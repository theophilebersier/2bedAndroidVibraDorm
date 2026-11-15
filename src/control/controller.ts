import { lightPacket, movementPacket, parseLight, stopPacket, type LightState, type Movement } from '../protocol/vmat';
import { SIDES, sideLabel, type BedTransport, type Mode, type Side, type Target } from '../transport/types';
import { OperationLane } from './lane';
import { VERSION } from '../version';

interface Session {
  transport: BedTransport;
  lane: OperationLane;
  light: LightState | null;
  unsubscribe: () => void;
}
interface Motion {
  command: Movement;
  sides: Side[];
  repeat?: ReturnType<typeof setTimeout>;
  limit?: ReturnType<typeof setTimeout>;
}
export interface EventRecord { time: string; code: string; sides: Side[] }
export interface ControllerSnapshot {
  mode: Mode;
  target: Target;
  active: Movement | null;
  stopping: boolean;
  accessoryBusy: boolean;
  ready: boolean;
  message: string;
  fault: boolean;
  beds: Record<Side, { connected: boolean; name: string; model?: string; firmware?: string; light: LightState | null }>;
}

export class BedController {
  private mode: Mode = 'real';
  private target: Target = 'both';
  private sessions: Partial<Record<Side, Session>> = {};
  private active: Motion | null = null;
  private stopping: Promise<void> | null = null;
  private accessoryBusy = false;
  private listeners = new Set<() => void>();
  private message = 'Associe tes deux sommiers pour commencer.';
  private fault = false;
  private events: EventRecord[] = [];

  constructor(private readonly timing = { repeatMs: 30, maxHoldMs: 10000 }) {}

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener); return () => this.listeners.delete(listener);
  }
  private emit(): void { for (const listener of this.listeners) listener(); }
  private log(code: string, sides: Side[] = []): void {
    this.events.push({ time: new Date().toISOString(), code, sides: [...sides] });
    this.events = this.events.slice(-100);
  }
  private selected(): Side[] { return this.target === 'both' ? [...SIDES] : [this.target]; }
  private connected(side: Side): boolean { return Boolean(this.sessions[side]?.transport.connected); }

  snapshot(): ControllerSnapshot {
    const bed = (side: Side) => {
      const session = this.sessions[side];
      return {
        connected: this.connected(side), name: session?.transport.name ?? 'Aucun sommier associé',
        model: session?.transport.model, firmware: session?.transport.firmware,
        light: this.connected(side) && session?.light ? { ...session.light } : null,
      };
    };
    return {
      mode: this.mode, target: this.target, active: this.active?.command ?? null,
      stopping: Boolean(this.stopping), accessoryBusy: this.accessoryBusy,
      ready: this.selected().every(side => this.connected(side)),
      message: this.message, fault: this.fault,
      beds: { left: bed('left'), right: bed('right') },
    };
  }

  attach(side: Side, transport: BedTransport): void {
    if (this.active || this.stopping || this.accessoryBusy) throw new Error('Termine la commande en cours avant de changer de sommier.');
    if (transport.mode !== this.mode) throw new Error('Connexion incompatible avec le mode actuel.');
    const other = this.sessions[side === 'left' ? 'right' : 'left'];
    if (other?.transport.id === transport.id) throw new Error('Ce sommier est déjà attribué à l’autre côté.');
    const previous = this.sessions[side];
    if (previous?.transport === transport) return;
    previous?.unsubscribe();
    // A closed transport may reference the same device as a fresh connection.
    // Never call disconnect on that old owner after the fresh link was opened.
    if (previous?.transport.connected) previous.transport.disconnect();
    const session: Session = { transport, lane: new OperationLane(), light: null, unsubscribe: () => {} };
    this.sessions[side] = session;
    session.unsubscribe = transport.onDisconnect(() => {
      session.light = null;
      this.log('disconnected', [side]);
      this.fault = true;
      this.message = `Lit ${sideLabel(side)} déconnecté. Vérifie l’arrêt physique avant de reconnecter.`;
      if (this.active) void this.stop('connection-lost');
      this.emit();
    });
    this.log('connected', [side]);
    this.fault = false;
    this.message = 'Connexion prête. Maintiens une commande pour déplacer le lit.';
    this.emit();
  }

  async setMode(mode: Mode): Promise<void> {
    if (mode === this.mode) return;
    await this.stop('mode-change');
    if (this.accessoryBusy) throw new Error('Attends la fin du réglage de lumière.');
    for (const session of Object.values(this.sessions)) {
      session.unsubscribe(); session.transport.disconnect();
    }
    this.sessions = {};
    this.mode = mode;
    this.fault = false;
    this.message = mode === 'demo' ? 'Simulation : aucune connexion à tes lits.' : 'Associe tes sommiers Bluetooth.';
    this.log('mode-changed'); this.emit();
  }

  async setTarget(target: Target): Promise<void> {
    if (target === this.target) return;
    await this.stop('target-change');
    if (this.accessoryBusy) throw new Error('Attends la fin du réglage de lumière.');
    this.target = target; this.emit();
  }

  start(command: Movement): boolean {
    if (this.active || this.stopping || this.accessoryBusy) return false;
    const sides = this.selected();
    if (!sides.every(side => this.connected(side))) {
      this.message = 'Les sommiers sélectionnés doivent tous être connectés.';
      this.fault = true; this.emit(); return false;
    }
    const motion: Motion = { command, sides };
    this.active = motion;
    this.fault = false;
    this.message = 'Commande en cours. Relâche pour demander l’arrêt.';
    this.log('movement-started', sides);
    motion.limit = setTimeout(() => {
      if (this.active !== motion) return;
      this.message = 'Limite de maintien atteinte (10 s). Relâche avant de recommencer.';
      void this.stop('hold-limit');
    }, this.timing.maxHoldMs);
    this.emit();
    void this.tick(motion);
    return true;
  }

  private async tick(motion: Motion): Promise<void> {
    const valid = () => this.active === motion && motion.sides.every(side => this.connected(side));
    try {
      if (!valid()) { if (this.active === motion) await this.stop('connection-lost'); return; }
      await Promise.all(motion.sides.map(side => {
        const session = this.sessions[side]!;
        return session.lane.run(() => session.transport.writeMovement(movementPacket(motion.command)), valid);
      }));
      if (valid()) motion.repeat = setTimeout(() => { void this.tick(motion); }, this.timing.repeatMs);
    } catch {
      if (this.active !== motion) return;
      this.fault = true;
      this.message = 'Commande interrompue. Vérifie l’arrêt des lits avant de réessayer.';
      this.log('movement-failed', motion.sides);
      await this.stop('write-failed');
    }
  }

  stop(reason = 'released'): Promise<void> {
    const motion = this.active;
    this.active = null; // Invalidate queued movement synchronously, before awaiting any I/O.
    clearTimeout(motion?.repeat); clearTimeout(motion?.limit);
    if (this.stopping) return this.stopping;
    const sessions = SIDES.flatMap(side => {
      const session = this.sessions[side];
      return session?.transport.connected ? [{ side, session }] : [];
    });
    // An explicit STOP also covers idle, connected receivers.
    this.stopping = Promise.resolve().then(async () => {
      const results = await Promise.allSettled(sessions.map(({ session }) =>
        session.lane.run(() => session.transport.writeMovement(stopPacket()), () => session.transport.connected, 0)));
      const failed = results.some(result => result.status === 'rejected' || !result.value);
      this.log(failed ? 'stop-failed' : 'stop-requested', sessions.map(entry => entry.side));
      if (failed) {
        this.fault = true;
        this.message = 'Arrêt non confirmé : une commande STOP a échoué. Vérifie les lits avec la télécommande.';
      } else if (!this.fault && reason !== 'hold-limit') {
        this.message = sessions.length ? 'Arrêt demandé. Maintiens une commande pour reprendre.' : 'Aucun sommier connecté.';
      }
    }).finally(() => { this.stopping = null; this.emit(); });
    this.emit(); return this.stopping;
  }

  async disconnect(side: Side): Promise<void> {
    await this.stop('disconnect');
    this.sessions[side]?.transport.disconnect();
  }

  async light(action: 'on' | 'off' | 'toggle' | 'read', level: number, minutes: number): Promise<void> {
    if (this.active || this.stopping || this.accessoryBusy) throw new Error('Termine le mouvement avant de régler la lumière.');
    lightPacket(level, minutes); // Validate before sending to any side.
    const sides = this.selected();
    if (!sides.every(side => this.connected(side))) throw new Error('Connecte tous les sommiers sélectionnés.');
    this.accessoryBusy = true; this.emit();
    try {
      const results = await Promise.allSettled(sides.map(async side => {
        const session = this.sessions[side]!;
        const ran = await session.lane.run(async () => {
          session.light = null;
          try {
            // A toggle always reads a fresh state, never cached intent.
            const before = parseLight(await session.transport.readLight());
            if (action !== 'read') {
              const off = action === 'off' || (action === 'toggle' && before.level > 0);
              await session.transport.writeLight(lightPacket(off ? 0 : level, off ? 0 : minutes));
              session.light = parseLight(await session.transport.readLight());
            } else { session.light = before; }
          } catch (error) { session.light = null; throw error; }
        }, () => session.transport.connected, 2);
        if (!ran) throw new Error('Connexion perdue avant la lecture de lumière.');
      }));
      const failed = results.flatMap((result, i) => result.status === 'rejected' ? [sideLabel(sides[i])] : []);
      this.fault = failed.length > 0;
      this.message = failed.length ? `Lumière non vérifiée : lit ${failed.join(' et ')}. Réessaie une lecture.` : 'État de la lumière relu sur les sommiers sélectionnés.';
      this.log(failed.length ? 'light-failed' : 'light-read', sides);
    } finally { this.accessoryBusy = false; this.emit(); }
  }

  diagnostics(): object {
    return {
      app: 'Dual Bed Sync', version: VERSION, hardwareValidated: false,
      mode: this.mode, target: this.target,
      // No device ID/name/model/firmware, packets, raw exceptions or persistent history.
      connections: Object.fromEntries(SIDES.map(side => [side, { connected: this.connected(side) }])),
      events: this.events.map(event => ({ ...event, sides: [...event.sides] })),
    };
  }
}

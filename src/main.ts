import './style.css';
import { BedController } from './control/controller';
import { BluetoothTransport, bluetoothSupport, chooseDevice } from './transport/bluetooth';
import { SimulatedTransport } from './transport/simulated';
import { SIDES, sideLabel, type Mode, type Side, type Target } from './transport/types';
import type { Movement } from './protocol/vmat';
import { readPreferences, savePreferences } from './storage/preferences';
import { bedIllustration } from './ui/bed';
import { icon } from './ui/icons';
import { readDevices, saveDevices } from './storage/devices';
import { Reconnection } from './control/reconnection';
import { VERSION } from './version';

const controller = new BedController();
let preferences = readPreferences();
const devices: Partial<Record<Side, BluetoothDevice>> = {};
const remembered = readDevices();
const simulations: Partial<Record<Side, SimulatedTransport>> = {};
let pairing: Side | null = null;
let modeChanging = false;
let recovering = false;
let reconnectingSide: Side | null = null;
let setupMessage = '';
let hold: { element: HTMLButtonElement; pointer?: number; key?: string } | null = null;
const reconnection = new Reconnection({
  remembered, devices,
  available: () => !document.hidden && !modeChanging && controller.snapshot().mode === 'real',
  idle: () => {
    const state = controller.snapshot();
    return !pairing && !state.active && !state.stopping && !state.accessoryBusy;
  },
  connected: side => controller.snapshot().beds[side].connected,
  attach: (side, transport) => controller.attach(side, transport),
  changed: (busy, side, message) => {
    recovering = busy; reconnectingSide = side;
    if (message) setupMessage = message;
    render();
  },
});

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="topbar"><a class="brand" href="./" aria-label="Dual Bed Sync, accueil"><span class="brand-icon">${icon('bed')}</span><span>dual<span class="brand-light">bed</span><small>SYNC</small></span></a><div class="top-actions"><span class="version">VERSION DE TEST</span><button class="icon-button" id="open-setup" aria-label="Configurer les sommiers">${icon('settings')}</button></div></header>
  <main>
    <div class="page-heading"><div><p class="eyebrow">VOTRE ESPACE DE REPOS</p><h1>Le confort, à deux.</h1></div><p class="heading-note">Chacun son côté.<br>Le même moment de calme.</p></div>
    <div id="demo-banner" class="demo-banner" hidden><span><strong>Mode simulation</strong> · Aucun lit réel n’est commandé.</span><button id="leave-demo">Passer au Bluetooth ${icon('arrow')}</button></div>
    <div class="workspace">
      <section class="bed-panel" aria-labelledby="bed-title">
        <div class="panel-heading"><div><p class="eyebrow">VOTRE SÉLECTION</p><h2 id="bed-title">Les deux sommiers</h2></div><span id="selection-state" class="pill">À connecter</span></div>
        <div class="bed-stage">${bedIllustration}<div class="bed-markers"><span id="marker-left">GAUCHE</span><span id="marker-right">DROITE</span></div></div>
        <div class="target-switch" role="group" aria-label="Choisir les sommiers"><button data-target="left" aria-pressed="false">Gauche</button><button data-target="both" aria-pressed="true">Les deux ${icon('link')}</button><button data-target="right" aria-pressed="false">Droite</button></div>
        <div class="connections">${SIDES.map(side => `<div class="connection"><div><span class="status-dot" id="dot-${side}"></span><strong>Lit ${sideLabel(side)}</strong><small id="status-${side}">Non connecté</small></div><button class="text-button" data-setup-side="${side}" aria-label="Configurer le lit ${sideLabel(side)}">Configurer ${icon('arrow')}</button></div>`).join('')}</div>
        <p class="selection-hint" id="selection-hint">Le mode combiné nécessite deux sommiers connectés.</p>
      </section>
      <section class="remote-panel" aria-labelledby="remote-title"><div class="panel-heading"><div><p class="eyebrow">PRENEZ VOTRE TEMPS</p><h2 id="remote-title">Votre télécommande</h2></div><span class="small-symbol">${icon('bed')}</span></div>
        <p class="hold-hint">Maintenez pour déplacer. Relâchez pour arrêter.</p>
        <div class="motion-row"><div class="zone-label"><span class="zone-drawing back-drawing"></span><span><strong>Dossier</strong><small>Partie haute du lit</small></span></div><div class="direction-buttons"><button class="hold-button" data-movement="backDown" aria-label="Baisser le dossier">${icon('down')}</button><button class="hold-button" data-movement="backUp" aria-label="Lever le dossier">${icon('up')}</button></div></div>
        <div class="motion-row"><div class="zone-label"><span class="zone-drawing legs-drawing"></span><span><strong>Jambes</strong><small>Partie basse du lit</small></span></div><div class="direction-buttons"><button class="hold-button" data-movement="legsDown" aria-label="Baisser les jambes">${icon('down')}</button><button class="hold-button" data-movement="legsUp" aria-label="Lever les jambes">${icon('up')}</button></div></div>
        <button class="flat-button hold-button" data-movement="allUp">${icon('bed')}<span>Tout monter<small>Maintenir le bouton</small></span>${icon('up')}</button>
        <button class="flat-button hold-button" data-movement="allDown">${icon('bed')}<span>Tout descendre<small>Maintenir le bouton</small></span>${icon('down')}</button>
        <button id="stop" class="stop-button">${icon('stop')} Arrêter les mouvements</button>
        <div class="status-message" id="movement-status" role="status" aria-live="polite"></div>
      </section>
      <section class="light-panel" aria-labelledby="light-title"><div class="light-intro"><span class="light-icon">${icon('light')}</span><div><p class="eyebrow">UNE AMBIANCE DOUCE</p><h2 id="light-title">Lumière sous le lit</h2><p id="light-state">État inconnu · connectez un sommier</p></div></div><div class="light-settings"><label for="brightness">Intensité <output id="brightness-value"></output></label><input id="brightness" type="range" min="1" max="100" step="1"><label class="timer-label" for="light-timer">Minuterie<select id="light-timer"><option value="0">Sans minuterie</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 heure</option><option value="120">2 heures</option></select></label></div><div class="light-actions"><button id="light-on" class="primary-button">Allumer / appliquer</button><button id="light-off" class="secondary-button">Éteindre</button><button id="light-read" class="text-button">Actualiser l’état</button></div></section>
    </div>
    <div class="help-strip"><p>${icon('link')} <span>La commande combinée ne mesure pas l’alignement des sommiers.</span></p><button id="try-demo" class="text-button">Essayer sans connecter de lit ${icon('arrow')}</button></div>
  </main>
  <footer><span>Un peu plus de calme, du bout des doigts.</span><div><button id="install" hidden>Installer l’application</button><button id="export">Diagnostic</button><button id="about">À propos</button><span>v${VERSION}</span></div></footer>
  <dialog id="setup-dialog" aria-labelledby="setup-title"><div class="dialog-heading"><div><p class="eyebrow">CONNEXIONS</p><h2 id="setup-title">Vos sommiers</h2></div><button class="close-button" data-close="setup-dialog" aria-label="Fermer la configuration">×</button></div><p>Choisissez chaque sommier séparément et attribuez-lui son côté, vu depuis le pied du lit.</p><div class="mode-switch" role="group" aria-label="Mode de connexion"><button data-mode="real" aria-pressed="true">Bluetooth réel</button><button data-mode="demo" aria-pressed="false">Simulation</button></div><p class="support-message" id="support-message"></p><div class="setup-beds">${SIDES.map(side => `<article class="setup-bed"><div><strong>Lit ${sideLabel(side)}</strong><span id="device-${side}">Aucun appareil associé</span><small id="details-${side}"></small></div><div class="setup-bed-actions"><button class="primary-button" data-connect="${side}">Choisir un sommier</button><button class="text-button" data-change="${side}" hidden>Changer d’appareil</button><button class="text-button demo-fault" data-fault="${side}" hidden>Simuler une perte de liaison</button></div></article>`).join('')}</div><p id="setup-status" role="status"></p><p class="setup-footnote">Profil prévu : V-MAT Basic CBI. Les essais sur vos moteurs restent à réaliser. Aucune commande de mouvement n’est envoyée lors de la connexion.</p><button class="secondary-button dialog-done" data-close="setup-dialog">Revenir à la télécommande</button></dialog>
  <dialog id="about-dialog" aria-labelledby="about-title"><div class="dialog-heading"><h2 id="about-title">Dual Bed Sync</h2><button class="close-button" data-close="about-dialog" aria-label="Fermer à propos">×</button></div><p>Version de test ${VERSION} pour les sommiers Vibradorm V-MAT Basic CBI. Application indépendante, sans affiliation avec Vibradorm ou Tempur.</p><p>Gardez l’application au premier plan pendant les commandes. Le maintien est limité à dix secondes ; relâchez puis maintenez de nouveau pour poursuivre. Une liaison Bluetooth perdue ne permet pas de confirmer l’arrêt physique : gardez la télécommande du lit accessible.</p><p>Les commandes groupées ne mesurent ni la position ni l’alignement mécanique. Les changements restent à vérifier sur les lits réels.</p><p>L’attribution gauche/droite et les réglages de lumière restent dans ce navigateur. Les sommiers autorisés sont reconnectés au retour sur la page, selon les permissions du navigateur. Aucun mouvement ne reprend. « Déconnecter » désactive la reconnexion automatique de ce côté jusqu’à votre prochaine connexion manuelle. Le diagnostic exporté exclut les identifiants et noms des appareils.</p><p>Protocole documenté par <a href="https://github.com/kristofferR/ha-adjustable-bed" target="_blank" rel="noopener noreferrer">kristofferR / ha-adjustable-bed</a>.</p></dialog>
`;

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
const setup = $<HTMLDialogElement>('#setup-dialog');
const buttons = (selector: string) => document.querySelectorAll<HTMLButtonElement>(selector);
const errorMessage = (error: unknown) => error instanceof DOMException && error.name === 'NotFoundError' ? 'Sélection annulée ou appareil indisponible.' : error instanceof Error ? error.message : 'Une erreur est survenue.';
function report(error: unknown): void { setupMessage = errorMessage(error); render(); }

function render(): void {
  const state = controller.snapshot();
  const blocked = state.stopping || state.accessoryBusy || Boolean(pairing) || modeChanging || recovering;
  $('#demo-banner').hidden = state.mode !== 'demo';
  $('#try-demo').hidden = state.mode === 'demo';
  $('#bed-title').textContent = state.target === 'both' ? 'Les deux sommiers' : `Le sommier ${sideLabel(state.target)}`;
  $('#selection-state').textContent = state.active ? 'En mouvement' : state.ready ? state.mode === 'demo' ? 'Simulation prête' : 'Connecté' : 'À connecter';
  $('#selection-state').classList.toggle('ready', state.ready);
  app.dataset.target = state.target;
  app.dataset.moving = String(Boolean(state.active));
  $('#movement-status').textContent = recovering ? setupMessage : state.message;
  $('#movement-status').classList.toggle('fault', state.fault);
  $('#selection-hint').textContent = state.target === 'both' ? 'Deux connexions sont nécessaires pour la commande combinée.' : 'Les commandes concernent uniquement le côté sélectionné.';
  for (const button of buttons('[data-target]')) {
    button.setAttribute('aria-pressed', String(button.dataset.target === state.target)); button.disabled = blocked;
  }
  for (const button of buttons('[data-movement]')) {
    const active = button.dataset.movement === state.active;
    button.classList.toggle('holding', active);
    button.disabled = !state.ready || blocked || (Boolean(state.active) && !active);
  }
  $<HTMLButtonElement>('#stop').disabled = !SIDES.some(side => state.beds[side].connected);
  for (const side of SIDES) {
    const bed = state.beds[side];
    $(`#status-${side}`).textContent = bed.connected ? state.mode === 'demo' ? 'Simulé · connecté' : 'Connecté' : 'Non connecté';
    $(`#dot-${side}`).classList.toggle('connected', bed.connected);
    $(`#marker-${side}`).classList.toggle('selected', state.target === 'both' || state.target === side);
    $(`#device-${side}`).textContent = !bed.connected && remembered[side] && state.mode === 'real' ? 'Sommier mémorisé' : bed.name;
    $(`#details-${side}`).textContent = [bed.model, bed.firmware && `Logiciel ${bed.firmware}`].filter(Boolean).join(' · ');
    const connect = $<HTMLButtonElement>(`[data-connect="${side}"]`);
    connect.disabled = blocked || Boolean(state.active);
    connect.textContent = pairing === side || reconnectingSide === side ? 'Connexion…' : bed.connected ? 'Déconnecter' : state.mode === 'demo' ? 'Connecter le lit simulé' : devices[side] || remembered[side] ? 'Reconnecter' : 'Choisir un sommier';
    connect.disabled ||= state.mode === 'real' && !bed.connected && Boolean(bluetoothSupport());
    const change = $<HTMLButtonElement>(`[data-change="${side}"]`);
    change.hidden = state.mode !== 'real' || (!devices[side] && !remembered[side]) || bed.connected;
    change.disabled = blocked;
    $<HTMLButtonElement>(`[data-fault="${side}"]`).hidden = state.mode !== 'demo' || !bed.connected;
  }
  for (const button of buttons('[data-mode]')) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)); button.disabled = blocked;
  }
  $('#support-message').textContent = state.mode === 'real' ? bluetoothSupport() ?? 'Choisissez vos récepteurs V-MAT Basic CBI dans le sélecteur Bluetooth.' : 'Les mouvements et les connexions sont simulés dans ce navigateur.';
  $('#setup-status').textContent = setupMessage || (state.fault && !pairing ? state.message : 'Les sommiers choisis sont mémorisés et reconnectés au retour sur la page.');
  const selected = state.target === 'both' ? SIDES : [state.target];
  $('#light-state').textContent = selected.map(side => {
    const light = state.beds[side].light;
    return `${side === 'left' ? 'Gauche' : 'Droite'} : ${light ? light.level > 0 ? `${Math.round(light.level / 255 * 100)} %` : 'éteint' : 'inconnu'}`;
  }).join(' · ');
  const observedOn = selected.some(side => (state.beds[side].light?.level ?? 0) > 0);
  $('.underlight').setAttribute('opacity', observedOn ? '.85' : '0');
  for (const button of buttons('#light-on, #light-off, #light-read')) button.disabled = !state.ready || Boolean(state.active) || blocked;
  $<HTMLInputElement>('#brightness').disabled = blocked || Boolean(state.active);
  $<HTMLSelectElement>('#light-timer').disabled = blocked || Boolean(state.active);
}

function releaseHold(reason = 'released'): void {
  const previous = hold; hold = null;
  if (previous?.pointer !== undefined && previous.element.hasPointerCapture(previous.pointer)) previous.element.releasePointerCapture(previous.pointer);
  void controller.stop(reason);
}
for (const button of buttons('[data-movement]')) {
  button.addEventListener('pointerdown', event => {
    if (hold || button.disabled || event.button !== 0) return;
    event.preventDefault();
    hold = { element: button, pointer: event.pointerId };
    if (!controller.start(button.dataset.movement as Movement)) { hold = null; return; }
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('lostpointercapture', event => { if (hold?.pointer === event.pointerId) releaseHold('capture-lost'); });
  button.addEventListener('keydown', event => {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    if (hold || event.repeat || button.disabled) return;
    hold = { element: button, key: event.key };
    if (!controller.start(button.dataset.movement as Movement)) hold = null;
  });
  button.addEventListener('click', event => event.preventDefault());
  button.addEventListener('contextmenu', event => event.preventDefault());
  button.addEventListener('blur', () => { if (hold?.element === button && hold.key) releaseHold('focus-lost'); });
}
window.addEventListener('pointerup', event => { if (hold?.pointer === event.pointerId) releaseHold(); }, true);
window.addEventListener('pointercancel', event => { if (hold?.pointer === event.pointerId) releaseHold('pointer-cancelled'); }, true);
window.addEventListener('keyup', event => { if (hold?.key === event.key) { event.preventDefault(); releaseHold(); } }, true);
window.addEventListener('keydown', event => { if (event.key === 'Escape' && hold) releaseHold('escape'); }, true);
window.addEventListener('blur', () => { if (hold || controller.snapshot().active) releaseHold('blur'); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { reconnection.suspend(); releaseHold('hidden'); }
  else reconnection.resume();
});
window.addEventListener('pagehide', () => { reconnection.suspend(); releaseHold('pagehide'); });
window.addEventListener('pageshow', () => reconnection.resume());
$('#stop').addEventListener('click', () => releaseHold('explicit-stop'));
for (const button of buttons('[data-target]')) button.addEventListener('click', () => {
  hold = null; void controller.setTarget(button.dataset.target as Target).catch(report);
});

async function openSetup(): Promise<void> {
  if (controller.snapshot().active) { releaseHold('setup'); await controller.stop('setup'); }
  if (!setup.open) setup.showModal();
}
$('#open-setup').addEventListener('click', () => { void openSetup(); });
for (const button of buttons('[data-setup-side]')) button.addEventListener('click', () => { void openSetup(); });
for (const button of buttons('[data-close]')) button.addEventListener('click', () => $<HTMLDialogElement>(`#${button.dataset.close}`).close());
$('#about').addEventListener('click', async () => {
  releaseHold('about'); await controller.stop('about'); $<HTMLDialogElement>('#about-dialog').showModal();
});

async function switchMode(mode: Mode): Promise<void> {
  if (pairing || modeChanging || recovering) return;
  reconnection.suspend();
  modeChanging = true; setupMessage = ''; hold = null; render();
  try {
    await controller.setMode(mode);
    if (mode === 'demo') for (const side of SIDES) {
      if (controller.snapshot().beds[side].connected) continue;
      const transport = new SimulatedTransport(side); simulations[side] = transport; controller.attach(side, transport);
    }
  } catch (error) { report(error); }
  finally { modeChanging = false; render(); reconnection.resume(); }
}
for (const button of buttons('[data-mode]')) button.addEventListener('click', () => { void switchMode(button.dataset.mode as Mode); });
$('#try-demo').addEventListener('click', () => { void switchMode('demo'); });
$('#leave-demo').addEventListener('click', async () => { await switchMode('real'); await openSetup(); });

async function connect(side: Side, change = false): Promise<void> {
  if (pairing || modeChanging || recovering) return;
  const state = controller.snapshot();
  if (state.beds[side].connected) {
    if (state.mode === 'real') {
      reconnection.suspend();
      if (remembered[side]) remembered[side]!.automatic = false;
      saveDevices(remembered);
    }
    await controller.disconnect(side);
    reconnection.resume(); return;
  }
  if (state.mode === 'demo') {
    const transport = new SimulatedTransport(side); simulations[side] = transport; controller.attach(side, transport); return;
  }
  // Request synchronously in this click turn, before any await.
  reconnection.suspend();
  const requested = !change && devices[side] ? Promise.resolve(devices[side]!) : chooseDevice();
  pairing = side; setupMessage = ''; render();
  let transport: BluetoothTransport | undefined;
  try {
    const device = await requested;
    const other = side === 'left' ? 'right' : 'left';
    if (remembered[other]?.id === device.id || devices[other]?.id === device.id) throw new Error('Cet appareil est déjà attribué à l’autre côté. Choisissez le second sommier.');
    transport = await BluetoothTransport.connect(device);
    controller.attach(side, transport);
    devices[side] = device;
    remembered[side] = { id: device.id, automatic: true };
    saveDevices(remembered);
    setupMessage = `Lit ${sideLabel(side)} connecté et mémorisé. Aucun mouvement envoyé.`;
    // Initial light read is deliberately optional and cannot start movement.
  } catch (error) { transport?.disconnect(); report(error); }
  finally { pairing = null; render(); reconnection.resume(); }
}
for (const button of buttons('[data-connect]')) button.addEventListener('click', () => { void connect(button.dataset.connect as Side).catch(report); });
for (const button of buttons('[data-change]')) button.addEventListener('click', () => { void connect(button.dataset.change as Side, true).catch(report); });
for (const button of buttons('[data-fault]')) button.addEventListener('click', () => simulations[button.dataset.fault as Side]?.disconnect());

$<HTMLInputElement>('#brightness').value = String(Math.round(preferences.level / 255 * 100));
if (![0, 15, 30, 60, 120].includes(preferences.minutes)) preferences.minutes = 30;
$<HTMLSelectElement>('#light-timer').value = String(preferences.minutes);
function updatePreferences(): void {
  const percent = Number($<HTMLInputElement>('#brightness').value);
  preferences = { level: Math.max(1, Math.round(percent * 255 / 100)), minutes: Number($<HTMLSelectElement>('#light-timer').value) };
  $('#brightness-value').textContent = `${percent} %`; savePreferences(preferences);
}
$('#brightness').addEventListener('input', updatePreferences);
$('#light-timer').addEventListener('change', updatePreferences);
for (const [selector, action] of [['#light-on', 'on'], ['#light-off', 'off'], ['#light-read', 'read']] as const) {
  $(selector).addEventListener('click', () => {
    void controller.light(action, preferences.level, preferences.minutes).catch(error => {
      $('#movement-status').textContent = errorMessage(error); $('#movement-status').classList.add('fault');
    });
  });
}
$('#export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(controller.diagnostics(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'dual-bed-sync-diagnostic.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

interface InstallPrompt extends Event { prompt(): Promise<{ outcome: string }> }
let installPrompt: InstallPrompt | null = null;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event as InstallPrompt; $('#install').hidden = false;
});
$('#install').addEventListener('click', async () => { await installPrompt?.prompt(); installPrompt = null; $('#install').hidden = true; });
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Updates wait until all existing pages close: no forced reload during movement.
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
const wasConnected = { left: false, right: false };
controller.subscribe(() => {
  const state = controller.snapshot();
  for (const side of SIDES) {
    if (wasConnected[side] && !state.beds[side].connected && remembered[side]?.automatic) reconnection.resume(1000);
    wasConnected[side] = state.beds[side].connected;
  }
  render();
});
updatePreferences(); render(); reconnection.resume();

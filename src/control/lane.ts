interface Task {
  priority: number;
  valid: () => boolean;
  work: () => Promise<void>;
  resolve: (ran: boolean) => void;
  reject: (reason: unknown) => void;
}

/** One in-flight GATT operation. STOP overtakes pending ordinary work. */
export class OperationLane {
  private queue: Task[] = [];
  private running = false;

  run(work: () => Promise<void>, valid = () => true, priority = 1): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.queue.push({ work, valid, priority, resolve, reject });
      this.queue.sort((a, b) => a.priority - b.priority);
      void this.drain();
    });
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      let task: Task | undefined;
      while ((task = this.queue.shift())) {
        try {
          if (!task.valid()) { task.resolve(false); continue; }
          await task.work();
          task.resolve(true);
        } catch (error) { task.reject(error); }
      }
    } finally { this.running = false; }
  }
}

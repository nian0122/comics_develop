export class RequestQueue {
    constructor(maxConcurrent = 4) {
        this.maxConcurrent = Math.max(1, maxConcurrent);
        this.activeCount = 0;
        this.pendingTasks = [];
    }

    async add(requestFn) {
        let pendingTask = null;
        if (this.activeCount >= this.maxConcurrent) {
            await new Promise(resolve => {
                pendingTask = { resolve, cancelled: false };
                this.pendingTasks.push(pendingTask);
            });
        }

        if (pendingTask?.cancelled) return undefined;

        this.activeCount += 1;
        try {
            return await requestFn();
        } finally {
            this.activeCount -= 1;
            this.runNext();
        }
    }

    runNext() {
        const nextTask = this.pendingTasks.shift();
        if (nextTask) nextTask.resolve();
    }

    clear() {
        this.pendingTasks.splice(0).forEach(task => {
            task.cancelled = true;
            task.resolve();
        });
    }
}

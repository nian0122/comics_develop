export class RequestQueue {
    constructor(maxConcurrent = 4) {
        this.maxConcurrent = Math.max(1, maxConcurrent);
        this.activeCount = 0;
        this.pendingTasks = [];
    }

    async add(requestFn) {
        if (this.activeCount >= this.maxConcurrent) {
            await new Promise(resolve => this.pendingTasks.push(resolve));
        }

        this.activeCount += 1;
        try {
            return await requestFn();
        } finally {
            this.activeCount -= 1;
            const nextTask = this.pendingTasks.shift();
            if (nextTask) nextTask();
        }
    }

    clear() {
        this.pendingTasks.splice(0).forEach(resolve => resolve());
    }
}

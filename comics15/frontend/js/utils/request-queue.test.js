import { describe, it, expect } from 'vitest';
import { RequestQueue } from './request-queue.js';

async function flushMicrotasks() {
    for (let index = 0; index < 5; index += 1) {
        await Promise.resolve();
    }
}

describe('RequestQueue', () => {
    it('限制同时执行的异步任务数量', async () => {
        const queue = new RequestQueue(2);
        let activeCount = 0;
        let maxActiveCount = 0;
        const releaseTasks = [];

        const tasks = Array.from({ length: 5 }, (_, index) => queue.add(async () => {
            activeCount += 1;
            maxActiveCount = Math.max(maxActiveCount, activeCount);
            await new Promise(resolve => releaseTasks.push(resolve));
            activeCount -= 1;
            return index;
        }));

        await flushMicrotasks();
        expect(maxActiveCount).toBe(2);
        expect(releaseTasks).toHaveLength(2);

        releaseTasks.shift()();
        await flushMicrotasks();
        expect(maxActiveCount).toBe(2);
        expect(releaseTasks).toHaveLength(2);

        while (releaseTasks.length > 0) {
            releaseTasks.shift()();
            await flushMicrotasks();
        }

        await expect(Promise.all(tasks)).resolves.toEqual([0, 1, 2, 3, 4]);
        expect(maxActiveCount).toBe(2);
    });

    it('任务失败后仍释放并发槽位', async () => {
        const queue = new RequestQueue(1);
        const calls = [];

        const failingTask = queue.add(async () => {
            calls.push('first');
            throw new Error('失败');
        });
        const nextTask = queue.add(async () => {
            calls.push('second');
            return 'ok';
        });

        await expect(failingTask).rejects.toThrow('失败');
        await expect(nextTask).resolves.toBe('ok');
        expect(calls).toEqual(['first', 'second']);
    });

    it('清理队列后不会继续执行待处理任务', async () => {
        const queue = new RequestQueue(1);
        const releaseTasks = [];
        const calls = [];

        const activeTask = queue.add(async () => {
            calls.push('active');
            await new Promise(resolve => releaseTasks.push(resolve));
        });
        const pendingTask = queue.add(async () => {
            calls.push('pending');
            return 'should-not-run';
        });

        await flushMicrotasks();
        expect(calls).toEqual(['active']);

        queue.clear();
        releaseTasks.shift()();
        await activeTask;

        await expect(pendingTask).resolves.toBeUndefined();
        expect(calls).toEqual(['active']);
    });

});

/**
 * PULSE PREMIER LEAGUE - Operation Queue
 * Prevents race conditions in concurrent operations
 */

window.PPL = window.PPL || {};

PPL.OperationQueue = class {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.locks = new Map();
    }

    async enqueue(operation, priority = 0) {
        return new Promise((resolve, reject) => {
            this.queue.push({ operation, priority, resolve, reject });
            this.queue.sort((a, b) => b.priority - a.priority);
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;

        while (this.queue.length > 0) {
            const { operation, resolve, reject } = this.queue.shift();
            try {
                const result = await operation();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }

        this.processing = false;
    }

    async withLock(lockName, operation) {
        while (this.locks.get(lockName)) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        this.locks.set(lockName, true);
        try {
            return await operation();
        } finally {
            this.locks.delete(lockName);
        }
    }
};

PPL.matchQueue = new PPL.OperationQueue();

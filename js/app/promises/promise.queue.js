define([], () => {
    'use strict';

    /**
     * sequential promise queue
     * @see https://medium.com/@karenmarkosyan/how-to-manage-promises-into-dynamic-queue-with-vanilla-javascript-9d0d1f8d4df5
     * @see https://codepen.io/exodus4d/pen/QWwgKay
     */
    return class Queue {

        constructor() {
            this._queue = [];
            this._pendingPromise = false;
            this._stop = false;
        }

        /**
         * wraps a promise that needs to be sequentially resolved
         * -> dequeue() process starts immediately (if not already pending)
         * @param promise
         * @param {'end'|'start'} position
         * @param data
         * @returns {Promise}
         */
        enqueue(promise, position = 'end', data = null) {
            return new Promise((resolve, reject) => {
                this._queue[position === 'end' ? 'push' : 'unshift']({
                    promise,
                    resolve,
                    reject,
                    data,
                });
                this.dequeue();
            });
        }

        /**
         * resolve promise queue recursive until queue is empty
         * @returns {boolean}
         */
        dequeue() {
            if (this._pendingPromise) {
                return false;
            }

            if (this._stop) {
                this._queue = [];
                this._stop = false;
                return false;
            }

            let item = this._queue.shift();
            if (!item) {
                return false;
            }

            try {
                this._pendingPromise = true;
                item.promise()
                    .then((value) => {
                        this._pendingPromise = false;
                        item.resolve(value);
                        this.dequeue();
                    })
                    .catch(err => {
                        this._pendingPromise = false;
                        item.reject(err);
                        this.dequeue();
                    });
            } catch (err) {
                this._pendingPromise = false;
                item.reject(err);
                this.dequeue();
            }
            return true;
        }

        filterQueue(callback) {
            return this._queue.filter(callback);
        }
    };
});
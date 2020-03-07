define([], () => {
    'use strict';

    class ResizeManager {
        constructor(config = {}) {
            this._config    = Object.assign({}, ResizeManager.defaultConfig, config);
            this._observables = new WeakMap();
            this._observer = new ResizeObserver((entries, observer) => { // jshint ignore:line
                for (let entry of entries) {
                    if (this._observables.has(entry.target)) {
                        this._observables
                            .get(entry.target)
                            .callback(entry.target, entry.contentRect);
                    } else {
                        this._observer.unobserve(entry.target);
                    }
                }
            });
        }

        debounce(callback, ms = this._config.msDebounce, immediate = false) {
            let timer;
            return (...args) => {
                let later = () => {
                    timer = null;
                    if (!immediate) callback(...args);
                };
                let callNow = immediate && !timer;
                clearTimeout(timer);
                timer = setTimeout(later, ms);
                if (callNow) callback(...args);
            };
        }

        throttle(callback, ms = this._config.msThrottle) {
            let lastFunc;
            let lastRan;
            return function (...args) {
                if (!lastRan) {
                    callback(...args);
                    lastRan = Date.now();
                } else {
                    clearTimeout(lastFunc);
                    lastFunc = setTimeout(() => {
                        if (Date.now() - lastRan >= ms) {
                            callback(...args);
                            lastRan = Date.now();
                        }
                    }, ms - (Date.now() - lastRan));
                }
            };
        }

        observe(target, callback, config = {}, options = ResizeManager.observeOptions) {
            if (!this._observables.has(target)) {
                if (config.hasOwnProperty('debounce')) {
                    let {ms, immediate} = config;
                    callback = this.debounce(callback, ms, immediate);
                }

                if (config.hasOwnProperty('throttle')) {
                    let {ms} = config;
                    callback = this.throttle(callback, ms);
                }

                this._observables.set(target, {callback});
                this._observer.observe(target, options);
            }
        }

        unobserve(target) {
            this._observer.unobserve(target);
            this._observables.delete(target);
        }

        disconnect() {
            this._observer.disconnect();
            this._observables = new WeakMap();
        }
    }

    ResizeManager.observeOptions = {
        box:            'border-box'    // sets which box model the observer will observe changes to
    };

    ResizeManager.defaultConfig = {
        msDebounce:     250,            // setTimeout for debounced calls
        msThrottle:     100             // setTimeout for throttled calls
    };

    return new ResizeManager();
});
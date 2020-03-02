define([], () => {
    'use strict';

    /*
    // Example usage --------------------------------------------------------------------------------------------------
    // global accessible DataStore instance
    window.dataStore = new DataStore();

    // extend HTMLElement class with an interface to set/get data to it
    HTMLElement.prototype.setData = function(key, value){
        window.dataStore.set(this, key, value);
    };

    HTMLElement.prototype.getData = function(key){
        return window.dataStore.get(this, key);
    };
    */

    /**
     * Stores data to an object
     * -> can be used as a replacement for jQuery $.data()
     */
    return class DataStore {
        constructor() {
            this._store = new WeakMap();
        }

        set(obj, key, value) {
            if (!this._store.has(obj)) {
                this._store.set(obj, new Map());
            }
            this._store.get(obj).set(key, value);
            return obj;
        }

        get(obj, key) {
            return this._store.has(obj) && (key ? this._store.get(obj).get(key) : this._store.get(obj));
        }

        has(obj, key) {
            return this._store.has(obj) && this._store.get(obj).has(key);
        }

        remove(obj, key) {
            let ret = false;
            if (this._store.has(obj)) {
                ret = this._store.get(obj).delete(key);
                // remove obj if store is empty
                // -> 'size' property is does not exist if valueStore is WeakMap
                if (!this._store.get(obj).size) {
                    this._store.delete(obj);
                }
            }
            return ret;
        }
    };
});
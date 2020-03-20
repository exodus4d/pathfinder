define([
    'localForage',
    'app/promises/promise.queue',
    'app/promises/promise.deferred',
], (LocalForage, PromiseQueue, DeferredPromise) => {
    'use strict';

    /**
     * Instances of LocalStore handle its own LocalForage instance
     */
    class LocalStore {
        constructor(config, LocalForageConfig){
            this._config = Object.assign({}, this.constructor.defaultConfig, config);

            let initPromise = new DeferredPromise();
            this._processQueue = new PromiseQueue();
            this._processQueue.enqueue(() => initPromise);

            this._localforage = LocalForage.createInstance(Object.assign({}, LocalStore.LocalForageConfig, LocalForageConfig));
            this._localforage.ready().then(() => initPromise.resolve());

            this._manager = null;       // reference to LocalStoreManager() that manages this LocalStore instance

            this.debug = (msg,...data) => {
                if(this._config.debug){
                    data = (data || []);
                    data.unshift(this.constructor.name, this._config.name);
                    console.debug('debug: %s %o | ' + msg, ...data);
                }
            };
        }

        /**
         * set scope for this instance
         * -> all read/write actions are scoped
         *    this is a prefix for all keys!
         * @param scope
         */
        set scope(scope){
            if(LocalStore.isString(scope)){
                this._config.scope = scope;
            }else{
                throw new TypeError('Scope must be instance of "String", Type of "' + typeof scope + '" given');
            }
        }

        get scope(){
            return this._config.scope;
        }

        /**
         * get item
         * @param key
         * @param successCallback
         * @returns {Promise}
         */
        getItem(key, successCallback = undefined){
            key = this.fixKey(key);
            let propArray = LocalStore.keyToArray(key);
            let rootKey = propArray.shift();

            let getItem = () => this._localforage.getItem(key, successCallback);
            if(propArray.length){
                getItem = () => {
                    return this._localforage.getItem(rootKey)
                        .then(data => {
                            if(LocalStore.isObject(data)){
                                // find nested property
                                return LocalStore.findObjProp(data, propArray);
                            }else{
                                // rootKey not found -> propArray path not exists
                                return Promise.resolve(null);
                            }
                        });
                };
            }

            return this._processQueue.enqueue(() => getItem());
        }

        /**
         * set/update existing value
         * @param key e.g. nested object key' first.a.b.test'
         * @param value
         * @param successCallback
         * @returns {Promise}
         */
        setItem(key, value, successCallback = undefined){
            key = this.fixKey(key);
            let propArray = LocalStore.keyToArray(key);
            let rootKey = propArray.shift();

            let getItem = () => Promise.resolve(value);
            if(propArray.length){
                getItem = () => {
                    return this._localforage.getItem(rootKey)
                        .then(rootVal => {
                            rootVal = (rootVal === null) ? {} : rootVal;
                            // update data with new value (merge obj)
                            LocalStore.updateObjProp(rootVal, value, propArray);
                            return rootVal;
                        });
                };
            }

            return this._processQueue.enqueue(() =>
                getItem()
                    .then(rootVal => this._localforage.setItem(rootKey, rootVal, successCallback))
                    .then(() => Promise.resolve(value))
            );
        }

        /**
         * remove item by key
         * -> allows deep obj delete if key points to a nested obj prop
         * @param key
         * @param successCallback
         * @returns {Promise}
         */
        removeItem(key, successCallback = undefined){
            key = this.fixKey(key);
            let propArray = LocalStore.keyToArray(key);
            let rootKey = propArray.shift();

            let removeItem = () => this._localforage.removeItem(rootKey, successCallback);
            if(propArray.length){
                removeItem = () => {
                    return this._localforage.getItem(rootKey)
                        .then(data => {
                            if(LocalStore.isObject(data)){
                                // update data -> delete nested prop
                                LocalStore.deleteObjProp(data, propArray);
                                return data;
                            }else{
                                // rootKey not found -> nothing to delete
                                return Promise.reject(new RangeError('No data found for key: ' + rootKey));
                            }
                        })
                        .then(value => this._localforage.setItem(rootKey, value, successCallback))
                        .catch(e => this.debug('removeItem() error',e));
                };
            }

            return this._processQueue.enqueue(() => removeItem());
        }

        /**
         * clear all items in store
         * @param successCallback
         * @returns {Promise}
         */
        clear(successCallback = undefined){
            return this._processQueue.enqueue(() => this._localforage.clear(successCallback));
        }

        /**
         * get number of keys in store
         * @param successCallback
         * @returns {Promise}
         */
        length(successCallback = undefined){
            return this._processQueue.enqueue(() => this._localforage.length(successCallback));
        }

        /**
         * Get the name of a key based on its index
         * @param keyIndex
         * @param successCallback
         * @returns {Promise|void}
         */
        key(keyIndex, successCallback = undefined){
            return this._processQueue.enqueue(() => this._localforage.key(keyIndex, successCallback));
        }

        /**
         * get list of all keys in store
         * @param successCallback
         * @returns {Promise|void}
         */
        keys(successCallback = undefined){
            return this._processQueue.enqueue(() => this._localforage.keys(successCallback));
        }

        /**
         * drop current LocalForage instance
         * -> removes this from LocalStoreManager
         * @returns {Promise|void}
         */
        dropInstance(){
            return this._processQueue.enqueue(() =>
                this._localforage.dropInstance().then(() => this._manager.deleteStore(this._config.name))
            );
        }

        /**
         * connect LocalStoreManager with instance
         * @param {LocalStoreManager} manager
         */
        connect(manager){
            if(manager instanceof LocalStoreManager){
                this._manager = manager;
            }else{
                throw new TypeError('Parameter must be instance of LocalStoreManager. Type of "' + typeof manager + '" given');
            }
        }

        /**
         * check if key is Int or String with Int at pos 0
         * -> prefix key
         * @param key
         * @returns {string}
         */
        fixKey(key){
            if(LocalStore.isString(this.scope) && this.scope.length){
                key = [this.scope, key].join('.');
            }

            if(
                Number.isInteger(key) ||
                (LocalStore.isString(key) && parseInt(key.charAt(0), 10))
            ){
                key = [this._config.name, key].join('_');
            }
            return key;
        }

        /**
         * find data from obj prop
         * -> deep object search
         * @param obj
         * @param propArray
         * @returns {null|*}
         */
        static findObjProp(obj, propArray){
            let [head, ...rest] = propArray;
            if(!rest.length){
                 return obj[head];
            }else{
                if(LocalStore.isObject(obj[head])){
                    return LocalStore.findObjProp(obj[head], rest);
                }else{
                    return null;
                }
            }
        }

        /**
         * update/extend obj with new value
         * -> deep object manipulation
         * @param obj
         * @param value
         * @param propArray
         */
        static updateObjProp(obj, value, propArray){
            let [head, ...rest] = propArray;
            if(!rest.length){
                obj[head] = value;
            }else{
                if(!LocalStore.isObject(obj[head])) obj[head] = {};
                LocalStore.updateObjProp(obj[head], value, rest);
            }
        }

        /**
         * delete object prop by propArray path
         * -> deep object delete
         * @param obj
         * @param propArray
         */
        static deleteObjProp(obj, propArray){
            let [head, ...rest] = propArray;
            if(!rest.length){
                delete obj[head];
            }else{
                if(LocalStore.isObject(obj[head])){
                    LocalStore.deleteObjProp(obj[head], rest);
                }
            }
        }

        /**
         * converts string key to array
         * @param propPath
         * @returns {*|string[]}
         */
        static keyToArray(propPath){
            return propPath.split('.');
        }

        /**
         * build DB name
         * @param name
         * @returns {string}
         */
        static buildDbName(name){
            return [LocalStore.dbNamePrefix, name].join(' ');
        }

        /**
         * check var for Object
         * @param obj
         * @returns {boolean}
         */
        static isObject(obj){
            return (!!obj) && (obj.constructor === Object);
        }

        /**
         * check var for Array
         * @param arr
         * @returns {boolean}
         */
        static isArray(arr){
            return (!!arr) && (arr.constructor === Array);
        }

        /**
         * check var for String
         * @param str
         * @returns {boolean}
         */
        static isString(str){
            return typeof str === 'string';
        }
    }

    LocalStore.defaultConfig = {
        name: 'default',            // custom unique name for identification
        debug: false
    };

    LocalStore.dbNamePrefix = 'PathfinderDB';
    LocalStore.LocalForageConfig = {
        driver: [LocalForage.INDEXEDDB, LocalForage.WEBSQL, LocalForage.LOCALSTORAGE],
        name: LocalStore.dbNamePrefix
    };

    /**
     * An instance of LocalStoreManager() handles multiple LocalStore()´s
     * -> LocalStore()´s can be set()/delete() from LocalStore() instance
     */
    class LocalStoreManager {

        constructor(){
            if(!this.constructor.instance){
                this._store = new Map();
                this.constructor.instance = this;
            }

            return this.constructor.instance;
        }

        /**
         * get LocalStore instance by name
         * @param name
         * @returns {LocalStore}
         */
        getStore(name){
            return this.newStore(name);
        }

        /**
         * get either existing LocalStore instance
         * -> or create new instance
         * @param name
         * @returns {LocalStore|undefined}
         */
        newStore(name){
            if(!this._store.has(name)){
                let store = new LocalStore({
                    name: name
                }, {
                    name: LocalStore.buildDbName(name)
                });
                store.connect(this);
                this._store.set(name, store);
            }
            return this._store.get(name);
        }

        /**
         * removes LocalStore instance from Manager
         * -> this will not drop LocalForage instance!
         *    check LocalStore.dropInstance() for graceful delete
         * @param name
         * @returns {boolean}
         */
        deleteStore(name){
            return this._store.delete(name);
        }
    }

    return new LocalStoreManager();
});
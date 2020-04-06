define([], () => {
    'use strict';

    /**
     * Abstract Cache Strategy class
     * @type {AbstractStrategy}
     */
    class AbstractStrategy {
        constructor(){
            if(new.target === AbstractStrategy){
                throw new TypeError('Cannot construct AbstractStrategy instances directly');
            }
        }

        /**
         * factory for Strategy* instances
         * @returns {AbstractStrategy}
         */
        static create(){
            return new this();
        }
    }

    /**
     * LIFO Cache Strategy - First In First Out
     * -> The cache evicts the entries in the order they were added,
     *    without any regard to how often or how many times they were accessed before.
     * @type {StrategyFIFO}
     */
    class StrategyFIFO extends AbstractStrategy {
        valueToCompare(metaData){
            return metaData.age();
        }

        compare(a, b){
            return b - a;
        }
    }

    /**
     * LFU Cache Strategy - Least Frequently Used
     * -> The cache evicts the entries in order how often have been accessed.
     *   Those that are used least often are discarded first
     * @type {StrategyLFU}
     */
    class StrategyLFU extends AbstractStrategy {
        valueToCompare(metaData){
            return metaData.hitCount;
        }

        compare(a, b){
            return  a - b;
        }
    }

    /**
     * LRU Cache Strategy - Least Recently Used
     * -> The cache evicts entries that have not been used for the longest amount of time.
     *    No matter how often they have been accessed.
     * @type {StrategyLRU}
     */
    class StrategyLRU extends AbstractStrategy {
        valueToCompare(metaData){
            return metaData.hits[metaData.hits.length - 1] || metaData.set;
        }

        compare(a, b){
            return  a - b;
        }
    }

    /**
     * Each entry in cache also has its own instance of CacheEntryMeta
     * -> The configured Cache Strategy use this meta data for eviction policy
     * @type {CacheEntryMeta}
     */
    class CacheEntryMeta {
        constructor(ttl, tSet){
            this._ttl = ttl;                                // ttl < 0 => no expire
            this._tSet = tSet || this.constructor.now();
            this._tHits = [];
        }

        get set(){
            return this._tSet;
        }

        get hits(){
            return this._tHits;
        }

        get hitCount(){
            return this.hits.length;
        }

        newHit(current){
            this._tHits.push(current || this.constructor.now());
        }

        age(current){
            return (current || this.constructor.now()) - this._tSet;
        }

        expired(current){
            return this._ttl < 0 ? false : this._ttl < this.age(current);
        }

        static now(){
            return new Date().getTime() / 1000;
        }

        static create(ttl, tSet){
            return new this(ttl, tSet);
        }
    }

    /**
     * Each instance of Cache represents a key value in memory data store
     * -> Name should be set to identify current Cache instance
     * -> Default ttl can be overwritten by individual entries
     * -> Cache Strategy handles eviction policy
     * -> Buffer Size (in percent) can be used to remove e.g. 10% of all entries
     *    if cache reaches maxSize limit, to increase performance.
     * @type {Cache}
     */
    class Cache {

        constructor(config = {}){
            this._config    = Object.assign({}, Cache.defaultConfig, config);
            this._store     = new Map();
            this._metaStore = new WeakMap();
            this._strategy  = this.constructor.setStrategy(this._config.strategy);

            this.debug = (msg,...data) => {
                if(this._config.debug){
                    data = (data || []);
                    data.unshift(this._config.name);
                    console.debug('debug: CACHE %o | ' + msg, ...data);
                }
            };

            this.debug('New Cache instance');
        }

        get size(){
            return this._store.size;
        }

        isFull(){
            return this.size>= this._config.maxSize;
        }

        set(key, value, ttl){
            if(this._store.has(key)){
                this.debug('SET key %o, UPDATE value %o', key, value);
                this._store.set(key, value);
            }else{
                this.debug('SET key %o, NEW value %o', key, value);
                if(this.isFull()){
                    this.debug(' ↪ FULL trim cache…');
                    this.trim(this.trimCount(1));
                }
                this._store.set(key, value);
            }

            this._metaStore.set(value, CacheEntryMeta.create(ttl || this._config.ttl));
        }

        get(key){
            if(this._store.has(key)){
                let value = this._store.get(key);
                if(value){
                    let metaData = this._metaStore.get(value);
                    if(metaData.expired()){
                        this.debug('EXPIRED key %o delete', key);
                        this.delete(key);
                    }else{
                        this.debug('HIT key %o', key);
                        metaData.newHit();
                        return value;
                    }
                }
            }
            this.debug('MISS key %o', key);
        }

        getOrDefault(key, def){
            return this.get(key) || def;
        }

        keysForTrim(count){
            let trimKeys = [];
            let compare = [];
            for(let [key, value] of this._store){
                let metaData = this._metaStore.get(value);
                if(metaData.expired()){
                    trimKeys.push(key);
                    if(count === trimKeys.length){
                        break;
                    }
                }else{
                    compare.push({
                        key: key,
                        value: this._strategy.valueToCompare(metaData)
                    });
                }
            }

            let countLeft = count - trimKeys.length;
            if(countLeft > 0){
                compare = compare.sort((a, b) => this._strategy.compare(a.value, b.value));
                trimKeys = trimKeys.concat(compare.splice(0, countLeft).map(a => a.key));
            }

            return trimKeys;
        }

        keys(){
            return this._store.keys();
        }

        delete(key){
            return this._store.delete(key);
        }

        clear(){
            this._store.clear();
        }

        trimCount(spaceLeft){
            let bufferSize = Math.max(Math.round(this._config.maxSize / 100 * this._config.bufferSize), spaceLeft);
            return Math.min(Math.max(this.size - this._config.maxSize + bufferSize, 0), this.size);
        }

        trim(count){
            if(count > 0){
                let trimKeys = this.keysForTrim(count);
                if(count > trimKeys.length){
                    console.warn(' ↪ Failed to trim(%i) entries. Only %i in store', count, this.size);
                }
                this.debug(' ↪ DELETE min %i keys: %o', count, trimKeys);
                trimKeys.forEach(key => this.delete(key));
            }
        }

        status(){
            return {
                config: this._config,
                store: this._store,
                metaStore: this._metaStore
            };
        }

        static setStrategy(name){
            switch(name){
                case 'FIFO': return StrategyFIFO.create();
                case 'LFU': return StrategyLFU.create();
                case 'LRU': return StrategyLRU.create();
                default:
                    throw new ReferenceError('Unknown cache strategy name: ' + name);

            }
        }
    }

    Cache.defaultConfig = {
        name:       'Default',          // custom unique name for identification
        ttl:        3600,               // default ttl for cache entries
        maxSize:    600,                // max cache entries
        bufferSize: 10,                 // cache entry count in percent to be removed if maxSize reached
        strategy:   'FIFO',             // cache strategy policy
        debug:      false               // debug output in console
    };

    return Cache;
});
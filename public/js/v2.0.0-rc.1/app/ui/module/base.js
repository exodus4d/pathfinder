define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/util',
    'app/lib/cache',
    'app/promises/promise.deferred',
    'app/promises/promise.queue'
], ($, Init, Util, MapUtil, Cache, DeferredPromise, PromiseQueue) => {
    'use strict';

    /**
     * abstract BaseModel class
     * -> custom/plugin modules must extend from it
     * @type {BaseModule}
     */
    let BaseModule = class BaseModule {

        constructor(config= {}){
            if(new.target === BaseModule){
                throw new TypeError('Cannot construct ' + this.constructor.name + ' instances directly');
            }

            // check for abstract methods to be implemented in child
            if(this.render === undefined){
                throw new TypeError('Abstract method render() missing in ' + new.target.name + ' class');
            }

            this._config = Object.assign({}, BaseModule.defaultConfig, config);
            this._updateQueue = new PromiseQueue();
        }

        /**
         * get current module configuration
         * @returns {*}
         */
        get config(){
            return this._config;
        }

        /**
         * get root node for this module
         * -> parent container for custom body HTML
         * @returns {HTMLElement}
         */
        get moduleElement(){
            if(!this._moduleEl){
                // init new moduleElement
                this._moduleEl = Object.assign(document.createElement('div'), {
                    className: `${BaseModule.className} ${this._config.className}`,
                    style: {
                        opacity: '0'
                    }
                }).setData('module', this);

                this._moduleEl.dataset.position = this._config.position;
                this._moduleEl.dataset.module = this.constructor.name;

                // module header
                this._moduleEl.append(this.newHeaderElement());
            }
            return this._moduleEl;
        }

        /**
         * module header element
         * -> dragHandler + headline
         * @param text
         * @returns {HTMLDivElement}
         */
        newHeaderElement(text){
            let headEl = this.newHeadElement();
            headEl.append(
                this.newHandlerElement(),
                this.newHeadlineElement(text || this._config.headline)
            );
            return headEl;
        }

        /**
         * module head element
         * @returns {HTMLDivElement}
         */
        newHeadElement(){
            return Object.assign(document.createElement('div'), {
                className: this._config.headClassName
            });
        }

        /**
         * module dragHandler element
         * @returns {HTMLHeadingElement}
         */
        newHandlerElement(){
            return Object.assign(document.createElement('h5'), {
                className: this._config.handlerClassName
            });
        }

        /**
         * module headline element
         * @param text
         * @returns {HTMLHeadingElement}
         */
        newHeadlineElement(text){
            return Object.assign(document.createElement('h5'), {
                textContent: typeof text === 'string' ? text : ''
            });
        }

        /**
         * module toolbar element (wrapper)
         * @returns {HTMLHeadingElement}
         */
        newHeadlineToolbarElement(){
            return Object.assign(document.createElement('h5'), {
                className: 'pull-right'
            });
        }

        /**
         * icon element
         * @param cls
         * @returns {HTMLElement}
         */
        newIconElement(cls = []){
            return Object.assign(document.createElement('i'), {
                className: ['fas', ...cls].join(' ')
            });
        }

        /**
         * label element
         * @param text
         * @param cls
         * @returns {HTMLSpanElement}
         */
        newLabelElement(text, cls = []){
            let labelEl = document.createElement('span');
            labelEl.classList.add('label', 'center-block', ...cls);
            labelEl.textContent = text || '';
            return labelEl;
        }

        /**
         * control button element
         * @param text
         * @param cls
         * @param iconCls
         * @returns {HTMLDivElement}
         */
        newControlElement(text, cls = [], iconCls = ['fa-sync']){
            let controlEl = document.createElement('div');
            controlEl.classList.add(...[BaseModule.Util.config.dynamicAreaClass, this._config.controlAreaClass, ...cls]);
            controlEl.insertAdjacentHTML('beforeend', `&nbsp;&nbsp;${text}`);
            controlEl.prepend(this.newIconElement(iconCls));
            return controlEl;
        }

        /**
         * HTTP request handler for internal (Pathfinder) ajax calls
         * @param args
         * @returns {Promise}
         */
        request(...args){
            return BaseModule.Util.request(...args);
        }

        /**
         * scoped instance for LocalStore for current module
         * @returns {LocalStore}
         */
        getLocalStore(){
            if(!this._localStore){
                // make accessible -> scope Store keys!
                this._localStore = BaseModule.Util.getLocalStore('module');
                this._localStore.scope = this.constructor.name;
            }
            return this._localStore;
        }

        /**
         * visual notification handler (UI popover)
         * -> can be used for info/error on-screen messages
         * @param args
         */
        showNotify(...args){
            return BaseModule.Util.showNotify(...args);
        }

        /**
         * responsible for dispatching all incoming method calls
         * @param handler
         * @param data
         * @returns {*}
         */
        handle(handler, ...data){
            try{
                if(BaseModule.handler.includes(handler)){
                    // .. run module handler
                    let returnData = this[handler].apply(this, data);
                    if(returnData instanceof Promise){
                        // log returned Promise from handler call resolved
                        returnData.then(() => { this.logHandler(handler, 0);});
                    }
                    // log handler call
                    this.logHandler(handler);

                    return returnData;
                }else{
                    console.error('Error in module %o. Invalid handler %o', this.constructor.name, handler);
                }
            }catch(e){
                console.error('Error in module %o in handler %s() %o', this.constructor.name, handler, e);
            }
        }

        /**
         * log handler calls for this instance
         * -> can be helpful for debugging
         * @param handler
         * @param increment
         */
        logHandler(handler, increment = 1){
            if(increment){
                if(!this._config.logHandler){
                    this._config.logHandler = {};
                }

                this._config.logHandler[handler] = (this._config.logHandler[handler] || 0) + increment;
            }
        }

        /**
         * init module
         */
        init(){}

        /**
         * update module
         * @param data
         * @returns {Promise}
         */
        update(data){
            return this._updateQueue.enqueue(() => Promise.resolve(data), 'end', 'upd');
        }

        beforeHide(){}

        beforeDestroy(){
            $(this.moduleElement).destroyPopover(true);

            // destroy DataTable instances
            for(let table of $(this.moduleElement).find('table.dataTable')){
                $(table).DataTable().destroy(true);
            }
        }

        /**
         * events from 'Sortable' lib
         * @see https://github.com/SortableJS/Sortable
         * @param name
         * @param e
         */
        onSortableEvent(name, e){
            if(name === 'onUnchoose' && this._sortableChoosePromise){
                this._sortableChoosePromise.resolve();
            }

            if(name === 'onChoose' && !this._sortableChoosePromise){
                this._sortableChoosePromise = BaseModule.newDeferredPromise();
                this._updateQueue.enqueue(() => this._sortableChoosePromise.then(() => {
                    this._sortableChoosePromise = null;
                }), 'start');
            }
        }

        /**
         * get a unique cache key name for "source"/"target"-name
         * @param sourceName
         * @param targetName
         * @returns {string|boolean}
         */
        static getConnectionDataCacheKey(sourceName, targetName){
            let key = false;
            if(sourceName && targetName){
                // names can be "undefined" in case system is currently in drag/drop state
                // sort() is important -> ignore direction
                key = `con_` + `${ [String(sourceName).toLowerCase(), String(targetName).toLowerCase()].sort() }`.hashCode();
            }
            return key;
        }

        /**
         * get a connectionsData object that holds all connections for given mapIds (used as cache for route search)
         * @param mapIds
         * @returns {{}}
         */
        static getConnectionsDataFromMaps(mapIds){
            let data = {};
            for(let mapId of mapIds){
                let map = MapUtil.getMapInstance(mapId);
                if(map){
                    let cacheKey = `map_${mapId}`;
                    let cache = BaseModule.getCache('mapConnections');
                    let mapConnectionsData = cache.get(cacheKey);

                    if(!mapConnectionsData){
                        mapConnectionsData = this.getConnectionsDataFromConnections(mapId, map.getAllConnections());
                        // update cache
                        cache.set(cacheKey, mapConnectionsData);
                    }
                    Object.assign(data, mapConnectionsData);
                }
            }
            return data;
        }

        /**
         * get a connectionsData object for all connections
         * @param mapId
         * @param connections
         * @returns {{}}
         */
        static getConnectionsDataFromConnections(mapId = 0, connections = []){
            let data = {};
            if(connections.length){
                let connectionsData = MapUtil.getDataByConnections(connections);
                for(let connectionData of connectionsData){
                    let connectionDataCacheKey = BaseModule.getConnectionDataCacheKey(connectionData.sourceName, connectionData.targetName);

                    // skip double connections between same systems
                    if(connectionDataCacheKey && !Object.keys(data).includes(connectionDataCacheKey)){
                        data[connectionDataCacheKey] = {
                            map: {
                                id: mapId
                            },
                            connection: {
                                id: connectionData.id,
                                type: connectionData.type,
                                scope: connectionData.scope,
                                updated: connectionData.updated
                            },
                            source: {
                                id: connectionData.source,
                                name: connectionData.sourceName,
                                alias: connectionData.sourceAlias
                            },
                            target: {
                                id: connectionData.target,
                                name: connectionData.targetName,
                                alias: connectionData.targetAlias
                            }
                        };
                    }
                }
            }
            return data;
        }

        /**
         * search for a specific connection by "source"/"target"-name inside connectionsData cache
         * @param connectionsData
         * @param sourceName
         * @param targetName
         * @returns {*}
         */
        static findConnectionsData(connectionsData, sourceName, targetName){
            return this.Util.getObjVal(connectionsData, this.getConnectionDataCacheKey(sourceName, targetName));
        }

        /**
         * get fake connection data (default connection type in case connection was not found on a map)
         * @param sourceSystemData
         * @param targetSystemData
         * @param scope
         * @param types
         * @returns {{connection: {scope: string, id: number, type: [*]}, source: {name: number, alias: number, id: number}, target: {name: number, alias: number, id: number}}}
         */
        static getFakeConnectionData(sourceSystemData, targetSystemData, scope = 'stargate', types = []){
            return {
                connection: {
                    id: 0,
                    scope: scope,
                    type: types.length ? types : [MapUtil.getDefaultConnectionTypeByScope(scope)],
                    updated: 0
                },
                source: {
                    id: 0,
                    name: sourceSystemData.system,
                    alias: sourceSystemData.system
                },
                target: {
                    id: 0,
                    name: targetSystemData.system,
                    alias: targetSystemData.system
                }
            };
        }

        /**
         * get fake connection Element
         * @param connectionData
         * @returns {string}
         */
        static getFakeConnectionElement(connectionData){
            let mapId = this.Util.getObjVal(connectionData, 'map.id') || 0;
            let connectionId = this.Util.getObjVal(connectionData, 'connection.id') || 0;
            let scope = this.Util.getObjVal(connectionData, 'connection.scope') || '';
            let classes = MapUtil.getConnectionFakeClassesByTypes(this.Util.getObjVal(connectionData, 'connection.type') || []);
            let disabled = !mapId || !connectionId;

            let connectionElement = '<div data-mapId="' + mapId + '" data-connectionId="' + connectionId + '" ';
            connectionElement += (disabled ? 'data-disabled' : '');
            connectionElement += ' class="' + classes.join(' ') + '" ';
            connectionElement += ' title="' + scope + '" data-placement="bottom"></div>';
            return connectionElement;
        }

        /**
         * get static instance of in-memory Cache() store by 'name'
         * -> not persistent across page reloads
         * -> persistent across module instances (different and same maps)
         * @param name
         * @returns {Cache}
         */
        static getCache(name){
            let key = `CACHE-${name}`;
            if(!this.Util.getObjVal(this, key)){
                let configKey = `cacheConfig.${name}`;
                let cacheConfig = this.Util.getObjVal(this, configKey);
                if(!cacheConfig){
                    console.warn('Missing Cache config for %o. Expected at %o. Default config loaded…',
                        name, `${this.name}.${configKey}`
                    );
                    cacheConfig = {};
                }else{
                    // set cache name
                    cacheConfig.name = name;
                }

                this[key] = new Cache(cacheConfig);
            }
            return this[key];
        }

        static now(){
            return new Date().getTime() / 1000;
        }

        static getOrderPrio(){
            return this.isPlugin ?
                this.scopeOrder.indexOf('plugin') :
                (this.scopeOrder.indexOf(this.scope) !== -1 ?
                        this.scopeOrder.indexOf(this.scope) :
                        this.scopeOrder.length - 1
                );
        }

        static newDeferredPromise(){
            return new DeferredPromise();
        }
    };

    BaseModule.isPlugin = true;                             // module is defined as 'plugin'
    BaseModule.scope = 'system';                            // static module scope controls how module gets updated and what type of data is injected
    BaseModule.sortArea = 'a';                              // static default sortable area
    BaseModule.position = 0;                                // static default sort/order position within sortable area
    BaseModule.label = '???';                               // static module label (e.g. description)
    BaseModule.className = 'pf-module';                     // static CSS class name
    BaseModule.fullDataUpdate = false;                      // static module requires additional data (e.g. system description,...)
    BaseModule.Util = Util;                                 // static access to Pathfinders Util object

    BaseModule.scopeOrder = [
        'system',
        'connection',
        'global',
        'plugin',
        'undefined'
    ];

    BaseModule.handler = [
        'render',
        'init',
        'update',
        'beforeHide',
        'beforeDestroy',
        'onSortableEvent'
    ];

    BaseModule.cacheConfig = {
        mapConnections: {
            ttl: 5,
            maxSize: 600,
            debug: false
        }
    };

    BaseModule.defaultConfig = {
        position: 1,
        className: 'pf-base-module',                        // class for module
        headClassName: 'pf-module-head',                    // class for module header
        handlerClassName: 'pf-sortable-handle',             // class for "drag" handler
        sortTargetAreas: ['a', 'b', 'c'],                   // sortable areas where module can be dragged into
        headline: 'Base headline',                          // module headline
        bodyClassName: 'pf-module-body',                    // class for module body [optional: can be used]
        controlAreaClass: 'pf-module-control-area',         // class for "control" areas

        moduleHeadlineIconClass: 'pf-module-icon-button'    // class for toolbar icons in the head
    };

    return BaseModule;
});

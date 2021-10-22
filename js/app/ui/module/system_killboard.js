/**
 * System killboard module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'module/base',
    'app/map/util'
], ($, Init, Util, BaseModule, MapUtil) => {
    'use strict';

    let SystemKillboardModule = class SystemKillboardModule extends BaseModule {
        constructor(config = {}) {
            super(Object.assign({}, new.target.defaultConfig, config));
        }

        /**
         * module header
         * @param text
         * @returns {HTMLDivElement}
         */
        newHeaderElement(text){
            let headEl = super.newHeaderElement(text);

            // WebSocket status
            let wsStatusEl = Object.assign(document.createElement('h5'), {
                className: this._config.wsStatusWrapperClass
            });
            this._iconWsEl = this.newIconElement([
                'fa-circle', 'fa-fw', 'txt-color', this._config.wsStatusClass
            ]);
            wsStatusEl.append(this._iconWsEl);

            // toolbar
            let toolbarEl = this.newHeadlineToolbarElement();
            this._iconFilterEl = this.newIconElement([
                'fa-filter', 'fa-fw',
                this._config.moduleHeadlineIconClass
            ]);

            let iconKbEl = this.newIconElement([
                'fa-external-link-alt', 'fa-fw',
                this._config.moduleHeadlineIconClass
            ]);
            iconKbEl.setAttribute('title', 'zkillboard.com');
            iconKbEl.onclick = e => this.openKillboardUrl(e);
            
            let iconRegKbEl = this.newIconElement([
                'fa-map-marked-alt', 'fa-fw',
                this._config.moduleHeadlineIconClass
            ]);
            iconRegKbEl.setAttribute('title', 'zkillboard.com region');
            iconRegKbEl.onclick = e => this.openKillboardUrlRegion(e);

            toolbarEl.append(iconRegKbEl, iconKbEl, this._iconFilterEl);
            headEl.append(wsStatusEl, toolbarEl);

            return headEl;
        }

        /**
         * HTTP request
         * @param url
         * @returns {Promise}
         */
        request(url){
            return new Promise((resolve, reject) => {
                let handleResponse = response => {
                    return response.json()
                        .then((json) => {
                            if(!response.ok){
                                return Promise.reject(Object.assign({}, json, {
                                    status: response.status,
                                    statusText: response.statusText,
                                }));
                            }
                            return json;
                        });
                };

                fetch(url)
                    .then(handleResponse)
                    .then((result) => {
                        resolve(result);
                    }).catch((e) => {
                        console.error(url, e);

                        let title = e.status ? e.status : e;
                        let text = e.error ? e.error : url;
                        this.showNotify({title: title, text: text, type: 'error'});

                        reject(e);
                    }).finally(() => {
                        $(this.moduleElement).hideLoadingAnimation();
                    });
            });
        }

        /**
         * get zKillboard data
         * @returns {Promise}
         */
        getSystemKillsData(){
            // check for cached responses "short term cache"
            let cacheKey = SystemKillboardModule.getCacheKey('systemId', this._systemData.systemId);
            let result = SystemKillboardModule.getCache('zkb').get(cacheKey);
            if(result){
                // could also be an empty array!
                return Promise.resolve(result);
            }else{
                return new Promise(resolve => {
                    $(this.moduleElement).showLoadingAnimation();

                    // get kills within the last 24h
                    let timeFrameInSeconds = 60 * 60 * 24;

                    let url = `${Init.url.zKillboard}/npc/0/solarSystemID/${this._systemData.systemId}/pastSeconds/${timeFrameInSeconds}/`;

                    this.request(url).then(result => {
                        if(result.error){
                            // successful request with error response
                            this.showNotify({title: 'Data fetch() from zKillboard failed', text: result.error, type: 'error'});
                            return Promise.reject(result);
                        }else{
                            // zkb result needs to be cached and becomes reduced on "load more"
                            SystemKillboardModule.getCache('zkb').set(cacheKey, result);
                            return result;
                        }
                    }).then(result => resolve(result)).catch(e => {
                        console.error(e);
                        this.showNotify({title: 'Data fetch() from zKillboard failed', text: e, type: 'error'});
                    });
                });
            }
        }

        /**
         * render module
         * @param mapId
         * @param systemData
         * @returns {HTMLElement}
         */
        render(mapId, systemData){
            this._mapId = mapId;
            this._systemData = systemData;

            // request graph data and store result promise
            // -> module is not full rendered jet
            this._dataPromise = this.getSystemKillsData();

            this._bodyEl = Object.assign(document.createElement('div'), {
                className: this._config.bodyClassName
            });
            this.moduleElement.append(this._bodyEl);

            this.setModuleObserver();

            // init webSocket connection
            SystemKillboardModule.initWebSocket();

            return this.moduleElement;
        }

        /**
         * init module
         */
        init(){
            super.init();

            // subscribe this module instance to the zKB WebSocket
            SystemKillboardModule.subscribeToWS(this);
            this.updateWsStatus();

            // show "historic" killmails
            if(this._dataPromise instanceof Promise){
                this._dataPromise
                    .then(result => {
                        this._killboardLabelEl = this.newLabelElement('recent kills within the last hour', [
                            'label-warning', this._config.labelRecentKillsClass, 'hidden'
                        ]);

                        if(result.length){
                            // kills found
                            this._killboardEl = document.createElement('ul');
                            this._killboardEl.classList.add(this._config.systemKillboardListClass);

                            this._bodyEl.append(
                                this._killboardLabelEl,
                                this._killboardEl,
                                this.newControlElement('load more', [this._config.moduleHeadlineIconClass])
                            );

                            // set a "local" copy of all indexes from cached response
                            // -> this "local" array gets reduces when KM gets loaded
                            // -> manipulation does NOT affect cached data
                            this._tempZkbKillmailIndexes = Object.keys(result);

                            this.showKills(this._config.chunkCountKills);
                        }else{
                            // no kills found
                            this._bodyEl.append(
                                this.newLabelElement('No kills found within the last 24h', ['label-success'])
                            );
                        }
                })
                .catch(e => {
                    console.error(e);
                });
            }
        }

        beforeHide(){
            super.beforeHide();
            SystemKillboardModule.unsubscribeFromWS(this);
        }

        /**
         * load a chunk of killmails and render them
         * @param chunkSize
         */
        showKills(chunkSize){
            if(chunkSize){
                let cacheKey = SystemKillboardModule.getCacheKey('systemId', this._systemData.systemId);
                let result = SystemKillboardModule.getCache('zkb').get(cacheKey);

                if(
                    this._killboardEl.children.length < this._config.maxCountKillHistoric &&
                    (this._tempZkbKillmailIndexes || []).length &&
                    (result || []).length
                ){
                    // next killmail to load -> reduce "local" index array
                    let nextZkb = result[this._tempZkbKillmailIndexes.shift()];
                    if(nextZkb){
                        this.loadKillmailData({
                            killId: parseInt(nextZkb.killmail_id) || 0,
                            hash: nextZkb.zkb.hash
                        }, {
                            chunkSize: --chunkSize,
                            zkb: nextZkb.zkb
                        }, 'renderKillmail');
                    }else{
                        console.warn('Killmail not found in local zkb cache');
                    }
                }else{
                    // no more kills available OR max kills reached
                    this.moduleElement.querySelector('.' + this._config.controlAreaClass).style.display = 'none';
                }
            }
        }

        /**
         * get killmail data from ESI
         * @param requestData
         * @param context
         * @param callback
         */
        loadKillmailData(requestData, context, callback){
            let cacheKey = SystemKillboardModule.getCacheKey('killmail', requestData.killId);
            let cacheItem = SystemKillboardModule.getCache('killmail').get(cacheKey);
            if(cacheItem){
                // ... already cached -> show cache killmail
                this[callback](cacheItem.zkb, cacheItem.killmailData, cacheItem.systemData, context.chunkSize)
                    .then(payload => this.showKills(payload.data.chunkSize))
                    .catch(e => console.error(e));
            }else{
                // ...not cached -> request data
                let url = 'https://esi.evetech.net/latest/killmails/' + requestData.killId + '/' + requestData.hash + '/';

                this.request(url).then(killmailData => {
                    let systemData = SystemKillboardModule.getSystemDataForCache(this._systemData);
                    SystemKillboardModule.getCache('killmail').set(cacheKey, {zkb: context.zkb, killmailData: killmailData, systemData: systemData});

                    this[callback](context.zkb, killmailData, systemData, context.chunkSize)
                        .then(payload => this.showKills(payload.data.chunkSize))
                        .catch(e => console.error(e));
                }).catch(e => {
                    // request failed -> skip this and load next
                    console.warn(e);
                    this.showKills(context.chunkSize);
                });
            }
        }

        /**
         * @param zkb
         * @param attackersCount
         * @returns {{color: string, label: string}}
         */
        getAttackerBadgeData(zkb, attackersCount){
            let color, label;
            if(zkb.solo){
                color = '#5cb85c';
                label = 'solo';
            }else if(zkb.npc){
                color = '#d747d6';
                label = 'npc';
            }else if(attackersCount){
                color = '#adadad';
                label = attackersCount;
            }
            return {color, label};
        }

        /**
         * render a single killmail
         * @param zkbData
         * @param killmailData
         * @param systemData
         * @param chunkSize
         * @param position
         * @returns {Promise<any>}
         */
        renderKillmail(zkbData, killmailData, systemData, chunkSize, position = 'bottom'){
            return new Promise((resolve, reject) => {
                if(!this._killboardEl){
                    // killboard element might not be rendered at this point (e.g. if new kills pushed to WS)
                    return reject(new ReferenceError('Could not render killmail. KB element not found.'));
                }

                // calculate time diff in hours
                let serverDate = SystemKillboardModule.serverTime;
                let serverHours = serverDate.setHours(0,0,0,0);

                let killDate = Util.convertDateToUTC(new Date(killmailData.killmail_time));

                // get time diff
                let timeDiffMin = Math.round((serverDate - killDate) / 1000 / 60);
                let timeDiffHour = Math.floor(timeDiffMin / 60);

                let attackers = BaseModule.Util.getObjVal(killmailData, 'attackers') || [];
                let attackersCount = attackers.length;
                let attackerFinal = attackers.find(attacker => attacker.final_blow);


                let data = {
                    zkb: zkbData,
                    killmail: killmailData,
                    system: systemData,
                    isPodKill: BaseModule.Util.getObjVal(killmailData, 'victim.ship_type_id') === 670, // POD shipId
                    attackersCount: attackersCount,
                    attackerFinal: attackerFinal,
                    attackerBadge: this.getAttackerBadgeData(zkbData, attackersCount),
                    config: this._config,
                    zKillboardUrl: 'https://zkillboard.com',
                    ccpImageServerUrl: Init.url.ccpImageServer,
                    imgUrlType: () => {
                        return (val, render) => this.getImageUrl('types', parseInt(render(val)) || 0, 64);
                    },
                    imgUrlChar: () => {
                        return (val, render) => this.getImageUrl('characters', parseInt(render(val)) || 0);
                    },
                    imgUrlCorp: () => {
                        return (val, render) => this.getImageUrl('corporations', parseInt(render(val)) || 0);
                    },
                    imgUrlAlly: () => {
                        return (val, render) => this.getImageUrl('alliances', parseInt(render(val)) || 0);
                    },
                    dateFormat: () => {
                        return (val, render) => {
                            let killDate = Util.convertDateToUTC(new Date(render(val)));
                            let value = Util.convertDateToString(killDate);

                            // check whether log is new (today) ->
                            if(killDate.setHours(0,0,0,0) === serverHours){
                                // replace dd/mm/YYYY
                                value = 'today' + value.substring(10);
                            }

                            return  value;
                        };
                    },
                    iskFormat: () => {
                        return (val, render) => {
                            return Util.formatPrice(render(val));
                        };
                    },
                };

                requirejs(['text!templates/modules/killmail.html', 'mustache'], (template, Mustache) => {
                    // show hint for recent kills
                    this._killboardLabelEl.classList.toggle('hidden', !(timeDiffHour === 0 && this._killboardLabelEl));

                    // render killmail entry
                    let insertPos = ['append', 'beforeend'];
                    let animationPos = 'lastChild';
                    if(position === 'top'){
                        insertPos = ['prepend', 'afterbegin'];
                        animationPos = 'firstChild';
                    }

                    this._killboardEl.insertAdjacentHTML(insertPos[1], Mustache.render(template, data));

                    // animate kill li-element
                    $(this._killboardEl[animationPos]).velocity('transition.expandIn', {
                        display: 'flex',
                        complete: function(){
                            $(this).initTooltips();
                        }
                    }, {
                        display: 'flex'
                    });

                    resolve({
                        action: 'renderKillmail',
                        data: {
                            chunkSize: chunkSize
                        }
                    });
                });
            });
        }

        /**
         * remove last killmail list entry
         */
        removeKillmail(){
            if(this._killboardEl){
                let lastEl = this._nextToRemove || (this._listStreamHeadline ? this._listStreamHeadline.previousElementSibling : null) || this._killboardEl.lastChild;
                if(lastEl){
                    this._nextToRemove = lastEl.previousElementSibling;
                    this._killboardEl.removeChild(lastEl);
                }
            }
        }

        /**
         * get image src URL
         * @param resourceType
         * @param resourceId
         * @param size
         * @returns {string}
         */
        getImageUrl(resourceType, resourceId, size = 32){
            let url = '#';
            if(resourceId){
                url = BaseModule.Util.eveImageUrl(resourceType, resourceId, size);
            }
            return url;
        }

        /**
         * Li headline (devider)
         * @param text
         * @returns {HTMLLIElement}
         */
        newListItemHeadElement(text){
            let listHeadEl = Object.assign(document.createElement('li'), {
                className: ['flex-row', 'flex-between', 'media', this._config.systemKillboardListHeadClass].join(' ')
            });

            let iconDownEl = this.newIconElement(['fa-angle-double-down']);
            let iconUpEl = this.newIconElement(['fa-angle-double-up']);
            let headlineIconLeftEl = Object.assign(this.newHeadlineElement(), {
                className: 'flex-col'
            });
            let headlineIconRightEl = Object.assign(this.newHeadlineElement(), {
                className: 'flex-col'
            });
            headlineIconLeftEl.append(iconDownEl);
            headlineIconRightEl.append(iconUpEl);

            let headlineLeftEl = this.newHeadlineElement(text);
            headlineLeftEl.classList.add('flex-col', 'flex-grow', 'media-body');
            let headlineRightEl = this.newHeadlineElement('Killstream');
            headlineRightEl.classList.add('flex-col', 'flex-grow', 'media-body', 'text-right');

            listHeadEl.append(headlineIconLeftEl, headlineLeftEl, headlineRightEl, headlineIconRightEl);
            return listHeadEl;
        }

        /**
         * set module observer
         */
        setModuleObserver(){
            this.setFilterIconObserver();

            $(this.moduleElement).initTooltips({
                placement: 'top'
            });

            this.moduleElement.addEventListener('click', e => {
                if(e.target.closest('.' + this._config.controlAreaClass)){
                    e.stopPropagation();
                    this.showKills(this._config.chunkCountKills);
                }
            });
        }

        /**
         * init filter icon for WebSocket streams
         */
        setFilterIconObserver(){
            let cacheKey = `map_${this._mapId}.streams`;
            this.getLocalStore().getItem(cacheKey).then(streams => {
                if(!streams){
                    // not saved yet -> default streams
                    streams = ['system', 'map'];
                    this.getLocalStore().setItem(cacheKey, streams);
                }
                this._filterStreams = streams;

                let sourceOptions = [{
                    value: 'system',
                    text: `System (${this._systemData.name})`
                },{
                    value: 'map',
                    text: `Map (${BaseModule.Util.getObjVal(BaseModule.Util.getCurrentMapData(this._mapId), 'config.name')})`
                },{
                    value: 'all',
                    text: `All (New Eden)`
                }];

                $(this._iconFilterEl).editable({
                    // toggle: 'manual',
                    mode: 'popup',
                    type: 'checklist',
                    showbuttons: false,
                    onblur: 'submit',
                    highlight: false,
                    title: 'Streams',
                    placement: 'left',
                    pk: this._mapId,
                    value: this._filterStreams,
                    source: sourceOptions,
                    emptyclass: '',
                    emptytext: '',
                    display: function(value, sourceData){
                        // update filter badge
                        if(
                            value && sourceData &&
                            value.length < sourceData.length
                        ){
                            this.dataset.badge = String(value.length);
                        }else{
                            delete this.dataset.badge;
                        }
                    },
                    viewport: {
                        selector: this.moduleElement,
                        padding: 5
                    }
                });

                $(this._iconFilterEl).on('save', (e, params) => {
                    this.getLocalStore().setItem(cacheKey, params.newValue).then(streams => this._filterStreams = streams);
                });
            });
        }

        /**
         * open external zKillboard URL
         * @param e
         */
        openKillboardUrl(e){
            e.stopPropagation();
            window.open(`//zkillboard.com/system/${this._systemData.systemId}/`, '_blank');
        }

        /**
         * check if killmailData matches any killStream
         * @param killmailData
         * @returns {boolean}
         */
        filterKillmailByStreams(killmailData){
            let streams = this._filterStreams || [];
            return !!(streams.includes('all') ||
                (streams.includes('system') && this._systemData.systemId === killmailData.solar_system_id) ||
                (streams.includes('map') && MapUtil.getSystemData(this._mapId, killmailData.solar_system_id, 'systemId')));

        }

        /**
         * callback for WebSocket responses
         * @param zkbData
         * @param killmailData
         */
        onWsMessage(zkbData, killmailData){
            // check if killmail belongs to current filtered "streams"
            if(this.filterKillmailByStreams(killmailData)){
                
                if(!this._killboardEl){
                    // Remove label which indicates that there are no kills
                    let noKillsEl = this._bodyEl.querySelector('.label-success');
                    if(noKillsEl){
                        this._bodyEl.removeChild(noKillsEl);
                    }
                    
                    // Initialize necessary container nodes
                    this._killboardEl = document.createElement('ul');
                    this._killboardEl.classList.add(this._config.systemKillboardListClass);
                    
                    this._bodyEl.append(
                        this._killboardLabelEl,
                        this._killboardEl
                    );
                }
                
            
            
                // check max limit for WS kill entries
                this._countKillsWS = (this._countKillsWS || 0) + 1;
                if(this._countKillsWS > this._config.maxCountKillsWS){
                    // remove oldest KM
                    this.removeKillmail();
                }

                // add headline before first WS killmail gets added to top
                if(this._killboardEl && this._countKillsWS === 1){
                    this._listStreamHeadline = this.newListItemHeadElement(this._systemData.name);
                    this._killboardEl.prepend(this._listStreamHeadline);
                }

                // get systemData for killmailData
                // -> systemData should exist if KM belongs to any system on any map
                let systemData = MapUtil.getSystemData(this._mapId, killmailData.solar_system_id, 'systemId') || null;

                this.renderKillmail(zkbData, killmailData, systemData, 0, 'top')
                    .catch(e => console.warn(e));
            }
        }

        /**
         * update module with current WebSocket status
         */
        updateWsStatus(){
            let isSuccess = false;
            let isWarning = false;
            let isError = false;
            let title = 'unknown';
            switch(SystemKillboardModule.wsStatus){
                case 1: // connecting
                    title = 'connecting…';
                    isWarning = true;
                    break;
                case 2: // connected
                    title = 'connected';
                    isSuccess = true;
                    break;
                case 3: // error
                    title = 'error';
                    isError = true;
                    break;
                case 4: // close
                    title = 'closed';
                    isError = true;
                    break;
            }


            this._iconWsEl.classList.toggle('txt-color-green', isSuccess);
            this._iconWsEl.classList.toggle('txt-color-orange', isWarning);
            this._iconWsEl.classList.toggle('txt-color-red', isError);
            this._iconWsEl.setAttribute('title', title);

            $(this._iconWsEl).destroyTooltips().initTooltips({
                placement: 'top'
            });
        }

        /**
         * reduce full systemData to minimal data that should be cached with a KM
         * @param systemData
         * @returns {*}
         */
        static getSystemDataForCache(systemData){
            return systemData ? {id: systemData.systemId, name: systemData.name} : null;
        }

        /**
         * get all systems from all maps, that might be relevant for any cache stream
         * -> KMs belonging to any of these systems are cached
         * @returns {Object}
         */
        static getWsRelevantSystemsFromMaps(){
            let cacheKey = SystemKillboardModule.getCacheKey('tempSystemsData', 1);
            let systemsData = SystemKillboardModule.getCache('zkb').get(cacheKey);

            if(!systemsData){
                // KB cache ist for all maps (not just the current one)
                let mapsData = BaseModule.Util.getCurrentMapData() || [];
                systemsData = mapsData.reduce(
                    (accAll, mapData) => Object.assign(
                        accAll,
                        (BaseModule.Util.getObjVal(mapData, 'data.systems') || []).reduce(
                            (accMap, systemData) => Object.assign(
                                accMap,
                                {[systemData.systemId]: this.getSystemDataForCache(systemData)}
                            ), {})
                    ), {});

                SystemKillboardModule.getCache('zkb').set(cacheKey, systemsData);
            }
            return systemsData;
        }

        /**
         * cache WebSocket response if it is relevant for us
         * @param response
         * @returns {*[]}
         */
        static cacheWsResponse(response){
            let zkbData = response.zkb;
            delete response.zkb;
            let killmailData = response;
            let systemData = null;

            // check if killmailData is relevant (belongs to any system on any map
            let systemsData = this.getWsRelevantSystemsFromMaps();
            if(Object.keys(systemsData).map(systemId => parseInt(systemId)).includes(killmailData.solar_system_id)){
                // system is on map! -> cache
                systemData = BaseModule.Util.getObjVal(systemsData, String(killmailData.solar_system_id));
                let cacheKey = SystemKillboardModule.getCacheKey('killmail', killmailData.killmail_id);
                SystemKillboardModule.getCache('killmail').set(cacheKey, {
                    zkb: zkbData,
                    killmailData: killmailData,
                    systemData: systemData
                });
            }

            return [zkbData, killmailData];
        }

        /**
         * subscribe instance of Killboard module to WebSocket
         * @param module
         */
        static unsubscribeFromWS(module){
            SystemKillboardModule.wsSubscribtions = SystemKillboardModule.wsSubscribtions.filter(subscriber => subscriber !== module);
        }

        /**
         * unsubscribe instance of Killboard module to WebSocket
         * @param module
         */
        static subscribeToWS(module){
            if(
                !SystemKillboardModule.wsSubscribtions.includes(module)  &&
                module instanceof SystemKillboardModule
            ){
                SystemKillboardModule.wsSubscribtions.push(module);
            }
        }

        /**
         * init/connect to WebSocket if not already done
         */
        static initWebSocket(){
            if(!SystemKillboardModule.ws){
                SystemKillboardModule.ws = new WebSocket('wss://zkillboard.com/websocket/');
                SystemKillboardModule.wsStatus = 1;
            }

            let sendMessage = req => {
                SystemKillboardModule.ws.send(JSON.stringify(req));
            };

            SystemKillboardModule.ws.onopen = e => {
                SystemKillboardModule.wsStatus = 2;
                SystemKillboardModule.wsSubscribtions.forEach(subscriber => subscriber.updateWsStatus());

                sendMessage({action:'sub', channel:'killstream'});
            };

            SystemKillboardModule.ws.onmessage = e => {
                let response = JSON.parse(e.data);

                let [zkbData, killmailData] = this.cacheWsResponse(response);
                SystemKillboardModule.wsSubscribtions.forEach(subscriber => subscriber.onWsMessage(zkbData, killmailData));
            };

            SystemKillboardModule.ws.onerror = e => {
                SystemKillboardModule.wsStatus = 3;
                SystemKillboardModule.ws = null;
                SystemKillboardModule.wsSubscribtions.forEach(subscriber => subscriber.updateWsStatus());
            };

            SystemKillboardModule.ws.onclose = e => {
                SystemKillboardModule.wsStatus = 4;
                SystemKillboardModule.ws = null;
                SystemKillboardModule.wsSubscribtions.forEach(subscriber => subscriber.updateWsStatus());
            };
        }

        /**
         * get cache key
         * @param type
         * @param objId
         * @returns {string}
         */
        static getCacheKey(type, objId){
            if(
                typeof type === 'string' && type.length &&
                parseInt(objId)
            ){
                return `${type}_${objId}`;
            }
            throw new TypeError('Invalid cache key types');
        }
    };

    SystemKillboardModule.isPlugin = false;                                     // module is defined as 'plugin'
    SystemKillboardModule.scope = 'system';                                     // module scope controls how module gets updated and what type of data is injected
    SystemKillboardModule.sortArea = 'c';                                       // default sortable area
    SystemKillboardModule.position = 1;                                         // default sort/order position within sortable area
    SystemKillboardModule.label = 'Killboard';                                  // static module label (e.g. description)
    SystemKillboardModule.wsStatus = undefined;
    SystemKillboardModule.serverTime = BaseModule.Util.getServerTime();         // static Date() with current EVE server time
    SystemKillboardModule.wsSubscribtions = [];                                 // static container for all KB module instances (from multiple maps) for WS responses
    SystemKillboardModule.cacheConfig = {
        zkb: {                                                                  // cache for "zKillboard" responses -> short term cache
            ttl: 60 * 3,
            maxSize: 50
        },
        killmail: {                                                             // cache for "Killmail" data -> long term cache
            ttl: 60 * 30,
            maxSize: 500
        }
    };

    SystemKillboardModule.defaultConfig = {
        className: 'pf-system-killboard-module',                                // class for module
        sortTargetAreas: ['a', 'b', 'c'],                                       // sortable areas where module can be dragged into
        headline: 'Killboard',

        // system killboard list
        systemKillboardListClass: 'pf-system-killboard-list',                   // class for a list with kill entries
        systemKillboardListHeadClass: 'pf-system-killboard-list-head',          // class for a list entry headline
        systemKillboardListImgL: 'pf-system-killboard-img-l',                   // class for all large centered img (ship images)
        systemKillboardListImgM: 'pf-system-killboard-img-m',                   // class for all medium centered img (character logos)
        systemKillboardListImgS: 'pf-system-killboard-img-s',                   // class for all small top/bottom img (alliance/corp logos)

        wsStatusWrapperClass: 'pf-system-killboard-wsStatusWrapper',            // class for WebSocket "status" wrapper
        wsStatusClass: 'pf-system-killboard-wsStatus',                          // class for WebSocket "status" headline
        labelRecentKillsClass: 'pf-system-killboard-label-recent',              // class for "recent kills" label

        minCountKills: 5,
        chunkCountKills: 5,
        maxCountKillHistoric: 43,

        maxCountKillsWS: 150
    };

    return SystemKillboardModule;
});
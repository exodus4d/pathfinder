/**
 * Main map application
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/logging',
    'app/page',
    'app/counter',
    'app/map/worker',
    'app/map/util',
    'app/module_map',
    'app/key',
    'app/ui/form_element'
], ($, Init, Util, Logging, Page, Counter, MapWorker, MapUtil, ModuleMap) => {
    'use strict';

    // main update intervals/trigger (heartbeat)
    let updateTimeouts = {
        mapUpdate: 0,
        userUpdate: 0
    };

    // log keys -----------------------------------------------------------------------------------------------
    let logKeyServerMapData = Init.performanceLogging.keyServerMapData;
    let logKeyServerUserData = Init.performanceLogging.keyServerUserData;

    let initApp = rootEl => new Promise(resolve => {
        Page.renderPage(rootEl)
            .then(pageEls => {
                // passive event listener
                Util.initPassiveEvents();

                // clear sessionStorage
                //Util.clearSessionStorage();

                // set default tooltip config
                Util.initDefaultTooltipConfig(pageEls.pageEl);

                // set default popover config
                Util.initDefaultPopoverConfig(pageEls.pageEl);

                // set default confirmation popover config
                Util.initDefaultConfirmationConfig();

                // set default xEditable config
                Util.initDefaultEditableConfig(pageEls.pageEl);

                // set default select2 config
                Util.initDefaultSelect2Config();

                // set default dialog config
                Util.initDefaultBootboxConfig();

                // show app information in browser console
                Util.showVersionInfo();

                // init logging
                Logging.init();

                return Promise.resolve(pageEls);
            })
            .then(Page.loadPageStructure)
            .then(() => resolve(document.getElementById(Util.config.mapModuleId)));
    });

    /**
     * get static init data and store response
     * @returns {Promise<any>}
     */
    let initData = () => {

        /**
         * add wormhole size data for each wormhole
         * @param wormholes
         * @returns {*}
         */
        let addWormholeSizeData = wormholes => {
            for(let wormholeData of Object.values(wormholes)){
                wormholeData.class = Util.getSecurityClassForSystem(wormholeData.security);
                for(let sizeData of Object.values(Init.wormholeSizes)){
                    if(wormholeData.massIndividual >= sizeData.jumpMassMin){
                        wormholeData.size = sizeData;
                        break;
                    }
                }
            }
            return wormholes;
        };

        let initDataExecutor = (resolve, reject) => {
            $.getJSON(Init.path.initData).done(response => {
                if(response.error.length > 0){
                    for(let i = 0; i < response.error.length; i++){
                        Util.showNotify({
                            title: response.error[i].title,
                            text: response.error[i].message,
                            type: response.error[i].type
                        });
                    }
                }

                Init.timer              = response.timer;
                Init.mapTypes           = response.mapTypes;
                Init.mapScopes          = response.mapScopes;
                Init.connectionScopes   = response.connectionScopes;
                Init.systemStatus       = response.systemStatus;
                Init.systemType         = response.systemType;
                Init.wormholes          = addWormholeSizeData(response.wormholes);
                Init.characterStatus    = response.characterStatus;
                Init.routes             = response.routes;
                Init.url                = response.url;
                Init.plugin             = response.plugin;
                Init.character          = response.character;
                Init.slack              = response.slack;
                Init.discord            = response.discord;
                Init.structureStatus    = response.structureStatus;
                Init.universeCategories = response.universeCategories;
                Init.routeSearch        = response.routeSearch;

                resolve({
                    action: 'initData',
                    data: false
                });
            }).fail((jqXHR, status, error) => {
                reject({
                    action: 'shutdown',
                    data: {
                        jqXHR: jqXHR,
                        status: status,
                        error: error
                    }
                });
            });
        };

        return new Promise(initDataExecutor);
    };

    /**
     * get mapAccess Data for WebSocket subscription
     * @returns {Promise<any>}
     */
    let getMapAccessData = () => new Promise((resolve, reject) => {
        $.getJSON(Init.path.getAccessData).done(accessData => {
            resolve(accessData);
        }).fail((jqXHR, status, error) => {
            reject({
                action: 'shutdown',
                data: {
                    jqXHR: jqXHR,
                    status: status,
                    error: error
                }
            });
        });
    });

    /**
     * init DataTables plugin + dependencies + default config
     * @returns {Promise<any>}
     */
    let initDataTables = () => new Promise(resolve => {
        let payload = {
            action: 'initDataTables',
            data: false
        };

        require(['datatables.loader'], dtLoader => {
            dtLoader.initDefaultConfig({
                breakpoints: Init.breakpoints,
                onDestroy: table => {
                    // remove all active counters in table
                    Counter.destroyTimestampCounter(table, true);
                }
            }).then(() => resolve(payload));
        });
    });

    /**
     * init main mapModule
     * -> initData() needs to be resolved first!
     * @param mapModule
     * @returns {Promise<any>}
     */
    let initMapModule = mapModule => new Promise(resolve => {
        Promise.all([
            Page.initTabChangeObserver(),   // init browser tab change observer, Once the timers are available
            Page.renderMapContextMenus()    // init hidden context menu elements
        ]).then(() => {
            // initial start of the  map update function
            triggerMapUpdatePing(mapModule, true);
        }).then(() => resolve({
            action: 'initMapModule',
            data: false
        }));
    });

    /**
     * request all map access data (tokens) -> required wor WebSocket subscription
     * -> initData() needs to be resolved first!
     * @param mapModule
     * @param accessData
     * @returns {Promise<any>}
     */
    let initMapWorker = (mapModule, accessData) => new Promise((resolve, reject) => {
        let getPayload = command => ({
            action: 'initMapWorker',
            data: {
                syncStatus: Init.syncStatus.type,
                command: command
            }
        });

        if(accessData && accessData.status === 'OK'){
            // init SharedWorker for maps
            MapWorker.init({
                characterId: accessData.data.id,
                callbacks: {
                    onInit: (MsgWorkerMessage) => {
                        Util.setSyncStatus(MsgWorkerMessage.command);

                    },
                    onOpen: (MsgWorkerMessage) => {
                        Util.setSyncStatus(MsgWorkerMessage.command, MsgWorkerMessage.meta());
                        MapWorker.send('subscribe', accessData.data);

                        resolve(getPayload(MsgWorkerMessage.command));
                    },
                    onGet: (MsgWorkerMessage) => {
                        switch(MsgWorkerMessage.task()){
                            case 'mapUpdate':
                                Util.updateCurrentMapData(MsgWorkerMessage.data());
                                ModuleMap.updateMapModule(mapModule);
                                break;
                            case 'mapAccess':
                            case 'mapDeleted':
                                Util.deleteCurrentMapData(MsgWorkerMessage.data());
                                ModuleMap.updateMapModule(mapModule);
                                break;
                            case 'mapSubscriptions':
                                Util.updateCurrentMapUserData(MsgWorkerMessage.data());
                                ModuleMap.updateActiveMapUserData(mapModule);
                                break;
                        }

                        Util.setSyncStatus('ws:get');
                    },
                    onClosed: (MsgWorkerMessage) => {
                        Util.setSyncStatus(MsgWorkerMessage.command, MsgWorkerMessage.meta());
                        reject(getPayload(MsgWorkerMessage.command));

                    },
                    onError: (MsgWorkerMessage) => {
                        Util.setSyncStatus(MsgWorkerMessage.command, MsgWorkerMessage.meta());
                        reject(getPayload(MsgWorkerMessage.command));
                    }
                }
            });
        }else{
            reject(getPayload('Invalid mapAccessData'));
        }
    });

    /**
     * init 'beforeunload' event
     * @param mapModule
     * @returns {Promise<any>}
     */
    let initUnload = mapModule => new Promise(resolve => {

        /**
         * handles "final" map update request before window.unload event
         * -> navigator.sendBeacon browser support required
         *    ajax would not work here, because browsers might cancel the request!
         * @param mapModule
         */
        let mapUpdateUnload = mapModule => {
            // get updated map data
            let mapData = ModuleMap.getMapModuleDataForUpdate(mapModule);

            if(mapData.length){
                let fd = new FormData();
                fd.set('mapData', JSON.stringify(mapData));
                navigator.sendBeacon(Init.path.updateUnloadData, fd);

                console.info('Map update request send by: %O', navigator.sendBeacon);
            }
        };

        // Send map update request on tab close/reload, in order to save map changes that
        // haven´t been saved through default update trigger
        window.addEventListener('beforeunload', e => {
            // close "SharedWorker" connection
            MapWorker.close();

            // clear periodic update timeouts
            // -> this function will handle the final map update request
            clearUpdateTimeouts();

            // save unsaved map changes ...
            if(navigator.sendBeacon){
                mapUpdateUnload(mapModule);
            }else{
                // fallback if sendBeacon() is not supported by browser
                triggerMapUpdatePing();
            }

            // check if character should be switched on reload or current character should be loaded afterwards
            let characterSwitch = Boolean( $('body').data('characterSwitch') );
            if(!characterSwitch){
                let characterId = Util.getCurrentCharacterId();
                if(characterId){
                    Util.setCookie('old_char_id', characterId, 3, 's');
                }
            }

            // IMPORTANT, return false in order to not "abort" ajax request in background!
            return false;
        }, false);

        resolve({
            action: 'initUnload',
            data: false
        });
    });


    /**
     * clear both main update timeouts, and reset values
     * -> stop program from working -> shutdown
     */
    let clearUpdateTimeouts = () => {
        Object.keys(updateTimeouts).forEach(intervalKey => {
            clearTimeout(updateTimeouts[intervalKey]);
            updateTimeouts[intervalKey] = 0;
        });
    };


    // ping for main map update =======================================================================================
    /**
     * @param forceUpdateMapData // force request to be send
     * @param mapModule
     * @param forceUpdateMapData
     */
    let triggerMapUpdatePing = (mapModule, forceUpdateMapData) => {

        // check each interval if map module  is still available
        if(!mapModule){
            // program crash stop any update
            return;
        }

        // get updated map data
        let updatedMapData = {
            mapData: ModuleMap.getMapModuleDataForUpdate(mapModule),
            getUserData: Util.getCurrentUserData() ? 0 : 1
        };

        // check if mapUpdate trigger should be send
        // -> if "syncType" === "ajax" -> send always
        // -> if "syncType" === "webSocket" -> send initial AND on map changes
        if(
            forceUpdateMapData ||
            Util.getSyncType() === 'ajax' ||
            (
                Util.getSyncType() === 'webSocket' &&
                updatedMapData.mapData.length
            )
        ){
            // start log
            Util.timeStart(logKeyServerMapData);

            // store updatedMapData
            $.ajax({
                type: 'POST',
                url: Init.path.updateMapData,
                data: updatedMapData,
                dataType: 'json'
            }).done((data) => {
                // log request time
                let duration = Util.timeStop(logKeyServerMapData);
                Util.log(logKeyServerMapData, {duration: duration, type: 'server', description: 'request map data'});

                Util.setSyncStatus('ajax:get');

                if(
                    data.error &&
                    data.error.length > 0
                ){
                    // any error in the main trigger functions result in a user log-off
                    Util.triggerMenuAction(document, 'Logout');
                }else{
                    $(document).setProgramStatus('online');

                    if(data.userData !== undefined){
                        // store current user data global (cache)
                        Util.setCurrentUserData(data.userData);
                    }

                    // map data found
                    Util.setCurrentMapData(data.mapData);

                    // load/update main map module
                    ModuleMap.updateMapModule(mapModule).then(() => {
                        // map update done, init new trigger

                        // get the current update delay (this can change if a user is inactive)
                        let mapUpdateDelay = Util.getCurrentTriggerDelay(logKeyServerMapData, 0);

                        // init new trigger
                        initMapUpdatePing(mapModule, false);

                        // initial start for the userUpdate trigger
                        // this should only be called at the first time!
                        if(updateTimeouts.userUpdate === 0){
                            // start user update trigger after map loaded
                            updateTimeouts.userUpdate = setTimeout(() => {
                                triggerUserUpdatePing(mapModule);
                            }, 500);
                        }
                    });
                }

            }).fail(handleAjaxErrorResponse);
        }else{
            // skip this mapUpdate trigger and init next one
            initMapUpdatePing(mapModule, false);
        }
    };

    // ping for user data update ==============================================================================
    let triggerUserUpdatePing = mapModule => {

        // IMPORTANT: Get user data for ONE map that is currently visible
        // On later releases this can be easy changed to "full update" all maps for a user
        let mapId;
        let newSystemPositions = null;
        let locationToggle = document.getElementById(Util.config.headMapTrackingId);
        let activeMap = Util.getMapModule().getActiveMap();

        if(activeMap){
            mapId = activeMap.data('id');
            newSystemPositions = MapUtil.newSystemPositionsByMap(activeMap);
        }

        let updatedUserData = {
            mapIds: mapId ? [mapId] : [],
            getMapUserData: Util.getSyncType() === 'webSocket' ? 0 : 1,
            mapTracking: locationToggle ? locationToggle.checked | 0 : 0, // location tracking
            systemData: mapId ? Util.getCurrentSystemData(mapId) : []
        };

        if(newSystemPositions){
            updatedUserData.newSystemPositions = newSystemPositions;
        }

        Util.timeStart(logKeyServerUserData);

        $.ajax({
            type: 'POST',
            url: Init.path.updateUserData,
            data: updatedUserData,
            dataType: 'json'
        }).done((data) => {
            // log request time
            let duration = Util.timeStop(logKeyServerUserData);
            Util.log(logKeyServerUserData, {duration: duration, type: 'server', description:'request user data'});

            if(
                data.error &&
                data.error.length > 0
            ){
                // any error in the main trigger functions result in a user log-off
                Util.triggerMenuAction(document, 'Logout');
            }else{
                $(document).setProgramStatus('online');

                if(data.userData !== undefined){
                    // store current user data global (cache)
                    Util.setCurrentUserData(data.userData);

                    // update system info panels
                    if(data.system){
                        ModuleMap.updateSystemModulesData(mapModule, data.system);
                    }

                    // store current map user data (cache)
                    if(data.mapUserData !== undefined){
                        Util.setCurrentMapUserData(data.mapUserData);
                    }

                    // update map module character data
                    ModuleMap.updateActiveMapUserData(mapModule).then(() => {
                        // map module update done, init new trigger
                        initMapUserUpdatePing(mapModule);
                    });
                }
            }
        }).fail(handleAjaxErrorResponse);
    };

    /**
     * init (schedule) next MapUpdate Ping
     * @param mapModule
     * @param forceUpdateMapData
     */
    let initMapUpdatePing = (mapModule, forceUpdateMapData) => {
        // get the current update delay (this can change if a user is inactive)
        let delay = Util.getCurrentTriggerDelay(logKeyServerMapData, 0);

        updateTimeouts.mapUpdate = setTimeout((mapModule, forceUpdateMapData) => {
            triggerMapUpdatePing(mapModule, forceUpdateMapData);
        }, delay, mapModule, forceUpdateMapData);
    };

    /**
     * init (schedule) next MapUserUpdate Ping
     * @param mapModule
     */
    let initMapUserUpdatePing = mapModule => {
        // get the current update delay (this can change if a user is inactive)
        let delay = Util.getCurrentTriggerDelay(logKeyServerUserData, 0);

        updateTimeouts.userUpdate = setTimeout(mapModule => {
            triggerUserUpdatePing(mapModule);
        }, delay, mapModule);
    };

    /**
     * Ajax error response handler function for main-ping functions
     * @param jqXHR
     * @param status
     * @param error
     */
    let handleAjaxErrorResponse = (jqXHR, status, error) => {
        // clear both main update request trigger timer
        clearUpdateTimeouts();

        let reason = `${status} ${jqXHR.status}`;
        let firstError = error;
        let errorData = [];
        let redirect = false;   // redirect user to other page e.g. login
        let reload = true;      // reload current page (default: true)

        if(jqXHR.responseJSON){
            // handle JSON
            let responseObj = jqXHR.responseJSON;
            if(
                responseObj.error &&
                responseObj.error.length > 0
            ){
                firstError = responseObj.error[0].status;
                errorData = responseObj.error;
            }

            if(responseObj.reroute){
                redirect = responseObj.reroute;
            }
        }else{
            // handle HTML
            errorData.push({
                type: 'error',
                message: 'Please restart and reload this page'
            });
        }

        console.error(' ↪ %s Error response: %o', jqXHR.url, errorData);
        $(document).trigger('pf:shutdown', {
            status: jqXHR.status,
            reason: `${reason}: ${firstError}`,
            error: errorData,
            redirect: redirect,
            reload: reload
        });
    };

    // ================================================================================================================
    //  main thread -> init "map" page
    // ================================================================================================================
    // set default AJAX config
    Util.ajaxSetup();

    /**
     * run app
     * @param rootEl
     * @returns {Promise<any>}
     */
    let run = (rootEl = document.body) => new Promise(resolve => {
        // run all init functions for mainModule and WebSocket configuration async
        Promise.all([
            initApp(rootEl),
            initData(),
            getMapAccessData(),
            initDataTables(),
        ])
        .then(([mapModule, initData, accessData]) => Promise.all([
            initMapModule(mapModule),
            initMapWorker(mapModule, accessData),
            initUnload(mapModule)
        ]))
        .then(([payloadMapModule, payloadMapWorker]) => {
            // mapModule initialized and WebSocket configuration working
            console.ok('Client syncStatus: %s. %O resolved by command: %s!',
                payloadMapWorker.data.syncStatus,
                payloadMapWorker.action + '()',
                payloadMapWorker.data.command
            );
            resolve('OK');
        })
        .catch(payload => {
            switch(payload.action){
                case 'shutdown':
                    // ajax error
                    handleAjaxErrorResponse(payload.data.jqXHR, payload.data.status, payload.data.error);
                    break;
                case 'initMapWorker':
                    // WebSocket not working -> no error here -> fallback to Ajax
                    console.info('Client syncStatus: %s. %O rejected by command: %s! payload: %o',
                        payload.data.syncStatus,
                        payload.action + '()',
                        payload.data.command,
                        payload.data
                    );
                    break;
                default:
                    console.error('Unhandled error thrown while initialization: %o ', payload);
            }
        });
    });

    if(document.readyState === 'loading'){  // Loading hasn't finished yet
        document.addEventListener('DOMContentLoaded', run);
    }else{  // `DOMContentLoaded` has already fired
        run();
    }
});
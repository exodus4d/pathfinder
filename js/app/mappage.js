/**
 * Main map application
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/logging',
    'app/page',
    'app/map/worker',
    'app/module_map',
    'app/key',
    'app/ui/form_element'
], ($, Init, Util, Logging, Page, MapWorker, ModuleMap) => {

    'use strict';

    /**
     * main init "map" page
     */
    $(() => {
        Util.initPrototypes();

        // clear sessionStorage
        //Util.clearSessionStorage();

        // set default AJAX config
        Util.ajaxSetup();

        // set default dialog config
        Util.initDefaultBootboxConfig();

        // set default select2 config
        Util.initDefaultSelect2Config();

        // set default xEditable config
        Util.initDefaultEditableConfig();

        // load page
        Page.loadPageStructure();

        // show app information in browser console
        Util.showVersionInfo();

        // init logging
        Logging.init();

        let mapModule = $('#' + Util.config.mapModuleId);

        // main update intervals/trigger (heartbeat)
        let updateTimeouts = {
            mapUpdate: 0,
            userUpdate: 0
        };

        /**
         * clear both main update timeouts
         * -> stop program from working -> shutdown
         */
        let clearUpdateTimeouts = () => {
            for(let intervalKey in updateTimeouts){
                if(updateTimeouts.hasOwnProperty(intervalKey)){
                    clearTimeout(updateTimeouts[intervalKey]);
                }
            }
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

            let reason = status + ' ' + jqXHR.status + ': ' + error;
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
                reason: reason,
                error: errorData,
                redirect: redirect,
                reload: reload
            });
        };

        // map init functions =========================================================================================

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
                for(let [wormholeName, wormholeData] of Object.entries(wormholes)){
                    wormholeData.class = Util.getSecurityClassForSystem(wormholeData.security);

                    for(let [sizeName, sizeData] of Object.entries(Init.wormholeSizes)){
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
                    if( response.error.length > 0 ){
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
        let getMapAccessData = () => {

            let getMapAccessDataExecutor = (resolve, reject) => {
                $.getJSON(Init.path.getAccessData).done(response => {
                    resolve({
                        action: 'mapAccessData',
                        data: response
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

            return new Promise(getMapAccessDataExecutor);
        };

        /**
         * init main mapModule
         * -> initData() needs to be resolved first!
         * @param payload
         * @returns {Promise<any>}
         */
        let initMapModule = payload => {

            let initMapModuleExecutor = (resolve, reject) => {
                // init browser tab change observer, Once the timers are available
                Page.initTabChangeObserver();

                // init hidden context menu elements
                Page.renderMapContextMenus();

                // init map module
                mapModule.initMapModule();

                resolve({
                    action: 'initMapModule',
                    data: false
                });
            };

            return new Promise(initMapModuleExecutor);
        };

        /**
         * request all map access data (tokens) -> required wor WebSocket subscription
         * -> initData() needs to be resolved first!
         * @param payloadMapAccessData
         * @returns {Promise<any>}
         */
        let initMapWorker = payloadMapAccessData => {

            let initMapWorkerExecutor = (resolve, reject) => {
                let getPayload = command => {
                    return {
                        action: 'initMapWorker',
                        data: {
                            syncStatus: Init.syncStatus.type,
                            command: command
                        }
                    };
                };

                let validMapAccessData = false;

                if(payloadMapAccessData && payloadMapAccessData.action === 'mapAccessData'){
                    let response = payloadMapAccessData.data;
                    if(response.status === 'OK'){
                        validMapAccessData = true;

                        // init SharedWorker for maps
                        MapWorker.init({
                            characterId: response.data.id,
                            callbacks: {
                                onInit: (MsgWorkerMessage) => {
                                    Util.setSyncStatus(MsgWorkerMessage.command);

                                },
                                onOpen: (MsgWorkerMessage) => {
                                    Util.setSyncStatus(MsgWorkerMessage.command, MsgWorkerMessage.meta());
                                    MapWorker.send('subscribe', response.data);

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
                    }
                }

                if( !validMapAccessData ){
                    reject(getPayload('Invalid mapAccessData'));
                }
            };

            return new Promise(initMapWorkerExecutor);
        };

        // run all init functions for mainModule and WebSocket configuration async
        Promise.all([initData(), getMapAccessData()])
            .then(payload => Promise.all([initMapModule(payload[0]), initMapWorker(payload[1])]))
            .then(payload => {
                // mapModule initialized and WebSocket configuration working
                console.ok('Client syncStatus: %s. %O resolved by command: %s!',
                    payload[1].data.syncStatus,
                    payload[1].action + '()',
                    payload[1].data.command
                );
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

        /**
         * main function for init all map relevant trigger calls
         */
        $.fn.initMapModule = function(){
            let mapModule = $(this);

            // log keys -----------------------------------------------------------------------------------------------
            let logKeyServerMapData = Init.performanceLogging.keyServerMapData;
            let logKeyServerUserData = Init.performanceLogging.keyServerUserData;
            let locationToggle = $('#' + Util.config.headMapTrackingId);

            // ping for main map update ===============================================================================
            /**
             * @param forceUpdateMapData // force request to be send
             */
            let triggerMapUpdatePing = (forceUpdateMapData) => {

                // check each interval if map module  is still available
                let check = $('#' + mapModule.attr('id')).length;

                if(check === 0){
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
                                initMapUpdatePing(false);

                                // initial start for the userUpdate trigger
                                // this should only be called at the first time!
                                if(updateTimeouts.userUpdate === 0){
                                    // start user update trigger after map loaded
                                    updateTimeouts.userUpdate = setTimeout(() => {
                                        triggerUserUpdatePing();
                                    }, 1000);
                                }
                            });
                        }

                    }).fail(handleAjaxErrorResponse);
                }else{
                    // skip this mapUpdate trigger and init next one
                    initMapUpdatePing(false);
                }
            };

            // ping for user data update ==============================================================================
            let triggerUserUpdatePing = () => {

                // IMPORTANT: Get user data for ONE map that is currently visible
                // On later releases this can be easy changed to "full update" all maps for a user
                //
                let mapIds = [];
                let activeMap = Util.getMapModule().getActiveMap();
                if(activeMap){
                    mapIds = [ activeMap.data('id') ];
                }

                let updatedUserData = {
                    mapIds: mapIds,
                    getMapUserData: Util.getSyncType() === 'webSocket' ? 0 : 1,
                    mapTracking: locationToggle.is(':checked') ? 1 : 0, // location tracking
                    systemData: Util.getCurrentSystemData()
                };

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
                                initMapUserUpdatePing();
                            });
                        }
                    }

                }).fail(handleAjaxErrorResponse);
            };

            /**
             * init (schedule) next MapUpdate Ping
             */
            let initMapUpdatePing = (forceUpdateMapData) => {
                // get the current update delay (this can change if a user is inactive)
                let delay = Util.getCurrentTriggerDelay(logKeyServerMapData, 0);

                updateTimeouts.mapUpdate = setTimeout((forceUpdateMapData) => {
                    triggerMapUpdatePing(forceUpdateMapData);
                }, delay, forceUpdateMapData);
            };

            /**
             * init (schedule) next MapUserUpdate Ping
             */
            let initMapUserUpdatePing = () => {
                // get the current update delay (this can change if a user is inactive)
                let delay = Util.getCurrentTriggerDelay(logKeyServerUserData, 0);

                updateTimeouts.userUpdate = setTimeout(() => {
                    triggerUserUpdatePing();
                }, delay);
            };

            // initial start of the  map update function
            triggerMapUpdatePing(true);

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
            window.addEventListener('beforeunload', function(e){
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

        };

    });

});
/**
 * Main map application
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'app/logging',
    'app/page',
    'app/map/worker',
    'app/module_map',
    'app/key',
    'app/ui/form_element'
], ($, Init, Util, Render, Logging, Page, MapWorker, ModuleMap) => {

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

        // load page
        // load info (maintenance) info panel (if scheduled)
        $('body').loadPageStructure().setGlobalShortcuts();

        // show app information in browser console
        Util.showVersionInfo();

        // init logging
        Logging.init();

        let mapModule = $('#' + Util.config.mapModuleId);

        // map init load static data =======================================================
        $.getJSON( Init.path.initMap, (initData) => {


            if( initData.error.length > 0 ){
                for(let i = 0; i < initData.error.length; i++){
                    Util.showNotify({
                        title: initData.error[i].title,
                        text: initData.error[i].message,
                        type: initData.error[i].type
                    });
                }
            }

            Init.timer              = initData.timer;
            Init.mapTypes           = initData.mapTypes;
            Init.mapScopes          = initData.mapScopes;
            Init.connectionScopes   = initData.connectionScopes;
            Init.systemStatus       = initData.systemStatus;
            Init.systemType         = initData.systemType;
            Init.wormholes          = initData.wormholes;
            Init.characterStatus    = initData.characterStatus;
            Init.routes             = initData.routes;
            Init.url                = initData.url;
            Init.slack              = initData.slack;
            Init.discord            = initData.discord;
            Init.routeSearch        = initData.routeSearch;
            Init.programMode        = initData.programMode;

            // init tab change observer, Once the timers are available
            Page.initTabChangeObserver();

            // init map module
            mapModule.initMapModule();

            // load info (maintenance) info panel (if scheduled)
            if(Init.programMode.maintenance){
                $('body').showGlobalInfoPanel();
            }

        }).fail(( jqXHR, status, error) => {
            let reason = status + ' ' + jqXHR.status + ': ' + error;

            $(document).trigger('pf:shutdown', {status: jqXHR.status, reason: reason});
        });

        /**
         * request all map access data (tokens) -> required wor WebSocket subscription
         */
        let getMapAccessData = () => {
            $.getJSON( Init.path.getAccessData, ( response ) => {
                if(response.status === 'OK'){
                    // init SharedWorker for maps
                    MapWorker.init({
                        characterId:  response.data.id,
                        callbacks: {
                            onInit: (MsgWorkerMessage) => {
                                Util.setSyncStatus(MsgWorkerMessage.command);
                            },
                            onOpen: (MsgWorkerMessage) => {
                                Util.setSyncStatus(MsgWorkerMessage.command, MsgWorkerMessage.meta());

                                MapWorker.send( 'subscribe', response.data);
                            },
                            onGet: (MsgWorkerMessage) => {
                                switch(MsgWorkerMessage.task()){
                                    case 'mapUpdate':
                                        Util.updateCurrentMapData( MsgWorkerMessage.data() );
                                        ModuleMap.updateMapModule(mapModule);
                                        break;
                                    case 'mapAccess':
                                    case 'mapDeleted':
                                        Util.deleteCurrentMapData( MsgWorkerMessage.data() );
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
                            },
                            onError: (MsgWorkerMessage) => {
                                Util.setSyncStatus(MsgWorkerMessage.command, MsgWorkerMessage.meta());
                            }
                        }
                    });
                }
            });
        };

        getMapAccessData();

        /**
         * main function for init all map relevant trigger calls
         */
        $.fn.initMapModule = function(){

            let mapModule = $(this);

            // log keys ------------------------------------------------------------------------
            let logKeyServerMapData = Init.performanceLogging.keyServerMapData;
            let logKeyServerUserData = Init.performanceLogging.keyServerUserData;

            // main update intervals/trigger (heartbeat)
            let updateTimeouts = {
                mapUpdate: 0,
                userUpdate: 0
            };

            let locationToggle = $('#' + Util.config.headMapTrackingId);

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

                if(jqXHR.responseJSON){
                    // handle JSON
                    let errorObj = jqXHR.responseJSON;
                    if(
                        errorObj.error &&
                        errorObj.error.length > 0
                    ){
                        errorData = errorObj.error;
                    }
                }else{
                    // handle HTML
                    errorData.push({
                        type: 'error',
                        message: 'Please restart and reload this page'
                    });
                }

                $(document).trigger('pf:shutdown', {status: jqXHR.status, reason: reason, error: errorData});
            };

            // ping for main map update ========================================================
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
                    mapData: mapModule.getMapModuleDataForUpdate(),
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
                            $(document).trigger('pf:menuLogout');
                        }else{
                            $(document).setProgramStatus('online');

                            if(data.userData !== undefined) {
                                // store current user data global (cache)
                                Util.setCurrentUserData(data.userData);
                            }

                            // map data found
                            if(data.mapData !== undefined) {
                                // store current map data global (cache)
                                Util.setCurrentMapData(data.mapData);
                            }

                            // load/update main map module
                            ModuleMap.updateMapModule(mapModule).then(() => {
                                // map update done, init new trigger

                                // get the current update delay (this can change if a user is inactive)
                                let mapUpdateDelay = Util.getCurrentTriggerDelay( logKeyServerMapData, 0 );

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

            // ping for user data update =======================================================
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
                        $(document).trigger('pf:menuLogout');
                    }else{
                        $(document).setProgramStatus('online');

                        if(data.userData !== undefined){
                            // store current user data global (cache)
                            let userData = Util.setCurrentUserData(data.userData);

                            // update system info panels
                            if(data.system){
                                mapModule.updateSystemModuleData(data.system);
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

            /**
             * clear both main update timeouts
             * -> stop program from working -> shutdown
             */
            let clearUpdateTimeouts = () => {
                for(let intervalKey in updateTimeouts) {

                    if(updateTimeouts.hasOwnProperty(intervalKey)){
                        clearTimeout( updateTimeouts[intervalKey] );
                    }
                }
            };

            // initial start of the  map update function
            triggerMapUpdatePing(true);

            // Send map update request on tab close/reload, in order to save map changes that
            // haven´t been saved through default update trigger
            window.addEventListener('beforeunload', function(e) {
                // save unsaved map changes ...
                triggerMapUpdatePing();

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
            });

        };

    });

});
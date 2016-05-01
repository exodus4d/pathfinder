/**
 * Main map application
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'app/logging',
    'app/ccp',
    'app/page',
    'app/ui/form_element',
    'app/module_map'
], function($, Init, Util, Render, Logging, CCP, Page) {

    'use strict';

    /**
     * main init "map" page
     */
    $(function(){
        // load page
        $('body').loadPageStructure();

        // show app information in browser console
        Util.showVersionInfo();

        // init logging
        Logging.init();

        if( !CCP.isTrusted() ){
            // show trust message
            $(document).trigger('pf:showTrustDialog');
            return;
        }
        var mapModule = $('#' + Util.config.mapModuleId);

        // map init load static data =======================================================
        $.getJSON( Init.path.initMap, function( initData ) {


            if( initData.error.length > 0 ){
                for(var i = 0; i < initData.error.length; i++){
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
            Init.characterStatus    = initData.characterStatus;
            Init.maxSharedCount     = initData.maxSharedCount;
            Init.routes             = initData.routes;

            // init tab change observer, Once the timers are available
            Page.initTabChangeObserver();

            // init map module
            mapModule.initMapModule();

        }).fail(function( jqXHR, status, error) {
            var reason = status + ' ' + jqXHR.status + ': ' + error;

            $(document).trigger('pf:shutdown', {reason: reason});
        });

        /**
         * main function for init all map relevant trigger calls
         */
        $.fn.initMapModule = function(){

            var mapModule = $(this);

            // log keys ------------------------------------------------------------------------

            // ajax request update map data
            var logKeyServerMapData = 'UPDATE_SERVER_MAP';

            // update client map data
            var logKeyClientMapData = 'UPDATE_CLIENT_MAP';

            // ajax request update map user data
            var logKeyServerUserData = 'UPDATE_SERVER_USER_DATA';

            // update client map user data
            var logKeyClientUserData = 'UPDATE_CLIENT_USER_DATA';

            // main update intervals/trigger (heartbeat)
            var updateTimeouts = {
                mapUpdate: 0,
                userUpdate: 0
            };

            // ping for main map update ========================================================
            var triggerMapUpdatePing = function(){

                // check each execution time if map module  is still available
                var check = $('#' + mapModule.attr('id')).length;

                if(check === 0){
                    // program crash stop any update
                    return;
                }

                // get updated map data
                var updatedMapData = mapModule.getMapModuleDataForUpdate();

                // wrap array to object
                updatedMapData = {mapData: updatedMapData};

                // start log
                Util.timeStart(logKeyServerMapData);

                // store updatedMapData
                $.ajax({
                    type: 'POST',
                    url: Init.path.updateMapData,
                    data: updatedMapData,
                    dataType: 'json'
                }).done(function(data){

                    // log request time
                    var duration = Util.timeStop(logKeyServerMapData);
                    Util.log(logKeyServerMapData, {duration: duration, type: 'server', description: 'request map data'});

                    if(
                        data.error &&
                        data.error.length > 0
                    ){
                        // any error in the main trigger functions result in a user log-off
                        $(document).trigger('pf:menuLogout');
                    }else{

                        $(document).setProgramStatus('online');

                        if(data.mapData.length === 0){
                            // clear all existing maps
                            mapModule.clearMapModule();

                            // no map data available -> show "new map" dialog
                            $(document).trigger('pf:menuShowMapSettings', {tab: 'new'});
                        }else{
                            // map data found

                            // start log
                            Util.timeStart(logKeyClientMapData);

                            // load/update main map module
                            mapModule.updateMapModule(data.mapData);

                            // log client map update time
                            duration = Util.timeStop(logKeyClientMapData);
                            Util.log(logKeyClientMapData, {duration: duration, type: 'client', description: 'update map'});
                        }

                        // get the current update delay (this can change if a user is inactive)
                        var mapUpdateDelay = Util.getCurrentTriggerDelay( logKeyServerMapData, 0 );

                        // init new trigger
                        updateTimeouts.mapUpdate = setTimeout(function(){
                            triggerMapUpdatePing();
                        }, mapUpdateDelay);

                        // initial start for the userUpdate trigger
                        // this should only be called at the first time!
                        if(updateTimeouts.userUpdate === 0){

                            // start user update trigger after map loaded
                            updateTimeouts.userUpdate = setTimeout(function(){
                                 triggerUserUpdatePing();
                            }, 3000);
                        }
                    }

                }).fail(handleAjaxErrorResponse);
            };

            // ping for user data update =======================================================
            var triggerUserUpdatePing = function(){

                // IMPORTANT: Get user data for ONE map that is currently visible
                // On later releases this can be easy changed to "full update" all maps for a user
                //
                var mapIds = [];
                var activeMap = Util.getMapModule().getActiveMap();
                if(activeMap){
                    mapIds = [ activeMap.data('id') ];
                }

                var updatedUserData = {
                    mapIds: mapIds,
                    systemData: Util.getCurrentSystemData()
                };

                Util.timeStart(logKeyServerUserData);

                $.ajax({
                    type: 'POST',
                    url: Init.path.updateUserData,
                    data: updatedUserData,
                    dataType: 'json'
                }).done(function(data){

                    // log request time
                    var duration = Util.timeStop(logKeyServerUserData);
                    Util.log(logKeyServerUserData, {duration: duration, type: 'server', description:'request user data'});

                    if(data.error.length > 0){
                        // any error in the main trigger functions result in a user log-off
                        $(document).trigger('pf:menuLogout');
                    }else{

                        $(document).setProgramStatus('online');

                        if(data.userData !== undefined){
                            // store current user data global (cache)
                            var userData = Util.setCurrentUserData(data.userData);

                            if(userData.character === undefined){
                                // no active character found -> show settings dialog

                                Util.showNotify({title: 'Main character not set', text: 'Check your API data and set a main character', type: 'error'});

                                $(document).triggerMenuEvent('ShowSettingsDialog');
                            }

                            // store current map user data (cache)
                            if(data.mapUserData !== undefined){
                                Util.setCurrentMapUserData(data.mapUserData);
                            }

                            // start log
                            Util.timeStart(logKeyClientUserData);

                            // active character data found
                            mapModule.updateMapModuleData();

                            // log client user data update time
                            duration = Util.timeStop(logKeyClientUserData);
                            Util.log(logKeyClientUserData, {duration: duration, type: 'client', description:'update users'});

                            // update system info panels
                            if(data.system){
                                mapModule.updateSystemModuleData(data.system);
                            }

                            // get the current update delay (this can change if a user is inactive)
                            var mapUserUpdateDelay = Util.getCurrentTriggerDelay( logKeyServerUserData, 0 );

                            // init new trigger
                            updateTimeouts.userUpdate = setTimeout(function(){
                                triggerUserUpdatePing();
                            }, mapUserUpdateDelay);

                        }
                    }

                }).fail(handleAjaxErrorResponse);

            };

            /**
             * Ajax error response handler function for main-ping functions
             * @param jqXHR
             * @param status
             * @param error
             */
            var handleAjaxErrorResponse = function(jqXHR, status, error){
                // clear both main update request trigger timer
                clearUpdateTimeouts();

                var reason = status + ' ' + jqXHR.status + ': ' + error;
                var errorData = [];

                if(jqXHR.responseText){
                    var errorObj = $.parseJSON(jqXHR.responseText);

                    if(
                        errorObj.error &&
                        errorObj.error.length > 0
                    ){
                        errorData = errorObj.error;
                    }
                }

                $(document).trigger('pf:shutdown', {reason: reason, error: errorData});

            };

            /**
             * clear both main update timeouts
             * -> stop program from working -> shutdown
             */
            var clearUpdateTimeouts = function(){
                for(var intervalKey in updateTimeouts) {

                    if(updateTimeouts.hasOwnProperty(intervalKey)){
                        clearTimeout( updateTimeouts[intervalKey] );
                    }
                }
            };

            // initial start of the  map update function
            triggerMapUpdatePing();

        };

    });

});
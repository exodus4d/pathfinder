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

    $(function(){
        // load page
        $('body').loadPageStructure();

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

            Init.timer = initData.timer;
            Init.mapTypes = initData.mapTypes;
            Init.mapScopes = initData.mapScopes;
            Init.connectionScopes = initData.connectionScopes;
            Init.systemStatus = initData.systemStatus;
            Init.systemType = initData.systemType;
            Init.characterStatus = initData.characterStatus;
            Init.maxSharedCount = initData.maxSharedCount;

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

            var mapUpdateKey = 'MAP_UPDATE';
            var mapModuleDataKey = 'MAP_MODULE_DATA';
            var mapUserUpdateKey = 'USER_UPDATE';

            // ping for main map update ========================================================
            var triggerMapUpdatePing = function(){

                // check each execution time if map module  is still available
                var check = $('#' + mapModule.attr('id')).length;

                if(check === 0){
                    // program crash stop any update
                    return;
                }

                // get updated map data
                Util.timeStart(mapModuleDataKey);
                var updatedMapData = mapModule.getMapModuleData();
                var mapDataLogDuration = Util.timeStop(mapModuleDataKey);

                // log execution time
                Util.log(mapModuleDataKey, {duration: mapDataLogDuration, description: 'getMapModuleData'});

                // wrap array to object
                updatedMapData = {mapData: updatedMapData};

                // start log
                Util.timeStart(mapUpdateKey);

                // store updatedMapData
                $.ajax({
                    type: 'POST',
                    url: Init.path.updateMapData,
                    data: updatedMapData,
                    dataType: 'json'
                }).done(function(data){

                    if(
                        data.error &&
                        data.error.length > 0
                    ){
                        // anny error in the main trigger functions result in a user log-off
                        $(document).trigger('pf:menuLogout');
                    }else{

                        $(document).setProgramStatus('online');

                        if(data.mapData.length === 0){
                            // no map data available -> show "new map" dialog
                            $(document).trigger('pf:menuShowMapSettings', {tab: 'new'});
                        }else{
                            // map data found

                            // load map module
                            mapModule.updateMapModule(data.mapData);

                            // log execution time
                            var duration = Util.timeStop(mapUpdateKey);
                            Util.log(mapUpdateKey, {duration: duration, description: 'updateMapModule'});
                        }

                        // get the current update delay (this can change if a user is inactive)
                        var mapUpdateDelay = Util.getCurrentTriggerDelay( mapUpdateKey, 0 );

                        // init new trigger
                        setTimeout(function(){
                            triggerMapUpdatePing();
                        }, mapUpdateDelay);
                    }

                }).fail(function( jqXHR, status, error) {
                    var reason = status + ' ' + jqXHR.status + ': ' + error;

                    $(document).trigger('pf:shutdown', {reason: reason});
                });
            };

            triggerMapUpdatePing();

            // ping for user data update =======================================================
            var triggerUserUpdatePing = function(){

                var updatedUserData = {
                    systemData: Util.getCurrentSystemData()
                };

                Util.timeStart(mapUserUpdateKey);

                $.ajax({
                    type: 'POST',
                    url: Init.path.updateUserData,
                    data: updatedUserData,
                    dataType: 'json'
                }).done(function(data){

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

                                Util.showNotify({title: 'No main character found', text: 'Set up your main character', type: 'error'});

                                $(document).triggerMenuEvent('ShowSettingsDialog');
                            }else{
                                // active character data found
                                mapModule.updateMapModuleData(data);
                                var duration = Util.timeStop(mapUserUpdateKey);

                                // log execution time
                                Util.log(mapUserUpdateKey, {duration: duration, description:'updateMapModuleData'});

                                // get the current update delay (this can change if a user is inactive)
                                var mapUserUpdateDelay = Util.getCurrentTriggerDelay( mapUserUpdateKey, 0 );

                                // init new trigger
                                setTimeout(function(){
                                    triggerUserUpdatePing();
                                }, mapUserUpdateDelay);
                            }
                        }
                    }

                }).fail(function( jqXHR, status, error) {
                    var reason = status + ' ' + jqXHR.status + ': ' + error;

                    $(document).trigger('pf:shutdown', {reason: reason});
                });

            };


            // start user update trigger after map loaded
            setTimeout(function(){
               // triggerUserUpdatePing();
            }, 3000);

        };



    });

});
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
    'app/ui/form_element',
    'app/page',
    'app/module_map'
], function($, Init, Util, Render, Logging, CCP) {

    'use strict';

    var config = {
        mapModuleId: 'pf-map-module'
    };


    $(function(){
        // load page
        $('body').loadPageStructure();

        // init logging
        Logging.init();

        // page initialized event ==============================================================
        $('#' + config.mapModuleId).on('pf:initModule', function(){

            if(! CCP.isTrusted()){
                // show trust message
                $(document).trigger('pf:showTrustDialog');
                return;
            }



            var mapModule = $(this);

            // map init load static data =======================================================
            $.getJSON( Init.path.initMap, function( initData ) {

                Init.mapTypes = initData.mapTypes;
                Init.mapScopes = initData.mapScopes;
                Init.connectionScopes = initData.connectionScopes;
                Init.systemStatus = initData.systemStatus;
                Init.systemType = initData.systemType;
                Init.characterStatus = initData.characterStatus;

                // init map module
                mapModule.initMapModule();

            }).fail(function( jqXHR, status, error) {
                var reason = status + ' ' + jqXHR.status + ': ' + error;

                $(document).trigger('pf:shutdown', {reason: reason});
            });

        });

        /**
         * main function for init all map relevant trigger calls
         */
        $.fn.initMapModule = function(){

            var mapModule = $(this);

            var mapUpdateKey = 'mapUpdate';
            var mapUpdateDelay = Init.timer[mapUpdateKey].delay;

            var mapModuleDatakey = 'mapModuleData';

            var mapUserUpdateKey = 'userUpdate';
            var mapUserUpdateDelay = Init.timer[mapUserUpdateKey].delay;

            // ping for main map update ========================================================
            var triggerMapUpdatePing = function(){

                // check each execution time if map module  is still available
                var check = $('#' + mapModule.attr('id')).length;

                if(check === 0){
                    // program crash stop any update
                    return;
                }

                // get updated map data
                Util.timeStart(mapModuleDatakey);
                var updatedMapData = mapModule.getMapModuleData();
                var mapDataLogDuration = Util.timeStop(mapModuleDatakey);

                // log execution time
                Util.log(mapModuleDatakey, {duration: mapDataLogDuration, description: 'getMapModuleData'});

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
                }).done(function(mapData){

                    $(document).setProgramStatus('online');

                    if(mapData.length === 0){
                        // no map data available -> show "new map" dialog
                        $(document).trigger('pf:menuShowMapSettings');
                    }else{
                        // map data found

                        // load map module
                        mapModule.updateMapModule(mapData);

                        // log execution time
                        var duration = Util.timeStop(mapUpdateKey);
                        Util.log(mapUpdateKey, {duration: duration, description: 'updateMapModule'});
                    }
                    // init new trigger
                    setTimeout(function(){
                        triggerMapUpdatePing();
                    }, mapUpdateDelay);

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

                    $(document).setProgramStatus('online');

                    if(data.userData !== undefined){
                        // store current user data global (cache)
                        var userData = Util.setCurrentUserData(data.userData);

                        if(userData.character === undefined){
                            // no active character found -> show settings dialog
                            $(document).triggerMenuEvent('ShowSettingsDialog');
                        }else{
                            // active character data found

                            mapModule.updateMapModuleData(data);
                            var duration = Util.timeStop(mapUserUpdateKey);

                            // log execution time
                            Util.log(mapUserUpdateKey, {duration: duration, description:'updateMapModuleData'});


                            // init new trigger
                            setTimeout(function(){
                                triggerUserUpdatePing();
                            }, mapUserUpdateDelay);
                        }

                    }

                }).fail(function( jqXHR, status, error) {
                    var reason = status + ' ' + jqXHR.status + ': ' + error;

                    $(document).trigger('pf:shutdown', {reason: reason});
                });

            };


            // start user update trigger after map loaded
            setTimeout(function(){
                triggerUserUpdatePing();
            }, 2000);

        };



    });

});
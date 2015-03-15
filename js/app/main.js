/**
 * Main Application
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'app/logging',
    'app/ccp',
    'velocity',
    'velocityUI',
    'app/ui/form_element',
    'app/page',
    'app/module_map'
], function($, Init, Util, Render, Logging, CCP) {

    'use strict';

    var config = {
        mapModuleId: 'pf-map-module'
    };


    $(function() {
        //CCP.requestTrust();

        // init logging
        Logging.init();

        // load page
        $('body').loadPageStructure();

        // Map init options
        var mapData = [];

        /*
        var mapData =[{
            map: {},
            config: {
                id: 99,
                name: 'Polaris',
                scope: {
                    id: 1,
                    name: 'wh',
                    label: 'w-space'
                },
                icon: 'fa-globe',
                type: {
                    id: 1,
                    name: 'alliance',
                    label: 'Alliance'
                },
                updated: 1424545904
            },
            data: {
                systems: [
                    {
                        id: 2,
                        systemId: 31002378,
                        name: 'J150020',
                        alias: 'Polaris',
                        effect: 'magnetar',
                        type: {
                            id: 1,
                            name: 'wh'
                        },
                        security: 'C6',
                        trueSec: -1,
                        region: {
                            id: '11000030',
                            name: 'F-R00030'
                        },
                        constellation: {
                            id: '21000298',
                            name: 'F-C00298'
                        },
                        status: {
                            id: 2,
                            name: 'friendly'
                        },
                        locked: 1,
                        rally: 0,
                        position: {
                            x: 8,
                            y: 300
                        },
                        updated: 1420903681
                    },{
                        id: 3,
                        systemId: 31002375,
                        name: 'J115844',
                        alias: '',
                        effect: 'wolfRyet',
                        type: {
                            id: 1,
                            name: 'wh'
                        },
                        security: 'C6',
                        trueSec: -1,
                        region: {
                            id: '11000030',
                            name: 'F-R00030'
                        },
                        constellation: {
                            id: '21000298',
                            name: 'F-C00298'
                        },
                        status: {
                            id: 5,
                            name: 'empty'
                        },
                        position: {
                            x: 25,
                            y: 40
                        },
                        updated: 1420903681

                    },{
                        id: 4,
                        systemId: 31002402,
                        name: 'J155207',
                        alias: '',
                        effect: 'wolfRyet',
                        type: {
                            id: 1,
                            name: 'wh'
                        },
                        security: 'C6',
                        trueSec: -1,
                        region: {
                            id: '11000030',
                            name: 'F-R00030'
                        },
                        constellation: {
                            id: '21000301',
                            name: 'F-C00301'
                        },
                        status: {
                            id: 1,
                            name: 'unknown'
                        },
                        locked: '1',
                        rally: '1',
                        position: {
                            x: 203,
                            y: 60
                        },
                        updated: 1420903681
                    },{
                        id: 5,
                        systemId: 31002416,
                        name: 'J145510',
                        alias: '',
                        effect: 'pulsar',
                        security: 'C3',
                        trueSec: -1,
                        region: {
                            id: '11000030',
                            name: 'F-R00030'
                        },
                        constellation: {
                            id: '21000303',
                            name: 'F-C00303'
                        },
                        type: {
                            id: 1,
                            name: 'wh'
                        },
                        status: {
                            id: 4,
                            name: 'hostile'
                        },
                        position: {
                            x: 40,
                            y: 160
                        },
                        updated: 1420903681
                    },{
                        id: 542,
                        systemId: 30002979,
                        name: 'Tararan',
                        alias: '',
                        effect: '',
                        security: 'L',
                        trueSec: 0.3,
                        region: {
                            id: 10000036,
                            name: 'Devoid'
                        },
                        constellation: {
                            id: 20000436,
                            name: 'Jayai'
                        },
                        type: {
                            id: 2,
                            name: 'k-space'
                        },
                        status: {
                            id: 1,
                            name: 'unknown'
                        },
                        position: {
                            x: 280,
                            y: 250
                        },
                        updated: 1420903681
                    },{
                        id: 429,
                        systemId: 30000142,
                        name: 'Jita',
                        alias: '',
                        effect: '',
                        security: 'H',
                        trueSec: 0.9,
                        region: {
                            id: 10000002,
                            name: 'The Forge'
                        },
                        constellation: {
                            id: 20000020,
                            name: 'Kimotoro'
                        },
                        type: {
                            id: 2,
                            name: 'k-space'
                        },
                        status: {
                            id: 1,
                            name: 'unknown'
                        },
                        position: {
                            x: 400,
                            y: 150
                        },
                        updated: 1420903681
                    },{
                        id: 876,
                        systemId: 31000152,
                        name: 'J121418',
                        alias: '',
                        effect: '',
                        security: 'C1',
                        trueSec: -1,
                        region: {
                            id: 11000002,
                            name: 'A-R00002'
                        },
                        constellation: {
                            id: 21000002,
                            name: 'A-C00002'
                        },
                        type: {
                            id: 1,
                            name: 'wh'
                        },
                        status: {
                            id: 3,
                            name: 'occupied'
                        },
                        position: {
                            x: 600,
                            y: 75
                        },
                        updated: 1420903681
                    },{
                        id: 755,
                        systemId: 30000144,
                        name: 'Perimeter',
                        alias: '',
                        effect: '',
                        security: 'H',
                        trueSec: 0.9,
                        region: {
                            id: 10000002,
                            name: 'The Forge'
                        },
                        constellation: {
                            id: '20000020',
                            name: 'Kimotoro'
                        },
                        type: {
                            id: 2,
                            name: 'k-space'
                        },
                        status: {
                            id: 6,
                            name: 'unscanned'
                        },
                        position: {
                            x: 550,
                            y: 200
                        },
                        updated: 1420903681
                    },{
                        id: 8555,
                        systemId: 30001028,
                        name: 'RMOC-W',
                        alias: '',
                        effect: '',
                        security: '0.0',
                        trueSec: -0.1,
                        region: {
                            id: 10000012,
                            name: 'Curse'
                        },
                        constellation: {
                            id: '20000150',
                            name: 'Sound'
                        },
                        type: {
                            id: 2,
                            name: 'k-space'
                        },
                        status: {
                            id: 1,
                            name: 'unknown'
                        },
                        position: {
                            x: 500,
                            y: 300
                        },
                        updated: 1420903681
                    }

                ],
                connections: [
                    {
                        id: 2,
                        source: 2,
                        target: 5,
                        scope: 'wh',
                        type: [
                            'wh_reduced'
                        ],
                        updated: 1420903681
                    },{
                        id: 3,
                        source: 5,
                        target: 4,
                        scope: 'wh',
                        type: [
                            'wh_fresh',
                            'frigate'
                        ],
                        updated: 1420903681
                    },{
                        id: 5,
                        source: 3,
                        target: 4,
                        scope: 'wh',
                        type: [
                            'wh_critical'
                        ],
                        updated: 1420903681
                    },
                    {
                        id: 77,
                        source: 4,
                        target: 542,
                        scope: 'wh',
                        type: [
                            'wh_critical'
                        ],
                        updated: 1420903681
                    },
                    {
                        id: 95,
                        source: 4,
                        target: 429,
                        scope: 'wh',
                        type: [
                            'wh_eol',
                            'wh_reduced',
                            'preserve_mass'
                        ],
                        updated: 1420903681
                    },
                    {
                        id: 96,
                        source: 429,
                        target: 755,
                        scope: 'wh',
                        type: [
                            'wh_fresh'
                        ],
                        updated: 1420903681
                    },
                    {
                        id: 97,
                        source: 429,
                        target: 876,
                        scope: 'stargate',
                        type: [
                            'stargate'
                        ],
                        updated: 1420903681
                    },
                    {
                        id: 98,
                        source: 542,
                        target: 8555,
                        scope: 'jumpbridge',
                        type: [
                            'jumpbridge'
                        ],
                        updated: 1420903681
                    }
                ]
            }
        },
            {
            map: {},
            config: {
                name: 'Providence',
                id: 2,
                scope: {
                    id: 1,
                    name: 'wh',
                    label: 'w-space'
                },
                icon: 'fa-bookmark',
                type: {
                    id: 3,
                    name: 'global',
                    label: 'global'
                },
                updated: 1424545903
            },
            data: {
                systems: [
                    {
                        id: 755,
                        systemId: 30000144,
                        name: 'Perimeter',
                        alias: '',
                        effect: '',
                        security: 'H',
                        trueSec: 0.9,
                        region: {
                            id: 10000002,
                            name: 'The Forge'
                        },
                        constellation: {
                            id: '20000020',
                            name: 'Kimotoro'
                        },
                        type: {
                            id: 2,
                            name: 'k-space'
                        },
                        status: {
                            id: 6,
                            name: 'unscanned'
                        },
                        position: {
                            x: 550,
                            y: 200
                        },
                        updated: 1420903681
                    },{
                        id: 8555,
                        systemId: 30001028,
                        name: 'RMOC-W',
                        alias: '',
                        effect: '',
                        security: '0.0',
                        trueSec: -0.1,
                        region: {
                            id: 10000012,
                            name: 'Curse'
                        },
                        constellation: {
                            id: '20000150',
                            name: 'Sound'
                        },
                        type: {
                            id: 2,
                            name: 'k-space'
                        },
                        status: {
                            id: 1,
                            name: 'unknown'
                        },
                        position: {
                            x: 500,
                            y: 300
                        },
                        updated: 1420903681
                    }
                ],
                connections: [{
                    id: 23,
                    source: 755,
                    target: 8555,
                    type: [
                        'wh_fresh'
                    ],
                    updated: 1420903681
                }]
            }
        },
        {
            map: {},
            config: {
                name: 'Exodus 4D',
                id: 3,
                scope: {
                    id: 1,
                    name: 'wh',
                    label: 'w-space'
                },
                icon: 'fa-sitemap',
                type: {
                    id: 2,
                    name: 'private',
                    label: 'private'
                },
                updated: 1424545903
            },
            data: {
                systems: [],
                connections: []
            }
        }];
*/

        // current user Data for a map
        var tempUserData ={
            currentUserData: {
                ship: 'Legion',
                name: 'Exodus 4D',
                system: {
                    name: 'J115844',
                    id: 4
                }
            },
            mapUserData: [ // user Data for all maps
                {
                    config: {   // map config
                        id: 99   // map id
                    },
                    data: {
                        systems:[   // systems in map
                            {
                                id: 4,  // system id
                                user: [
                                    {
                                        id: 3,
                                        name: 'Exodus 4D',
                                        ship: {
                                            id: 55,
                                            name: 'Legion'
                                        },
                                        status: 'corp'
                                    }
                                ]
                            },
                            {
                                id: 5,  // system id
                                user: [
                                    {
                                        id: 4,
                                        name: 'Faye Fantastic',
                                        ship: {
                                            id: 56,
                                            name: 'Armageddon'
                                        },
                                        status: 'ally'
                                    },{
                                        id: 5,
                                        name: 'Sibasomos',
                                        ship: {
                                            id: 57,
                                            name: 'Proteus'
                                        },
                                        status: 'corp'
                                    },{
                                        id: 6,
                                        name: 'Xtrah',
                                        ship: {
                                            id: 58,
                                            name: 'Pod'
                                        },
                                        status: 'ally'
                                    }
                                ]
                            }
                        ]
                    }
                },{
                    config: {   // map config
                        id: 128   // map id
                    },
                    data: {
                        systems:[   // systems in map
                            {
                                id: 8597,  // system id
                                user: [
                                    {
                                        id: 6,
                                        name: 'Exodus 6D Gidrine',
                                        ship: {
                                            id: 69,
                                            name: 'Tengu'
                                        },
                                        status: 'corp'
                                    }
                                ]
                            }
                        ]
                    }
                }
            ]};

        // update map module ========================================
        $('#' + config.mapModuleId).on('pf:initModule', function(){

            var mapModule = $(this);

            // map init load static data ==================================
            $.getJSON( Init.path.initMap, function( initData ) {

                Init.mapTypes = initData.mapTypes;
                Init.mapScopes = initData.mapScopes;
                Init.connectionScopes = initData.connectionScopes;
                Init.systemStatus = initData.systemStatus;
                Init.systemType = initData.systemType;

                // init map module
                mapModule.initMapModule();

            }).fail(function( jqXHR, status, error) {
                var reason = status + ' ' + jqXHR.status + ': ' + error;
                Util.emergencyShutdown(reason);
            });

        });


        $.fn.initMapModule = function(){

            var mapModule = $(this);

            var mapUpdateKey = 'mapUpdate';
            var mapUpdateDelay = Init.timer[mapUpdateKey].delay;

            var mapModuleDatakey = 'mapModuleData';

            var mapUserUpdateKey = 'userUpdate';
            var mapUserUpdateDelay = Init.timer[mapUserUpdateKey].delay;

            // ping for main map update
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
                        $(document).trigger('pf:menuEditMap', {newMap: true});
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

                    Util.emergencyShutdown(reason);
                });


            };

            triggerMapUpdatePing([]);

            // ping for user data update -------------------------------------------------------
            var triggerUserUpdatePing = function(userData){

                $(document).setProgramStatus('online');

                Util.timeStart(mapUserUpdateKey);
              //  mapModule.updateMapModuleData(userData);
                var duration = Util.timeStop(mapUserUpdateKey);

                // log execution time
                Util.log(mapUserUpdateKey, {duration: duration, description:'updateMapModuleData'});

                // init new trigger
                setTimeout(function(){
                    triggerUserUpdatePing(tempUserData);
                }, mapUserUpdateDelay);
            };

            // start user update trigger after map loaded
            setTimeout(function(){
                triggerUserUpdatePing(tempUserData);
            }, 2000);

        };



    });

});
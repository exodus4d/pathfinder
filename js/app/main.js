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
        var mapData =[{
            map: {},
            config: {
                id: 99,
                name: 'Polaris',
                scope: 'wormhole',
                icon: 'fa-globe',
                type: 'alliance'              // global, alliance, private
            },
            data: {
                systems: [
                    {
                        id: 2,
                        systemId: 31002378,
                        name: 'J150020',
                        alias: 'Polaris',
                        effect: 'magnetar',
                        type: 'wh',
                        security: 'C6',
                        trueSec: -1,
                        status: 'friendly',
                        locked: '1',
                        rally: '0',
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
                        type: 'wh',
                        security: 'C6',
                        trueSec: -1,
                        status: 'empty',
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
                        type: 'wh',
                        security: 'C6',
                        trueSec: -1,
                        status: '',
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
                        type: 'wh',
                        status: 'hostile',
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
                            id: '10000036',
                            name: 'Devoid'
                        },
                        constellation: {
                            id: '20000436',
                            name: 'Jayai'
                        },
                        type: 'k-space',
                        status: '',
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
                            id: '10000002',
                            name: 'The Forge'
                        },
                        constellation: {
                            id: '20000020',
                            name: 'Kimotoro'
                        },
                        type: 'k-space',
                        status: '',
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
                            id: '11000002',
                            name: 'A-R00002'
                        },
                        constellation: {
                            id: '21000002',
                            name: 'A-C00002'
                        },
                        type: 'wh',
                        status: 'occupied',
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
                            id: '10000002',
                            name: 'The Forge'
                        },
                        constellation: {
                            id: '20000020',
                            name: 'Kimotoro'
                        },
                        type: 'k-space',
                        status: 'unscanned',
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
                            id: '10000012',
                            name: 'Curse'
                        },
                        constellation: {
                            id: '20000150',
                            name: 'Sound'
                        },
                        type: 'k-space',
                        status: '',
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
                scope: 'wormhole',
                icon: 'fa-bookmark',
                type: 'global'
            },
            data: {
                systems: [
                    {
                        id: 50,
                        systemId: 31002378,
                        name: 'J150020',
                        alias: '',
                        effect: 'magnetar',
                        security: 'C6',
                        type: 'wh',
                        status: 'friendly',
                        position: {
                            x: 5,
                            y: 200
                        },
                        updated: 1420903681
                    },{
                        id: 51,
                        systemId: 31002375,
                        name: 'J115844',
                        alias: '',
                        effect: 'wolfRyet',
                        security: 'C6',
                        type: 'wh',
                        status: 'empty',
                        position: {
                            x: 60,
                            y: 65
                        },
                        updated: 1420903681
                    }
                ],
                connections: [{
                    id: 23,
                    source: 50,
                    target: 51,
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
                scope: 'wormhole',
                icon: 'fa-sitemap',
                type: 'private'
            },
            data: {
                systems: [],
                connections: []
            }
        }];


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
                        id: 2   // map id
                    },
                    data: {
                        systems:[   // systems in map
                            {
                                id: 50,  // system id
                                user: [
                                    {
                                        id: 6,
                                        name: 'Schleiferius',
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

            var mapDataUpdateActive = true;         // allow update "map data"
            var userDataUpdateActive = true;        // allow update "user data"

            var mapUpdateKey = 'mapUpdate';
            var mapUpdateDelay = Init.timer[mapUpdateKey].delay;

            var mapModuleDatakey = 'mapModuleData';

            var mapUserUpdateKey = 'userUpdate';
            var mapUserUpdateDelay = Init.timer[mapUserUpdateKey].delay;

            // ping for main map update
            var triggerMapUpdatePing = function(tempMapData){

                // check each execution time if map module  is still available
                var check = $('#' + mapModule.attr('id')).length;

                if(check === 0){
                    // program crash stop any update
                    return;
                }

                $(document).setProgramStatus('online');

                Util.timeStart(mapUpdateKey);
                // load map module ==========================================
                mapModule.updateMapModule(tempMapData);
                var duration = Util.timeStop(mapUpdateKey);

                // log execution time
                Util.log(mapUpdateKey, {duration: duration, description: 'updateMapModule'});

                // get updated map data
                Util.timeStart(mapModuleDatakey);
                var newMapData = mapModule.getMapModuleData();
                var mapDataLogDuration = Util.timeStop(mapModuleDatakey);
console.log(newMapData)
                // log execution time
                Util.log(mapModuleDatakey, {duration: mapDataLogDuration, description: 'getMapModuleData'});

                //
                setTimeout(function(){
                    triggerMapUpdatePing(mapData);
                }, mapUpdateDelay);

            };

            triggerMapUpdatePing(mapData);

            // ping for user data update -------------------------------------------------------
            var triggerUserUpdatePing = function(userData){

                // prevent multiple requests simultaneously
                if(userDataUpdateActive === true){
                    $(document).setProgramStatus('online');

                    userDataUpdateActive = false;

                    Util.timeStart(mapUserUpdateKey);
                    userDataUpdateActive = mapModule.updateMapModuleData(userData);
                    var duration = Util.timeStop(mapUserUpdateKey);

                    // log execution time
                    Util.log(mapUserUpdateKey, {duration: duration, description:'updateMapModuleData'});


                }else{
                    // not finished in time -> to slow or error
                    $(document).setProgramStatus('problem');
                }

            };
            setInterval(triggerUserUpdatePing, mapUserUpdateDelay, tempUserData);

        });


    });

});
/**
 * Main Application
 */

define([
    'jquery',
    'app/init',
    'app/render',
    'app/ccp',
    'app/page',
    'app/module_map'
], function($, Init, Render, CCP) {

    'use strict';

    var config = {
        mapModuleId: 'pf-map-module'
    };


    $(function() {
        CCP.requestTrust();

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
                        id: 30002979,
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
                        id: 30000142,
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
                        id: 31000152,
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
                        id: 30000144,
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
                        id: 30001028,
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
                        target: 30002979,
                        scope: 'wh',
                        type: [
                            'wh_critical'
                        ],
                        updated: 1420903681
                    },
                    {
                        id: 95,
                        source: 4,
                        target: 30000142,
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
                        source: 30000142,
                        target: 31000152,
                        scope: 'wh',
                        type: [
                            'wh_fresh'
                        ],
                        updated: 1420903681
                    },
                    {
                        id: 97,
                        source: 30000142,
                        target: 30000144,
                        scope: 'stargate',
                        type: [
                            'stargate'
                        ],
                        updated: 1420903681
                    },
                    {
                        id: 98,
                        source: 30002979,
                        target: 30001028,
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
                        name: 'J150020',
                        alias: '',
                        effect: 'magnetar',
                        security: 'C6',
                        type: 'wh',
                        status: 'friendly',
                        position: {
                            x: 5,
                            y: 7
                        },
                        updated: 1420903681
                    },{
                        id: 51,
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
        var userData ={
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
                                        name: 'Exodus 4D',
                                        ship: 'Legion',
                                        status: 'corp'
                                    }
                                ]
                            },
                            {
                                id: 5,  // system id
                                user: [
                                    {
                                        name: 'Faye Fantastic',
                                        ship: 'Armageddon',
                                        status: 'ally'
                                    },{
                                        name: 'Sibasomos',
                                        ship: 'Proteus',
                                        status: 'corp'
                                    },{
                                        name: 'Xtrah',
                                        ship: 'Pod',
                                        status: 'ally'
                                    }
                                ]
                            }
                        ]
                    }
                }
            ]};



        // update map module ========================================
        setTimeout(
            function() {
                console.time('updateUserData')
               // $('#' + config.mapModuleId).updateMapModuleData(userData);
                console.timeEnd('updateUserData')
            }, 5000);




        // server ping
        var triggerMainPing = function(tempMapData){
            console.time('updateMapData')
            // load map module ==========================================
            $('#' + config.mapModuleId).updateMapModule(tempMapData);
            console.timeEnd('updateMapData')

            console.time('getMapData')
            var mapData = $('#' + config.mapModuleId).getMapModuleData();
            console.timeEnd('getMapData')
            console.log(mapData);
        };

        //setInterval(triggerMainPing, 5000, mapData);

        setInterval(triggerMainPing, Init.timer.mainPing, mapData);

    });

});
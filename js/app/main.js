define(["jquery", "app/render", "app/ccp", "app/module_map"], function($, Render, CCP) {

    "use strict";

    var config = {
      mapModuleId: 'pf-map-module'
    };

    $(function() {
        CCP.requestTrust();



        // Map init options
        var mapData =[{
            map: {},
            config: {
                name: 'Polaris',
                id: 1,
                scope: 'wormhole',
                icon: 'fa-desktop',
                type: 'alliance'              // global, alliance, private
            },
            data: {
                systems: [
                    {
                        id: 2,
                        name: 'J150020',
                        effect: 'magnetar',
                        type: 'wh',
                        security: 'C6',
                        status: 'friendly',
                        position: {
                            x: 0,
                            y: 0
                        }
                    },{
                        id: 3,
                        name: 'J115844',
                        effect: 'wolfRyet',
                        type: 'wh',
                        security: 'C6',
                        status: 'empty',
                        position: {
                            x: 60,
                            y: 60
                        }
                    },{
                        id: 4,
                        name: 'J155207',
                        effect: 'wolfRyet',
                        type: 'wh',
                        security: 'C6',
                        status: '',
                        position: {
                            x: 200,
                            y: 60
                        }
                    },{
                        id: 5,
                        name: 'J145510',
                        effect: 'pulsar',
                        security: 'C3',
                        type: 'wh',
                        status: 'hostile',
                        position: {
                            x: 110,
                            y: 110
                        }
                    }
                ],
                connections: [
                    {
                        source: 3,
                        target: 4,
                        type: 'wh'
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
                        effect: 'magnetar',
                        security: 'C6',
                        type: 'wh',
                        status: 'friendly',
                        position: {
                            x: 5,
                            y: 7
                        }
                    },{
                        id: 51,
                        name: 'J115844',
                        effect: 'wolfRyet',
                        security: 'C6',
                        type: 'wh',
                        status: 'empty',
                        position: {
                            x: 60,
                            y: 65
                        }
                    }
                ],
                connections: [{
                    source: 50,
                    target: 51,
                    type: 'wh'
                }]
            }
        },
        {
            map: {},
            config: {
                name: 'Exodus 4D',
                id: 3,
                scope: 'wormhole',
                icon: 'fa-cube',
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
                system: {
                    name: 'J115844',
                    id: 4
                }
            },
            mapUserData: [ // user Data for all maps
                {
                    config: {   // map config
                        id: 1   // map id
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
                                        name: 'Xtrah gfdfgdfgfd',
                                        ship: 'Pod',
                                        status: 'ally'
                                    }
                                ]
                            }
                        ]
                    }
                }
            ]};

        // load map module ==========================================
        $('#' + config.mapModuleId).loadMapModule(mapData);

        // update map module ========================================
        setTimeout(
            function() {
                $('#' + config.mapModuleId).updateMapModule(userData);

                console.log('update map done');
            }, 1000);



    });


});
define(["jquery", "app/ccp", "app/map"], function($, CCP, Map) {

    "use strict";

    $(function() {
        //$('body').alpha().beta();

        CCP.requestTrust();

        // Map init options
        var mapOptions = {
            map: {},
            config: {
                name: 'WH Test',
                id: 'pf-map-1',
                scope: 'wormhole'
            },
            data: {
                systems: [
                    {
                        id: 2,
                        name: 'J150020',
                        effect: 'magnetar',
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


        }

        Map.render(mapOptions);

        var mapOptions = {
            map: {},
            config: {
                name: 'K-Space Test',
                id: 'pf-map-2',
                scope: 'wormhole'
            },
            data: {
                systems: [
                    {
                        id: 50,
                        name: 'J150020',
                        effect: 'magnetar',
                        security: 'C6',
                        status: 'friendly',
                        position: {
                            x: 5,
                            y: 5
                        }
                    },{
                        id: 51,
                        name: 'J115844',
                        effect: 'wolfRyet',
                        security: 'C6',
                        status: 'empty',
                        position: {
                            x: 60,
                            y: 60
                        }
                    }
                ],
                connections: [{
                    source: 50,
                    target: 51,
                    type: 'wormhole'
                }]
            }
        }

     //   Map.render(mapOptions);


    });
});
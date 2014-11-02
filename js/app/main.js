define(["jquery", "app/render", "app/ccp", "app/map"], function($, Render, CCP, Map) {

    "use strict";

    var config = {
      mapModuleId: 'pf-map-module',
      mapTabBarId: 'pf-map-tabs',
      mapTabIdPrefix: 'pf-map-tab-'
    };

    $(function() {
        //$('body').alpha().beta();

        CCP.requestTrust();






        // Map init options
        var mapData =[{
            map: {},
            config: {
                name: 'WH Test',
                id: 1,
                scope: 'wormhole',
                icon: 'fa-desktop'
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


        },{
            map: {},
            config: {
                name: 'K-Space Test',
                id: 2,
                scope: 'wormhole',
                icon: 'fa-bookmark'
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
                    type: 'wh'
                }]
            }
        }];


        // load map navigation Bar and init map ==========================================

        var moduleConfig = {
            name: 'modules/tabs',
            position: $('#' + config.mapModuleId),
            link: 'prepend',
            functions: {
                after: function(){
                    // load first map i in first tab content container
                    var firstTabContentElement = $("div[data-map-tabs='" + config.mapTabBarId + "'] div:first-child");

                    firstTabContentElement.loadMap(mapData[0]);

                    // load new map right after tab-change
                    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                        var mapIndex = $(e.target).attr('data-map-index');
                        var mapId = mapData[mapIndex].config.id;
                        $('#' + config.mapTabIdPrefix + mapId).loadMap(mapData[mapIndex]);
                    });
                }
            }
        };

        var moduleData = {
            id: config.mapTabBarId,
            tabs: []
        };

        // add new tab data for each map
        $.each(mapData, function(i, data){

            var active = false;
            if(i === 0){
                active = true;
            }

            moduleData.tabs.push({
                id: data.config.id,
                index: i,
                name: data.config.name,
                icon: data.config.icon,
                active: active
            });
        });

        Render.showModule(moduleConfig, moduleData);


    });
});
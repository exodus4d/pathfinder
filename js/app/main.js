define(['jquery', 'app/render', 'app/ccp', 'slidebars', 'app/module_map'], function($, Render, CCP) {

    'use strict';

    var config = {

        // page structure slidebars-menu classes
        pageId: 'sb-site',
        pageSlidebarClass: 'sb-slidebar',
        pageSlidebarLeftClass: 'sb-left',
        pageSlidebarRightClass: 'sb-right',
        pageSlideLeftWidth: '150px',
        pageSlideRightWidth: '150px',

        // page structure
        pageClass: 'pf-site',
        pageHeaderId: 'pf-site-head',

        // header
        headClass: 'pf-head',
        headMenuClass: 'pf-head-menu',
        headMapClass: 'pf-head-map',

        // map module
        mapModuleId: 'pf-map-module',

        // helper element
        dynamicElementWrapperId: 'pf-dialog-wrapper'
    };

    /**
     * load main page structure elements and navigation container into body
     */
    $.fn.loadPageStructure = function(){

        // menu right
        $(this).prepend(
            $('<div>', {
                class: [config.pageSlidebarClass, config.pageSlidebarRightClass, 'sb-style-push', 'sb-width-custom'].join(' ')
            }).attr('data-sb-width', config.pageSlideRightWidth).text('right')
        );

        // menu left
        $(this).prepend(
            $('<div>', {
                class: [config.pageSlidebarClass, config.pageSlidebarLeftClass, 'sb-style-push', 'sb-width-custom'].join(' ')
            }).attr('data-sb-width', config.pageSlideLeftWidth).text('left')
        );

        // main page
        $(this).prepend(
            $('<div>', {
                id: config.pageId,
                class: config.pageClass
            }).append(
                $('<div>', {
                    id: config.mapModuleId
                })
            ).append(
                $('<div>', {
                    id: config.dynamicElementWrapperId
                })
            )
        );

        // load header
         $('.' + config.pageClass).loadHeader();

    };

    /**
     * load page header
     */
    $.fn.loadHeader = function(){

        var pageElement = $(this);

        var moduleConfig = {
            name: 'modules/header',
            position: pageElement,
            link: 'prepend',
            functions: {
                after: function(){

                    // init slide menus
                    var slideMenu = new $.slidebars({
                        scrollLock: false
                    });
                    $('.' + config.headMenuClass).on('click', function() {
                        slideMenu.slidebars.toggle('left');
                    });

                    $('.' + config.headMapClass).on('click', function() {
                        slideMenu.slidebars.toggle('right');
                    });
                }
            }
        };

        var moduleData = {
            id: config.pageHeaderId,
            userName: 'Exodus 4D'
        };

        Render.showModule(moduleConfig, moduleData);

    };




    $(function() {
        CCP.requestTrust();


        $('body').loadPageStructure();

        // Map init options
        var mapData =[{
            map: {},
            config: {
                name: 'Polaris',
                id: 1,
                scope: 'wormhole',
                icon: 'fa-globe',
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
                            x: 300,
                            y: 250
                        }
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
                        }
                    }
                ],
                connections: [
                    {
                        source: 3,
                        target: 4,
                        type: 'wh'
                    },
                    {
                        source: 4,
                        target: 30002979,
                        type: 'wh'
                    },
                    {
                        source: 4,
                        target: 30000142,
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
     //           $('#' + config.mapModuleId).updateMapModule(userData);

                console.log('update map done');
            }, 500);



    });


});
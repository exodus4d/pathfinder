/**
 *  Init
 */

define(['jquery'], function($) {

    'use strict';

    var Config = {
        path: {
            img: 'public/img/',                                     // path for images
            // user API
            getCaptcha: 'api/user/getCaptcha',                      // ajax URL - get captcha image
            sendInviteKey: 'api/user/sendInvite',                   // ajax URL - send registration key
            getCookieCharacterData: 'api/user/getCookieCharacter',  // ajax URL - get character data from cookie
            logIn: 'api/user/logIn',                                // ajax URL - login
            logOut: 'api/user/logOut',                              // ajax URL - logout
            deleteLog: 'api/user/deleteLog',                        // ajax URL - delete character log
            saveUserConfig: 'api/user/saveAccount',                 // ajax URL - saves/update user account
            deleteAccount: 'api/user/deleteAccount',                // ajax URL - delete Account data
            // access API
            searchAccess: 'api/access/search',                      // ajax URL - search user/corporation/ally by name
            // main config/map ping API
            initMap: 'api/map/init',                                // ajax URL - get static data
            updateMapData: 'api/map/updateData',                    // ajax URL - main map update trigger
            updateUserData: 'api/map/updateUserData',               // ajax URL - main map user data trigger
            // map API
            saveMap: 'api/map/save',                                // ajax URL - save/update map
            deleteMap: 'api/map/delete',                            // ajax URL - delete map
            importMap: 'api/map/import',                            // ajax URL - import map
            // system API
            searchSystem: 'api/system/search',                      // ajax URL - search system by name
            saveSystem: 'api/system/save',                          // ajax URL - saves system to map
            deleteSystem: 'api/system/delete',                      // ajax URL - delete system from map
            getSystemGraphData: 'api/system/graphData',             // ajax URL - get all system graph data
            getConstellationData: 'api/system/constellationData',   // ajax URL - get system constellation data

            // connection API
            saveConnection: 'api/connection/save',                  // ajax URL - save new connection to map
            deleteConnection: 'api/connection/delete',              // ajax URL - delete connection from map
            // signature API
            getSignatures: 'api/signature/getAll',                  // ajax URL - get all signature data for system
            saveSignatureData: 'api/signature/save',                // ajax URL - save signature data for system
            deleteSignatureData: 'api/signature/delete',            // ajax URL - delete signature data for system
            // route API
            searchRoute: 'api/route/search',                        // ajax URL - search system routes
            // GitHub API
            gitHubReleases: 'api/github/releases'                   // ajax URL - get release info from GitHub
        },
        url: {
            ccpImageServer: 'https://image.eveonline.com/',         // CCP image Server
            zKillboard: 'https://zkillboard.com/api/'               // killboard api
        },
        animationSpeed: {
            splashOverlay: 300,                                     // "splash" loading overlay
            headerLink: 100,                                        // links in head bar
            mapOverlay: 200,                                        // show/hide duration for map overlays
            mapMoveSystem: 300,                                     // system position has changed animation
            mapDeleteSystem: 200,                                   // remove system from map
            mapModule: 200,                                         // show/hide of an map module
            dialogEvents: 180                                       // dialog events /slide/show/...
        },
        mapIcons: [                                                 // map tab-icons
            {
                class: 'fa-desktop',
                label: 'desktop',
                unicode: '&#xf108;'
            },{
                class: 'fa-bookmark',
                label: 'bookmark',
                unicode: '&#xf02e;'
            },{
                class: 'fa-cube',
                label: 'cube',
                unicode: '&#xf1b2;'
            },{
                class: 'fa-plane',
                label: 'plane',
                unicode: '&#xf072;'
            },{
                class: 'fa-globe',
                label: 'globe',
                unicode: '&#xf0ac;'
            },{
                class: 'fa-rocket',
                label: 'rocket',
                unicode: '&#xf135;'
            },{
                class: 'fa-life-ring',
                label: 'life ring',
                unicode: '&#xf1cd;'
            },{
                class: 'fa-heart',
                label: 'heart',
                unicode: '&#xf004;'
            }
        ],

        classes: {
            // log types
            logTypes: {
                info: {
                    class: 'pf-log-info',
                    label: 'info'
                },
                warning: {
                    class: 'pf-log-warning',
                    label: 'warning'
                },
                error: {
                    class: 'pf-log-error',
                    label: 'error'
                }
            },
            // system effects
            systemEffects: {

                effect: {
                    class: 'pf-system-effect',
                    name: 'no effect'
                },
                magnetar: {
                    class: 'pf-system-effect-magnetar',
                    name: 'magnetar'
                },
                redGiant: {
                    class: 'pf-system-effect-redgiant',
                    name: 'red gaint'
                },
                pulsar: {
                    class: 'pf-system-effect-pulsar',
                    name: 'pulsar'
                },
                wolfRayet: {
                    class: 'pf-system-effect-wolfrayet',
                    name: 'wolf rayet'
                },
                cataclysmic: {
                    class: 'pf-system-effect-cataclysmic',
                    name: 'cytaclysmic'
                },
                blackHole: {
                    class: 'pf-system-effect-blackhole',
                    name: 'black hole'
                }
            },
            // system security
            systemSecurity: {
                security: {
                    class: 'pf-system-sec'
                },
                'SH': {
                    class: 'pf-system-sec-unknown'
                },
                'H': {
                     class: 'pf-system-sec-highSec'
                },
                'L': {
                    class: 'pf-system-sec-lowSec'
                },
                '0.0': {
                    class: 'pf-system-sec-nullSec'
                },
                'C6': {
                    class: 'pf-system-sec-high'
                },
                'C5': {
                    class: 'pf-system-sec-high'
                },
                'C4': {
                    class: 'pf-system-sec-mid'
                },
                'C3': {
                    class: 'pf-system-sec-mid'
                },
                'C2': {
                    class: 'pf-system-sec-low'
                },
                'C1': {
                    class: 'pf-system-sec-low'
                }
            },
            // true sec
            trueSec: {
                '0.0': {
                    class: 'pf-system-security-0-0'
                },
                '0.1': {
                    class: 'pf-system-security-0-1'
                },
                '0.2': {
                    class: 'pf-system-security-0-2'
                },
                '0.3': {
                    class: 'pf-system-security-0-3'
                },
                '0.4': {
                    class: 'pf-system-security-0-4'
                },
                '0.5': {
                    class: 'pf-system-security-0-5'
                },
                '0.6': {
                    class: 'pf-system-security-0-6'
                },
                '0.7': {
                    class: 'pf-system-security-0-7'
                },
                '0.8': {
                    class: 'pf-system-security-0-8'
                },
                '0.9': {
                    class: 'pf-system-security-0-9'
                },
                '1.0': {
                    class: 'pf-system-security-1-0'
                }
            },
            // system info
            systemInfo: {
                rally: {
                    class: 'pf-system-info-rally',
                    label: 'rally point'
                }
            },
            // easy-pie-charts
            pieChart: {
                class: 'pf-pie-chart',                              // class for all pie charts
                pieChartMapCounterClass: 'pf-pie-chart-map-timer'   // class for timer chart
            }
        },
        // map scopes
        defaultMapScope: 'wh',                                      // default scope for connection
        // map connection types
        connectionTypes: {
            jumpbridge: {
                cssClass: 'pf-map-connection-jumpbridge',
                paintStyle: {
                    dashstyle: '4 2 1 2'
                }
            },
            stargate: {
                cssClass: 'pf-map-connection-stargate',
                paintStyle: {
                    dashstyle: '0' // solid line
                }
            },
            wh_eol: {
                cssClass: 'pf-map-connection-wh-eol',
                paintStyle: {
                    dashstyle: '0' // solid line
                }
            },
            wh_fresh: {
                cssClass: 'pf-map-connection-wh-fresh',
                paintStyle: {
                    dashstyle: '0' // solid line
                }
            },
            wh_reduced: {
                cssClass: 'pf-map-connection-wh-reduced',
                paintStyle: {
                    dashstyle: '0' // solid line
                }
            },
            wh_critical: {
                cssClass: 'pf-map-connection-wh-critical',
                paintStyle: {
                    dashstyle: '0' // solid line
                }
            },
            frigate: {
                cssClass: 'pf-map-connection-frig',
                paintStyle: {
                    dashstyle: '0.99'
                },
                overlays:[
                    [ 'Label',
                        {
                            label: 'frig',
                            cssClass: ['pf-map-connection-overlay', 'frig'].join(' ')
                        } ]
                ]
            },
            preserve_mass: {
                cssClass: 'pf-map-connection-preserve-mass',
                overlays:[
                    [ 'Label',
                        {
                            label: '<i class="fa fa-warning"></i>&nbsp;save mass',
                            cssClass: ['pf-map-connection-overlay', 'mass'].join(' '),
                            width:50, length:30,
                            location: 0.5
                        } ]
                ]
            }
        },
        // signature groups
        signatureGroups: {
            1: {
                name: 'combat site', //*
                label: 'Combat'
            },
            2: {
                name: 'relic site', //*
                label: 'Relic'
            },
            3: {
                name: 'data site',
                label: 'Data'
            },
            4: {
                name: 'gas site',
                label: 'Gas'
            },
            5: {
                name: 'wormhole',
                label: 'Wormhole'
            },
            6: {
                name: 'ore site',
                label: 'Ore'
            },
            7: {
                name: 'ghost',
                label: 'Ghost'
            }
        },
        // frigate wormholes
        frigateWormholes: {
            1: {    // C1

            },
            2: {    // C2
                1: 'L005 - C2',
                2: 'C008 - C5',
                3: 'Q003 - 0.0'
            },
            3: {    // C3
                1: 'E004 - C1',
                2: 'L005 - C2',
                3: 'M001 - C4'
            },
            4: {    // C4
                1: 'L005 - C2',
                2: 'G008 - C6',
                3: 'Q003 - 0.0'
            },
            5: {    // C5
                1: 'E004 - C1',
                2: 'L005 - C2',
                3: 'Z006 - C3',
                4: 'C008 - C5',
                5: 'Q003 - 0.0'
            },
            6: {    // C6
                1: 'E004 - C1',
                2: 'Z006 - C3',
                5: 'Q003 - 0.0'
            },
            13: {   // Shattered Wormholes (some of them are static)
                1: 'E004 - C1',
                2: 'L005 - C2',
                3: 'Z006 - C3',
                4: 'M001 - C4',
                5: 'C008 - C5',
                6: 'G008 - C6',
                7: 'Q003 - C7'

            }
        },
        // incoming wormholes
        incomingWormholes: {
            1: 'K162 - C1/2/3 (unknown)',
            2: 'K162 - C4/5 (dangerous)',
            3: 'K162 - C6 (deadly)',
            4: 'K162 - HS',
            5: 'K162 - LS',
            6: 'K162 - 0.0'
        }

    };

    return Config;
});
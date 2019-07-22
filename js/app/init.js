/**
 *  Init
 */

define([], () => {

    'use strict';

    let Config = {
        path: {
            img: '/public/img/',                                            // path for images
            api: '/api/rest',                                               //ajax URL - REST API
            // user API
            getCaptcha: '/api/user/getCaptcha',                             // ajax URL - get captcha image
            getServerStatus: '/api/user/getEveServerStatus',                // ajax URL - get EVE-Online server status
            getCookieCharacterData: '/api/user/getCookieCharacter',         // ajax URL - get character data from cookie
            logIn: '/api/user/logIn',                                       // ajax URL - login
            logout: '/api/user/logout',                                     // ajax URL - logout
            openIngameWindow: '/api/user/openIngameWindow',                 // ajax URL - open inGame Window
            saveUserConfig: '/api/user/saveAccount',                        // ajax URL - saves/update user account
            deleteAccount: '/api/user/deleteAccount',                       // ajax URL - delete Account data
            // access API
            searchAccess: '/api/access/search',                             // ajax URL - search user/corporation/ally by name
            // main config/map ping API
            initData: '/api/map/initData',                                  // ajax URL - get static configuration data
            getAccessData: '/api/map/getAccessData',                        // ajax URL - get map access tokens (WebSocket)
            updateMapData: '/api/map/updateData',                           // ajax URL - main map update trigger
            updateUserData: '/api/map/updateUserData',                      // ajax URL - main map user data trigger
            updateUnloadData: '/api/map/updateUnloadData',                  // post URL - for my sync onUnload
            // map API
            saveMap: '/api/map/save',                                       // ajax URL - save/update map
            deleteMap: '/api/map/delete',                                   // ajax URL - delete map
            importMap: '/api/map/import',                                   // ajax URL - import map
            getMapConnectionData: '/api/map/getConnectionData',             // ajax URL - get connection data
            getMapLogData: '/api/map/getLogData',                           // ajax URL - get logs data
            // system API
            getSystemGraphData: '/api/system/graphData',                    // ajax URL - get all system graph data
            setDestination: '/api/system/setDestination',                   // ajax URL - set destination
            pokeRally: '/api/system/pokeRally',                             // ajax URL - send rally point pokes
            // route API
            searchRoute: '/api/route/search',                               // ajax URL - search system routes
            // stats API
            getStatisticsData: '/api/statistic/getData',                    // ajax URL - get statistics data (activity log)
            // universe API
            searchUniverseData: '/api/universe/search',                     // ajax URL - search universe data by category Ids
            searchUniverseSystemData: '/api/universe/systems',              // ajax URL - search universe system data by name
            getConstellationData: '/api/universe/constellationData',        // ajax URL - get system constellation data
            // GitHub API
            gitHubReleases: '/api/github/releases'                          // ajax URL - get release info from GitHub
        },
        breakpoints: [
            { name: 'screen-xl', width: Infinity },
            { name: 'screen-l', width: 1600 },
            { name: 'screen-m', width: 1200 },
            { name: 'screen-d', width: 1000 },
            { name: 'screen-s', width: 780 },
            { name: 'screen-xs', width: 480 }
        ],
        animationSpeed: {
            splashOverlay: 300,                                             // "splash" loading overlay
            headerLink: 100,                                                // links in head bar
            mapOverlay: 200,                                                // show/hide duration for map overlays
            mapOverlayLocal: 180,                                           // show/hide duration for map "local" overlay
            mapMoveSystem: 180,                                             // system position has changed animation
            mapDeleteSystem: 200,                                           // remove system from map
            mapModule: 200,                                                 // show/hide of an map module
            dialogEvents: 180                                               // dialog events /slide/show/...
        },
        syncStatus: {
            type: 'ajax',
            webSocket: {
                status: 'closed',
                class: 'txt-color-danger',
                timestamp: undefined
            },
            sharedWorker: {
                status: 'offline',                                          // SharedWorker status
                class: 'txt-color-danger',
                timestamp: undefined
            },
            ajax: {
                status: 'enabled',
                class: 'txt-color-success',
                timestamp: undefined
            }
        },
        performanceLogging: {
            keyServerMapData: 'UPDATE_SERVER_MAP',                          // ajax request update map data
            keyClientMapData: 'UPDATE_CLIENT_MAP',                          // update client map data
            keyServerUserData: 'UPDATE_SERVER_USER_DATA',                   // ajax request update map user data
            keyClientUserData: 'UPDATE_CLIENT_USER_DATA',                   // update client map user data
        },
        mapIcons: [                                                         // map tab-icons
            {
                class: 'fa-desktop',
                label: 'desktop',
                unicode: '&#xf108;'
            },{
                class: 'fa-space-shuttle',
                label: 'space shuttle',
                unicode: '&#xf197;'
            },{
                class: 'fa-anchor',
                label: 'anchor',
                unicode: '&#xf13d;'
            },{
                class: 'fa-satellite',
                label: 'satellite',
                unicode: '&#xf7bf;'
            },{
                class: 'fa-skull-crossbones',
                label: 'skull crossbones',
                unicode: '&#xf714;'
            },{
                class: 'fa-fire',
                label: 'fire',
                unicode: '&#xf06d;'
            },{
                class: 'fa-bookmark',
                label: 'bookmark',
                unicode: '&#xf02e;'
            },{
                class: 'fa-cube',
                label: 'cube',
                unicode: '&#xf1b2;'
            },{
                class: 'fa-star',
                label: 'star',
                unicode: '&#xf005;'
            },{
                class: 'fa-hat-wizard',
                label: 'hat wizard',
                unicode: '&#xf6e8;'
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
            },{
                class: 'fa-poop',
                label: 'poop',
                unicode: '&#xf619;'
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
                    name: 'red giant'
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
                    name: 'cataclysmic'
                },
                blackHole: {
                    class: 'pf-system-effect-blackhole',
                    name: 'black hole'
                }
            },
            // system security
            systemSecurity: {
                'security': {
                    class: 'pf-system-sec'
                },
                'A': {
                    class: 'pf-system-sec-abyssal'
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
                'C1': {
                    class: 'pf-system-sec-low'
                },
                'C2': {
                    class: 'pf-system-sec-low'
                },
                'C3': {
                    class: 'pf-system-sec-mid'
                },
                'C4': {
                    class: 'pf-system-sec-mid'
                },
                'C5': {
                    class: 'pf-system-sec-high'
                },
                'C6': {
                    class: 'pf-system-sec-high'
                },
                'C12': {
                    class: 'pf-system-sec-special'
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
            // planets
            planets: {
                barren: {
                    class: 'pf-planet-barren'
                },
                gas: {
                    class: 'pf-planet-gas'
                },
                ice: {
                    class: 'pf-planet-ice'
                },
                lava: {
                    class: 'pf-planet-lava'
                },
                oceanic: {
                    class: 'pf-planet-oceanic'
                },
                plasma: {
                    class: 'pf-planet-plasma'
                },
                shattered: {
                    class: 'pf-planet-shattered'
                },
                storm: {
                    class: 'pf-planet-storm'
                },
                temperate: {
                    class: 'pf-planet-temperate'
                }
            },
            // easy-pie-charts
            pieChart: {
                class: 'pf-pie-chart',                                      // class for all pie charts
                pieChartMapCounterClass: 'pf-pie-chart-map-timer'           // class for timer chart
            }
        },
        // map scopes
        defaultMapScope: 'wh',                                              // default scope for connection
        // map endpoint types
        endpointTypes: {
            bubble: {
                cssClass: 'pf-map-endpoint-bubble',
            }
        },
        // map connection types
        connectionTypes: {
            abyssal: {
                cssClass: 'pf-map-connection-abyssal',
                paintStyle: {
                    dashstyle: '0.5 2' // dotted line
                }
            },
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
                cssClass: 'pf-map-connection-wh-eol'
            },
            wh_fresh: {
                cssClass: 'pf-map-connection-wh-fresh'
            },
            wh_reduced: {
                cssClass: 'pf-map-connection-wh-reduced'
            },
            wh_critical: {
                cssClass: 'pf-map-connection-wh-critical'
            },
            wh_jump_mass_s: {
                cssClass: 'pf-map-connection-wh-size-s',
                paintStyle: {
                    dashstyle: '0.5 1',
                    strokeWidth: 3
                },
                overlays: [
                    ['Label',
                        {
                            label: '<i class="fas fa-char pf-jump-mass-s" data-char-content="S"></i>',
                            cssClass: ['pf-map-component-overlay', 'small', 'text-center'].join(' '),
                            location: 0.65,
                            id: 'pf-map-connection-jump-mass-overlay'
                        }]
                ]
            },
            wh_jump_mass_m: {
                cssClass: 'pf-map-connection-wh-size-m',
                paintStyle: {
                    dashstyle: '3 1'
                },
                overlays: [
                    ['Label',
                        {
                            label: '<i class="fas fa-char pf-jump-mass-m" data-char-content="M"></i>',
                            cssClass: ['pf-map-component-overlay', 'small', 'text-center'].join(' '),
                            location: 0.65,
                            id: 'pf-map-connection-jump-mass-overlay'
                        }]
                ]
            },
            wh_jump_mass_l: {
                cssClass: 'pf-map-connection-wh-size-l',
                overlays: [
                    ['Label',
                        {
                            label: '<i class="fas fa-char pf-jump-mass-l" data-char-content="L"></i>',
                            cssClass: ['pf-map-component-overlay', 'small', 'text-center'].join(' '),
                            location: 0.65,
                            id: 'pf-map-connection-jump-mass-overlay'
                        }]
                ]
            },
            wh_jump_mass_xl: {
                cssClass: 'pf-map-connection-wh-size-xl',
                paintStyle: {
                    strokeWidth: 6
                },
                overlays: [
                    ['Label',
                        {
                            label: '<i class="fas fa-char pf-jump-mass-xl" data-char-content="XL"></i>',
                            cssClass: ['pf-map-component-overlay', 'small', 'text-center'].join(' '),
                            location: 0.65,
                            id: 'pf-map-connection-jump-mass-overlay'
                        }]
                ]
            },
            preserve_mass: {
                cssClass: 'pf-map-connection-preserve-mass',
                overlays: [
                    ['Label',
                        {
                            label: '<i class="fas fa-fw fa-exclamation-triangle"></i>&nbsp;save mass',
                            cssClass: ['pf-map-component-overlay', 'mass'].join(' '),
                            location: 0.35
                        }]
                ]
            },
            info_signature: {
                overlays: [
                    ['Arrow',
                        {
                            id: 'pf-map-connection-arrow-overlay',
                            cssClass: 'pf-map-connection-arrow-overlay',
                            width: 12,
                            length: 15,
                            direction: 1,
                            foldback: 0.8,
                            location: 0.5
                        }]
                ]
            },
            state_active: {
                cssClass: 'pf-map-connection-active'
            },
            state_process: {
                cssClass: 'pf-map-connection-process',
                overlays: [
                    ['Label',
                        {
                            label: '<i class="fas fa-fw fa-sync fa-spin"></i>',
                            cssClass: ['pf-map-connection-state-overlay'].join(' '),
                            location: 0.5
                        }]
                ]
            }
        },
        wormholeSizes: {
            wh_jump_mass_xl: {
                jumpMassMin: 1000000000,
                type: 'wh_jump_mass_xl',
                class: 'pf-jump-mass-xl',
                label: 'XL',
                text: 'capital ships'
            },
            wh_jump_mass_l: {
                jumpMassMin: 300000000,
                type: 'wh_jump_mass_l',
                class: 'pf-jump-mass-l',
                label: 'L',
                text: 'larger ships'
            },
            wh_jump_mass_m: {
                jumpMassMin: 20000000,
                type: 'wh_jump_mass_m',
                class: 'pf-jump-mass-m',
                label: 'M',
                text: 'medium ships'
            },
            wh_jump_mass_s: {
                jumpMassMin: 1000,
                type: 'wh_jump_mass_s',
                class: 'pf-jump-mass-s',
                label: 'S',
                text: 'smallest ships'
            }
        },
        // signature groups
        signatureGroups: {
            1: {
                name: '(combat site|kampfgebiet|site de combat|Боевой район|战斗地点)',
                label: 'Combat'
            },
            2: {
                name: '(relic site|reliktgebiet|site de reliques|Археологический район|遗迹地点)',
                label: 'Relic'
            },
            3: {
                name: '(data site|datengebiet|site de données|Информационный район|数据地点)',
                label: 'Data'
            },
            4: {
                name: '(gas site|gasgebiet|site de collecte de gaz|Газовый район|气云地点)',
                label: 'Gas'
            },
            5: {
                name: '(wormhole|wurmloch|trou de ver|Червоточина|虫洞)',
                label: 'Wormhole'
            },
            6: {
                name: '(ore site|mineraliengebiet|site de minerai|Астероидный район|矿石地点)',
                label: 'Ore'
            },
            7: {
                name: '(ghost|Призрачный)',
                label: 'Ghost'
            }
        },
        // frigate wormholes
        frigateWormholes: {
            1: {    // C1
                1: 'E004 - C1',
                2: 'L005 - C2',
                3: 'Z006 - C3',
                4: 'M001 - C4',
                5: 'C008 - C5',
                6: 'G008 - C6',
                7: 'Q003 - 0.0',
                8: 'A009 - C13'
            },
            2: {    // C2
                1: 'E004 - C1',
                2: 'L005 - C2',
                3: 'Z006 - C3',
                4: 'M001 - C4',
                5: 'C008 - C5',
                6: 'G008 - C6',
                7: 'Q003 - 0.0',
                8: 'A009 - C13'
            },
            3: {    // C3
                1: 'E004 - C1',
                2: 'L005 - C2',
                3: 'Z006 - C3',
                4: 'M001 - C4',
                5: 'C008 - C5',
                6: 'G008 - C6',
                7: 'Q003 - 0.0',
                8: 'A009 - C13'
            },
            4: {    // C4
                1: 'E004 - C1',
                2: 'L005 - C2',
                3: 'Z006 - C3',
                4: 'M001 - C4',
                5: 'C008 - C5',
                6: 'G008 - C6',
                7: 'Q003 - 0.0',
                8: 'A009 - C13'
            },
            5: {    // C5
                1: 'E004 - C1',
                2: 'L005 - C2',
                3: 'Z006 - C3',
                4: 'M001 - C4',
                5: 'C008 - C5',
                6: 'G008 - C6',
                7: 'Q003 - 0.0',
                8: 'A009 - C13'
            },
            6: {    // C6
                1: 'E004 - C1',
                2: 'L005 - C2',
                3: 'Z006 - C3',
                4: 'M001 - C4',
                5: 'C008 - C5',
                6: 'G008 - C6',
                7: 'Q003 - 0.0',
                8: 'A009 - C13'
            },
            13: {   // Shattered Wormholes (some of them are static)
                1: 'E004 - C1',
                2: 'L005 - C2',
                3: 'Z006 - C3',
                4: 'M001 - C4',
                5: 'C008 - C5',
                6: 'G008 - C6',
                7: 'Q003 - 0.0',
                8: 'A009 - C13'
            },
            30: {   // High Sec
                1: 'E004 - C1',
                2: 'L005 - C2',
                3: 'Z006 - C3',
                4: 'M001 - C4',
                5: 'C008 - C5',
                6: 'G008 - C6',
                7: 'Q003 - 0.0',
                8: 'A009 - C13'
            },
            31: {   // Low Sec
                1: 'E004 - C1',
                2: 'L005 - C2',
                3: 'Z006 - C3',
                4: 'M001 - C4',
                5: 'C008 - C5',
                6: 'G008 - C6',
                7: 'Q003 - 0.0',
                8: 'A009 - C13'
            },
            32: {   // 0.0
                1: 'E004 - C1',
                2: 'L005 - C2',
                3: 'Z006 - C3',
                4: 'M001 - C4',
                5: 'C008 - C5',
                6: 'G008 - C6',
                7: 'Q003 - 0.0',
                8: 'A009 - C13'
            }
        },
        // incoming wormholes
        incomingWormholes: {
            1: 'K162 - C1/2/3 (unknown)',
            2: 'K162 - C4/5 (dangerous)',
            3: 'K162 - C6 (deadly)',
            4: 'K162 - H',
            5: 'K162 - L',
            6: 'K162 - 0.0',
            7: 'K162 - C12 Thera'
        }

    };

    return Config;
});

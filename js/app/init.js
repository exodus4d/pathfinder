/**
 *  Init
 */

define([], () => {
    'use strict';

    let frigWH = {
        1: 'E004 - C1',
        2: 'L005 - C2',
        3: 'Z006 - C3',
        4: 'M001 - C4',
        5: 'C008 - C5',
        6: 'G008 - C6',
        7: 'Q003 - 0.0',
        8: 'A009 - C13'
    };

    return {
        path: {
            api: '/api/rest',                                               //ajax URL - REST API
            // user API
            getCaptcha: '/api/User/getCaptcha',                             // ajax URL - get captcha image
            getServerStatus: '/api/User/getEveServerStatus',                // ajax URL - get EVE-Online server status
            getCookieCharacterData: '/api/User/getCookieCharacter',         // ajax URL - get character data from cookie
            logIn: '/api/User/logIn',                                       // ajax URL - login
            logout: '/api/User/logout',                                     // ajax URL - logout
            openIngameWindow: '/api/User/openIngameWindow',                 // ajax URL - open inGame Window
            saveUserConfig: '/api/User/saveAccount',                        // ajax URL - saves/update user account
            deleteAccount: '/api/User/deleteAccount',                       // ajax URL - delete Account data
            // access API
            searchAccess: '/api/Access/search',                             // ajax URL - search user/corporation/ally by name
            // main config/map ping API
            initData: '/api/Map/initData',                                  // ajax URL - get static configuration data
            getAccessData: '/api/Map/getAccessData',                        // ajax URL - get map access tokens (WebSocket)
            updateMapData: '/api/Map/updateData',                           // ajax URL - main map update trigger
            updateUserData: '/api/Map/updateUserData',                      // ajax URL - main map user data trigger
            updateUnloadData: '/api/Map/updateUnloadData',                  // post URL - for my sync onUnload
            // map API
            importMap: '/api/Map/import',                                   // ajax URL - import map
            getMapConnectionData: '/api/Map/getConnectionData',             // ajax URL - get connection data
            getMapLogData: '/api/Map/getLogData',                           // ajax URL - get logs data
            // system API
            setDestination: '/api/System/setDestination',                   // ajax URL - set destination
            pokeRally: '/api/System/pokeRally',                             // ajax URL - send rally point pokes
            // stats API
            getStatisticsData: '/api/Statistic/getData',                    // ajax URL - get statistics data (activity log)
            // universe API
            searchUniverseData: '/api/Universe/search',                     // ajax URL - search universe data by category Ids
            getConstellationData: '/api/Universe/constellationData',        // ajax URL - get system constellation data
            // GitHub API
            gitHubReleases: '/api/GitHub/releases'                          // ajax URL - get release info from GitHub
        },
        breakpoints: [
            {name: 'screen-xl', width: Infinity},
            {name: 'screen-l', width: 1600},
            {name: 'screen-m', width: 1200},
            {name: 'screen-d', width: 1000},
            {name: 'screen-s', width: 780},
            {name: 'screen-xs', width: 480}
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
            }, {
                class: 'fa-space-shuttle',
                label: 'space shuttle',
                unicode: '&#xf197;'
            }, {
                class: 'fa-anchor',
                label: 'anchor',
                unicode: '&#xf13d;'
            }, {
                class: 'fa-satellite',
                label: 'satellite',
                unicode: '&#xf7bf;'
            }, {
                class: 'fa-skull-crossbones',
                label: 'skull crossbones',
                unicode: '&#xf714;'
            }, {
                class: 'fa-fire',
                label: 'fire',
                unicode: '&#xf06d;'
            }, {
                class: 'fa-bookmark',
                label: 'bookmark',
                unicode: '&#xf02e;'
            }, {
                class: 'fa-cube',
                label: 'cube',
                unicode: '&#xf1b2;'
            }, {
                class: 'fa-star',
                label: 'star',
                unicode: '&#xf005;'
            }, {
                class: 'fa-hat-wizard',
                label: 'hat wizard',
                unicode: '&#xf6e8;'
            },{
                class: 'fa-cross',
                label: 'cross',
                unicode: '&#xf654;'
            }, {
                class: 'fa-cannabis',
                label: 'cannabis',
                unicode: '&#xf55f;'
            }, {
                class: 'fa-spider',
                label: 'spider',
                unicode: '&#xf717;'
            }, {
                class: 'fa-plane',
                label: 'plane',
                unicode: '&#xf072;'
            }, {
                class: 'fa-globe',
                label: 'globe',
                unicode: '&#xf0ac;'
            }, {
                class: 'fa-rocket',
                label: 'rocket',
                unicode: '&#xf135;'
            }, {
                class: 'fa-life-ring',
                label: 'life ring',
                unicode: '&#xf1cd;'
            }, {
                class: 'fa-heart',
                label: 'heart',
                unicode: '&#xf004;'
            }, {
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
                'T': {
                    class: 'pf-system-sec-triglav'
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
                },
                'C14': {
                    class: 'pf-system-sec-drifter'
                },
                'C15': {
                    class: 'pf-system-sec-drifter'
                },
                'C16': {
                    class: 'pf-system-sec-drifter'
                },
                'C17': {
                    class: 'pf-system-sec-drifter'
                },
                'C18': {
                    class: 'pf-system-sec-drifter'
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
                cssClass: 'pf-map-connection-abyssal'
            },
            jumpbridge: {
                cssClass: 'pf-map-connection-jumpbridge'
            },
            stargate: {
                cssClass: 'pf-map-connection-stargate'
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
                            location: 0.5,
                            length: '${arrowlength}',
                            width: 12,
                            direction: '${arrowdirection}',
                            foldback: '${arrowfoldback}'
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
                jumpMassMin: 375000000,
                type: 'wh_jump_mass_l',
                class: 'pf-jump-mass-l',
                label: 'L',
                text: 'larger ships'
            },
            wh_jump_mass_m: {
                jumpMassMin: 62000000,
                type: 'wh_jump_mass_m',
                class: 'pf-jump-mass-m',
                label: 'M',
                text: 'medium ships'
            },
            wh_jump_mass_s: {
                jumpMassMin: 5000,
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
            1: frigWH,  // C1
            2: frigWH,  // C2
            3: frigWH,  // C3
            4: frigWH,  // C4
            5: frigWH,  // C5
            6: frigWH,  // C6
            13: frigWH, // Shattered Wormholes (some of them are static)
            30: frigWH, // High Sec
            31: frigWH, // Low Sec
            32: frigWH  // 0.0
        },
        // Drifter wormholes (can only appear in k-space)
        drifterWormholes: {
            1: 'S877 - C14 Sentinel',
            2: 'B735 - C15 Barbican',
            3: 'V928 - C16 Vidette',
            4: 'C414 - C17 Conflux',
            5: 'R259 - C18 Redoubt'
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
});

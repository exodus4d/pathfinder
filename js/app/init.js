/**
 *  Init
 */

define(["jquery"], function($) {

    "use strict";

    var Config = {
        url:{
            zKillboard: 'https://zkillboard.com/api/',
            eveCentral: 'http://api.eve-central.com/api/'
        },
        classes: {
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
                wolfRyet: {
                    class: 'pf-system-effect-wolfryet',
                    name: 'wolf ryet'
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
            // system status
            systemStatus: {
                unknown: {
                    class: 'pf-system-status-unknown',
                    label: 'unknown'
                },
                friendly: {
                    class: 'pf-system-status-friendly',
                    label: 'friendly'
                },
                occupied: {
                    class: 'pf-system-status-occupied',
                    label: 'occupied'
                },
                hostile: {
                    class: 'pf-system-status-hostile',
                    label: 'hostile'
                },
                empty: {
                    class: 'pf-system-status-empty',
                    label: 'empty'
                },
                unscanned: {
                    class: 'pf-system-status-unscanned',
                    label: 'unscanned'
                }
            }

        },
        // signature groups
        signatureGroups: {
            1: {
                name: 'combat site',
                label: 'Combat'
            },
            2: {
                name: 'relic site',
                label: 'Relict'
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
            }
        },
        // signature Type
        signatureTypes: {
            wh: { // system type
                1: {    // C1 (area id)
                    1: {    // Combat
                        1: 'Perimeter Ambush Point',
                        2: 'Perimeter Camp',
                        3: 'Phase Catalyst Node',
                        4: 'The Line'
                    },
                    2: {    // Relic
                        1: 'Forgotten Perimeter Coronation Platform'
                    },
                    3: {    // Data
                        1: 'Unsecured Perimeter Amplifier',
                        2: 'Unsecured Perimeter Information Center '
                    },
                    5: {    // Wormhole
                        1: 'Wormhole'
                    }
                },
                2: {    // C2
                    1: {    // Combat
                        1: 'Perimeter Checkpoint',
                        2: 'Perimeter Hangar',
                        3: 'The Ruins of Enclave Cohort 27',
                        4: 'Sleeper Data Sanctuary'
                    },
                    2: {    // Relic
                        1: 'Forgotten Perimeter Gateway',
                        2: 'Forgotten Perimeter Habitation Coils'
                    },
                    3: {    // Data
                        1: 'Unsecured Perimeter Comms Relay',
                        2: 'Unsecured Perimeter Transponder Farm '
                    },
                    5: {    // Wormhole
                        1: 'Wormhole'
                    }
                },
                3: {    // C3
                    1: {    // Combat
                        1: 'Fortification Frontier Stronghold',
                        2: 'Outpost Frontier Stronghold',
                        3: 'Solar Cell',
                        4: 'The Oruze Construct'
                    },
                    2: {    // Relic
                        1: 'Forgotten Frontier Quarantine Outpost',
                        2: 'Forgotten Frontier Recursive Depot'
                    },
                    3: {    // Data
                        1: 'Unsecured Frontier Database',
                        2: 'Unsecured Frontier Receiver'
                    },
                    5: {    // Wormhole
                        1: 'Wormhole'
                    }
                },
                4: {    // C4
                    1: {    // Combat
                        1: 'Frontier Barracks',
                        2: 'Frontier Command Post',
                        3: 'Integrated Terminus',
                        4: 'Sleeper Information Sanctum'
                    },
                    2: {    // Relic
                        1: 'Forgotten Frontier Conversion Module',
                        2: 'Forgotten Frontier Evacuation Center'
                    },
                    3: {    // Data
                        1: 'Unsecured Frontier Digital Nexus',
                        2: 'Unsecured Frontier Trinary Hub'
                    },
                    5: {    // Wormhole
                        1: 'Wormhole'
                    }
                },
                5: {    // C5
                    1: {    // Combat
                        1: 'Core Garrison',
                        2: 'Core Stronghold',
                        3: 'Oruze Osobnyk',
                        4: 'Quarantine Area'
                    },
                    2: {    // Relic
                        1: 'Forgotten Core Data Field',
                        2: 'Forgotten Core Information Pen'
                    },
                    3: {    // Data
                        1: 'Unsecured Frontier Enclave Relay',
                        2: 'Unsecured Frontier Server Bank'
                    },
                    5: {    // Wormhole
                        1: 'Wormhole'
                    }
                },
                6: {    // C6
                    1: {    // Combat
                        1: 'Core Citadel',
                        2: 'Core Bastion',
                        3: 'Strange Energy Readings',
                        4: 'The Mirror'
                    },
                    2: {    // Relic
                        1: 'Forgotten Core Assembly Hall',
                        2: 'Forgotten Core Circuitry Disassembler'
                    },
                    3: {    // Data
                        1: 'Unsecured Core Backup Array',
                        2: 'Unsecured Core Emergence'
                    },
                    5: {    // Wormhole
                        1: 'Wormhole'
                    }
                }
            }
        }

    };

    return Config;
});
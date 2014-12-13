/**
 *  Init
 */

define(['jquery'], function($) {

    'use strict';

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
        // system effects
        systemEffects:{
            wh: {
                magnetar: {
                    1: [
                        {
                            effect: 'Damage',
                            value: '+30%'
                        },{
                            effect: 'Missile explosion radius',
                            value: '+15%'
                        },{
                            effect: 'Drone Tracking',
                            value: '-15%'
                        },{
                            effect: 'Targeting Range',
                            value: '-15%'
                        },{
                            effect: 'Tracking Speed',
                            value: '-15%'
                        },{
                            effect: 'Target Painter Strength',
                            value: '-15%'
                        }
                    ],
                    2: [
                        {
                            effect: 'Damage',
                            value: '+44%'
                        },{
                            effect: 'Missile explosion radius',
                            value: '+22%'
                        },{
                            effect: 'Drone Tracking',
                            value: '-22%'
                        },{
                            effect: 'Targeting Range',
                            value: '-22%'
                        },{
                            effect: 'Tracking Speed',
                            value: '-22%'
                        },{
                            effect: 'Target Painter Strength',
                            value: '-22%'
                        }
                    ],
                    3: [
                        {
                            effect: 'Damage',
                            value: '+58%'
                        },{
                            effect: 'Missile explosion radius',
                            value: '+29%'
                        },{
                            effect: 'Drone Tracking',
                            value: '-29%'
                        },{
                            effect: 'Targeting Range',
                            value: '-29%'
                        },{
                            effect: 'Tracking Speed',
                            value: '-29%'
                        },{
                            effect: 'Target Painter Strength',
                            value: '-29%'
                        }
                    ],
                    4: [
                        {
                            effect: 'Damage',
                            value: '+72%'
                        },{
                            effect: 'Missile explosion radius',
                            value: '+36%'
                        },{
                            effect: 'Drone Tracking',
                            value: '-36%'
                        },{
                            effect: 'Targeting Range',
                            value: '-36%'
                        },{
                            effect: 'Tracking Speed',
                            value: '-36%'
                        },{
                            effect: 'Target Painter Strength',
                            value: '-36%'
                        }
                    ],
                    5: [
                        {
                            effect: 'Damage',
                            value: '+86%'
                        },{
                            effect: 'Missile explosion radius',
                            value: '+43%'
                        },{
                            effect: 'Drone Tracking',
                            value: '-43%'
                        },{
                            effect: 'Targeting Range',
                            value: '-43%'
                        },{
                            effect: 'Tracking Speed',
                            value: '-43%'
                        },{
                            effect: 'Target Painter Strength',
                            value: '-43%'
                        }
                    ],
                    6: [
                        {
                            effect: 'Damage',
                            value: '+100%'
                        },{
                            effect: 'Missile explosion radius',
                            value: '+50%'
                        },{
                            effect: 'Drone Tracking',
                            value: '-50%'
                        },{
                            effect: 'Targeting Range',
                            value: '-50%'
                        },{
                            effect: 'Tracking Speed',
                            value: '-50%'
                        },{
                            effect: 'Target Painter Strength',
                            value: '-50%'
                        }
                    ]
                },
                redGiant: {
                    1: [
                        {
                            effect: 'Heat Damage',
                            value: '+15%'
                        },{
                            effect: 'Overload Bonus',
                            value: '+30%'
                        },{
                            effect: 'Smart Bomb Range',
                            value: '+30%'
                        },{
                            effect: 'Smart Bomb Damage',
                            value: '+30%'
                        },{
                            effect: 'Bomb Damage',
                            value: '+30%'
                        }
                    ],
                    2: [
                        {
                            effect: 'Heat Damage',
                            value: '+22%'
                        },{
                            effect: 'Overload Bonus',
                            value: '+44%'
                        },{
                            effect: 'Smart Bomb Range',
                            value: '+44%'
                        },{
                            effect: 'Smart Bomb Damage',
                            value: '+44%'
                        },{
                            effect: 'Bomb Damage',
                            value: '+44%'
                        }
                    ],
                    3: [
                        {
                            effect: 'Heat Damage',
                            value: '+29%'
                        },{
                            effect: 'Overload Bonus',
                            value: '+58%'
                        },{
                            effect: 'Smart Bomb Range',
                            value: '+58%'
                        },{
                            effect: 'Smart Bomb Damage',
                            value: '+58%'
                        },{
                            effect: 'Bomb Damage',
                            value: '+58%'
                        }
                    ],
                    4: [
                        {
                            effect: 'Heat Damage',
                            value: '+36%'
                        },{
                            effect: 'Overload Bonus',
                            value: '+72%'
                        },{
                            effect: 'Smart Bomb Range',
                            value: '+72%'
                        },{
                            effect: 'Smart Bomb Damage',
                            value: '+72%'
                        },{
                            effect: 'Bomb Damage',
                            value: '+72%'
                        }
                    ],
                    5: [
                        {
                            effect: 'Heat Damage',
                            value: '+43%'
                        },{
                            effect: 'Overload Bonus',
                            value: '+86%'
                        },{
                            effect: 'Smart Bomb Range',
                            value: '+86%'
                        },{
                            effect: 'Smart Bomb Damage',
                            value: '+86%'
                        },{
                            effect: 'Bomb Damage',
                            value: '+86%'
                        }
                    ],
                    6: [
                        {
                            effect: 'Heat Damage',
                            value: '+50%'
                        },{
                            effect: 'Overload Bonus',
                            value: '+100%'
                        },{
                            effect: 'Smart Bomb Range',
                            value: '+100%'
                        },{
                            effect: 'Smart Bomb Damage',
                            value: '+100%'
                        },{
                            effect: 'Bomb Damage',
                            value: '+100%'
                        }
                    ]
                },
                pulsar: {
                    1: [
                        {
                            effect: 'Shield HP',
                            value: '+30%'
                        },{
                            effect: 'Armor Resists',
                            value: '-15%'
                        },{
                            effect: 'Capacitor recharge',
                            value: '-15%'
                        },{
                            effect: 'Signature',
                            value: '+30%'
                        },{
                            effect: 'NOS / Neut Drain Amount',
                            value: '+30%'
                        }
                    ],
                    2: [
                        {
                            effect: 'Shield HP',
                            value: '+44%'
                        },{
                            effect: 'Armor Resists',
                            value: '-22%'
                        },{
                            effect: 'Capacitor recharge',
                            value: '-22%'
                        },{
                            effect: 'Signature',
                            value: '+44%'
                        },{
                            effect: 'NOS / Neut Drain Amount',
                            value: '+44%'
                        }
                    ],
                    3: [
                        {
                            effect: 'Shield HP',
                            value: '+58%'
                        },{
                            effect: 'Armor Resists',
                            value: '-29%'
                        },{
                            effect: 'Capacitor recharge',
                            value: '-29%'
                        },{
                            effect: 'Signature',
                            value: '+58%'
                        },{
                            effect: 'NOS / Neut Drain Amount',
                            value: '+58%'
                        }
                    ],
                    4: [
                        {
                            effect: 'Shield HP',
                            value: '+72%'
                        },{
                            effect: 'Armor Resists',
                            value: '-36%'
                        },{
                            effect: 'Capacitor recharge',
                            value: '-36%'
                        },{
                            effect: 'Signature',
                            value: '+72%'
                        },{
                            effect: 'NOS / Neut Drain Amount',
                            value: '+72%'
                        }
                    ],
                    5: [
                        {
                            effect: 'Shield HP',
                            value: '+86%'
                        },{
                            effect: 'Armor Resists',
                            value: '-43%'
                        },{
                            effect: 'Capacitor recharge',
                            value: '-43%'
                        },{
                            effect: 'Signature',
                            value: '+86%'
                        },{
                            effect: 'NOS / Neut Drain Amount',
                            value: '+86%'
                        }
                    ],
                    6: [
                        {
                            effect: 'Shield HP',
                            value: '+100%'
                        },{
                            effect: 'Armor Resists',
                            value: '-50%'
                        },{
                            effect: 'Capacitor recharge',
                            value: '-50%'
                        },{
                            effect: 'Signature',
                            value: '+100%'
                        },{
                            effect: 'NOS / Neut Drain Amount',
                            value: '+100%'
                        }
                    ]
                },
                wolfRyet: {
                    1: [
                        {
                            effect: 'Armor HP',
                            value: '+30%'
                        },{
                            effect: 'Shield Resist',
                            value: '-15%'
                        },{
                            effect: 'Small Weapon Damage',
                            value: '+60%'
                        },{
                            effect: 'Signature Size',
                            value: '-15%'
                        }
                    ],
                    2: [
                        {
                            effect: 'Armor HP',
                            value: '+44%'
                        },{
                            effect: 'Shield Resist',
                            value: '-22%'
                        },{
                            effect: 'Small Weapon Damage',
                            value: '+88%'
                        },{
                            effect: 'Signature Size',
                            value: '-22%'
                        }
                    ],
                    3: [
                        {
                            effect: 'Armor HP',
                            value: '+58%'
                        },{
                            effect: 'Shield Resist',
                            value: '-29%'
                        },{
                            effect: 'Small Weapon Damage',
                            value: '+116%'
                        },{
                            effect: 'Signature Size',
                            value: '-29%'
                        }
                    ],
                    4: [
                        {
                            effect: 'Armor HP',
                            value: '+72%'
                        },{
                            effect: 'Shield Resist',
                            value: '-36%'
                        },{
                            effect: 'Small Weapon Damage',
                            value: '+144%'
                        },{
                            effect: 'Signature Size',
                            value: '-36%'
                        }
                    ],
                    5: [
                        {
                            effect: 'Armor HP',
                            value: '+86%'
                        },{
                            effect: 'Shield Resist',
                            value: '-43%'
                        },{
                            effect: 'Small Weapon Damage',
                            value: '+172%'
                        },{
                            effect: 'Signature Size',
                            value: '-43%'
                        }
                    ],
                    6: [
                        {
                            effect: 'Armor HP',
                            value: '+100%'
                        },{
                            effect: 'Shield Resist',
                            value: '-50%'
                        },{
                            effect: 'Small Weapon Damage',
                            value: '+200%'
                        },{
                            effect: 'Signature Size',
                            value: '-50%'
                        }
                    ]
                },
                cataclysmic: {
                    1: [
                        {
                            effect: 'Local armor repair amount',
                            value: '-15%'
                        },{
                            effect: 'Local shield boost amount',
                            value: '-15%'
                        },{
                            effect: 'Shield transfer amount',
                            value: '+30%'
                        },{
                            effect: 'Remote repair amount',
                            value: '+30%'
                        },{
                            effect: 'Capacitor capacity',
                            value: '+30%'
                        },{
                            effect: 'Capacitor recharge time',
                            value: '+15%'
                        },{
                            effect: 'Remote Capacitor Transmitter amount',
                            value: '-15%'
                        }
                    ],
                    2: [
                        {
                            effect: 'Local armor repair amount',
                            value: '-22%'
                        },{
                            effect: 'Local shield boost amount',
                            value: '-22%'
                        },{
                            effect: 'Shield transfer amount',
                            value: '+44%'
                        },{
                            effect: 'Remote repair amount',
                            value: '+44%'
                        },{
                            effect: 'Capacitor capacity',
                            value: '+44%'
                        },{
                            effect: 'Capacitor recharge time',
                            value: '+22%'
                        },{
                            effect: 'Remote Capacitor Transmitter amount',
                            value: '-22%'
                        }
                    ],
                    3: [
                        {
                            effect: 'Local armor repair amount',
                            value: '-29%'
                        },{
                            effect: 'Local shield boost amount',
                            value: '-29%'
                        },{
                            effect: 'Shield transfer amount',
                            value: '+58%'
                        },{
                            effect: 'Remote repair amount',
                            value: '+58%'
                        },{
                            effect: 'Capacitor capacity',
                            value: '+58%'
                        },{
                            effect: 'Capacitor recharge time',
                            value: '+29%'
                        },{
                            effect: 'Remote Capacitor Transmitter amount',
                            value: '-29%'
                        }
                    ],
                    4: [
                        {
                            effect: 'Local armor repair amount',
                            value: '-36%'
                        },{
                            effect: 'Local shield boost amount',
                            value: '-36%'
                        },{
                            effect: 'Shield transfer amount',
                            value: '+72%'
                        },{
                            effect: 'Remote repair amount',
                            value: '+72%'
                        },{
                            effect: 'Capacitor capacity',
                            value: '+72%'
                        },{
                            effect: 'Capacitor recharge time',
                            value: '+36%'
                        },{
                            effect: 'Remote Capacitor Transmitter amount',
                            value: '-36%'
                        }
                    ],
                    5: [
                        {
                            effect: 'Local armor repair amount',
                            value: '-43%'
                        },{
                            effect: 'Local shield boost amount',
                            value: '-43%'
                        },{
                            effect: 'Shield transfer amount',
                            value: '+86%'
                        },{
                            effect: 'Remote repair amount',
                            value: '+86%'
                        },{
                            effect: 'Capacitor capacity',
                            value: '+86%'
                        },{
                            effect: 'Capacitor recharge time',
                            value: '+43%'
                        },{
                            effect: 'Remote Capacitor Transmitter amount',
                            value: '-43%'
                        }
                    ],
                    6: [
                        {
                            effect: 'Local armor repair amount',
                            value: '-50%'
                        },{
                            effect: 'Local shield boost amount',
                            value: '-50%'
                        },{
                            effect: 'Shield transfer amount',
                            value: '+100%'
                        },{
                            effect: 'Remote repair amount',
                            value: '+100%'
                        },{
                            effect: 'Capacitor capacity',
                            value: '+100%'
                        },{
                            effect: 'Capacitor recharge time',
                            value: '+50%'
                        },{
                            effect: 'Remote Capacitor Transmitter amount',
                            value: '-50%'
                        }
                    ]
                },
                blackHole: {
                    1: [
                        {
                            effect: 'Missile velocity',
                            value: '+15%'
                        },{
                            effect: 'Missile Explosion Velocity',
                            value: '+30%'
                        },{
                            effect: 'Ship velocity',
                            value: '+30%'
                        },{
                            effect: 'Stasis Webifier Strength',
                            value: '-15%'
                        },{
                            effect: 'Inertia',
                            value: '+15%'
                        },{
                            effect: 'Targeting range',
                            value: '+30%'
                        }
                    ],
                    2: [
                        {
                            effect: 'Missile velocity',
                            value: '+22%'
                        },{
                            effect: 'Missile Explosion Velocity',
                            value: '+44%'
                        },{
                            effect: 'Ship velocity',
                            value: '+44%'
                        },{
                            effect: 'Stasis Webifier Strength',
                            value: '-22%'
                        },{
                            effect: 'Inertia',
                            value: '+22%'
                        },{
                            effect: 'Targeting range',
                            value: '+44%'
                        }
                    ],
                    3: [
                        {
                            effect: 'Missile velocity',
                            value: '+29%'
                        },{
                            effect: 'Missile Explosion Velocity',
                            value: '+58%'
                        },{
                            effect: 'Ship velocity',
                            value: '+58%'
                        },{
                            effect: 'Stasis Webifier Strength',
                            value: '-29%'
                        },{
                            effect: 'Inertia',
                            value: '+29%'
                        },{
                            effect: 'Targeting range',
                            value: '+58%'
                        }
                    ],
                    4: [
                        {
                            effect: 'Missile velocity',
                            value: '+36%'
                        },{
                            effect: 'Missile Explosion Velocity',
                            value: '+72%'
                        },{
                            effect: 'Ship velocity',
                            value: '+72%'
                        },{
                            effect: 'Stasis Webifier Strength',
                            value: '-36%'
                        },{
                            effect: 'Inertia',
                            value: '+36%'
                        },{
                            effect: 'Targeting range',
                            value: '+72%'
                        }
                    ],
                    5: [
                        {
                            effect: 'Missile velocity',
                            value: '+43%'
                        },{
                            effect: 'Missile Explosion Velocity',
                            value: '+86%'
                        },{
                            effect: 'Ship velocity',
                            value: '+86%'
                        },{
                            effect: 'Stasis Webifier Strength',
                            value: '-43%'
                        },{
                            effect: 'Inertia',
                            value: '+43%'
                        },{
                            effect: 'Targeting range',
                            value: '+86%'
                        }
                    ],
                    6: [
                        {
                            effect: 'Missile velocity',
                            value: '+50%'
                        },{
                            effect: 'Missile Explosion Velocity',
                            value: '+100%'
                        },{
                            effect: 'Ship velocity',
                            value: '+100%'
                        },{
                            effect: 'Stasis Webifier Strength',
                            value: '-50%'
                        },{
                            effect: 'Inertia',
                            value: '+50%'
                        },{
                            effect: 'Targeting range',
                            value: '+100%'
                        }
                    ]
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
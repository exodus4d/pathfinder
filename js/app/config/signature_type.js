/**
 * Created by exodus4d on 06.07.2015.
 * static signature types
 *
 * (*) marked fields are in-game verified and
 * proofed, signature names (copy & paste from scanning window)
 */

define(['jquery'], function($) {

    'use strict';

    // signature sources
    // http://de.sistersprobe.wikia.com/wiki/EVE_Sister_Core_Scanner_Probe_Wiki


    // NullSec Relic sites, which can also spawn in C1, C2, C3 wormholes
    var nullSecRelicSites = {
        10: 'Ruined Angel Crystal Quarry',
        11: 'Ruined Angel Monument Site',
        12: 'Ruined Angel Science Outpost',
        13: 'Ruined Angel Temple Site',
        14: 'Ruined Blood Raider Crystal Quarry',
        15: 'Ruined Blood Raider Monument Site',
        16: 'Ruined Blood Raider Science Outpost',
        17: 'Ruined Blood Raider Temple Site',
        18: 'Ruined Guristas Crystal Quarry',
        19: 'Ruined Guristas Monument Site',
        20: 'Ruined Guristas Science Outpost',
        21: 'Ruined Guristas Temple Site',
        22: 'Ruined Sansha Crystal Quarry',
        23: 'Ruined Sansha Monument Site',
        24: 'Ruined Sansha Science Outpost',
        25: 'Ruined Sansha Temple Site',
        26: 'Ruined Serpentis Crystal Quarry',
        27: 'Ruined Serpentis Monument Site',
        28: 'Ruined Serpentis Science Outpost',
        29: 'Ruined Serpentis Temple Site'
    };

    // NulSec Data sites, which can also spawn in C1, C2, C3 wormholes
    var nullSecDataSites = {
        10: 'Abandoned Research Complex DA005',
        11: 'Abandoned Research Complex DA015',
        12: 'Abandoned Research Complex DC007',
        13: 'Abandoned Research Complex DC021',
        14: 'Abandoned Research Complex DC035',
        15: 'Abandoned Research Complex DG003',
        16: 'Central Angel Command Center',
        17: 'Central Angel Data Mining Site',
        18: 'Central Angel Sparking Transmitter',
        19: 'Central Angel Survey Site',
        20: 'Central Blood Raider Command Center',
        21: 'Central Blood Raider Data Mining Site',
        22: 'Central Blood Raider Sparking Transmitter',
        23: 'Central Blood Raider Survey Site',
        24: 'Central Guristas Command Center',
        25: 'Central Guristas Data Mining Center',
        26: 'Central Guristas Sparking Transmitter',
        27: 'Central Guristas Survey Site',
        28: 'Central Sansha Command Center',
        29: 'Central Sansha Data Mining Site',
        30: 'Central Sansha Sparking Transmitter',
        31: 'Central Sansha Survey Site',
        32: 'Central Serpentis Command Center',
        33: 'Central Serpentis Data Mining Site',
        34: 'Central Serpentis Sparking Transmitter',
        35: 'Central Serpentis Survey Site'
    };


    // signature types
    var signatureTypes = {
        1: { // system type (wh)
            1: {    // C1 (area id)
                1: {    // Combat
                    1: 'Perimeter Ambush Point',
                    2: 'Perimeter Camp',
                    3: 'Phase Catalyst Node',
                    4: 'The Line'
                },
                2: $.extend({}, nullSecRelicSites, {    // Relic
                    1: 'Forgotten Perimeter Coronation Platform', //*
                    2: 'Forgotten Perimeter Power Array' //*
                }),
                3: $.extend({}, nullSecDataSites, {    // Data
                    1: 'Unsecured Perimeter Amplifier', //*
                    2: 'Unsecured Perimeter Information Center' //*
                }),
                4: {    // Gas
                    1: 'Barren Perimeter Reservoir', //*
                    2: 'Token Perimeter Reservoir', //*
                    3: 'Minor Perimeter Reservoir', //*
                    4: 'Sizeable Perimeter Reservoir', //*
                    5: 'Ordinary Perimeter Reservoir' //*
                },
                5: {    // Wormhole
                    1: 'H121 - C1',
                    2: 'C125 - C2',
                    3: 'O883 - C3',
                    4: 'M609 - C4',
                    5: 'L614 - C5',
                    6: 'S804 - C6'
                },
                6: {    // ORE
                    1: 'Ordinary Perimeter Deposit', //*
                    2: 'Common Perimeter Deposit', //*
                    3: 'Unexceptional Frontier Deposit', //*
                    4: 'Average Frontier Deposit', //*
                    5: 'Isolated Core Deposit', //*
                    6: 'Uncommon Core Deposit' //*
                },
                7: {    // Ghost

                }
            },
            2: {    // C2
                1: {    // Combat
                    1: 'Perimeter Checkpoint',
                    2: 'Perimeter Hangar',
                    3: 'The Ruins of Enclave Cohort 27',
                    4: 'Sleeper Data Sanctuary'
                },
                2: $.extend({}, nullSecRelicSites, {    // Relic
                    1: 'Forgotten Perimeter Gateway', //*
                    2: 'Forgotten Perimeter Habitation Coils' //*
                }),
                3: $.extend({}, nullSecDataSites, {    // Data
                    1: 'Unsecured Perimeter Comms Relay', //*
                    2: 'Unsecured Perimeter Transponder Farm' //*
                }),
                4: {    // Gas
                    1: 'Barren Perimeter Reservoir', //*
                    2: 'Token Perimeter Reservoir', //*
                    3: 'Minor Perimeter Reservoir', //*
                    4: 'Sizeable Perimeter Reservoir', //*
                    5: 'Ordinary Perimeter Reservoir' //*
                },
                5: {    // Wormhole
                    // no *wandering* w-space -> k-space wormholes
                    // all holes are statics or K162
                },
                6: {    // ORE
                    1: 'Ordinary Perimeter Deposit', //*
                    2: 'Common Perimeter Deposit', //*
                    3: 'Unexceptional Frontier Deposit', //*
                    4: 'Average Frontier Deposit', //*
                    5: 'Isolated Core Deposit', //*
                    6: 'Uncommon Core Deposit' //*
                },
                7: {    // Ghost

                }
            },
            3: {    // C3
                1: {    // Combat
                    1: 'Fortification Frontier Stronghold',
                    2: 'Outpost Frontier Stronghold',
                    3: 'Solar Cell',
                    4: 'The Oruze Construct'
                },
                2: $.extend({}, nullSecRelicSites, {    // Relic
                    1: 'Forgotten Frontier Quarantine Outpost', //*
                    2: 'Forgotten Frontier Recursive Depot' //*
                }),
                3: $.extend({}, nullSecDataSites, {    // Data
                    1: 'Unsecured Frontier Database', //*
                    2: 'Unsecured Frontier Receiver' //*
                }),
                4: {    // Gas
                    1: 'Barren Perimeter Reservoir', //*
                    2: 'Token Perimeter Reservoir', //*
                    3: 'Minor Perimeter Reservoir', //*
                    4: 'Sizeable Perimeter Reservoir', //*
                    5: 'Ordinary Perimeter Reservoir', //*
                    6: 'Bountiful Frontier Reservoir', //*
                    7: 'Vast Frontier Reservoir' //*
                },
                5: {    // Wormhole
                    1: 'V301 - C1',
                    2: 'I182 - C2',
                    3: 'N968 - C3',
                    4: 'T405 - C4',
                    5: 'N770 - C5',
                    6: 'A982 - C6'
                },
                6: {    // ORE
                    1: 'Ordinary Perimeter Deposit', //*
                    2: 'Common Perimeter Deposit', //*
                    3: 'Unexceptional Frontier Deposit', //*
                    4: 'Average Frontier Deposit', //*
                    5: 'Infrequent Core Deposit', //*
                    6: 'Unusual Core Deposit' //*
                },
                7: {    // Ghost

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
                4: {    // Gas
                    1: 'Barren Perimeter Reservoir', //*
                    2: 'Token Perimeter Reservoir', //*
                    3: 'Minor Perimeter Reservoir', //*
                    4: 'Sizeable Perimeter Reservoir', //*
                    5: 'Ordinary Perimeter Reservoir', //*
                    6: 'Vast Frontier Reservoir' //*
                },
                5: {    // Wormhole
                    // no *wandering* w-space -> k-space wormholes
                    // all holes are statics or K162
                },
                6: {    // ORE
                    1: 'Ordinary Perimeter Deposit', //*
                    2: 'Common Perimeter Deposit', //*
                    3: 'Unexceptional Frontier Deposit', //*
                    4: 'Average Frontier Deposit', //*
                    5: 'Unusual Core Deposit' //*
                },
                7: {    // Ghost

                }
            },
            5: {    // C5
                1: {    // Combat
                    1: 'Core Garrison', //*
                    2: 'Core Stronghold', //*
                    3: 'Oruze Osobnyk', //*
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
                4: {    // Gas
                    1: 'Barren Perimeter Reservoir', //*
                    2: 'Minor Perimeter Reservoir', //*
                    3: 'Ordinary Perimeter Reservoir', //*
                    4: 'Sizeable Perimeter Reservoir', //*
                    5: 'Token Perimeter Reservoir', //*
                    6: 'Bountiful Frontier Reservoir', //*
                    7: 'Vast Frontier Reservoir', //*
                    8: 'Instrumental Core Reservoir', //*
                    9: 'Vital Core Reservoir' //*
                },
                5: {    // Wormhole
                    1: 'D792 - HS',
                    2: 'C140 - LS',
                    3: 'Z142 - 0.0'
                },
                6: {    // ORE
                    1: 'Average Frontier Deposit', //*
                    2: 'Unexceptional Frontier Deposit', //*
                    3: 'Uncommon Core Deposit', //*
                    4: 'Ordinary Perimeter Deposit', //*
                    5: 'Common Perimeter Deposit', //*
                    6: 'Exceptional Core Deposit', //*
                    7: 'Infrequent Core Deposit', //*
                    8: 'Unusual Core Deposit', //*
                    9: 'Rarified Core Deposit', //*
                    10: 'Isolated Core Deposit' //*
                },
                7: {    // Ghost

                }
            },
            6: {    // C6
                1: {    // Combat
                    1: 'Core Citadel', //*
                    2: 'Core Bastion', //*
                    3: 'Strange Energy Readings', //*
                    4: 'The Mirror' //*
                },
                2: {    // Relic
                    1: 'Forgotten Core Assembly Hall', //*
                    2: 'Forgotten Core Circuitry Disassembler' //*
                },
                3: {    // Data
                    1: 'Unsecured Core Backup Array', //*
                    2: 'Unsecured Core Emergence' //*
                },
                4: {    // Gas
                    1: 'Barren Perimeter Reservoir', //*
                    2: 'Minor Perimeter Reservoir', //*
                    3: 'Ordinary Perimeter Reservoir', //*
                    4: 'Sizeable Perimeter Reservoir', //*
                    5: 'Token Perimeter Reservoir', //*
                    6: 'Bountiful Frontier Reservoir', //*
                    7: 'Vast Frontier Reservoir', //*
                    8: 'Instrumental Core Reservoir', //*
                    9: 'Vital Core Reservoir' //*
                },
                5: {    // Wormhole
                    1: 'D792 - HS',
                    2: 'C391 - LS',
                    3: 'Z142 - 0.0'
                },
                6: {    // ORE
                    1: 'Ordinary Perimeter Deposit', //*
                    2: 'Common Perimeter Deposit', //*
                    3: 'Unexceptional Frontier Deposit', //*
                    4: 'Average Frontier Deposit', //*
                    5: 'Rarified Core Deposit' //*
                },
                7: {    // Ghost
                    1: 'Superior Blood Raider Covert Research Facility' //*
                }
            },
            13: {   // Shattered Wormholes
                5: {    // Wormhole (some of them are static)
                    1: 'P060 - C1',
                    2: 'Z647 - C1',
                    3: 'D382 - C2',
                    4: 'L005 - C2',
                    5: 'N766 - C2',
                    6: 'C247 - C3',
                    7: 'K346 - C3',
                    8: 'M267 - C3',
                    9: 'O477 - C3',
                    10: 'X877 - C4',
                    11: 'Y683 - C4',
                    12: 'H296 - C5',
                    13: 'H900 - C5',
                    14: 'H296 - C5',
                    15: 'N062 - C5',
                    16: 'V911 - C5',
                    17: 'U574 - C6',
                    18: 'V753 - C6',
                    19: 'W237 - C6',
                    20: 'B274 - HS',
                    21: 'D792 - HS',
                    22: 'D845 - HS',
                    23: 'N110 - HS',
                    24: 'A239 - LS',
                    25: 'C391 - LS',
                    26: 'J244 - LS',
                    27: 'U201 - LS',
                    28: 'U210 - LS',
                    29: 'C248 - NS',
                    30: 'E545 - NS',
                    31: 'K346 - NS',
                    32: 'Z060 - NS'
                }
            }
        }, // system type (k-space)
        2:  {
            10: {   // High Sec
                5:  {   // Wormhole
                    1: 'Z971 - C1',
                    2: 'R943 - C2',
                    3: 'X702 - C3',
                    // no C4
                    4: 'M555 - C5',
                    5: 'B041 - C6',
                    6: 'A641 - HS',
                    7: 'R051 - LS',
                    8: 'V283 - NS'
                }
            },
            11: {   // Low Sec
                5:  {   // Wormhole
                    1: 'Z971 - C1',
                    2: 'R943 - C2',
                    3: 'X702 - C3',
                    // no C4
                    4: 'N432 - C5',
                    5: 'U319 - C6',
                    6: 'B449 - HS',
                    7: 'N944 - LS',
                    8: 'S199 - NS'
                }
            },
            12: {   // 0.0
                5:  {   // Wormhole
                    1: 'Z971 - C1',
                    2: 'R943 - C2',
                    3: 'X702 - C3',
                    // no C4
                    4: 'N432 - C5',
                    5: 'U319 - C6',
                    6: 'B449 - HS',
                    7: 'N944 - LS',
                    8: 'S199 - NS'
                }
            }
        }
    };


    return signatureTypes;
});
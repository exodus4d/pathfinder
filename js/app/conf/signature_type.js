/**
 * Created by exodus4d on 06.07.2015.
 * static signature types
 *
 * (*) marked fields are in-game verified and
 * proofed, signature names (copy & paste from scanning window)
 */

define(['jquery'], ($) => {

    'use strict';

    // signature sources
    // http://de.sistersprobe.wikia.com/wiki/EVE_Sister_Core_Scanner_Probe_Wiki


    // NullSec Relic sites, which can also spawn in C1, C2, C3 wormholes
    let nullSecRelicSites = {
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
    let nullSecDataSites = {
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
    let signatureTypes = {
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
                    // all k-space exits are static or K162
                    1: 'H121 - C1',
                    2: 'C125 - C2',
                    3: 'O883 - C3',
                    4: 'M609 - C4',
                    5: 'L614 - C5',
                    6: 'S804 - C6',
                    7: 'F353 - C12 Thera'
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
                    // all w-space -> w-space are statics or K162
                    1: 'Z647 - C1',
                    2: 'D382 - C2',
                    3: 'O477 - C3',
                    4: 'Y683 - C4',
                    5: 'N062 - C5',
                    6: 'R474 - C6',
                    7: 'F135 - C12 Thera'
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
                    // all k-space exits are static or K162
                    1: 'V301 - C1',
                    2: 'I182 - C2',
                    3: 'N968 - C3',
                    4: 'T405 - C4',
                    5: 'N770 - C5',
                    6: 'A982 - C6',
                    7: 'F135 - C12 Thera'
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
                    6: 'Vast Frontier Reservoir', //*
                    7: 'Bountiful Frontier Reservoir' //*
                },
                5: {    // Wormhole
                    // no *wandering* w-space -> w-space
                    // all holes are statics or K162
                    1: 'S047 - H',
                    2: 'N290 - L',
                    3: 'K329 - 0.0'
                },
                6: {    // ORE
                    1: 'Ordinary Perimeter Deposit', //*
                    2: 'Common Perimeter Deposit', //*
                    3: 'Unexceptional Frontier Deposit', //*
                    4: 'Average Frontier Deposit', //*
                    5: 'Unusual Core Deposit', //*
                    6: 'Infrequent Core Deposit' //*
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
                    1: 'D792 - H',
                    2: 'C140 - L',
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
                    1: 'B520 - H',
                    2: 'D792 - H',
                    3: 'C140 - L',
                    4: 'C391 - L',
                    5: 'C248 - 0.0',
                    6: 'Z142 - 0.0'
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
            12: {   // Thera wormhole
                1: {    // Combat
                    1: 'Epicenter',
                    2: 'Expedition Command Outpost Wreck',
                    3: 'Planetary Colonization Office Wreck',
                    4: 'Testing Facilities'
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
                    7: 'M267 - C3',
                    8: 'O477 - C3',
                    9: 'X877 - C4',
                    10: 'Y683 - C4',
                    11: 'H296 - C5',
                    12: 'H900 - C5',
                    13: 'H296 - C5',
                    14: 'N062 - C5',    // ??
                    15: 'V911 - C5',
                    16: 'U574 - C6',
                    17: 'V753 - C6',
                    18: 'W237 - C6',
                    19: 'B274 - H',
                    20: 'D792 - H',
                    21: 'D845 - H',
                    22: 'N110 - H',
                    23: 'A239 - L',
                    24: 'C391 - L',
                    25: 'J244 - L',
                    26: 'U201 - L',    // ??
                    27: 'U210 - L',
                    28: 'C248 - 0.0',
                    29: 'E545 - 0.0',
                    30: 'K346 - 0.0',
                    31: 'Z060 - 0.0'
                }
            }
        }, // system type (k-space)
        2:  {
            30: {   // High Sec
                5:  {   // Wormhole
                    1: 'Z971 - C1',
                    2: 'R943 - C2',
                    3: 'X702 - C3',
                    4: 'O128 - C4',
                    5: 'M555 - C5',
                    6: 'B041 - C6',
                    7: 'A641 - H',
                    8: 'R051 - L',
                    9: 'V283 - 0.0',
                    10: 'T458 - C12 Thera'
                }
            },
            31: {   // Low Sec
                5:  {   // Wormhole
                    1: 'Z971 - C1',
                    2: 'R943 - C2',
                    3: 'X702 - C3',
                    4: 'O128 - C4',
                    5: 'N432 - C5',
                    6: 'U319 - C6',
                    7: 'B449 - H',
                    8: 'N944 - L',
                    9: 'S199 - 0.0',
                    10: 'M164 - C12 Thera'
                }
            },
            32: {   // 0.0
                5:  {   // Wormhole
                    1: 'Z971 - C1',
                    2: 'R943 - C2',
                    3: 'X702 - C3',
                    4: 'O128 - C4',
                    5: 'N432 - C5',
                    6: 'U319 - C6',
                    7: 'B449 - H',
                    8: 'N944 - L',
                    9: 'S199 - 0.0',
                    10: 'L031 - C12 Thera'
                }
            }
        }
    };

    return signatureTypes;
});

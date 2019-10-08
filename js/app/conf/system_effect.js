/**
 * Created by exodus4d on 06.07.2015.
 * static system effects
 */


define([], () => {

    'use strict';

    /**
     * get system effect multiplier
     * @param areaId
     * @returns {number}
     */
    let getMultiplierByAreaId = areaId => {
        let multiply = 0;
        switch(areaId){
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
                multiply = areaId;  // C1-C6 holes
                break;
            case 13:
                multiply = 6;       // Shattered frigate holes
                break;
            case 14:
            case 15:
            case 16:
            case 17:
            case 18:
                multiply = 2;       // Drifter space
                break;
        }

        return multiply;
    };


    let magnetar = {
        1: [
            {
                effect: 'Damage',
                value: '+30%'
            }, {
                effect: 'Missile exp. radius',
                value: '+15%'
            }, {
                effect: 'Drone tracking',
                value: '-15%'
            }, {
                effect: 'Targeting range',
                value: '-15%'
            }, {
                effect: 'Tracking speed',
                value: '-15%'
            }, {
                effect: 'Target Painter strength',
                value: '-15%'
            }
        ],
        2: [
            {
                effect: 'Damage',
                value: '+44%'
            }, {
                effect: 'Missile exp. radius',
                value: '+22%'
            }, {
                effect: 'Drone tracking',
                value: '-22%'
            }, {
                effect: 'Targeting range',
                value: '-22%'
            }, {
                effect: 'Tracking speed',
                value: '-22%'
            }, {
                effect: 'Target Painter strength',
                value: '-22%'
            }
        ],
        3: [
            {
                effect: 'Damage',
                value: '+58%'
            }, {
                effect: 'Missile exp. radius',
                value: '+29%'
            }, {
                effect: 'Drone tracking',
                value: '-29%'
            }, {
                effect: 'Targeting range',
                value: '-29%'
            }, {
                effect: 'Tracking speed',
                value: '-29%'
            }, {
                effect: 'Target Painter strength',
                value: '-29%'
            }
        ],
        4: [
            {
                effect: 'Damage',
                value: '+72%'
            }, {
                effect: 'Missile exp. radius',
                value: '+36%'
            }, {
                effect: 'Drone tracking',
                value: '-36%'
            }, {
                effect: 'Targeting range',
                value: '-36%'
            }, {
                effect: 'Tracking speed',
                value: '-36%'
            }, {
                effect: 'Target Painter strength',
                value: '-36%'
            }
        ],
        5: [
            {
                effect: 'Damage',
                value: '+86%'
            }, {
                effect: 'Missile exp. radius',
                value: '+43%'
            }, {
                effect: 'Drone tracking',
                value: '-43%'
            }, {
                effect: 'Targeting range',
                value: '-43%'
            }, {
                effect: 'Tracking speed',
                value: '-43%'
            }, {
                effect: 'Target Painter strength',
                value: '-43%'
            }
        ],
        6: [
            {
                effect: 'Damage',
                value: '+100%'
            }, {
                effect: 'Missile exp. radius',
                value: '+50%'
            }, {
                effect: 'Drone tracking',
                value: '-50%'
            }, {
                effect: 'Targeting range',
                value: '-50%'
            }, {
                effect: 'Tracking speed',
                value: '-50%'
            }, {
                effect: 'Target Painter strength',
                value: '-50%'
            }
        ]
    };

    let redGiant = {
        1: [
            {
                effect: 'Heat damage',
                value: '+15%'
            }, {
                effect: 'Overload bonus',
                value: '+30%'
            }, {
                effect: 'Smart Bomb range',
                value: '+30%'
            }, {
                effect: 'Smart Bomb damage',
                value: '+30%'
            }, {
                effect: 'Bomb damage',
                value: '+30%'
            }
        ],
        2: [
            {
                effect: 'Heat damage',
                value: '+22%'
            }, {
                effect: 'Overload bonus',
                value: '+44%'
            }, {
                effect: 'Smart Bomb range',
                value: '+44%'
            }, {
                effect: 'Smart Bomb damage',
                value: '+44%'
            }, {
                effect: 'Bomb damage',
                value: '+44%'
            }
        ],
        3: [
            {
                effect: 'Heat damage',
                value: '+29%'
            }, {
                effect: 'Overload bonus',
                value: '+58%'
            }, {
                effect: 'Smart Bomb range',
                value: '+58%'
            }, {
                effect: 'Smart Bomb damage',
                value: '+58%'
            }, {
                effect: 'Bomb damage',
                value: '+58%'
            }
        ],
        4: [
            {
                effect: 'Heat damage',
                value: '+36%'
            }, {
                effect: 'Overload bonus',
                value: '+72%'
            }, {
                effect: 'Smart Bomb range',
                value: '+72%'
            }, {
                effect: 'Smart Bomb damage',
                value: '+72%'
            }, {
                effect: 'Bomb damage',
                value: '+72%'
            }
        ],
        5: [
            {
                effect: 'Heat damage',
                value: '+43%'
            }, {
                effect: 'Overload bonus',
                value: '+86%'
            }, {
                effect: 'Smart Bomb range',
                value: '+86%'
            }, {
                effect: 'Smart Bomb damage',
                value: '+86%'
            }, {
                effect: 'Bomb damage',
                value: '+86%'
            }
        ],
        6: [
            {
                effect: 'Heat damage',
                value: '+50%'
            }, {
                effect: 'Overload bonus',
                value: '+100%'
            }, {
                effect: 'Smart Bomb range',
                value: '+100%'
            }, {
                effect: 'Smart Bomb damage',
                value: '+100%'
            }, {
                effect: 'Bomb damage',
                value: '+100%'
            }
        ]
    };

    let pulsar = {
        1: [
            {
                effect: 'Shield HP',
                value: '+30%'
            }, {
                effect: 'Armor resist',
                value: '-15%'
            }, {
                effect: 'Capacitor recharge',
                value: '-15%'
            }, {
                effect: 'Signature',
                value: '+30%'
            }, {
                effect: 'NOS/Neut drain',
                value: '+30%'
            }
        ],
        2: [
            {
                effect: 'Shield HP',
                value: '+44%'
            }, {
                effect: 'Armor resist',
                value: '-22%'
            }, {
                effect: 'Capacitor recharge',
                value: '-22%'
            }, {
                effect: 'Signature',
                value: '+44%'
            }, {
                effect: 'NOS/Neut drain',
                value: '+44%'
            }
        ],
        3: [
            {
                effect: 'Shield HP',
                value: '+58%'
            }, {
                effect: 'Armor resist',
                value: '-29%'
            }, {
                effect: 'Capacitor recharge',
                value: '-29%'
            }, {
                effect: 'Signature',
                value: '+58%'
            }, {
                effect: 'NOS/Neut drain',
                value: '+58%'
            }
        ],
        4: [
            {
                effect: 'Shield HP',
                value: '+72%'
            }, {
                effect: 'Armor resist',
                value: '-36%'
            }, {
                effect: 'Capacitor recharge',
                value: '-36%'
            }, {
                effect: 'Signature',
                value: '+72%'
            }, {
                effect: 'NOS/Neut drain',
                value: '+72%'
            }
        ],
        5: [
            {
                effect: 'Shield HP',
                value: '+86%'
            }, {
                effect: 'Armor resist',
                value: '-43%'
            }, {
                effect: 'Capacitor recharge',
                value: '-43%'
            }, {
                effect: 'Signature',
                value: '+86%'
            }, {
                effect: 'NOS/Neut drain',
                value: '+86%'
            }
        ],
        6: [
            {
                effect: 'Shield HP',
                value: '+100%'
            }, {
                effect: 'Armor resist',
                value: '-50%'
            }, {
                effect: 'Capacitor recharge',
                value: '-50%'
            }, {
                effect: 'Signature',
                value: '+100%'
            }, {
                effect: 'NOS/Neut drain',
                value: '+100%'
            }
        ]
    };

    let wolfRayet = {
        1: [
            {
                effect: 'Armor HP',
                value: '+30%'
            }, {
                effect: 'Shield resist',
                value: '-15%'
            }, {
                effect: 'Small Weapon damage',
                value: '+60%'
            }, {
                effect: 'Signature size',
                value: '-15%'
            }
        ],
        2: [
            {
                effect: 'Armor HP',
                value: '+44%'
            }, {
                effect: 'Shield resist',
                value: '-22%'
            }, {
                effect: 'Small Weapon damage',
                value: '+88%'
            }, {
                effect: 'Signature size',
                value: '-22%'
            }
        ],
        3: [
            {
                effect: 'Armor HP',
                value: '+58%'
            }, {
                effect: 'Shield resist',
                value: '-29%'
            }, {
                effect: 'Small Weapon damage',
                value: '+116%'
            }, {
                effect: 'Signature size',
                value: '-29%'
            }
        ],
        4: [
            {
                effect: 'Armor HP',
                value: '+72%'
            }, {
                effect: 'Shield resist',
                value: '-36%'
            }, {
                effect: 'Small Weapon damage',
                value: '+144%'
            }, {
                effect: 'Signature size',
                value: '-36%'
            }
        ],
        5: [
            {
                effect: 'Armor HP',
                value: '+86%'
            }, {
                effect: 'Shield resist',
                value: '-43%'
            }, {
                effect: 'Small Weapon damage',
                value: '+172%'
            }, {
                effect: 'Signature size',
                value: '-43%'
            }
        ],
        6: [
            {
                effect: 'Armor HP',
                value: '+100%'
            }, {
                effect: 'Shield resist',
                value: '-50%'
            }, {
                effect: 'Small Weapon damage',
                value: '+200%'
            }, {
                effect: 'Signature size',
                value: '-50%'
            }
        ]
    };

    let cataclysmic = {
        1: [
            {
                effect: 'Local armor repair amount',
                value: '-15%'
            }, {
                effect: 'Local shield boost amount',
                value: '-15%'
            }, {
                effect: 'Shield transfer amount',
                value: '+30%'
            }, {
                effect: 'Remote repair amount',
                value: '+30%'
            }, {
                effect: 'Capacitor capacity',
                value: '+30%'
            }, {
                effect: 'Capacitor recharge time',
                value: '+15%'
            }, {
                effect: 'Remote Capacitor Transmitter amount',
                value: '-15%'
            }
        ],
        2: [
            {
                effect: 'Local armor repair amount',
                value: '-22%'
            }, {
                effect: 'Local shield boost amount',
                value: '-22%'
            }, {
                effect: 'Shield transfer amount',
                value: '+44%'
            }, {
                effect: 'Remote repair amount',
                value: '+44%'
            }, {
                effect: 'Capacitor capacity',
                value: '+44%'
            }, {
                effect: 'Capacitor recharge time',
                value: '+22%'
            }, {
                effect: 'Remote Capacitor Transmitter amount',
                value: '-22%'
            }
        ],
        3: [
            {
                effect: 'Local armor repair amount',
                value: '-29%'
            }, {
                effect: 'Local shield boost amount',
                value: '-29%'
            }, {
                effect: 'Shield transfer amount',
                value: '+58%'
            }, {
                effect: 'Remote repair amount',
                value: '+58%'
            }, {
                effect: 'Capacitor capacity',
                value: '+58%'
            }, {
                effect: 'Capacitor recharge time',
                value: '+29%'
            }, {
                effect: 'Remote Capacitor Transmitter amount',
                value: '-29%'
            }
        ],
        4: [
            {
                effect: 'Local armor repair amount',
                value: '-36%'
            }, {
                effect: 'Local shield boost amount',
                value: '-36%'
            }, {
                effect: 'Shield transfer amount',
                value: '+72%'
            }, {
                effect: 'Remote repair amount',
                value: '+72%'
            }, {
                effect: 'Capacitor capacity',
                value: '+72%'
            }, {
                effect: 'Capacitor recharge time',
                value: '+36%'
            }, {
                effect: 'Remote Capacitor Transmitter amount',
                value: '-36%'
            }
        ],
        5: [
            {
                effect: 'Local armor repair amount',
                value: '-43%'
            }, {
                effect: 'Local shield boost amount',
                value: '-43%'
            }, {
                effect: 'Shield transfer amount',
                value: '+86%'
            }, {
                effect: 'Remote repair amount',
                value: '+86%'
            }, {
                effect: 'Capacitor capacity',
                value: '+86%'
            }, {
                effect: 'Capacitor recharge time',
                value: '+43%'
            }, {
                effect: 'Remote Capacitor Transmitter amount',
                value: '-43%'
            }
        ],
        6: [
            {
                effect: 'Local armor repair amount',
                value: '-50%'
            }, {
                effect: 'Local shield boost amount',
                value: '-50%'
            }, {
                effect: 'Shield transfer amount',
                value: '+100%'
            }, {
                effect: 'Remote repair amount',
                value: '+100%'
            }, {
                effect: 'Capacitor capacity',
                value: '+100%'
            }, {
                effect: 'Capacitor recharge time',
                value: '+50%'
            }, {
                effect: 'Remote Capacitor Transmitter amount',
                value: '-50%'
            }
        ]
    };

    let blackHole = {
        1: [
            {
                effect: 'Missile velocity',
                value: '+15%'
            }, {
                effect: 'Missile exp. velocity',
                value: '+30%'
            }, {
                effect: 'Ship velocity',
                value: '+30%'
            }, {
                effect: 'Stasis Webifier strength',
                value: '-15%'
            }, {
                effect: 'Inertia',
                value: '+15%'
            }, {
                effect: 'Targeting range',
                value: '+30%'
            }
        ],
        2: [
            {
                effect: 'Missile velocity',
                value: '+22%'
            }, {
                effect: 'Missile exp. velocity',
                value: '+44%'
            }, {
                effect: 'Ship velocity',
                value: '+44%'
            }, {
                effect: 'Stasis Webifier strength',
                value: '-22%'
            }, {
                effect: 'Inertia',
                value: '+22%'
            }, {
                effect: 'Targeting range',
                value: '+44%'
            }
        ],
        3: [
            {
                effect: 'Missile velocity',
                value: '+29%'
            }, {
                effect: 'Missile exp. velocity',
                value: '+58%'
            }, {
                effect: 'Ship velocity',
                value: '+58%'
            }, {
                effect: 'Stasis Webifier strength',
                value: '-29%'
            }, {
                effect: 'Inertia',
                value: '+29%'
            }, {
                effect: 'Targeting range',
                value: '+58%'
            }
        ],
        4: [
            {
                effect: 'Missile velocity',
                value: '+36%'
            }, {
                effect: 'Missile exp. velocity',
                value: '+72%'
            }, {
                effect: 'Ship velocity',
                value: '+72%'
            }, {
                effect: 'Stasis Webifier strength',
                value: '-36%'
            }, {
                effect: 'Inertia',
                value: '+36%'
            }, {
                effect: 'Targeting range',
                value: '+72%'
            }
        ],
        5: [
            {
                effect: 'Missile velocity',
                value: '+43%'
            }, {
                effect: 'Missile exp. velocity',
                value: '+86%'
            }, {
                effect: 'Ship velocity',
                value: '+86%'
            }, {
                effect: 'Stasis Webifier strength',
                value: '-43%'
            }, {
                effect: 'Inertia',
                value: '+43%'
            }, {
                effect: 'Targeting range',
                value: '+86%'
            }
        ],
        6: [
            {
                effect: 'Missile velocity',
                value: '+50%'
            }, {
                effect: 'Missile exp. velocity',
                value: '+100%'
            }, {
                effect: 'Ship velocity',
                value: '+100%'
            }, {
                effect: 'Stasis Webifier strength',
                value: '-50%'
            }, {
                effect: 'Inertia',
                value: '+50%'
            }, {
                effect: 'Targeting range',
                value: '+100%'
            }
        ]
    };

    // system effects
    return {
        getMultiplierByAreaId: getMultiplierByAreaId,
        wh: {
            magnetar: {
                1: magnetar[getMultiplierByAreaId(1)],
                2: magnetar[getMultiplierByAreaId(2)],
                3: magnetar[getMultiplierByAreaId(3)],
                4: magnetar[getMultiplierByAreaId(4)],
                5: magnetar[getMultiplierByAreaId(5)],
                6: magnetar[getMultiplierByAreaId(6)],
                16: magnetar[getMultiplierByAreaId(16)]
            },
            redGiant: {
                1: redGiant[getMultiplierByAreaId(1)],
                2: redGiant[getMultiplierByAreaId(2)],
                3: redGiant[getMultiplierByAreaId(3)],
                4: redGiant[getMultiplierByAreaId(4)],
                5: redGiant[getMultiplierByAreaId(5)],
                6: redGiant[getMultiplierByAreaId(6)],
                14: redGiant[getMultiplierByAreaId(14)]
            },
            pulsar: {
                1: pulsar[getMultiplierByAreaId(1)],
                2: pulsar[getMultiplierByAreaId(2)],
                3: pulsar[getMultiplierByAreaId(3)],
                4: pulsar[getMultiplierByAreaId(4)],
                5: pulsar[getMultiplierByAreaId(5)],
                6: pulsar[getMultiplierByAreaId(6)],
                17: pulsar[getMultiplierByAreaId(17)]
            },
            wolfRayet: {
                1: wolfRayet[getMultiplierByAreaId(1)],
                2: wolfRayet[getMultiplierByAreaId(2)],
                3: wolfRayet[getMultiplierByAreaId(3)],
                4: wolfRayet[getMultiplierByAreaId(4)],
                5: wolfRayet[getMultiplierByAreaId(5)],
                6: wolfRayet[getMultiplierByAreaId(6)],
                13: wolfRayet[getMultiplierByAreaId(13)],
                18: wolfRayet[getMultiplierByAreaId(18)]
            },
            cataclysmic: {
                1: cataclysmic[getMultiplierByAreaId(1)],
                2: cataclysmic[getMultiplierByAreaId(2)],
                3: cataclysmic[getMultiplierByAreaId(3)],
                4: cataclysmic[getMultiplierByAreaId(4)],
                5: cataclysmic[getMultiplierByAreaId(5)],
                6: cataclysmic[getMultiplierByAreaId(6)],
                15: cataclysmic[getMultiplierByAreaId(15)]
            },
            blackHole: {
                1: blackHole[getMultiplierByAreaId(1)],
                2: blackHole[getMultiplierByAreaId(2)],
                3: blackHole[getMultiplierByAreaId(3)],
                4: blackHole[getMultiplierByAreaId(4)],
                5: blackHole[getMultiplierByAreaId(5)],
                6: blackHole[getMultiplierByAreaId(6)]
            }
        }
    };
});
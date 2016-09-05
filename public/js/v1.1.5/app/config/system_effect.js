/**
 * Created by exodus4d on 06.07.2015.
 * static system effects
 */


define([], function() {

    'use strict';

    // system effects
    var systemEffects = {
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
                wolfRayet: {
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
        };


    return systemEffects;
});
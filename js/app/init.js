/**
 *  Init
 */

define(["jquery"], function($) {

    "use strict";

    var Config = {
        //  baseUrl: "http://localhost/exodus4d/pathfinder/" // TODO: change baseURL

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
           }

        }





    };

    return Config;
});
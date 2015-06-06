define([
    'jquery',
    'app/init',
    'pnotify',
    //'pnotify.buttons',
    //'pnotify.confirm',
    'pnotify.nonblock',
    'pnotify.desktop',
    //'pnotify.history',
    'pnotify.callbacks'
], function($, Init, PNotify) {

    'use strict';

    var config = {
        title: '',
        text: '',
        type: '',                                                       // 'info', 'success', error, 'warning'
        icon: false,
        opacity: 0.8,
        styling: 'fontawesome',                                         // 'fontawesome', 'bootstrap3', 'jqueryui'
        animate_speed: 200,                                             // effect animation
        position_animate_speed: 100,                                    // animation speed for notifications moving up/down
        hide: true,                                                     // close after few seconds
        delay: 5000,                                                    // visible time for notification in browser
        mouse_reset: true,                                              // Reset the hide timer if the mouse moves over the notice.
        shadow: true,
        addclass: 'stack-bottomright',                                  // class for display, must changed on stack different stacks
        width: '250px',
        // animation settings
        animation: {
            'effect_in': 'fade',
            'options_in': {
                easing: 'linear'
            },
            'effect_out': 'fade',
            'options_out': {
                easing: 'linear'
            }
        },
        // nonblock extension parameter (click through notifications)
        nonblock: {
            nonblock: true,
            nonblock_opacity: 0.2
        },
        // desktop extension "Web Notifications"
        desktop: {
            desktop: false,                                             // change for enable
            icon: Init.path.img + 'notifications/logo.png'              // default image for desktop notifications
        }
    };

    // stack container for all notifications
    var stack = {
        bottomRight: {
            stack: {
                dir1: 'up',
                dir2: 'left',
                firstpos1: 30,
                firstpos2: 10,
                spacing1: 5,
                spacing2: 5,
                push: 'bottom'
            },
            addclass: 'stack-bottomright',
            width: '250px',
            opacity: 0.8
        },
        barTop: {
            stack: {
                dir1: 'down',
                dir2: 'right',
                push: 'top',
                spacing1: 0,
                spacing2: 0,

            },
            addclass: 'stack-bar-top',
            width: '80%',
            opacity: 1
        },
        barBottom: {
            stack: {
                dir1: 'up',
                dir2: 'right',
                firstpos1: 30,
                spacing1: 0,
                spacing2: 0
            },
            addclass: 'stack-bar-bottom',
            width: '100%',
            opacity: 1
        }
    };

    /**
     * show a notification in browser and/or "Web Notifications"  in OS
     * @param customConfig
     */
    var showNotify = function(customConfig, settings){

        customConfig = $.extend({}, config, customConfig );

        // desktop notification
        if(
            settings &&
            settings.desktop === true
        ){
            // ask for Web Notifications permission
            PNotify.desktop.permission();

            customConfig.delay = 10000;
            customConfig.desktop.desktop = true;

            // make browser tab blink
            startTabBlink(customConfig.title);

        }else{
            customConfig.delay = 5000;
            customConfig.desktop.desktop = false;
        }

        // set notification stack
        if(
            settings &&
            settings.stack
        ){
            customConfig.stack = stack[settings.stack].stack;
            customConfig.addclass = stack[settings.stack].addclass;
            customConfig.width = stack[settings.stack].width;
            customConfig.opacity = stack[settings.stack].opacity;
        }else{
            customConfig.stack = stack.bottomRight.stack;
            customConfig.addclass = stack.bottomRight.addclass;
            customConfig.opacity = stack.bottomRight.opacity;
        }

        switch(customConfig.type){
            case 'info':
                customConfig.icon = 'fa fa-info fa-fw fa-lg';
                break;
            case 'success':
                customConfig.icon = 'fa fa-check fa-fw fa-lg';
                break;
            case 'warning':
                customConfig.icon = 'fa fa-exclamation-triangle fa-fw fa-lg';
                break;
            case 'error':
                customConfig.icon = 'fa fa-close fa-fw fa-lg';
                break;
            default:
                customConfig.icon = false;
        }

        new PNotify(customConfig);
    };

    /**
     * change document.title and make the browsers tab blink
     * @param blinkTitle
     */
    var startTabBlink = function(blinkTitle){

        var initBlink = (function(blinkTitle){

            var currentTitle = document.title;

            var timeoutId;
            var blink = function(){
                document.title = document.title === blinkTitle ? currentTitle : blinkTitle;
            };

            var clear = function() {
                clearInterval(timeoutId);
                document.title = currentTitle;
                window.onmousemove = null;
                timeoutId = null;
            };

            return function () {
                if (!timeoutId) {
                    timeoutId = setInterval(blink, 1000);
                    window.onmousemove = clear;
                }
            };

        }( blinkTitle ));

        initBlink();

    };


    return {
        showNotify: showNotify,
        startTabBlink: startTabBlink
    };
});


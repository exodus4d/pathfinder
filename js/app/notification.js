define([
    'jquery',
    'pnotify',
    //'pnotify.buttons',
    //'pnotify.confirm',
    'pnotify.nonblock',
    'pnotify.desktop',
    //'pnotify.history',
    'pnotify.callbacks',
    //'pnotify.reference'
], function($, PNotify) {

    'use strict';

    var config = {
        title: '',
        text: '',
        type: '',                           // 'info', 'success', error, 'warning'
        icon: false,
        opacity: 0.8,
        styling: 'fontawesome',             // 'fontawesome', 'bootstrap3', 'jqueryui'
        animate_speed: 200,                 // effect animation
        position_animate_speed: 100,        // animation speed for notifications moving up/down
        hide: true,                         // close after few seconds
        delay: 5000,                        // visible time for notification in browser
        mouse_reset: true,                  // Reset the hide timer if the mouse moves over the notice.
        shadow: true,
        addclass: 'stack-bottomright',
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
            desktop: false,                 // change for enable
            icon: 'http://eve.damianvila.com/images/eve-logo.png'
        }
    };

    // stack container for all notifications
    var stack_bottomright = {
        dir1: 'up',
        dir2: 'left',
        firstpos1: 10,
        firstpos2: 10,
        spacing1: 5,
        spacing2: 5,
        push: 'bottom'
    };

    /**
     * show a notification in browser and/or "Web Notifications"  in OS
     * @param customConfig
     */
    var showNotify = function(customConfig){

        customConfig = $.extend({}, config, customConfig );

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
        customConfig.stack = stack_bottomright;

        if(
            customConfig.desktop &&
            customConfig.desktop.desktop === true
        ){
            // ask for Web Notifications permission
            PNotify.desktop.permission();
        }

        new PNotify(customConfig);
    };


    return {
        showNotify: showNotify
    };
});


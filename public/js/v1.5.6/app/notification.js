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
], ($, Init, PNotify) => {
    'use strict';

    let config = {
        title: '',
        text: '',
        type: '',                                                       // 'info', 'success', error, 'warning'
        icon: false,
        styling: 'fontawesome',                                         // 'fontawesome', 'bootstrap3', 'jqueryui'
        animate_speed: 'fast',                                          // animation speed for notifications moving up/down
        hide: true,                                                     // close after few seconds
        delay: 5000,                                                    // visible time for notification in browser
        mouse_reset: true,                                              // Reset the hide timer if the mouse moves over the notice.
        shadow: true,
        addclass: 'stack-bottomright',                                  // class for display, must changed on stack different stacks
        width: '250px',
        // nonblock extension parameter (click through notifications)
        nonblock: {
            nonblock: true,                                             // change for enable
            nonblock_opacity: 0.9
        },
        // desktop extension "Web Notifications"
        desktop: {
            desktop: false,                                             // change for enable
            icon: Init.path.img + 'notifications/logo.png'              // default image for desktop notifications
        }
    };

    // initial page title (cached)
    let initialPageTitle = document.title;

    // global blink timeout cache
    let blinkTimer;

    // stack container for all notifications
    let stack = {
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
        },
        barBottom: {
            stack: {
                dir1: 'up',
                dir2: 'right',
               // context: $('body'),
                spacing1: 0,
                spacing2: 0
            },
            addclass: 'stack-bar-bottom',
            width: '70%',
        }
    };

    /**
     * show a notification in browser and/or "Web Notifications"  in OS
     * @param customConfig
     * @param settings
     */
    let showNotify = (customConfig, settings) => {
        customConfig = $.extend(true, {}, config, customConfig );

        // desktop notification
        if(
            settings &&
            settings.desktop === true
        ){
            // ask for Web Notifications permission
            PNotify.desktop.permission();

            customConfig.delay = 10000;
            customConfig.nonblock.nonblock = false; // true results in error on "click" desktop notification
            customConfig.desktop.desktop = true;

            // make browser tab blink
            startTabBlink(customConfig.title);
        }

        // set notification stack
        if(
            settings &&
            settings.stack
        ){
            customConfig.stack = stack[settings.stack].stack;
            customConfig.addclass = stack[settings.stack].addclass;
            customConfig.width = stack[settings.stack].width;
        }else{
            customConfig.stack = stack.bottomRight.stack;
            customConfig.addclass = stack.bottomRight.addclass;
        }

        switch(customConfig.type){
            case 'info':
                customConfig.icon = 'fas fa-info fa-fw fa-lg';
                break;
            case 'success':
                customConfig.icon = 'fas fa-check fa-fw fa-lg';
                break;
            case 'warning':
                customConfig.icon = 'fas fa-exclamation-triangle fa-fw fa-lg';
                break;
            case 'error':
                customConfig.icon = 'fas fa-times fa-fw fa-lg';
                break;
            case 'lock':
                customConfig.icon = 'fas fa-lock fa-fw fa-lg';
                customConfig.type = 'success';
                break;
            case 'unlock':
                customConfig.icon = 'fas fa-unlock fa-fw fa-lg';
                customConfig.type = 'info';
                break;
            default:
                customConfig.icon = false;
        }

        let notify = new PNotify(customConfig);

        if(
            settings &&
            settings.click
        ){
            // set onclick for notification
            notify.get().on('click', settings.click);
        }

    };

    /**
     * change document.title and make the browsers tab blink
     * @param blinkTitle
     */
    let startTabBlink = blinkTitle => {
        let initBlink = (function(blinkTitle){

            // count blinks if tab is currently active
            let activeTabBlinkCount = 0;

            let blink = function(){
                // number of "blinks" should be limited if tab is currently active
                if(window.isVisible){
                    activeTabBlinkCount++;
                }

                // toggle page title
                document.title = (document.title === blinkTitle) ? initialPageTitle : blinkTitle;

                if(activeTabBlinkCount > 10){
                    stopTabBlink();
                }
            };

            return function(){
                if(!blinkTimer){
                    blinkTimer = setInterval(blink, 1000);
                }
            };
        }(blinkTitle));

        initBlink();
    };

    /**
     * stop blinking document.title
     */
    let stopTabBlink = () => {
        if(blinkTimer){
            clearInterval(blinkTimer);
            document.title = initialPageTitle;
            blinkTimer = null;
        }
    };

    return {
        showNotify: showNotify,
        startTabBlink: startTabBlink,
        stopTabBlink: stopTabBlink
    };
});


define([
    'PNotify',
    'PNotifyButtons',
    'PNotifyCallbacks',
    'PNotifyDesktop',
    'NonBlock'
], (PNotify) => {
    'use strict';

    let stackConfig = {
        bottomRight: {
            stack: {
                dir1: 'up',
                dir2: 'left',
                firstpos1: 32,
                firstpos2: 10,
                spacing1: 5,
                spacing2: 5,
                push: 'bottom',
                context: document.body
            }
        },
        barBottom: {
            stack: {
                dir1: 'up',
                firstpos1: 32,
                spacing1: 0,
                context: document.querySelector(`.pf-site`)
            },
            addclass: 'stack-bar-bottom'
        }
    };

    /**
     * default PNotify config
     */
    let initDefaultPNotifyConfig = () => {
        PNotify.defaults.styling = 'bootstrap3';
        PNotify.defaults.icons = 'fontawesome5';
        PNotify.defaults.addClass = 'nonblock';
        PNotify.defaults.delay = 5000;
        PNotify.defaults.width = '250px';
        PNotify.defaults.animateSpeed = 'fast';

        PNotify.defaults.stack = stackConfig.bottomRight.stack;

        PNotify.modules.Desktop.defaults.icon = '/public/img/notifications/logo.png';
    };

    /**
     * show browser/desktop notification
     * @param config
     * @param options
     */
    let showNotify = (config = {}, options = {}) => {

        if(options.desktop){
            config.modules = {
                Desktop: Object.assign({}, {desktop: true}, options.desktop)
            };
        }

        switch(config.type){
            case 'info':
                config.icon = 'fas fa-info fa-fw fa-lg';
                break;
            case 'success':
                config.icon = 'fas fa-check fa-fw fa-lg';
                break;
            case 'notice':
            case 'warning':
                config.icon = 'fas fa-exclamation-triangle fa-fw fa-lg';
                config.type = 'notice';
                break;
            case 'error':
                config.icon = 'fas fa-times fa-fw fa-lg';
                break;
            case 'lock':
                config.icon = 'fas fa-lock fa-fw fa-lg';
                config.type = 'success';
                break;
            case 'unlock':
                config.icon = 'fas fa-unlock fa-fw fa-lg';
                config.type = 'info';
                break;
            default:
                config.icon = false;
        }

        if(options.stack){
            config.stack = stackConfig[options.stack].stack;
            config.addClass = stackConfig[options.stack].addclass;
        }

        let notice = PNotify.alert(config);

        if(typeof options.click === 'function'){
            notice.refs.elem.style.cursor = 'pointer';
            notice.on('click', options.click);
        }
    };

    initDefaultPNotifyConfig();

    return {
        showNotify: showNotify
    };
});
/**
 * SharedWorker config for map
 */

define([
    'app/util'
], function(Util){
    'use strict';

    let config = {

    };

    let sharedWorker    = null;
    let MsgWorker       = null;
    let characterId     = null;

    /**
     * get WebSocket URL for SharedWorker script
     * @returns {string}
     */
    let getWebSocketURL = () => {
        let domain = location.host;
        let workerProtocol = (window.location.protocol === 'https:') ? 'wss:' : 'ws:';
        return workerProtocol + '//' + domain + '/ws/map/update';
    };

    /**
     * get SharedWorker Script path
     * @returns {string}
     */
    let getWorkerScript = () => {
        return '/public/js/' + Util.getVersion() + '/app/worker/map.js';
    };

    /**
     * get path to message object
     * @returns {string}
     */
    let getMessageWorkerObjectPath = () => {
        return '/public/js/' + Util.getVersion() + '/app/worker/message.js';
    };

    /**
     * init (connect) WebSocket within SharedWorker
     */
    let initSocket = () => {
        let MsgWorkerInit = new MsgWorker('ws:init');
        MsgWorkerInit.data({
            uri: getWebSocketURL(),
            characterId: characterId,
        });

        sharedWorker.port.postMessage(MsgWorkerInit);
    };

    /**
     * init (start/connect) to "SharedWorker"
     * -> set worker events
     */
    let init = (config) => {
        // set characterId that is connected with this SharedWorker PORT
        characterId = parseInt(config.characterId);

        // get  message Class for App <=> SharedWorker MessageEvent communication
        requirejs([getMessageWorkerObjectPath()], () => {
            MsgWorker = window.MsgWorker;

            // start/connect to "SharedWorker"
            sharedWorker = new SharedWorker( getWorkerScript(), getMessageWorkerObjectPath() );

            sharedWorker.port.addEventListener('message', (e) => {
                let MsgWorkerMessage = e.data;
                Object.setPrototypeOf(MsgWorkerMessage, MsgWorker.prototype);

                switch(MsgWorkerMessage.command){
                    case 'ws:open':
                        config.callbacks.onOpen(MsgWorkerMessage);
                        break;
                    case 'ws:send':
                        config.callbacks.onGet(MsgWorkerMessage);
                        break;
                    case 'ws:closed':
                        config.callbacks.onClosed(MsgWorkerMessage);
                        break;
                    case 'ws:error':
                        config.callbacks.onError(MsgWorkerMessage);
                        break;

                }
            }, false);

            sharedWorker.onerror = (e) => {
                // could not connect to SharedWorker script -> send error back
                let MsgWorkerError = new MsgWorker('sw:error');
                MsgWorkerError.meta({
                    reason: 'Could not connect to SharedWorker: ' + getWorkerScript()
                });

                config.callbacks.onError(MsgWorkerError);
            };

            sharedWorker.port.start();

            // SharedWorker initialized
            let MsgWorkerInit = new MsgWorker('sw:init');
            config.callbacks.onInit(MsgWorkerInit);

            // startWebSocket
            initSocket();
        });
    };

    let send = (task, data) => {
        let MsgWorkerSend = new MsgWorker('ws:send');
        MsgWorkerSend.task(task);
        MsgWorkerSend.data(data);

        sharedWorker.port.postMessage(MsgWorkerSend);
    };

    return {
        getWebSocketURL: getWebSocketURL,
        init: init,
        send: send
    };
});
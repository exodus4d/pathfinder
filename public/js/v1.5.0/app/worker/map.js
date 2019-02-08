'use strict';

// "fake" window object will contain "MsgWorker" after import
let window = {};                    // jshint ignore:line

// import "MsgWorker" class
self.importScripts( self.name );    // jshint ignore:line

let MsgWorker = window.MsgWorker;
let socket = null;
let ports = [];
let characterPorts = [];

// init "WebSocket" connection ========================================================================================
let initSocket = (uri) => {
    let MsgWorkerOpen = new MsgWorker('ws:open');

    if(socket === null){
        socket = new WebSocket(uri);

        // "WebSocket" open -----------------------------------------------------------------------
        socket.onopen = (e) => {
            MsgWorkerOpen.meta({
                readyState: socket.readyState
            });

            sendToCurrentPort(MsgWorkerOpen);
        };

        // "WebSocket message ---------------------------------------------------------------------
        socket.onmessage = (e) => {
            let response = JSON.parse(e.data);

            let MsgWorkerSend = new MsgWorker('ws:send');
            MsgWorkerSend.task( response.task );
            MsgWorkerSend.meta({
                readyState: this.readyState,
                characterIds: response.characterIds
            });
            MsgWorkerSend.data( response.load );

            broadcastPorts(MsgWorkerSend);
        };

        // "WebSocket" close ----------------------------------------------------------------------
        socket.onclose = (closeEvent) => {
            let MsgWorkerClosed = new MsgWorker('ws:closed');
            MsgWorkerClosed.meta({
                readyState: socket.readyState,
                code: closeEvent.code,
                reason: closeEvent.reason,
                wasClean: closeEvent.wasClean
            });

            broadcastPorts(MsgWorkerClosed);
            socket = null; // reset WebSocket
        };

        // "WebSocket" error ----------------------------------------------------------------------
        socket.onerror = (e) => {
            let MsgWorkerError = new MsgWorker('ws:error');
            MsgWorkerError.meta({
                readyState: socket.readyState
            });

            sendToCurrentPort(MsgWorkerError);
        };
    }else{
        // socket still open
        MsgWorkerOpen.meta({
            readyState: socket.readyState
        });
        sendToCurrentPort(MsgWorkerOpen);
    }
};

// send message to port(s) ============================================================================================
let sendToCurrentPort = (load) => {
    ports[ports.length - 1].postMessage(load);
};

let broadcastPorts = (load) => {
    // default: sent to all ports
    let sentToPorts = ports;

    // check if send() is limited to some ports
    let meta = load.meta();
    if(
        meta &&
        meta.characterIds &&
        meta.characterIds !== 'undefined' &&
        meta.characterIds instanceof Array
    ){
        // ... get ports for characterIds
        sentToPorts = getPortsByCharacterIds(meta.characterIds);
    }

    for(let i = 0; i < sentToPorts.length; i++){
        sentToPorts[i].postMessage(load);
    }
};

// port functions =====================================================================================================
let addPort = (port, characterId) => {
    characterId = parseInt(characterId);

    if(characterId > 0){
        characterPorts.push({
            characterId: characterId,
            port: port
        });
    }else{
        ports.push(port);
    }
};

let getPortsByCharacterIds = (characterIds) => {
    let ports = [];

    for(let i = 0; i < characterPorts.length; i++){
        for(let j = 0; j < characterIds.length; j++){
            if(characterPorts[i].characterId === characterIds[j]){
                ports.push(characterPorts[i].port);
            }
        }
    }

    return ports;
};

// "SharedWorker" connection ==========================================================================================
self.addEventListener('connect', (event) => {   // jshint ignore:line
    let port = event.ports[0];
    addPort(port);

    port.addEventListener('message', (e) => {
        let MsgWorkerMessage = e.data;
        Object.setPrototypeOf(MsgWorkerMessage, MsgWorker.prototype);

        switch(MsgWorkerMessage.command){
            case 'ws:init':
                let data = MsgWorkerMessage.data();
                // add character specific port (for broadcast) to individual ports (tabs)
                addPort(port, data.characterId);
                initSocket(data.uri);
                break;
            case 'ws:send':
                let MsgSocket = {
                    task: MsgWorkerMessage.task(),
                    load: MsgWorkerMessage.data()
                };

                socket.send(JSON.stringify(MsgSocket));
                break;
            case 'ws:close':
               // closeSocket();
                break;
        }
    }, false);

    port.start();
}, false);
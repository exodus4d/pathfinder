window.MsgWorker = class MessageWorker {

    constructor(cmd){
        /**
         * "command" type (identifies this message)
         */
        this.cmd = cmd;

        /**
         * "task" what should be done with this message
         * @type {string}
         */
        this.msgTask = '';

        /**
         * "message" meta data (e.g. error/close data from WebSocket
         * @type {null}
         */
        this.msgMeta = null;

        /**
         * "message" body (load)
         * @type {null}
         */
        this.msgBody = null;
    }

    get command(){
        return this.cmd;
    }

    task(task){
        if(task){
            this.msgTask = task;
        }

        return this.msgTask;
    }

    meta(metaData){
        if(metaData){
            this.msgMeta = metaData;
        }

        return this.msgMeta;
    }

    data(data){
        if(data){
            this.msgBody = data;
        }

        return this.msgBody;
    }
};
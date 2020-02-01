define([], () => {
    'use strict';

    let EventHandler = class EventHandler {

        constructor(){
            this._listeners = new Map();
        }

        addEventListener(target, type, listener, options){
            this._listeners.set(type, listener);
            target.addEventListener(this.constructor.eventParts(type).event, listener, options);
        }

        removeEventListener(target, type){
            target.removeEventListener(this.constructor.eventParts(type).event, this._listeners.get(type));
            this._listeners.delete(type);
        }

        static eventParts(type){
            return type.split('.').reduce((acc, val, i) => {
                acc[i ? 'namespace' : 'event'] = val;
                return acc;
            }, {});
        }
    };

    return new EventHandler();
});
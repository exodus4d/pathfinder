define([], () => {
    'use strict';

    /*
    Example1 callback -------------------------------------------------------------------------------------------------
    new TimeoutPromise((resolve, reject) => {
        request.get(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                resolve(body);
            } else {
                reject(error);
            }
        });
    }, 2000).then(data => {
        console.info((Date.now() - start)/1000, '--data -->  = ', data);
    }).catch(error => {
        console.info((Date.now() - start)/1000, '--error -->  = ', error);
    });

    Example2 DeferredPromise ------------------------------------------------------------------------------------------
    let deferredPromise = new DeferredPromise();

    new TimeoutPromise(deferredPromise, 2000).then(data => {
        console.info((Date.now() - start)/1000, '--data -->  = ', data);
    }).catch(error => {
        console.info((Date.now() - start)/1000, '--error -->  = ', error);
    });

    deferredPromise.resolve('OK');
    */


    /**
     * Timeout Promise implementation
     * -> wraps Promise into TimeoutPromise
     * -> rejects Promise after timeout
     *
     * Example1:
     *
     */
    return class TimeoutPromise extends Promise {

        constructor(callback, timeout = 6000){
            let timer;
            let promise = callback[Symbol.toStringTag] === 'Promise' ? callback : new Promise(callback);
            //let promise = new Promise(callback);

            let wrapperPromise = Promise.race([
                promise,
                new Promise((resolve, reject) => {
                    timer = setTimeout(timeout => {
                        reject(new Error('Promise timeout after ' + timeout + 'ms'));
                    }, timeout, timeout);
                }),
            ]);

            super(function(resolve, reject){
                wrapperPromise.then(data => {
                    clearTimeout(timer);
                    resolve(data);
                }).catch(error => {
                    clearTimeout(timer);
                    reject(error);
                });
            });

        }
    };
});
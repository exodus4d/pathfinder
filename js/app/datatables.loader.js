define([
    'jquery',
    'app/init',
    'app/promises/promise.deferred',
    'app/promises/promise.timeout',
    'datatables.net',
    'datatables.net-buttons',
    'datatables.net-buttons-html',
    'datatables.net-responsive',
    'datatables.net-select'
], ($, Init, DeferredPromise, TimeoutPromise) => {
    'use strict';

    // all Datatables stuff is available...
    let initDefaultDatatablesConfig = () => {

        $.extend(true, $.fn.dataTable.defaults, {
            pageLength: -1,
            pagingType: 'simple_numbers',
            lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, 'All']],
            order: [],              // no default order because columnDefs is empty
            autoWidth: false,
            language: {
                info: '_START_ - _END_ of _TOTAL_ entries'
            },
            responsive: {
                breakpoints: Init.breakpoints,
                details: false
            },
            columnDefs: [],
            data: []
        });

        // global open event
        $(document).on('destroy.dt', '.dataTable ', function(e, settings){
            let table = $(this);
            let tableApi = new $.fn.dataTable.Api(settings);
            // end all active processes (e.g. table lock)
            // -> this custom extension is only available if "StatusTable" feature is enabled with it
            if(typeof tableApi.endProcesses === 'function'){
                tableApi.endProcesses();
            }

            // remove all active counters in table
            table.destroyTimestampCounter(true);
        });

        let StatusTable = function(settings){
            let me = this;
            me.statusContainer = $('<div>', {
                class: 'dt-stats pull-right'
            });

            me.statusLock = $('<span>', {
                class: ['dt-stat', 'disabled', 'fade'].join(' ')
            }).append($('<i>', {class: ['fas', 'fa-fw', 'fa-lock'].join(' ')}));

            me.statusRequest = $('<span>', {
                class: ['dt-stat', 'disabled', 'fade'].join(' ')
            }).append($('<i>', {class: ['fas', 'fa-fw', 'fa-sync', 'fa-spin'].join(' ')}));

            me.statusContainer.append(me.statusLock, me.statusRequest);

            // processStore holds "unfulfilled" promises
            me.processStore = {};
            me.defaultProcessName = 'default';

            me.lock = () => me.statusLock.addClass('in');
            me.unlock = () => me.statusLock.removeClass('in');
            me.request = () => me.statusRequest.addClass('in');
            me.unrequest = () => me.statusRequest.removeClass('in');

            me.endProcess = deferredPromise => {
                me.processStore[deferredPromise.data.name].delete(deferredPromise);
                // update table processStatus
                me.updateProcessStatus(deferredPromise.data.name);
            };

            me.hasProcesses = name => {
                let hasProcesses = false;
                if(me.processStore[name] instanceof Map){
                    hasProcesses = me.processStore[name].size > 0;
                }
                return hasProcesses;
            };

            me.updateProcessStatus = name => {
                let method = me.hasProcesses(name) ? name : 'un' + name;
                me[method]();
            };

            $.fn.dataTable.Api.register('newProcess()', function(name = me.defaultProcessName){
                // new DeferredPromise for process
                let deferredPromise = new DeferredPromise();
                deferredPromise.data = {name: name};

                // reject DeferredPromise after timeout (if not resolved
                let timeoutPromise = new TimeoutPromise(deferredPromise);
                timeoutPromise
                    .then(function(name, payload){
                        // resolved within timeout -> wait for finally() block
                    }.bind(me, name))
                    .catch(error => {
                        if(error instanceof Error){
                            // either timeout error or error from rejected deferredPromise
                            console.warn(error);
                        }
                    })
                    .finally(function(deferredPromise){
                        // no matter if TimeoutPromise is resolved or rejected
                        // -> remove from processStore
                        this.endProcess(deferredPromise);
                    }.bind(me, deferredPromise));

                // store TimeoutPromise -------------------------------------------------------------------------------
                if(!(me.processStore[name] instanceof Map)){
                    me.processStore[name] = new Map();
                }
                me.processStore[name].set(deferredPromise);

                // update table processStatus
                me.updateProcessStatus(name);

                return deferredPromise;
            });

            $.fn.dataTable.Api.register('hasProcesses()', function(name = me.defaultProcessName){
                return me.hasProcesses(name);
            });

            $.fn.dataTable.Api.register('endProcess()', function(deferredPromise){
                me.endProcess(deferredPromise);
                deferredPromise.resolve();
            });

            $.fn.dataTable.Api.register('endProcesses()', function(){
                for(let [name, store] of Object.entries(me.processStore)){
                    for(let [deferredPromise, value] of store.entries()){
                        me.endProcess(deferredPromise);
                        deferredPromise.resolve();
                    }
                }
            });
        };

        StatusTable.prototype.getContainer = function(){
            return this.statusContainer;
        };

        $.fn.dataTable.ext.feature.push({
            fnInit: settings => {
                let oStatusTable = new StatusTable(settings);
                return oStatusTable.getContainer();
            },
            cFeature: 'S',
            sFeature: 'StatusTable'
        });
    };

    initDefaultDatatablesConfig();
});
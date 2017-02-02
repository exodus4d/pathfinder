/**
 *  map system functions
 */


define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox',
    'app/map/util'
], ($, Init, Util, bootbox, MapUtil) => {
    'use strict';

    let config = {
        systemActiveClass: 'pf-system-active'                           // class for an active system in a map
    };

    /**
     * show "set rally point" dialog for system
     * @param system
     */
    $.fn.showRallyPointDialog = (system) => {
        requirejs(['text!templates/dialog/system_rally.html', 'mustache'], function(template, Mustache) {
            let data = {
                notificationStatus: Init.notificationStatus.rallySet
            };

            let content = Mustache.render(template, data);

            let rallyDialog = bootbox.dialog({
                message: content,
                title: 'Set rally point for "' + system.getSystemInfo( ['alias'] ) + '"',
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    setRallyPoke: {
                        label: '<i class="fa fa-fw fa-volume-up"></i> set rally and poke',
                        className: 'btn-primary',
                        callback: function() {
                            system.setSystemRally(1, {
                                poke: true
                            });
                            system.markAsChanged();
                        }
                    },
                    success: {
                        label: '<i class="fa fa-fw fa-users"></i> set rally',
                        className: 'btn-success',
                        callback: function() {
                            system.setSystemRally(1);
                            system.markAsChanged();
                        }
                    }
                }
            });
        });
    };

    /**
     * shows delete dialog for systems that should be deleted
     * @param map
     * @param systems
     * @returns {*}
     */
    $.fn.showDeleteSystemDialog = (map, systems = []) => {
        let mapContainer = $( map.getContainer() );
        let validDeleteSystems = [];
        let activeCharacters = 0;
        // check if systems belong to map -> security check
        for (let system of systems) {
            let systemElement = $(system);
            if(
                systemElement.data('mapid') === mapContainer.data('id')  &&
                !systemElement.data('locked')
            ){
                // system belongs to map -> valid system
                validDeleteSystems.push(system);

                activeCharacters += (systemElement.data('userCount') ? parseInt( systemElement.data('userCount') ) : 0);
            }
        }

        if(validDeleteSystems.length){
            let msg = '';
            if(validDeleteSystems.length === 1){
                let deleteSystem = $(validDeleteSystems[0]);
                let systemName = deleteSystem.data('name');
                let systemAlias = deleteSystem.getSystemInfo( ['alias'] );

                let systemNameStr = (systemName === systemAlias) ? '"' + systemName + '"' : '"' + systemAlias + '" (' + systemName + ')';
                systemNameStr = '<span class="txt-color txt-color-warning">' + systemNameStr + '</span>';
                msg = 'Delete system ' + systemNameStr + ' and all its connections?';
            }else{
                msg = 'Delete ' + validDeleteSystems.length + ' selected systems and their connections?';
            }

            // add warning for active characters
            if(activeCharacters > 0){
                msg += ' <span class="txt-color txt-color-warning">Warning: ' + activeCharacters + ' active characters</span>';
            }

            let systemDeleteDialog = bootbox.confirm(msg, result => {
                if(result){
                    deleteSystems(map, validDeleteSystems, (systems) => {
                        // callback function after deleted -> close dialog
                        systemDeleteDialog.modal('hide');

                        if(systems.length === 1){
                            Util.showNotify({title: 'System deleted', text: $(systems[0]).data('name'), type: 'success'});
                        }else{
                            Util.showNotify({title: systems.length + ' systems deleted', type: 'success'});
                        }
                    });
                }
            });
        }else{
            Util.showNotify({title: 'No systems selected', type: 'warning'});
        }

        return this;
    };

    /**
     * delete system(s) with all their connections
     * (ajax call) remove system from DB
     * @param map
     * @param systems
     * @param callback function
     */
    let deleteSystems = (map, systems = [], callback = (systems) => {}) => {
        let mapContainer = $( map.getContainer() );

        $.ajax({
            type: 'POST',
            url: Init.path.deleteSystem,
            data: {
                mapId: mapContainer.data('id'),
                systemIds: systems.map( system => $(system).data('id') )
            },
            dataType: 'json',
            context: {
                map: map,
                systems: systems
            }
        }).done(function(){
            // remove systems from map
            removeSystems(this.map,  this.systems);

            callback(this.systems);
        }).fail(function(jqXHR, status, error) {
            let reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': deleteSystem', text: reason, type: 'warning'});
            $(document).setProgramStatus('problem');
        });
    };

    /**
     * remove system(s) from map (no backend requests)
     * @param map
     * @param systems
     */
    let removeSystems = (map, systems) => {

        let removeSystemCallbak = function(deleteSystem){
            map.remove(deleteSystem);
        };

        for (let system of systems){
            system = $(system);

            // check if system is "active"
            if( system.hasClass(config.systemActiveClass) ){
                // get parent Tab Content and fire clear modules event
                let tabContentElement = MapUtil.getTabContentElementByMapElement( system );
                $(tabContentElement).trigger('pf:removeSystemModules');
            }

            // remove endpoints and their connections
            // do not fire a "connectionDetached" event
            map.detachAllConnections(system, {fireEvent: false});

            // hide tooltip
            system.toggleSystemTooltip('destroy', {});

            // remove system
            system.velocity('transition.whirlOut', {
                duration: Init.animationSpeed.mapDeleteSystem,
                complete: removeSystemCallbak
            });
        }
    };

    return {
        deleteSystems: deleteSystems,
        removeSystems: removeSystems
    };
});
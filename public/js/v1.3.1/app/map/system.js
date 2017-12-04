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
        newSystemOffset: {
            x: 130,
            y: 0
        },

        systemActiveClass: 'pf-system-active',                                          // class for an active system on a map

        dialogRallyId: 'pf-rally-dialog',                                               // id for "Rally point" dialog

        dialogRallyPokeDesktopId: 'pf-rally-dialog-poke-desktop',                       // id for "desktop" poke checkbox
        dialogRallyPokeSlackId: 'pf-rally-dialog-poke-slack',                           // id for "Slack" poke checkbox
        dialogRallyPokeMailId: 'pf-rally-dialog-poke-mail',                             // id for "mail" poke checkbox
        dialogRallyMessageId: 'pf-rally-dialog-message',                                // id for "message" textarea

        dialogRallyMessageDefault: '' +
            'I need some help!\n\n' +
            '- Potential PvP options around\n' +
            '- DPS and Logistic ships needed'
    };

    /**
     * show "set rally point" dialog for system
     * @param system
     */
    $.fn.showRallyPointDialog = (system) => {
        let mapData = Util.getCurrentMapData(system.data('mapid'));

        requirejs(['text!templates/dialog/system_rally.html', 'mustache'], function(template, Mustache) {

            let setCheckboxObserver = (checkboxes) => {
                checkboxes.each(function(){
                    $(this).on('change', function(){
                        // check all others
                        let allUnchecked = true;
                        checkboxes.each(function(){
                            if(this.checked){
                                allUnchecked = false;
                            }
                        });
                        let textareaElement = $('#' + config.dialogRallyMessageId);
                        if(allUnchecked){
                            textareaElement.prop('disabled', true);
                        }else{
                            textareaElement.prop('disabled', false);
                        }
                    });
                });
            };

            let sendPoke = (requestData, context) => {
                // lock dialog
                let dialogContent = context.rallyDialog.find('.modal-content');
                dialogContent.showLoadingAnimation();

                $.ajax({
                    type: 'POST',
                    url: Init.path.pokeRally,
                    data: requestData,
                    dataType: 'json',
                    context: context
                }).done(function(data){

                }).fail(function( jqXHR, status, error) {
                    let reason = status + ' ' + error;
                    Util.showNotify({title: jqXHR.status + ': sendPoke', text: reason, type: 'warning'});
                }).always(function(){
                    this.rallyDialog.find('.modal-content').hideLoadingAnimation();
                });
            };

            let data = {
                id: config.dialogRallyId,

                dialogRallyPokeDesktopId: config.dialogRallyPokeDesktopId,
                dialogRallyPokeSlackId: config.dialogRallyPokeSlackId,
                dialogRallyPokeMailId: config.dialogRallyPokeMailId,
                dialogRallyMessageId: config.dialogRallyMessageId ,

                desktopRallyEnabled: true,
                slackRallyEnabled: Boolean(Util.getObjVal(mapData, 'config.logging.slackRally')),
                mailRallyEnabled: Boolean(Util.getObjVal(mapData, 'config.logging.mailRally')),
                dialogRallyMessageDefault: config.dialogRallyMessageDefault,

                systemId: system.data('id')
            };

            let content = Mustache.render(template, data);

            let rallyDialog = bootbox.dialog({
                message: content,
                title: 'Set rally point in "' + system.getSystemInfo( ['alias'] ) + '"',
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    success: {
                        label: '<i class="fa fa-fw fa-volume-up"></i> set rally point',
                        className: 'btn-success',
                        callback: function() {
                            let form = $('#' + config.dialogRallyId).find('form');
                            // get form data
                            let formData = form.getFormValues();

                            // update map
                            system.setSystemRally(1, {
                                poke: Boolean(formData.pokeDesktop)
                            });
                            system.markAsChanged();

                            // send poke data to server
                            sendPoke(formData, {
                                rallyDialog: this
                            });
                        }
                    }
                }
            });

            // after modal is shown ==================================================================================
            rallyDialog.on('shown.bs.modal', function(e){
                // set event for checkboxes
                setCheckboxObserver(rallyDialog.find(':checkbox'));
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
                    deleteSystems(map, validDeleteSystems, (deletedSystems) => {
                        // callback function after deleted -> close dialog
                        systemDeleteDialog.modal('hide');

                        // check whether all systems were deleted properly
                        if(deletedSystems.length !== validDeleteSystems.length){
                            let notDeletedCount = validDeleteSystems.length - deletedSystems.length;

                            Util.showNotify({
                                title: 'Failed to delete systems',
                                text: '(' + notDeletedCount + '/' +  validDeleteSystems.length + ') systems could not be deleted',
                                type: 'warning'}
                            );
                        }else if(deletedSystems.length === 1){
                            Util.showNotify({title: 'System deleted', text: $(deletedSystems[0]).data('name'), type: 'success'});
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
        }).done(function(data){
            // check if all systems were deleted that should get deleted
            let deletedSystems = this.systems.filter(
                function(system){
                    return this.indexOf( $(system).data('id') ) !== -1;
                }, data.deletedSystemIds
            );

            // remove systems from map
            removeSystems(this.map,  deletedSystems);

            callback(deletedSystems);
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

    /**
     * calculate the x/y coordinates for a new system - relativ to a source system
     * @param sourceSystem
     * @returns {{x: *, y: *}}
     */
    let calculateNewSystemPosition = function(sourceSystem){

        // related system is available
        let currentX = sourceSystem.css('left');
        let currentY = sourceSystem.css('top');

        // remove "px"
        currentX = parseInt( currentX.substring(0, currentX.length - 2) );
        currentY = parseInt( currentY.substring(0, currentY.length - 2) );

        let newPosition = {
            x: currentX + config.newSystemOffset.x,
            y: currentY + config.newSystemOffset.y
        };

        return newPosition;
    };

    return {
        deleteSystems: deleteSystems,
        removeSystems: removeSystems,
        calculateNewSystemPosition: calculateNewSystemPosition
    };
});
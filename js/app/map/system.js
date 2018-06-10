/**
 *  map system functions
 */


define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox',
    'app/map/util',
    'app/map/layout'
], ($, Init, Util, bootbox, MapUtil, Layout) => {
    'use strict';

    let config = {
        newSystemOffset: {
            x: 130,
            y: 0
        },

        mapClass: 'pf-map',                                                             // class for all maps

        popoverTriggerClass: 'pf-popover-trigger',                                      // class for "popover" trigger elements

        systemHeadInfoClass: 'pf-system-head-info',                                     // class for system info
        systemActiveClass: 'pf-system-active',                                          // class for an active system on a map
        systemTooltipInnerIdPrefix: 'pf-system-tooltip-inner-',                         // id prefix for system tooltip content
        systemTooltipInnerClass: 'pf-system-tooltip-inner',                             // class for system tooltip content

        dialogRallyId: 'pf-rally-dialog',                                               // id for "Rally point" dialog

        dialogRallyPokeDesktopId: 'pf-rally-dialog-poke-desktop',                       // id for "desktop" poke checkbox
        dialogRallyPokeSlackId: 'pf-rally-dialog-poke-slack',                           // id for "Slack" poke checkbox
        dialogRallyPokeDiscordId: 'pf-rally-dialog-poke-discord',                       // id for "Discord" poke checkbox
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
                dialogRallyPokeDiscordId: config.dialogRallyPokeDiscordId,
                dialogRallyPokeMailId: config.dialogRallyPokeMailId,
                dialogRallyMessageId: config.dialogRallyMessageId ,

                desktopRallyEnabled: true,
                slackRallyEnabled: Boolean(Util.getObjVal(mapData, 'config.logging.slackRally')),
                discordRallyEnabled: Boolean(Util.getObjVal(mapData, 'config.logging.discordRally')),
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
                        label: '<i class="fas fa-fw fa-volume-up"></i> set rally point',
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

            rallyDialog.initTooltips();

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
     * toggle system tooltip (current pilot count)
     * @param show
     * @param tooltipOptions
     * @returns {*}
     */
    $.fn.toggleSystemTooltip = function(show, tooltipOptions){
        let highlightData = {
            good: {
                colorClass: 'txt-color-green',
                iconClass: 'fa-caret-up'
            },
            bad: {
                colorClass: 'txt-color-red',
                iconClass: 'fa-caret-down'
            }
        };

        let getHighlightClass = (highlight) => {
            return Util.getObjVal(highlightData, highlight + '.colorClass') || '';
        };

        let getHighlightIcon = (highlight) => {
            return Util.getObjVal(highlightData, highlight + '.iconClass') || '';
        };

        let getTitle = (userCounter, highlight) => {
            return '<i class="fas ' + getHighlightIcon(highlight) + '"></i>&nbsp;' + userCounter + '';
        };

        return this.each(function(){
            let system = $(this);
            switch(show){
                case 'destroy':
                    //destroy tooltip and remove some attributes which are not deleted by 'destroy'
                    system.tooltip('destroy').removeAttr('title data-original-title');
                    break;
                case 'hide':
                    system.tooltip('hide');
                    break;
                case 'show':
                    // initial "show" OR "update" open tooltip
                    // -> do not update tooltips while a system is dragged
                    let showTooltip = !system.hasClass('jsPlumb_dragged');

                    if(system.data('bs.tooltip')){
                        // tooltip initialized but could be hidden
                        // check for title update
                        if(
                            tooltipOptions.hasOwnProperty('userCount') &&
                            tooltipOptions.hasOwnProperty('highlight')
                        ){
                            let currentTitle = system.attr('data-original-title');
                            let newTitle = getTitle(tooltipOptions.userCount, tooltipOptions.highlight);

                            if(currentTitle !== newTitle){
                                // update tooltip
                                let tooltipInner = system.attr('title', newTitle).tooltip('fixTitle').data('bs.tooltip').$tip.find('.tooltip-inner');
                                tooltipInner.html(newTitle);

                                // change highlight class
                                let highlightClass = getHighlightClass(tooltipOptions.highlight);
                                if( !tooltipInner.hasClass(highlightClass) ){
                                    tooltipInner.removeClass( getHighlightClass('good') + ' ' + getHighlightClass('bad')).addClass(highlightClass);
                                }
                            }
                        }

                        let tip = system.data('bs.tooltip').tip();
                        if( !tip.hasClass('in') && showTooltip){
                            // update tooltip placement based on system position
                            system.data('bs.tooltip').options.placement = getSystemTooltipPlacement(system);

                            system.tooltip('show');
                        }
                    }else{
                        // no tooltip initialized
                        // "some" config data is required
                        if(
                            tooltipOptions.hasOwnProperty('systemId') &&
                            tooltipOptions.hasOwnProperty('userCount') &&
                            tooltipOptions.hasOwnProperty('highlight')
                        ){
                            let innerTooltipId = config.systemTooltipInnerIdPrefix + tooltipOptions.systemId;

                            let template = '<div class="tooltip" role="tooltip">' +
                                '<div class="tooltip-arrow"></div>' +
                                '<div id="' + innerTooltipId + '" class="tooltip-inner txt-color ' + config.systemTooltipInnerClass + '"></div>' +
                                '</div>';

                            let options = {
                                trigger: 'manual',
                                placement: getSystemTooltipPlacement(system),
                                html: true,
                                animation: true,
                                  template: template,
                                viewport: system.closest('.' + config.mapClass)
                            };

                            // init new tooltip -> Do not show automatic maybe system is currently dragged
                            system.attr('title', getTitle(tooltipOptions.userCount, tooltipOptions.highlight));
                            system.tooltip(options);

                            system.one('shown.bs.tooltip', function() {
                                // set highlight only on FIRST show
                                $('#' + this.innerTooltipId).addClass(this.highlightClass);
                            }.bind({
                                highlightClass: getHighlightClass(tooltipOptions.highlight),
                                innerTooltipId: innerTooltipId
                            }));

                            if(showTooltip){
                                system.tooltip('show');
                            }
                        }
                    }
                    break;
            }
        });
    };

    /**
     * get tooltip position (top, bottom) based on system position
     * @param system
     * @returns {string}
     */
    let getSystemTooltipPlacement = (system) => {
        let offsetParent = system.parent().offset();
        let offsetSystem = system.offset();

        return (offsetSystem.top - offsetParent.top < 27)  ? 'bottom' : 'top';
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

            // destroy tooltip/popover
            system.toggleSystemTooltip('destroy', {});
            system.destroyPopover(true);

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
        let mapContainer = sourceSystem.parent();
        let grid = [MapUtil.config.mapSnapToGridDimension, MapUtil.config.mapSnapToGridDimension];

        let x = 0;
        let y = 0;

        let positionFinder = new Layout.Position({
            container: mapContainer[0],
            center: sourceSystem[0],
            loops: 4,
            grid: mapContainer.hasClass(MapUtil.config.mapGridClass) ? grid : false,
            debug: false
        });

        let dimensions = positionFinder.findNonOverlappingDimensions(1, 16);
        if(dimensions.length){
            //... empty map space found
            x = dimensions[0].left;
            y = dimensions[0].top;
        }else{
            //... fallback
            // related system is available
            let currentX = sourceSystem.css('left');
            let currentY = sourceSystem.css('top');

            // remove "px"
            currentX = parseInt( currentX.substring(0, currentX.length - 2) );
            currentY = parseInt( currentY.substring(0, currentY.length - 2) );
            x = currentX + config.newSystemOffset.x;
            y = currentY + config.newSystemOffset.y;
        }

        let newPosition = {
            x: x,
            y: y
        };

        return newPosition;
    };

    /**
     * get new dom element for systemData that shows "info" data (additional data)
     * -> this is show below the system base data on map
     * @param data
     * @returns {*}
     */
    let getHeadInfoElement = (data) => {
        let headInfo = null;

        // check systemData if headInfo element is needed
        if(data.statics && data.statics.length){
            // format wh statics
            let statics = [];
            for(let staticData of data.statics){
                statics.push(
                    '<span class="' +
                    Util.getSecurityClassForSystem(staticData.security) + ' ' +
                    config.popoverTriggerClass + '" data-name="' + staticData.name +
                    '">' + staticData.security + '</span>'
                );
            }

            headInfo = $('<div>',  {
                class: config.systemHeadInfoClass
            }).append(
                statics.join('&nbsp;&nbsp;')
            );
        }

        return headInfo;
    };

    return {
        deleteSystems: deleteSystems,
        removeSystems: removeSystems,
        calculateNewSystemPosition: calculateNewSystemPosition,
        getHeadInfoElement: getHeadInfoElement
    };
});
/**
 * map overlay functions for "Nearby" table
 * Created by Exodus on 13.04.2017.
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/util'
], function($, Init, Util, MapUtil){
    'use strict';

    let config = {
        overlayClass: 'pf-map-overlay',                                     // class for all map overlays
        overlayLocalClass: 'pf-map-overlay-local',                          // class for "local" overlay

        // left section
        overlayLocalContentClass: 'pf-map-overlay-local-content',           // class for left area - content
        overlayLocalHeadlineClass: 'pf-map-overlay-headline',               // class for headline
        overlayLocalTableClass: 'pf-local-table',                           // class for local tables

        // right section
        overlayLocalTriggerClass: 'pf-map-overlay-local-trigger',           // class for open/close trigger icon
        overlayLocalOpenClass: 'pf-map-overlay-local-open',                 // class for open status
        overlayLocalMainClass: 'pf-map-overlay-local-main',                 // class for right area (always visible)
        overlayLocalUsersClass: 'pf-map-overlay-local-users',               // class for active user count
        overlayLocalJumpsClass: 'pf-map-overlay-local-jumps',               // class for jump distance for table results

        // dataTable
        tableCellImageClass: 'pf-table-image-cell',                         // class for table "image" cells
        tableCellActionClass: 'pf-table-action-cell',                       // class for table "action" cells
        tableCellActionIconClass: 'pf-table-action-icon-cell',              // class for table "action" icon (icon is part of cell content)

        // toolbar
        toolbarClass: 'pf-map-overlay-toolbar',                             // class for toolbar - content
        toolbarIconClass: 'pf-map-overlay-toolbar-icon',                    // class for toolbar icon
        toolbarCheckboxClass: 'pf-map-overlay-toolbar-checkbox'             // class for toolbar checkbox
    };

    /**
     * checks whether overlay is currently open or not
     * @param overlay
     * @returns {*}
     */
    let isOpen = (overlay) => {
        return overlay.hasClass(config.overlayLocalOpenClass);
    };

    /**
     * open overlay -> animation
     * @param overlay
     */
    let openOverlay = (overlay) => {
        if( !isOpen(overlay) ){
            let overlayMain = overlay.find('.' + config.overlayLocalMainClass);
            overlayMain.find('.' + config.overlayLocalTriggerClass).addClass('right');
            overlay.addClass(config.overlayLocalOpenClass);

            overlay.velocity({
                width: '350px'
            },{
                duration: Init.animationSpeed.mapOverlayLocal,
                easing: 'easeOut'
            });
        }
    };

    /**
     * close overlay -> animation
     * @param overlay
     */
    let closeOverlay = (overlay) => {
        if( isOpen(overlay) ){
            let overlayMain = overlay.find('.' + config.overlayLocalMainClass);
            overlayMain.find('.' + config.overlayLocalTriggerClass).removeClass('right');
            overlay.removeClass(config.overlayLocalOpenClass);

            overlay.velocity({
                width: '32px'
            },{
                duration: Init.animationSpeed.mapOverlayLocal,
                easing: 'easeOut'
            });
        }
    };

    /**
     * sets overlay observer
     * @param overlay
     * @param mapId
     */
    let setOverlayObserver = (overlay, mapId) => {
        let overlayMain = overlay.find('.' + config.overlayLocalMainClass);

        overlayMain.on('click', function(){
            let overlayMain = $(this).parent('.' + config.overlayLocalClass);
            let isOpenStatus = isOpen(overlayMain);

            // store current state in indexDB (client)
            MapUtil.storeLocalData('map', mapId, 'showLocal', !isOpenStatus );

           // trigger open/close
           if( isOpenStatus ){
               closeOverlay(overlay);
           }else{
               openOverlay(overlay);
           }
        });

        overlayMain.initTooltips({
            container: 'body',
            placement: 'bottom'
        });
    };

    /**
     * filter DataTable rows by column data and return rowIds
     * @param table
     * @param data
     * @param values
     * @param checkExistence
     */
    let filterRows = (table, data = 'id', values = [], checkExistence = true) => {
        return table.rows().eq(0).filter( function(rowIdx){
            let rowExists = values.indexOf( table.row(rowIdx ).data()[data] ) !== -1;

            if( !checkExistence ){
                rowExists = !rowExists;
            }

            return rowExists;
        });
    };

    /**
     * Update the "headline" within the Overlay
     * @param overlay
     * @param systemData
     * @param characterAll
     * @param characterLocal
     */
    let updateLocaleHeadline = (overlay, systemData, characterAll = 0, characterLocal = 0) => {
        let headlineElement = overlay.find('.' + config.overlayLocalHeadlineClass);
        let userCountElement = overlay.find('.' + config.overlayLocalUsersClass);


        let secClassBase = Util.getSecurityClassForSystem('security');
        let secClass = Util.getSecurityClassForSystem(systemData.security);

        let childElements = headlineElement.children('span');
        childElements.eq(1).removeClass().addClass(
            [secClassBase, secClass].join(' ')
        ).text(systemData.security);

        childElements.eq(2).text(systemData.alias ? systemData.alias : systemData.name);

        // update userCount for "near by" count -------------------------------------------------------------------
        if( characterAll > 0){
            userCountElement.toggleClass('txt-color-green', true).toggleClass('txt-color-red', false);
        }else{
            userCountElement.toggleClass('txt-color-green', false).toggleClass('txt-color-red', true);
        }
        userCountElement.text(characterAll);

        // update userCount in current system ---------------------------------------------------------------------
        if( characterLocal > 0){
            childElements.eq(3).toggleClass('txt-color-green', true).toggleClass('txt-color-red', false);
        }else{
            childElements.eq(3).toggleClass('txt-color-green', false).toggleClass('txt-color-red', true);
        }
        childElements.eq(3).text(characterLocal);
    };

    /**
     * updates all changed table rows
     * @param systemData
     * @param userData
     */
    $.fn.updateLocalTable = function(systemData, userData){
        return this.each(function(){
            let overlay = $(this);
            let tableElement = overlay.find('.' + config.overlayLocalTableClass);
            let localTable = tableElement.DataTable();
            let mapId = systemData.mapId;

            let characterAllIds = [];
            let characterLocalIds = [];

            // system is on map (just for security check)
            for(let jumps in userData){
                if( userData.hasOwnProperty(jumps) ){
                    jumps = parseInt(jumps);

                    for(let j = 0; j < userData[jumps].length; j++){
                        // add jump distance
                        userData[jumps][j].jumps = jumps;

                        let rowData = userData[jumps][j];

                        // check for existing rows
                        let indexes = filterRows(localTable, 'id', [rowData.id]);

                        if(indexes.length > 0){
                            // row exists -> update
                            let changedRow = localTable.row( parseInt(indexes[0]) );
                            let changedRowElement = changedRow.nodes().to$();

                            // remove tooltips
                            changedRowElement.find('[title]').tooltip('hide').tooltip('destroy');

                            // update data
                            changedRow.data(rowData);
                        }else{
                            // new row
                            localTable.row.add(rowData);
                        }

                        if(jumps === 0){
                            characterLocalIds.push(rowData.id);
                        }

                        characterAllIds.push(rowData.id);
                    }
                }
            }

            // remove rows that no longer exists ----------------------------------------------------------------------
            let indexesRemove = filterRows(localTable, 'id', characterAllIds, false);
            localTable.rows(indexesRemove).remove();

            localTable.draw();

            // update system relevant data in overlay -----------------------------------------------------------------
            updateLocaleHeadline(overlay, systemData, characterAllIds.length, characterLocalIds.length);

            // open Overlay -------------------------------------------------------------------------------------------
            if( !isOpen(overlay) ){
                let promiseStore = MapUtil.getLocaleData('map', mapId);
                promiseStore.then(dataStore => {
                    if(
                        dataStore &&
                        dataStore.showLocal
                    ){
                        openOverlay(overlay);
                    }
                });
            }
        });
    };

    /**
     * init tooltip for a "DataTables" Cell
     * @param api
     * @param cell
     * @param titleSelector
     */
    let initCellTooltip = (api, cell, titleSelector = '') => {
        $(cell).hover( function(e){
            let rowIdx = api.cell(cell).index().row;
            let rowData = api.row(rowIdx).data();

            $(this).tooltip({
                container: 'body',
                title: Util.getObjVal(rowData, titleSelector),
                placement: 'left',
                delay: 100
            }).tooltip('show');
        }, function(e){
            $(this).tooltip('hide');
        });
    };

    /**
     * init all map local overlay on a "parent" element
     * @returns {*}
     */
    $.fn.initLocalOverlay = function(mapId){
        let parentElements = $(this);

        require(['datatables.loader'], () => {
            parentElements.each(function(){
                let parentElement = $(this);

                let overlay = $('<div>', {
                    class: [config.overlayClass, config.overlayLocalClass].join(' ')
                });

                let content = $('<div>', {
                    class: [ 'text-right', config.overlayLocalContentClass].join(' ')
                });

                // crate new route table
                let table = $('<table>', {
                    class: ['compact', 'order-column', config.overlayLocalTableClass].join(' ')
                });

                let overlayMain = $('<div>', {
                    text: '',
                    class: config.overlayLocalMainClass
                }).append(
                    $('<i>', {
                        class: ['fas', 'fa-chevron-down', 'fa-fw', 'pf-animate-rotate', config.overlayLocalTriggerClass].join(' ')
                    }),
                    $('<span>', {
                        class: ['badge', 'txt-color', 'txt-color-red', config.overlayLocalUsersClass].join(' '),
                        text: 0
                    }),
                    $('<div>', {
                        class: config.overlayLocalJumpsClass
                    }).append(
                        $('<span>', {
                            class: ['badge', 'txt-color', 'txt-color-grayLight'].join(' '),
                            text: MapUtil.config.defaultLocalJumpRadius
                        }).attr('title', 'jumps')
                    )
                );

                let headline = $('<div>', {
                    class: config.overlayLocalHeadlineClass
                }).append(
                    $('<span>', {
                        html: 'Nearby&nbsp;&nbsp;&nbsp;',
                        class: 'pull-left'
                    }),
                    $('<span>'),
                    $('<span>'),
                    $('<span>', {
                        class: ['badge', ' txt-color', 'txt-color-red'].join(' '),
                        text: 0
                    })
                );

                content.append(headline);
                content.append(table);
                // toolbar not used for now
                // content.append(initToolbar());

                overlay.append(overlayMain);
                overlay.append(content);

                // set observer
                setOverlayObserver(overlay, mapId);

                parentElement.append(overlay);

                // init local table ---------------------------------------------------------------------------------------

                table.on('draw.dt', function(e, settings){
                    // init table tooltips
                    $(this).find('td').initTooltips({
                        container: 'body',
                        placement: 'left'
                    });

                    // hide pagination in case of only one page
                    let paginationElement = overlay.find('.dataTables_paginate');
                    let pageElements = paginationElement.find('span .paginate_button');
                    if(pageElements.length <= 1){
                        paginationElement.hide();
                    }else{
                        paginationElement.show();
                    }
                });

                // table init complete
                table.on('init.dt', function(){
                    // init table head tooltips
                    $(this).initTooltips({
                        container: 'body',
                        placement: 'top'
                    });
                });

                let localTable = table.DataTable( {
                    pageLength: 13, // hint: if pagination visible => we need space to show it
                    paging: true,
                    lengthChange: false,
                    ordering: true,
                    order: [ 0, 'asc' ],
                    info: false,
                    searching: false,
                    hover: false,
                    responsive: false,          // true "hides" some columns on init (why?)
                    rowId: function(rowData){
                        return 'pf-local-row_' + rowData.id; // characterId
                    },
                    language: {
                        emptyTable: '<span>You&nbsp;are&nbsp;alone</span>'
                    },
                    columnDefs: [
                        {
                            targets: 0,
                            orderable: true,
                            title: '<span title="jumps" data-toggle="tooltip">&nbsp;</span>',
                            width: '1px',
                            className: [Util.config.helpDefaultClass, 'text-center'].join(' '),
                            data: 'jumps',
                            render: {
                                _: (data, type, row, meta) => {
                                    let value = data;
                                    if(type === 'display'){
                                        if(value === 0){
                                            value = '<i class="fas fa-map-marker-alt"></i>';
                                        }
                                    }
                                    return value;
                                }
                            },
                            createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                                let api = this.DataTable();
                                initCellTooltip(api, cell, 'log.system.name');
                            }
                        },{
                            targets: 1,
                            orderable: false,
                            title: '',
                            width: '26px',
                            className: [Util.config.helpDefaultClass, 'text-center', config.tableCellImageClass].join(' '),
                            data: 'log.ship',
                            render: {
                                _: (data, type, row, meta) => {
                                    let value = data.typeName;
                                    if(type === 'display'){
                                        value = '<img src="' + Init.url.ccpImageServer + '/Render/' + data.typeId + '_32.png"/>';
                                    }
                                    return value;
                                }
                            },
                            createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                                let api = this.DataTable();
                                initCellTooltip(api, cell, 'log.ship.typeName');
                            }
                        }, {
                            targets: 2,
                            orderable: true,
                            title: 'ship&nbsp;name',
                            width: '80px',
                            data: 'log.ship',
                            render: {
                                _: (data, type, row, meta) => {
                                    let value = data.name;
                                    if(type === 'display'){
                                        value = '<div class="' + MapUtil.config.tableCellEllipsisClass + ' ' + MapUtil.config.tableCellEllipsis80Class + '">' + data.name + '</div>';
                                    }
                                    return value;
                                },
                                sort: 'name'
                            }
                        },{
                            targets: 3,
                            orderable: true,
                            title: 'pilot',
                            data: 'name',
                            render: {
                                _: (data, type, row, meta) => {
                                    let value = data;
                                    if(type === 'display'){
                                        value = '<div class="' + MapUtil.config.tableCellEllipsisClass + ' ' + MapUtil.config.tableCellEllipsis90Class + '">' + data + '</div>';
                                    }
                                    return value;
                                }
                            }
                        },{
                            targets: 4,
                            orderable: false,
                            title: '',
                            width: '10px',
                            className: [Util.config.helpDefaultClass].join(' '),
                            data: 'log',
                            render: {
                                _: (data, type, row, meta) => {
                                    let value = '';
                                    if(type === 'display'){
                                        if(data.station && data.station.id > 0){
                                            value = '<i class="fas fa-home"></i>';
                                        }else if(data.structure && data.structure.id > 0){
                                            value = '<i class="fas fa-industry"></i>';
                                        }
                                    }
                                    return value;
                                }
                            },
                            createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                                let selector = '';
                                if(cellData.station && cellData.station.id > 0){
                                    selector = 'log.station.name';
                                }else if(cellData.structure && cellData.structure.id > 0){
                                    selector = 'log.structure.name';
                                }
                                let api = this.DataTable();
                                initCellTooltip(api, cell, selector);
                            }
                        },{
                            targets: 5,
                            orderable: false,
                            title: '<i title="open ingame" data-toggle="tooltip" class="fas fa-id-card text-right"></i>',
                            width: '10px',
                            className: [config.tableCellActionClass].join(' '),
                            data: 'id',
                            render: {
                                _: (data, type, row, meta) => {
                                    let value = data;
                                    if(type === 'display'){
                                        value = '<i class="fas fa-id-card ' + config.tableCellActionIconClass + '"></i>';
                                    }
                                    return value;
                                }
                            },
                            createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                                // open character information window (ingame)
                                $(cell).on('click', { tableApi: this.DataTable(), cellData: cellData }, function(e){
                                    let cellData = e.data.tableApi.cell(this).data();
                                    Util.openIngameWindow(e.data.cellData);
                                });
                            }
                        }
                    ]
                });
            });
        });
    };

    let initToolbar = () => {

        let getCheckbox = (options) => {
          return $('<div>', {
              class: [config.toolbarCheckboxClass, 'checkbox'].join(' ')
          }).append(
              $('<input>', {
                  type: 'checkbox',
                  id: options.id,
                  name: options.name,
                  value: options.value,
                  checked: 'checked'
              }),
              $('<label>',{
                  'for': options.id,
                  html: options.label
              })
          );
        };

        let toolbar = $('<div>', {
            class: [config.toolbarClass].join(' ')
        }).append(
            $('<i>', {
                class: ['fas', 'fa-fw', 'fa-lg', 'fa-filter', config.toolbarIconClass, 'pull-left'].join(' ')
            }),
            getCheckbox({
                id: 'test',
                name: 'filter_character_active',
                value: 1,
                checked: true,
                label: 'active'
            })
        );

        return toolbar;
    };

    /**
     * Clear Overlay and "Reset"
     * @param mapId
     */
    $.fn.clearLocalTable = function(mapId){
        return this.each(function(){
            let overlay = $(this);

            // update locale overlay headline -------------------------------------------------------------------------
            updateLocaleHeadline(overlay, {
                name: 'unknown',
                security: ''
            });

            // clear all table rows -----------------------------------------------------------------------------------
            let tableElement = overlay.find('.' + config.overlayLocalTableClass);
            let localTable = tableElement.DataTable();
            localTable.rows().remove().draw();
        });
    };

});
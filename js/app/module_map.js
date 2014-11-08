define(['jquery', 'app/render', 'datatables', 'xEditable', 'app/map/map', 'customScrollbar'], function($, Render) {

    "use strict";

    var config = {
        dynamicElementWrapperId: 'pf-dialog-wrapper',                           // parent Element for dynamic content (dialoges,..)
        mapTabBarId: 'pf-map-tabs',
        mapTabIdPrefix: 'pf-map-tab-',
        mapTabClass: 'pf-map-tab',
        mapTabContentClass: 'pf-map-tab-content',
        mapTabContentSystemInfoClass: 'pf-map-tab-content-system',
        mapWrapperClass: 'pf-map-wrapper',                                      // scrollable
        mapClass: 'pf-map',                                                     // class for each map
        newMapDialogId: 'pf-map-new-dialog',

        // TabContentStructure
        mapTabContentRow: 'pf-map-content-row',                                 // main row for Tab content (grid)
        mapTabContentCellFirst: 'pf-map-content-col-first',                     // first column
        mapTabContentCellSecond: 'pf-map-content-col-second',                   // second column

        // sig table
        sigTableClass: 'pf-sig-table',                                          // Table class for all Signature Tables
        sigTableEditText: 'pf-sig-table-edit-text',                             // class for editable fields (text)
        sigTableEditSigTypeSelect: 'pf-sig-table-edit-sig-type-select',         // class for editable fields (select)
        sigTableEditSigNameSelect: 'pf-sig-table-edit-sig-name-select',         // class for editable fields (select)

        // map types
        mapTypes: [
            {type: 'default', label: 'default', class: 'pf-map-type-default'},
            {type: 'global', label: 'global', class: 'pf-map-type-global'},
            {type: 'alliance', label: 'alliance', class: 'pf-map-type-alliance'},
            {type: 'private', label: 'private', class: 'pf-map-type-private'}
        ],

        // map scopes
        mapScopes: [
            {scope: 'wormhole', label: 'W-Space'}
        ],

        mapIcons: [
            {class: 'fa-desktop', label: 'desktop'},
            {class: 'fa-bookmark', label: 'bookmark'},
            {class: 'fa-cube', label: 'cube'},
            {class: 'fa-warning', label: 'warning'},
            {class: 'fa-plane', label: 'plane'},
            {class: 'fa-rocket', label: 'rocket'}
        ],

        // Signature Type
        signatureTypes: {
            wh: { // system type
                1: {    // C1 (area id)
                    1: {    // Combat
                        1: 'Perimeter Ambush Point',
                        2: 'Perimeter Camp',
                        3: 'Phase Catalyst Node',
                        4: 'The Line'
                    },
                    2: {    // Relict
                        1: 'Forgotten Perimeter Coronation Platform'
                    },
                    3: {    // Data
                        1: 'Unsecured Perimeter Amplifier ',
                        2: 'Unsecured Perimeter Information Center '
                    }
                },
                2: {    // C2
                    1: {    // Combat
                        1: 'Perimeter Checkpoint',
                        2: 'Perimeter Hangar',
                        3: 'The Ruins of Enclave Cohort 27',
                        4: 'Sleeper Data Sanctuary'
                    },
                    2: {    // Relict
                        1: 'Forgotten Perimeter Gateway',
                        2: 'Forgotten Perimeter Habitation Coils'
                    },
                    3: {    // Data
                        1: 'Unsecured Perimeter Comms Relay',
                        2: 'Unsecured Perimeter Transponder Farm '
                    }
                },
                3: {    // C3
                    1: {    // Combat
                        1: 'Fortification Frontier Stronghold',
                        2: 'Outpost Frontier Stronghold',
                        3: 'Solar Cell',
                        4: 'The Oruze Construct'
                    },
                    2: {    // Relict
                        1: 'Forgotten Frontier Quarantine Outpost',
                        2: 'Forgotten Frontier Recursive Depot'
                    },
                    3: {    // Data
                        1: 'Unsecured Frontier Database',
                        2: 'Unsecured Frontier Receiver'
                    }
                },
                4: {    // C4
                    1: {    // Combat
                        1: 'Frontier Barracks',
                        2: 'Frontier Command Post',
                        3: 'Integrated Terminus',
                        4: 'Sleeper Information Sanctum'
                    },
                    2: {    // Relict
                        1: 'Forgotten Frontier Conversion Module',
                        2: 'Forgotten Frontier Evacuation Center'
                    },
                    3: {    // Data
                        1: 'Unsecured Frontier Digital Nexus',
                        2: 'Unsecured Frontier Trinary Hub'
                    }
                },
                5: {    // C5
                    1: {    // Combat
                        1: 'Core Garrison',
                        2: 'Core Stronghold',
                        3: 'Oruze Osobnyk',
                        4: 'Quarantine Area'
                    },
                    2: {    // Relict
                        1: 'Forgotten Core Data Field',
                        2: 'Forgotten Core Information Pen'
                    },
                    3: {    // Data
                        1: 'Unsecured Frontier Enclave Relay',
                        2: 'Unsecured Frontier Server Bank'
                    }
                },
                6: {    // C6
                    1: {    // Combat
                        1: 'Core Citadel',
                        2: 'Core Bastion',
                        3: 'Strange Energy Readings',
                        4: 'The Mirror'
                    },
                    2: {    // Relict
                        1: 'Forgotten Core Assembly Hall',
                        2: 'Forgotten Core Circuitry Disassembler'
                    },
                    3: {    // Data
                        1: 'Unsecured Core Backup Array',
                        2: 'Unsecured Core Emergence '
                    }
                }
            }
        }


    };

    /**
     * get map type class for a type
     * @param type
     * @returns {string}
     */
    var getMapTypeClassForType = function(type){

        var typeClass= '';

        $.each(config.mapTypes, function(i, typeData){
            if(typeData.type === type){
               typeClass = typeData.class;
            }
        });

        return typeClass;
    };

    /**
     * shows the add new map dialog
     */
    var showNewMapDialog = function(){

        // confirm dialog
        var moduleConfig = {
            name: 'modules/map_dialog',
            position: $('#' + config.dynamicElementWrapperId),
            link: 'after',
            functions: {
                after: function(){
                    $( "#" + config.newMapDialogId).dialog({
                        modal: true,
                        resizable: false,
                        buttons: {
                            'Cancel': function(){
                                $(this).dialog('close');
                            },
                            'Add map': function(){

                                // get form Values
                                var form = $('#' + config.newMapDialogId).find('form');

                                var  newMapData = {};

                                $.each(form.serializeArray(), function(i, field) {
                                    newMapData[field.name] = field.value;
                                });

                                saveMapData(newMapData);

                                $(this).dialog('close');
                            }
                        }
                    });
                }
            }
        };

        var moduleData = {
            id: config.newMapDialogId,
            title: 'Add new map',
            scope: config.mapScopes,
            type: config.mapTypes,
            icon: config.mapIcons
        };

        Render.showModule(moduleConfig, moduleData);
    };

    var saveMapData = function(mapData){

        // TODO: save map
        console.log(mapData);
    };

    /**
     * get all maps for a maps module
     * @param mapModule
     * @returns {*}
     */
    var getMaps = function(mapModule){

        var maps = $(mapModule).find('.' + config.mapClass);

        return maps;
    };

    /**
     * get all Tabs for a maps module
     * @param mapModule
     * @returns {*}
     */
    var getTabContentElements = function(mapContentModule){

        var tabs = $(mapContentModule).find('.' + config.mapTabContentClass );

        return tabs;
    };

    /**
     * set Tab Observer, events are triggered within map.js
     * @param mapContentModule
     */
    $.fn.setTabContenteObserver = function(){

        return this.each(function(){
            $(this).on('pf:updateSystemData', function(e, data){
                // update Tab Content with system data information
                updateSystemInfo($( e.target ));
            });
        });
    };

    var updateSystemInfo = function(tabContentElement){

        // get Table cell for system Info
        var systemCell = $(tabContentElement).find('.' + config.mapTabContentCellFirst);

        // clear systemCell
        systemCell.empty();

        // TODO replace with backend ajax request
        var systemData = tempFunctionGetSystemData();

        var signatureData = formatSignatureData(systemData);

        // check if signatures exist
        if(signatureData.length > 0){
            var table = $('<table>', {
                class: ['display', 'compact', config.sigTableClass].join(' '),
                id: 'test_table'
            });

            systemCell.append(table);


            table.dataTable( {
                "data": signatureData,
                "pageLength": 100,
                "lengthMenu": [ 5, 10, 25, 50, 75, 100 ],
                "columnDefs": [
                    {
                        "targets": 0,
                        //"orderData": 0,
                        "orderable": true,
                        "title": "sig",
                        "width": '20px'
                    },{
                        "targets": 1,
                        "orderable": true,
                        "title": "type",
                        "width": '50px'
                    },{
                        "targets": 2,
                        "title": "name/description"
                    },{
                        "targets": 3,
                        "title": "created",
                        "width": '70px'
                    },{
                        "targets": 4,
                        "title": "updated",
                        "width": '70px'
                    }
                ]
            } );

            systemCell.show();

            // make Table editable
            table.makeEditable();


        }else{
            systemCell.hide();
        }

    };

    /**
     * make a table editable (in-line-editor)
     */
    $.fn.makeEditable = function(){
        // set editor mode
       // $.fn.editable.defaults.mode = 'inline';

        // cach sige types
        var sigTypeCache = {};

        // Select sig type (master)
        $(this).find('.' + config.sigTableEditSigTypeSelect).editable({
            mode: 'popup',
            source: function(){

                var systemType = $(this).attr('data-systemtype');
                var areaId = $(this).attr('data-areaid');

                var cacheKey = [systemType, areaId].join('_');

                // check for cached signature names
                if(sigTypeCache.hasOwnProperty( cacheKey )){
                    return sigTypeCache[cacheKey];
                }

                var availableTypes = {};

                // get all available Signature Types
                if(
                    config.signatureTypes[systemType] &&
                    config.signatureTypes[systemType][areaId]
                ){
                    // json object -> "translate" keys to names
                    var tempTypes = config.signatureTypes[systemType][areaId];


                    for (var prop in tempTypes) {
                        if(tempTypes.hasOwnProperty(prop)){
                             prop = parseInt(prop);

                            switch(prop){
                                case 1:
                                    availableTypes[prop] = 'Combat';
                                    break;
                                case 2:
                                    availableTypes[prop] = 'Relict';
                                    break;
                                case 3:
                                    availableTypes[prop] = 'Data';
                                    break;
                                case 4:
                                    availableTypes[prop] = 'Gas';
                                    break;
                            }
                        }
                    }


                    availableTypes = sigTypeCache[cacheKey] = availableTypes;
                }

                return availableTypes;
            }
        });

        // cache sig names
        var sigNameCache = {};

        // Select sig name (slave: depends on sig type)
        $(this).find('.' + config.sigTableEditSigNameSelect).editable({
            mode: 'inline',
            source: function(){

                var systemType = $(this).attr('data-systemtype');
                var areaId = $(this).attr('data-areaid');
                var sigType = $(this).attr('data-sigtypeid');

                var cacheKey = [systemType, areaId, sigType].join('_');

                // check for cached signature names
                if(sigNameCache.hasOwnProperty( cacheKey )){
                    return sigNameCache[cacheKey];
                }

                var availableSigs = {};

                // get all available Signature Names
                if(
                    config.signatureTypes[systemType] &&
                    config.signatureTypes[systemType][areaId] &&
                    config.signatureTypes[systemType][areaId][sigType]
                ){
                    availableSigs = sigNameCache[cacheKey] = config.signatureTypes[systemType][areaId][sigType];
                }

                return availableSigs;
            }
        });

        // Textfields
        $('.' + config.sigTableEditText).editable({
            anim: "1000"
        });
    };

    /**
     * get Area ID by security string
     * k-space not implemented jet
     * @param security
     * @returns {*}
     */
    var getAreaIdBySecurity = function(security){

        var areaId = null;

        switch(security){
            case 'C1':
                areaId = 1;
                break;
            case 'C2':
                areaId = 2;
                break;
            case 'C3':
                areaId = 3;
                break;
            case 'C4':
                areaId = 4;
                break;
            case 'C5':
                areaId = 5;
                break;
            case 'C6':
                areaId = 6;
                break;
        }

        return areaId;
    };

    /**
     * formats all signature data for table
     * @param systemData
     * @returns {Array}
     */
    var formatSignatureData = function(systemData){

        var formattedData = [];

        if(
            systemData &&
            systemData.config &&
            systemData.config.id &&
            systemData.config.type === 'wh'
        ){
            // system data "should" be valid :)
            var systemSecurity = systemData.config.security;
            var systemType = systemData.config.type;


            var areaId = getAreaIdBySecurity(systemSecurity);

            // areaId is required as a key for signature names
            if(areaId){

                $.each(systemData.signatures, function(i, data){

                    var tempData = [];

                    // set signature
                    tempData.push(data.sig);

                    var sigType = '<a href="#" class="' + config.sigTableEditSigTypeSelect + '" ';
                    sigType += 'data-type="select" ';
                    sigType += 'data-systemType="' + systemType + '" ';
                    sigType += 'data-areaId="' + areaId + '" ';
                    sigType += 'data-value="' + data.sigTypeId + '" ';
                    sigType += '></a>';

                    // set Sig Id
                    tempData.push( sigType );

                    var sigElement = '<a href="#" class="' + config.sigTableEditSigNameSelect + '" ';
                    sigElement += 'data-type="select" ';
                    sigElement += 'data-systemType="' + systemType + '" ';
                    sigElement += 'data-areaId="' + areaId + '" ';
                    sigElement += 'data-sigTypeId="' + data.sigTypeId + '" ';
                    sigElement += 'data-value="' + data.typeId + '" ';
                    sigElement += '></a>';

                    // set Sig Id
                    tempData.push( sigElement );

                    // set Sig created
                    tempData.push( data.created );

                    // set Sig updated
                    tempData.push( data.updated );

                    formattedData.push(tempData);
                });
            }

        }



        return formattedData;
    };


    /**
     * TODO delete function !!!!!!!
     */
    var tempFunctionGetSystemData = function(){

        var data = {
            config: {
                id: 2,
                name: 'J150020',
                security: 'C6',
                type: 'wh'
            },
            signatures: [
                {
                    id: 2,
                    sig: 'GDF',
                    typeId: 1,
                    sigTypeId: 2,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 6,
                    sig: 'HFS',
                    typeId: 1,
                    sigTypeId: 3,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 8,
                    sig: 'HFG',
                    typeId: 1,
                    sigTypeId: 1,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 8,
                    sig: 'LLD',
                    typeId: 1,
                    sigTypeId: 1,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 8,
                    sig: 'DGE',
                    typeId: 1,
                    sigTypeId: 1,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 8,
                    sig: 'EXS',
                    typeId: 1,
                    sigTypeId: 1,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 8,
                    sig: 'CVS',
                    typeId: 3,
                    sigTypeId: 1,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 8,
                    sig: 'GGD',
                    typeId: 2,
                    sigTypeId: 1,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 8,
                    sig: 'OKD',
                    typeId: 1,
                    sigTypeId: 1,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 8,
                    sig: 'DBE',
                    typeId: 3,
                    sigTypeId: 1,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 8,
                    sig: 'ASW',
                    typeId: 1,
                    sigTypeId: 1,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 8,
                    sig: 'NFG',
                    typeId: 2,
                    sigTypeId: 2,
                    created: 1415215936,
                    updated: 1415215936

                }
            ]

        };


        return data;
    };


    /**
     * updates complete map module (all maps)
     * @param userData
     */
    $.fn.updateMapModule = function(userData){

        // get all active map elements for module
        var mapElements = getMaps(this);

        // get map Data
        $.each(mapElements, function(i, mapElement){

            var mapId = parseInt( $(mapElement).attr('data-mapid') );

            var mapUserData = {};
            // get user data for each active map
            $.each(userData, function(j, tempMapData){

                if(tempMapData.config.id === mapId){
                    // map userdata found
                    mapUserData = tempMapData;
                }
            });

            // update map
            $(mapElement).updateUserData(mapUserData);
        });
    };

    /**
     * load all structrure elements into a TabsContent div (tab body)
     */
    $.fn.initContentStructure = function(){

        return this.each(function(){
            // init bootstrap Grid
            var contentStructure = $('<div>', {
                class: ['row', config.mapTabContentRow].join(' ')
            }).append(
                    $('<div>', {
                        class: ['col-xs-12', 'col-sm-8', config.mapTabContentCellFirst].join(' ')
                    })
                ).append(
                    $('<div>', {
                        class: ['col-xs-6', 'col-sm-4', config.mapTabContentCellSecond].join(' ')
                    })
                );


            // append grid structure
            $(this).append(contentStructure);
        });

    };

    /**
     * load map module into element (all maps)
     * @param mapData
     */
    $.fn.loadMapModule = function(mapData){

        var moduleConfig = {
            name: 'modules/tabs',
            position: $(this),
            link: 'prepend',
            functions: {
                after: function(){

                    // this new created module
                    var mapContentModule = $("div[data-map-tabs='" + config.mapTabBarId + "']");

                    // load first map i in first tab content container
                    var tabContentElements = getTabContentElements(mapContentModule);

                    // set observer for manually triggered map events
                    tabContentElements.setTabContenteObserver();

                    // load all the structure elements for ALL Tab Content Body
                    tabContentElements.initContentStructure();

                    // load first map i in first tab content container
                    $( tabContentElements[0] ).initMap(mapData[0]);

                    // check for "new map" action before tap-change
                    $('#' + config.mapTabBarId).find('a[data-toggle="tab"]').on('show.bs.tab', function (e) {

                        var mapIndex = parseInt( $(e.target).attr('data-map-index') );

                        if(mapIndex === -1){
                            // add new Tab selected
                            showNewMapDialog();
                            e.preventDefault();
                        }


                    });

                    // load new map right after tab-change
                    $('#' + config.mapTabBarId).find('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {

                        var mapIndex = parseInt( $(e.target).attr('data-map-index') );

                        if(mapIndex > 0){
                            var mapId = mapData[mapIndex].config.id;
                            var currentTabContentElement = $('#' + config.mapTabIdPrefix + mapId);

                            $( currentTabContentElement).initMap( mapData[mapIndex]);
                        }

                    });



                }
            }
        };

        var moduleData = {
            id: config.mapTabBarId,
            tabs: []
        };

        // add new tab data for each map
        $.each(mapData, function(i, data){

            var active = false;
            if(i === 0){
                active = true;
            }

            moduleData.tabs.push({
                id: data.config.id,
                index: i,
                name: data.config.name,
                icon: data.config.icon,
                tabClass: [config.mapTabClass, getMapTypeClassForType( data.config.type) ].join(' '),
                contentClass: config.mapTabContentClass,
                active: active
            });
        });

        // add new tab
        moduleData.tabs.push({
            id: 0,
            index: -1,
            name: 'add',
            icon: 'fa-plus',
            tabClass: [config.mapTabClass, getMapTypeClassForType('default')].join(' '),
            contentClass: config.mapTabContentClass,
            pullRight: true
        });

        Render.showModule(moduleConfig, moduleData);
    };

    /**
     * init map, load into a container and init custom scrollbar
     * @param container
     * @param mapData
     */
    $.fn.initMap = function(mapData){

        return this.each(function(){
            $(this).loadMap(mapData);

            // init custom scrollbars
            var scrollableElement = $(this).find('.' + config.mapWrapperClass);
            initCutomScrollbar( scrollableElement );
        });
    };

    /**
     * init a custom scrollbar
     * @param scrollableElement
     */
    var initCutomScrollbar = function( scrollableElement ){

        // init custom scrollbars
        $(scrollableElement).mCustomScrollbar({
            axis:"x",
            theme:"light-thick"
        });

    };

});
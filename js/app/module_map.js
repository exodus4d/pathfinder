define(["jquery", "app/render", "app/map/map", "customScrollbar"], function($, Render) {

    "use strict";

    var config = {
        dynamicElementWrapperId: 'pf-dialog-wrapper',   // parent Element for dynamic content (dialoges,..)
        mapTabBarId: 'pf-map-tabs',
        mapTabIdPrefix: 'pf-map-tab-',
        mapWrapperClass: 'pf-map-wrapper',              // scrollable
        mapClass: 'pf-map',                             // class for each map
        newMapDialogId: 'pf-map-new-dialog',

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
        ]


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
     * get all maps for a module
     * @param mapModule
     * @returns {*}
     */
    var getMaps = function(mapModule){

        var maps = $(mapModule).find('.' + config.mapClass);

        return maps;
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
                    // load first map i in first tab content container
                    var firstTabContentElement = $("div[data-map-tabs='" + config.mapTabBarId + "'] div:first-child");

                    loadMap(firstTabContentElement, mapData[0]);

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

                            loadMap(currentTabContentElement, mapData[mapIndex]);
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
                tabClass: getMapTypeClassForType(data.config.type),
                active: active
            });
        });

        // add new tab
        moduleData.tabs.push({
            id: 0,
            index: -1,
            name: 'add',
            icon: 'fa-plus',
            tabClass: getMapTypeClassForType('default'),
            pullRight: true
        });

        Render.showModule(moduleConfig, moduleData);
    };

    /**
     * load mapData into a container and init custom scrollbar
     * @param container
     * @param mapData
     */
    var loadMap = function(container, mapData){

        $(container).loadMap(mapData);

        // init custom scrollbars
        var scrollableElement = $(container).find('.' + config.mapWrapperClass);
        initCutomScrollbar( scrollableElement );

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
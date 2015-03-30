define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'app/ui/system_info',
    'app/ui/system_graph',
    'app/ui/system_signature',
    'app/ui/system_route',
    'app/ui/system_killboard',
    'datatablesTableTools',
    'xEditable',
    'app/map/map'
], function($, Config, Util, Render, bootbox) {

    'use strict';

    var currentMapData = [];                                                    // current map data

    var config = {
        dynamicElementWrapperId: 'pf-dialog-wrapper',                           // parent Element for dynamic content (dialogs,..)
        mapTabElementId: 'pf-map-tab-element',                                  // id for map tab element (tabs + content)
        mapTabBarId: 'pf-map-tabs',                                             // id for map tab bar
        mapTabIdPrefix: 'pf-map-tab-',                                          // id prefix for a map tab
        mapTabClass: 'pf-map-tab',                                              // class for a map tab
        mapTabLinkTextClass: 'nav-tabs-link',                                   // class for span elements in a tab
        mapTabContentClass: 'pf-map-tab-content',                               // class for tab content container
        mapTabContentSystemInfoClass: 'pf-map-tab-content-system',
        mapWrapperClass: 'pf-map-wrapper',                                      // scrollable
        mapClass: 'pf-map',                                                     // class for each map

        // TabContentStructure
        mapTabContentRow: 'pf-map-content-row',                                 // main row for Tab content (grid)
        mapTabContentCell: 'pf-map-content-col',                                // column
        mapTabContentCellFirst: 'pf-map-content-col-first',                     // first column
        mapTabContentCellSecond: 'pf-map-content-col-second',                   // second column

        // module
        moduleClass: 'pf-module',                                               // class for a module
        moduleClosedClass: 'pf-module-closed'                                   // class for a closed module

    };

    var mapTabChangeBlocked = false;                                            // flag for preventing map tab switch

    /**
     * get all maps for a maps module
     * @param mapModule
     * @returns {*}
     */
    $.fn.getMaps = function(){

        var maps = $(this).find('.' + config.mapClass);

        return maps;
    };

    /**
     * get the current active map for
     * @returns {*}
     */
    $.fn.getActiveMap = function(){

        var map = $(this).find('.active.' + config.mapTabContentClass + ' .' + config.mapClass);

        if(map.length === 0){
            map = false;
        }

        return map;
    };


    /**
     * get all TabElements in this map module
     * @returns {*}
     */
    var getTabElements = function(){
        return $('#' + config.mapTabBarId).find('a');
    };

    /**
     * set Tab Observer, events are triggered within map.js
     * @param mapContentModule
     */
    $.fn.setTabContentObserver = function(){

        return this.each(function(){
            // update Tab Content with system data information
            $(this).on('pf:updateSystemData', function(e, mapData){

                // collect all relevant data for SystemInfoElement
                var systemInfoData = {
                    systemData: $( mapData.system).getSystemData(),
                    mapId: parseInt( $( mapData.system).attr('data-mapid') )
                };

                drawSystemInfoElement($( e.target ), systemInfoData);
            });

            $(this).on('pf:deleteSystemData', function(e, systemData){
                console.log(systemData);
            });


        });
    };

    /**
     * clears and updates the system info element (signature table, system info,...)
     * @param tabContentElement
     * @param systemInfoData
     */
    var drawSystemInfoElement = function(tabContentElement, systemInfoData){

        // get Table cell for system Info
        var firstCell = $(tabContentElement).find('.' + config.mapTabContentCellFirst);
        var secondCell = $(tabContentElement).find('.' + config.mapTabContentCellSecond);

        // draw system info module
        firstCell.drawSystemInfoModule(systemInfoData.systemData);

        // draw system graph module
        firstCell.drawSystemGraphModule(systemInfoData.systemData);

        // draw signature table module
        firstCell.drawSignatureTableModule(systemInfoData.systemData);

        // draw system routes module
        secondCell.drawSystemRouteModule(systemInfoData.systemData);

        // draw system killboard module
        secondCell.drawSystemKillboardModule(systemInfoData.systemData);



        // set Module Observer
        setModuleObserver();

    };

    /**
     * set observer for each module
     */
    var setModuleObserver = function(){

        // toggle height for a module
        $(document).off('click.toggleModuleHeight').on('click.toggleModuleHeight', '.' + config.moduleClass, function(e){
            var moduleElement = $(this);
            // get click position
            var posX = moduleElement.offset().left;
            var posY = moduleElement.offset().top;
            var clickX = e.pageX - posX;
            var clickY = e.pageY - posY;

            // check for top-left click
            if(clickX <= 6 && clickY <= 6){

                // remember height
                if(! moduleElement.data('origHeight')){

                    moduleElement.data('origHeight', moduleElement.outerHeight());
                }

                if(moduleElement.hasClass( config.moduleClosedClass )){
                    var moduleHeight = moduleElement.data('origHeight');
                    moduleElement.velocity('finish').velocity({
                        height: [ moduleHeight + 'px', [ 400, 15 ] ]
                    },{
                        duration: 400,
                        easing: 'easeInSine',
                        complete: function(){
                            moduleElement.removeClass( config.moduleClosedClass );
                            moduleElement.removeData();
                        }
                    });
                }else{
                    moduleElement.velocity('finish').velocity({
                        height: [ '40px', [ 400, 15 ] ]
                    },{
                        duration: 400,
                        easing: 'easeInSine',
                        complete: function(){
                            moduleElement.addClass( config.moduleClosedClass );
                        }
                    });
                }
            }


        });

    };


    /**
     * updates only visible/active map module
     * @param userData
     * @returns {boolean}
     */
    var test = 1
    $.fn.updateMapModuleData = function(userData){

        var mapModule = $(this);

        test++;
        // get all active map elements for module
        var mapElement = mapModule.getActiveMap();

        var currentUserData = null;

        // current user data
        if(userData.currentUserData){
            currentUserData = userData.currentUserData;
        }

        if(mapElement !== false){
            var mapId = mapElement.data('id');

            // save static user data
            Config.currentUserData = userData.currentUserData;

            //var tempMapUserData = null;
            // get user data for each active map
            var tempMapUserDataClone = null;

            for(var j = 0; j < userData.mapUserData.length; j++){
                //var tempMapData = userData.mapUserData[j];
                var tempMapData = JSON.parse(JSON.stringify(userData.mapUserData[j]));
                if(tempMapData.config.id === mapId){
                    // map userData found

                    // clone object (pass by value) due to object manipulation
                    tempMapUserDataClone = JSON.parse(JSON.stringify(tempMapData));

                    // TODO remove !!!!
                    if( (test % 2) === 0){
                        tempMapUserDataClone.data.systems[0].user.push({
                            id: 7,
                            name: 'Lijama',
                            ship: {
                                id: 59,
                                name: 'Archon'
                            },
                            status: 'corp'
                        })
                    }else if((test % 3) === 0){
                        tempMapUserDataClone.data.systems = new Array();

                    }

                    break;
                }
            }

            // update map
            if(tempMapUserDataClone){
                mapElement.updateUserData(tempMapUserDataClone, currentUserData);
            }
        }

        return true;
    };

    /**
     * load all structure elements into a TabsContent div (tab body)
     */
    $.fn.initContentStructure = function(){

        return this.each(function(){
            // init bootstrap Grid
            var contentStructure = $('<div>', {
                class: ['row', config.mapTabContentRow].join(' ')
            }).append(
                    $('<div>', {
                        class: ['col-xs-12', 'col-md-8', config.mapTabContentCellFirst, config.mapTabContentCell].join(' ')
                    })
                ).append(
                    $('<div>', {
                        class: ['col-xs-12', 'col-md-4', config.mapTabContentCellSecond, config.mapTabContentCell].join(' ')
                    })
                );


            // append grid structure
            $(this).append(contentStructure);
        });

    };

    var getTabElement = function(options){

        var tabElement = $('<div>', {
            id: config.mapTabElementId
        });

        var tabBar = $('<ul>', {
            class: ['nav', 'nav-tabs'].join(' '),
            id: options.barId
        }).attr('role', 'tablist');

        var tabContent = $('<div>', {
            class: 'tab-content'
        }).attr('data-map-tabs', options.barId);

        tabElement.append(tabBar);
        tabElement.append(tabContent);

        return tabElement;
    };

    /**
     * set data for a map tab, or update an existing map tab with new data
     * @param options
     */
    $.fn.updateTabData = function(options){
        var tabElement = $(this);

        // set main data
        tabElement.data('map-id', options.id).data('updated', options.updated);

        // change tab link
        tabElement.attr('href', '#' + config.mapTabIdPrefix + options.id);

        // change map icon
        tabElement.find('i').removeClass().addClass(['fa', 'fa-fw', options.icon].join(' '));

        // change map name label
        tabElement.find('.' + config.mapTabLinkTextClass).text(options.name);

        // change tabClass
        var listElement = tabElement.parent();
       tabElement.parent().removeClass().addClass([config.mapTabClass, options.type.classTab ].join(' '));
        if(options.right === true){
            listElement.addClass('pull-right');
        }
    };


    /**
     * add a new tab to tab-map-module end returns the new objects
     * @param options
     * @returns {{listElement: (*|void), contentElement: (*|HTMLElement)}}
     */
    $.fn.addTab = function(options){

        var tabElement = $(this);
        var tabBar = tabElement.find('ul.nav-tabs');
        var tabContent = tabElement.find('div.tab-content');

        var listElement = $('<li>').attr('role', 'presentation');

        if(options.active === true){
            listElement.addClass('active');
        }

        if(options.right === true){
            listElement.addClass('pull-right');
        }

        // link element -------
        var linkElement = $('<a>').attr('role', 'tab');

        // icon element ------
        var iconElement = $('<i>');

        // text element -----
        var textElement = $('<span>', {
            class: config.mapTabLinkTextClass
        });

        var newListElement = listElement.append(
            linkElement.append(iconElement).append(textElement)
        );

        tabBar.append( newListElement );

        // update Tab element -> set data
        linkElement.updateTabData(options);

        // tabs content ====================================
        var contentElement = $('<div>', {
            id: config.mapTabIdPrefix + options.id,
            class: options.contentClasses.join(' ')
        });

        contentElement.addClass('tab-pane');

        if(options.active === true){
            contentElement.addClass('active');
        }

        tabContent.append(contentElement);


        // init tab =========================================================
        linkElement.on('click', function(e){
            e.preventDefault();

            // callback function after tab switch
            function switchTabCallback(mapElement, tabLinkElement){
                tabLinkElement.tab('show');
                // unfreeze map
                mapElement.data('frozen', false);
                return false;
            }

            if(mapTabChangeBlocked === false){

                var tabLinkElement = $(this);
                var mapId = tabLinkElement.data('map-id');

                // ignore "add" tab. no need for map change
                if(mapId > 0){
                    var mapElement = $('#' + config.mapTabElementId).getActiveMap();

                    if(mapId !== mapElement.data('id')){
                        // block tabs until switch is done
                        mapTabChangeBlocked = true;

                        // freeze active map -> no user data update while map switch
                        mapElement.data('frozen', true);

                        // hide current map with animation
                        mapElement.visualizeMap('hide', function(){
                            // un-block map tabs
                            mapTabChangeBlocked = switchTabCallback(mapElement, tabLinkElement);
                        });
                    }
                }else{
                    tabLinkElement.tab('show');
                }

            }
        });


        return {
            listElement: newListElement,
            contentElement: contentElement
        };
    };

    /**
     * deletes a map tab for a given map id
     * @param mapId
     */
    $.fn.deleteTab = function(mapId){

        var tabElement = $(this);

        var linkElement = tabElement.find('a[href="#' + config.mapTabIdPrefix + mapId + '"]');

        var deletedTabName = '';

        if(linkElement.length > 0){
            deletedTabName = linkElement.find('.' + config.mapTabLinkTextClass).text();

            var liElement = linkElement.parent();
            var contentElement = tabElement.find('div[id="' + config.mapTabIdPrefix + mapId + '"]');

            var findNewActiveTab = false;
            // check if liElement was active
            if(liElement.hasClass('active')){
                // search any remaining li element and set active
                findNewActiveTab = true;
            }

            liElement.remove();
            contentElement.remove();

            if(findNewActiveTab === true){
                tabElement.find('a:first').tab('show');
            }
        }

        return deletedTabName;
    };

    /**
     * get current map data for a map id
     * @param mapId
     * @returns {boolean}
     */
    var getMapDataById = function(mapId){

        var mapData = false;

        for(var i = 0; i < currentMapData.length; i++){
            if(currentMapData[i].config.id === mapId){
                mapData = currentMapData[i];
                break;
            }
        }

        return mapData;
    };

    /**
     * load/update map module into element (all maps)
     * @param mapData
     * @returns {boolean}
     */
    $.fn.updateMapModule = function(mapData){

        if(mapData.length === 0){
            return true;
        }


        // update current map data
        currentMapData = mapData;

        // temp store current map data to prevent data-change while function execution!
        var tempMapData = currentMapData;

        var mapModuleElement = $(this);

        // check if tabs module is already loaded
        var tabMapElement = $('#' + config.mapTabElementId);

        // check if tabs have changed
        var tabsChanged = false;

        if(tabMapElement.length > 0){
            // tab element already exists
            var tabElements = getTabElements();

            // mapIds that are currently active
            var activeMapIds = [];

            // check whether a tab/map is still active
            for(var i = 0; i < tabElements.length; i++){
                var tabElement = $(tabElements[i]);
                var mapId = tabElement.data('map-id');

                if(mapId > 0){
                    var tabMapData = getMapDataById(mapId);

                    if(tabMapData !== false){
                        // map data available ->
                        activeMapIds.push(mapId);

                        // check for map data change and update tab
                        if(tabMapData.config.updated !== tabElement.data('updated')){
                            tabElement.updateTabData(tabMapData.config);
                        }

                    }else{
                        // map data not available -> remove tab
                        var deletedTabName = tabMapElement.deleteTab(mapId);

                        tabsChanged = true;

                        if(deletedTabName.length > 0){
                            Util.showNotify({title: 'Map removed', text: deletedTabName + ' deleted', type: 'warning'});
                        }
                    }
                }
            }

            // add new tabs for new maps
            $.each(tempMapData, function(i, data){

                if( activeMapIds.indexOf( data.config.id ) === -1 ){
                    // add new map tab

                    var tabOptions = {
                        id: parseInt( data.config.id ),
                        type: data.config.type,
                        contentClasses: [config.mapTabContentClass],
                        active: false,
                        icon: data.config.icon,
                        name: data.config.name,
                        right: false,
                        updated: data.config.updated
                    };

                    var newTabElements = tabMapElement.addTab(tabOptions);

                    // set observer for manually triggered map events
                    newTabElements.contentElement.setTabContentObserver();

                    // load all the structure elements for the new tab
                    newTabElements.contentElement.initContentStructure();

                    tabsChanged = true;

                    Util.showNotify({title: 'Map added', text: data.config.name + ' added', type: 'success'});
                }

            });

            // get current active map
            var activeMapId = Util.getMapModule().getActiveMap().data('id');
            var activeMapData = getMapDataById(activeMapId);

            if(activeMapData !== false){
                // update active map with new mapData
                var currentTabContentElement = $('#' + config.mapTabIdPrefix + activeMapId);
                $( currentTabContentElement).loadMap( activeMapData, {} );
            }
        }else{
            // create Tab Element

            tabsChanged = true;

            var options = {
                barId: config.mapTabBarId
            };

            tabMapElement = getTabElement(options);

            // add new tab for each map
            for(var j = 0; j < tempMapData.length; j++){

                var data = tempMapData[j];

                var activeTab = false;
                if(j === 0){
                    activeTab = true;
                }

                var tabOptions = {
                    id: parseInt( data.config.id ),
                    type: data.config.type,
                    contentClasses: [config.mapTabContentClass],
                    active: activeTab,
                    icon: data.config.icon,
                    name: data.config.name,
                    right: false,
                    updated: data.config.updated
                };

                tabMapElement.addTab(tabOptions);

            }

            // add "add" button
            var tabAddOptions = {
                id: 0,
                type: {
                    classTab: Util.getInfoForMap( 'standard', 'classTab')
                },
                contentClasses: [config.mapTabContentClass],
                icon: 'fa-plus',
                name: 'add',
                right: true
            };

            tabMapElement.addTab(tabAddOptions);


            mapModuleElement.prepend(tabMapElement);

            // ==============================================================

            // this new created module
            var tabContentElements = tabMapElement.find('.' + config.mapTabContentClass);

            // set observer for manually triggered map events
            tabContentElements.setTabContentObserver();

            // load all the structure elements for ALL Tab Content Body
            tabContentElements.initContentStructure();

            // load first map i in first tab content container
            $( tabContentElements[0] ).loadMap( tempMapData[0], {showAnimation: true} );
        }

        if(tabsChanged === true){

            // remove previous event handlers
            var allTabElements = getTabElements();
            allTabElements.off('show.bs.tab');
            allTabElements.off('shown.bs.tab');
            allTabElements.off('hide.bs.tab');


            // check for "new map" action before tap-change
            allTabElements.on('show.bs.tab', function (e) {
                var mapId = $(e.target).data('map-id');

                if(mapId === 0){
                    // add new Tab selected
                    $(document).trigger('pf:menuEditMap', {newMap: true});
                    e.preventDefault();
                }
            });

            // load new map right after tab-change
            allTabElements.on('shown.bs.tab', function (e) {
                var mapId = $(e.target).data('map-id');
                var tabMapData = getMapDataById(mapId);

                if(tabMapData !== false){
                    // load map
                    var currentTabContentElement = $('#' + config.mapTabIdPrefix + mapId);

                    $( currentTabContentElement).loadMap( tabMapData, {showAnimation: true} );

                    // "wake up" scrollbar for map and get previous state back
                    var scrollableElement = currentTabContentElement.find('.' + config.mapWrapperClass);
                    $(scrollableElement).mCustomScrollbar( 'update');
                }else{
                    // no map data found -> remove tab
                    tabMapElement.deleteTab(mapId);
                }
            });

            allTabElements.on('hide.bs.tab', function (e, a) {

                var newMapId = $(e.relatedTarget).data('map-id');
                var oldMapId = $(e.target).data('map-id');

                // disable map if new map is selected -> not "add button"
                if(newMapId > 0){

                    var currentTabContentElement = $('#' + config.mapTabIdPrefix + oldMapId);

                    // disable scrollbar for map that will be hidden. "freeze" current state
                    var scrollableElement = currentTabContentElement.find('.' + config.mapWrapperClass);
                    $(scrollableElement).mCustomScrollbar( 'disable' );
                }
            });
        }

        return true;
    };

    /**
     * collect all data for export/save from each active map in the map module
     * @returns {Array}
     */
    $.fn.getMapModuleData = function(){

        // get all active map elements for module
        var mapElements = $(this).getMaps();

        var data = [];
        for(var i = 0; i < mapElements.length; i++){

            var mapData = $(mapElements[i]).getMapData(false);

            if(mapData !== false){
                data.push(mapData);
            }
        }

        return data;
    };

});
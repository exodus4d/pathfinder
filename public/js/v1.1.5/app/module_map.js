define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/map',
    'app/map/util',
    'app/counter',
    'app/ui/system_info',
    'app/ui/system_graph',
    'app/ui/system_signature',
    'app/ui/system_route',
    'app/ui/system_killboard',
    'datatables.net',
    'datatables.net-buttons',
    'datatables.net-buttons-html',
    'datatables.net-responsive',
    'datatables.net-select'
], function($, Init, Util, Map, MapUtil) {

    'use strict';

    var config = {
        dynamicElementWrapperId: 'pf-dialog-wrapper',                           // parent Element for dynamic content (dialogs,..)
        mapTabElementId: 'pf-map-tab-element',                                  // id for map tab element (tabs + content)
        mapTabBarId: 'pf-map-tabs',                                             // id for map tab bar
        mapTabIdPrefix: 'pf-map-tab-',                                          // id prefix for a map tab
        mapTabClass: 'pf-map-tab',                                              // class for a map tab
        mapTabLinkTextClass: 'nav-tabs-link',                                   // class for span elements in a tab
        mapTabIconClass: 'pf-map-tab-icon',                                     // class for map icon
        mapTabSharedIconClass: 'pf-map-tab-shared-icon',                        // class for map shared icon
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
     * set Tab Observer, events are triggered within map.js
     */
    $.fn.setTabContentObserver = function(){
        return this.each(function(){
            // update Tab Content with system data information
            $(this).on('pf:drawSystemModules', function(e){
                drawSystemModules($( e.target ));
            });

            $(this).on('pf:removeSystemModules', function(e){
                removeSystemModules($( e.target ));
            });
        });
    };

    /**
     * clear all system info modules and remove them
     * @param tabContentElement
     * @param callback
     */
    var removeSystemModules = function(tabContentElement, callback){
        tabContentElement.find('.' + config.moduleClass).velocity('transition.slideDownOut', {
            duration: Init.animationSpeed.mapModule,
            complete: function(tempElement){
                $(tempElement).remove();

                if(callback){
                    callback();
                }
            }
        });
    };

    /**
     * clears and updates the system info element (signature table, system info,...)
     * @param tabContentElement
     */
    var drawSystemModules = function(tabContentElement){
        var currentSystemData = Util.getCurrentSystemData();

        // get Table cell for system Info
        var firstCell = $(tabContentElement).find('.' + config.mapTabContentCellFirst);
        var secondCell = $(tabContentElement).find('.' + config.mapTabContentCellSecond);

        // draw system info module
        firstCell.drawSystemInfoModule(currentSystemData.mapId, currentSystemData.systemData);

        // draw system graph module
        firstCell.drawSystemGraphModule(currentSystemData.systemData);

        // draw signature table module
        firstCell.drawSignatureTableModule(currentSystemData.systemData);

        // draw system routes module
        secondCell.drawSystemRouteModule(currentSystemData.mapId, currentSystemData.systemData);

        // draw system killboard module
        secondCell.drawSystemKillboardModule(currentSystemData.systemData);

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
            if(clickX <= 8 && clickY <= 8){

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
                        height: [ '36px', [ 400, 15 ] ]
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
     * @returns {boolean}
     */
    $.fn.updateMapModuleData = function(){
        var mapModule = $(this);

        // get all active map elements for module
        var mapElement = mapModule.getActiveMap();

        if(mapElement !== false){
            var mapId = mapElement.data('id');

            var currentMapUserData = Util.getCurrentMapUserData(mapId);

            // update map with current user data
            if(currentMapUserData){
                mapElement.updateUserData(currentMapUserData);
            }
        }

        return true;
    };

    /**
     * update system info panels (below map)
     * @param systemData
     */
    $.fn.updateSystemModuleData = function(systemData){
        var mapModule = $(this);

        if(systemData){
            // check if current open system is still the requested info system
            var currentSystemData = Util.getCurrentSystemData();

            if(currentSystemData){
                if(systemData.id === currentSystemData.systemData.id){
                    // trigger system update event
                    $(document).trigger('pf:updateSystemModules', [systemData]);
                }
            }
        }
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

    /**
     * get a fresh tab element
     * @param options
     * @returns {*|jQuery|HTMLElement}
     */
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

        // set "main" data
        tabElement.data('map-id', options.id).data('updated', options.updated);

        // change "tab" link
        tabElement.attr('href', '#' + config.mapTabIdPrefix + options.id);

        // change "map" icon
        var mapIconElement = tabElement.find('.' + config.mapTabIconClass);
        mapIconElement.removeClass().addClass([config.mapTabIconClass, 'fa', 'fa-fw', options.icon].join(' '));

        // change "shared" icon
        var mapSharedIconElement = tabElement.find('.' + config.mapTabSharedIconClass);
        mapSharedIconElement.hide();

        // check if the map is a "shared" map
        if(options.access){
            if(
                options.access.user.length > 1 ||
                options.access.corporation.length > 1 ||
                options.access.alliance.length > 1
            ){
                mapSharedIconElement.show();
            }
        }

        // change map name label
        var tabLinkTextElement = tabElement.find('.' + config.mapTabLinkTextClass);
        tabLinkTextElement.text(options.name);

        // change tabClass
        var listElement = tabElement.parent();

        // new tab classes
        var tabClasses = [config.mapTabClass, options.type.classTab ];

        // check if tab was "active" before
        if( listElement.hasClass('active') ){
            tabClasses.push('active');
        }
        listElement.removeClass().addClass( tabClasses.join(' ') );

        // set title for tooltip
        if(options.type.name !== undefined){
            tabLinkTextElement.attr('title', options.type.name + ' map');
        }

        var mapTooltipOptions = {
            placement: 'bottom',
            container: 'body',
            trigger: 'hover',
            delay: 150
        };

        listElement.find('[title]').tooltip(mapTooltipOptions).tooltip('fixTitle');

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

        if(options.right === true){
            listElement.addClass('pull-right');
        }

        // link element
        var linkElement = $('<a>').attr('role', 'tab');

        // map icon element
        var mapIconElement = $('<i>', {
            class: config.mapTabIconClass
        });

        // map shared icon element
        var mapSharedIconElement = $('<i>', {
            class: [config.mapTabSharedIconClass, 'fa', 'fa-fw', 'fa-share-alt'].join(' '),
            title: 'shared map'
        });

        // text element
        var textElement = $('<span>', {
            class: config.mapTabLinkTextClass
        });

        var newListElement = listElement.append(
            linkElement.append(mapIconElement).append(textElement).append(mapSharedIconElement)
        );

        tabBar.append( newListElement );

        // update Tab element -> set data
        linkElement.updateTabData(options);

        // tabs content =======================================================
        var contentElement = $('<div>', {
            id: config.mapTabIdPrefix + parseInt( options.id ),
            class: [config.mapTabContentClass].join(' ')
        });

        contentElement.addClass('tab-pane');

        tabContent.append(contentElement);

        // init tab ===========================================================
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

            // remove map instance from local cache
            Map.clearMapInstance(mapId);

            if(findNewActiveTab === true){
                tabElement.find('.' + config.mapTabClass + ':not(.pull-right):first a').tab('show');
            }
        }

        return deletedTabName;
    };

    /**
     * clear all active maps
     */
    $.fn.clearMapModule = function(){
        var mapModuleElement = $(this);
        var tabMapElement = $('#' + config.mapTabElementId);

        if(tabMapElement.length > 0){
            var tabElements = mapModuleElement.getMapTabElements();

            for(var i = 0; i < tabElements.length; i++){
                var tabElement = $(tabElements[i]);
                var mapId = tabElement.data('map-id');

                if(mapId > 0){
                    tabMapElement.deleteTab(mapId);
                }
            }
        }
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

        // store current map data global (cache)
        // temp store current map data to prevent data-change while function execution!
        var tempMapData = Util.setCurrentMapData(mapData);

        var mapModuleElement = $(this);

        // check if tabs module is already loaded
        var tabMapElement = $('#' + config.mapTabElementId);

        // check if tabs have changed
        var tabsChanged = false;

        if(tabMapElement.length > 0){
            // tab element already exists
            var tabElements = mapModuleElement.getMapTabElements();

            // map ID that is currently active
            var activeMapId = 0;

            // mapIds that are currently active
            var activeMapIds = [];

            // check whether a tab/map is still active
            for(var i = 0; i < tabElements.length; i++){
                var tabElement = $(tabElements[i]);
                var mapId = tabElement.data('map-id');

                if(mapId > 0){
                    var tabMapData = Util.getCurrentMapData(mapId);

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

                    var newTabElements = tabMapElement.addTab(data.config);

                    // check if there is any active map yet (this is not the case
                    // when ALL maps are removed AND new maps are added in one call
                    // e.g. character switch)
                    if(tabMapElement.find('.' + config.mapTabClass + '.active:not(.pull-right)').length === 0){
                        tabMapElement.find('.' + config.mapTabClass + ':not(.pull-right):first a').tab('show');

                        activeMapId = data.config.id;
                    }

                    // set observer for manually triggered map events
                    newTabElements.contentElement.setTabContentObserver();

                    // load all the structure elements for the new tab
                    newTabElements.contentElement.initContentStructure();

                    tabsChanged = true;

                    Util.showNotify({title: 'Map added', text: data.config.name + ' added', type: 'success'});
                }
            });

            // get current active map
            if(activeMapId === 0){
                activeMapId = Util.getMapModule().getActiveMap().data('id');
            }
            var activeMapData = Util.getCurrentMapData(activeMapId);

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
                tabMapElement.addTab(data.config);
            }

            // add "add" button
            var tabAddOptions = {
                id: 0,
                type: {
                    classTab: MapUtil.getInfoForMap( 'standard', 'classTab')
                },
                icon: 'fa-plus',
                name: 'add',
                right: true
            };

            tabMapElement.addTab(tabAddOptions);

            mapModuleElement.prepend(tabMapElement);

            var currentUserData = Util.getCurrentUserData();
            var promiseStore = MapUtil.getLocaleData('character', currentUserData.character.id);

            promiseStore.then(function(data) {
                // array key where map data is available (0 == first map found)
                var mapDataIndex = 0;
                // tab dom selector
                var mapKeyTabSelector = 'first';

                if(
                    data &&
                    data.defaultMapId
                ){
                    mapDataIndex = Util.getCurrentMapDataIndex(data.defaultMapId);
                    mapKeyTabSelector = 'nth-child(' + ( mapDataIndex + 1 ) + ')';
                }

                // ==============================================================

                // this new created module
                var tabContentElements = tabMapElement.find('.' + config.mapTabContentClass);

                // set observer for manually triggered map events
                tabContentElements.setTabContentObserver();

                // load all the structure elements for ALL Tab Content Body
                tabContentElements.initContentStructure();

                // set first Tab active
                tabMapElement.find('.' + config.mapTabClass + ':' + mapKeyTabSelector + ' a').tab('show');
            });

        }

        if(tabsChanged === true){

            // remove previous event handlers
            var allTabElements = mapModuleElement.getMapTabElements();
            allTabElements.off('show.bs.tab');
            allTabElements.off('shown.bs.tab');
            allTabElements.off('hide.bs.tab');


            // check for "new map" action before tap-change
            allTabElements.on('show.bs.tab', function (e) {
                var mapId = $(e.target).data('map-id');

                if(mapId > 0){
                    // save mapId as new "default" (local storage)
                    var userData = MapUtil.storeDefaultMapId(mapId);
                }else{
                    // add new Tab selected
                    $(document).trigger('pf:menuShowMapSettings', {tab: 'new'});
                    e.preventDefault();
                }
            });

            // load new map right after tab-change
            allTabElements.on('shown.bs.tab', function (e) {
                var mapId = $(e.target).data('map-id');
                var tabMapData = Util.getCurrentMapData(mapId);

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

            allTabElements.on('hide.bs.tab', function (e) {
                var newMapId = $(e.relatedTarget).data('map-id');
                var oldMapId = $(e.target).data('map-id');

                // skip "add button"
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
     * collect all data (systems/connections) for export/save from each active map in the map module
     * if no change detected -> do not attach map data to return array
     * @returns {Array}
     */
    $.fn.getMapModuleDataForUpdate = function(){

        // get all active map elements for module
        var mapElements = $(this).getMaps();

        var data = [];
        for(var i = 0; i < mapElements.length; i++){
            // get all changed (system / connection) data from this map
            var mapData = $(mapElements[i]).getMapDataFromClient({forceData: false, checkForChange: true});

            if(mapData !== false){

                if(
                    mapData.data.systems.length > 0 ||
                    mapData.data.connections.length > 0
                ){
                    data.push(mapData);
                }
            }
        }

        return data;
    };

});
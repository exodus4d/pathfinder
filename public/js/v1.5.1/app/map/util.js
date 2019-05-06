/**
 * Map util functions
 */

define([
    'jquery',
    'app/init',
    'app/util'
], ($, Init, Util) => {
    'use strict';

    let config = {
        mapSnapToGridDimension: 20,                                     // px for grid snapping (grid YxY)
        defaultLocalJumpRadius: 3,                                      // default search radius (in jumps) for "nearby" pilots

        // local storage
        characterLocalStoragePrefix: 'character_',                      // prefix for character data local storage key
        mapLocalStoragePrefix: 'map_',                                  // prefix for map data local storage key
        mapTabContentClass: 'pf-map-tab-content',                       // Tab-Content element (parent element)

        mapWrapperClass: 'pf-map-wrapper',                              // wrapper div (scrollable)

        mapClass: 'pf-map',                                             // class for all maps
        mapGridClass: 'pf-grid-small',                                  // class for map grid snapping
        mapCompactClass: 'pf-compact',                                  // class for map compact system UI

        systemIdPrefix: 'pf-system-',                                   // id prefix for a system
        systemClass: 'pf-system',                                       // class for all systems
        systemActiveClass: 'pf-system-active',                          // class for an active system on a map
        systemSelectedClass: 'pf-system-selected',                      // class for selected systems on on map
        systemHiddenClass: 'pf-system-hidden',                          // class for hidden (filtered) systems

        // dataTable
        tableCellEllipsisClass: 'pf-table-cell-ellipsis',
        tableCellEllipsis80Class: 'pf-table-cell-80',
        tableCellEllipsis90Class: 'pf-table-cell-90',
        tableCellEllipsis100Class: 'pf-table-cell-100'
    };

    // map menu options
    let mapOptions = {
        mapMagnetizer: {
            buttonId: Util.config.menuButtonMagnetizerId,
            description: 'Magnetizer',
            onEnable: 'initMagnetizer',                                 // jQuery extension function
            onDisable: 'destroyMagnetizer'                              // jQuery extension function
        },
        mapSnapToGrid : {
            buttonId: Util.config.menuButtonGridId,
            description: 'Grid snapping',
            class: 'mapGridClass'
        },
        mapEndpoint : {
            buttonId: Util.config.menuButtonEndpointId,
            description: 'Endpoint overlay',
            onEnable: 'showEndpointOverlays',                           // jQuery extension function
            onDisable: 'hideEndpointOverlays'                           // jQuery extension function
        },
        mapCompact : {
            buttonId: Util.config.menuButtonCompactId,
            description: 'Compact system layout',
            class: 'mapCompactClass'
        }
    };

    // active jsPlumb instances currently running =====================================================================
    let activeInstances = {};

    /**
     * set mapInstance
     * @param mapId
     * @param map
     */
    let setMapInstance = (mapId, map) => {
        activeInstances[mapId] = map;
    };

    /**
     * get mapInstance
     * @param mapId
     * @returns {*}
     */
    let getMapInstance = mapId => activeInstances[mapId];

    /**
     * check for mapInstance is set
     * @param mapId
     * @returns {boolean}
     */
    let existsMapInstance = mapId => typeof activeInstances[mapId] === 'object';

    /**
     * removes a map instance
     * @param mapId
     */
    let clearMapInstance = mapId => {
        if(existsMapInstance(mapId)){
            delete activeInstances[mapId];
        }
    };

    // ================================================================================================================

    /**
     * get all available map Types
     * optional they can be filtered by current access level of a user
     * @param {bool} filterByUser
     * @returns {Array}
     */
    let getMapTypes = (filterByUser) => {
        let mapTypes = Object.assign({}, Init.mapTypes);

        if(filterByUser === true){
            let authorizedMapTypes = [];
            let checkMapTypes = ['private', 'corporation', 'alliance'];

            for(let i = 0; i < checkMapTypes.length; i++){
                let objectId = Util.getCurrentUserInfo(checkMapTypes[i] + 'Id');
                if(objectId > 0){
                    // check if User could add new map with a mapType
                    let currentObjectMapData = Util.filterCurrentMapData('config.type.id', Util.getObjVal(mapTypes, checkMapTypes[i] + '.id'));
                    let maxCountObject = Util.getObjVal(mapTypes, checkMapTypes[i] + '.defaultConfig.max_count');
                    if(currentObjectMapData.length < maxCountObject){
                        authorizedMapTypes.push(checkMapTypes[i]);
                    }
                }
            }

            for(let mapType in mapTypes){
                if(authorizedMapTypes.indexOf(mapType) < 0){
                    delete( mapTypes[mapType] );
                }
            }
        }

        // convert to array
        let mapTypesFlat = [];
        for(let mapType in mapTypes){
            mapTypes[mapType].name = mapType;
            mapTypesFlat.push(mapTypes[mapType]);
        }

        return mapTypesFlat;
    };

    /**
     * get all available scopes for a map
     * @returns {Array}
     */
    let getMapScopes = () => {
        let scopes = [];
        $.each(Init.mapScopes, function(prop, data){
            let tempData = data;
            tempData.name = prop;
            scopes.push(tempData);
        });

        return scopes;
    };

    /**
     * get some scope info for a given info string
     * @param {string} info
     * @param {string} option
     * @returns {string}
     */
    let getScopeInfoForMap = (info, option) => {
        let scopeInfo = '';
        if(Init.mapScopes.hasOwnProperty(info)){
            scopeInfo = Init.mapScopes[info][option];
        }
        return scopeInfo;
    };

    /**
     * get all available map icons
     * @returns {Object[]}
     */
    let getMapIcons = () => {
        return Init.mapIcons;
    };

    /**
     * get map info
     * @param {string} mapType
     * @param {string} option
     * @returns {string}
     */
    let getInfoForMap = (mapType, option) => {
        let mapInfo = '';
        if(Init.mapTypes.hasOwnProperty(mapType)){
            mapInfo = Init.mapTypes[mapType][option];
        }
        return mapInfo;
    };

    /**
     * get some system info for a given info string (e.g. rally class)
     * @param {string} info
     * @param {string} option
     * @returns {string}
     */
    let getInfoForSystem = (info, option) => {
        let systemInfo = '';
        if(Init.classes.systemInfo.hasOwnProperty(info)){
            systemInfo = Init.classes.systemInfo[info][option];
        }
        return systemInfo;
    };

    /**
     * get system data by mapId and systemid
     * @param mapId
     * @param systemId
     * @returns {boolean}
     */
    let getSystemData = (mapId, systemId) => {
        let systemData = false;
        let mapData = Util.getCurrentMapData(mapId);

        if(mapData){
            for(let j = 0; j < mapData.data.systems.length; j++){
                let systemDataTemp = mapData.data.systems[j];
                if(systemDataTemp.id === systemId){
                    systemData = systemDataTemp;
                    break;
                }
            }
        }
        return systemData;
    };

    /**
     * get system type information
     * @param {number} systemTypeId
     * @param {string} option
     * @returns {string}
     */
    let getSystemTypeInfo = (systemTypeId, option) => {
        let systemTypeInfo = '';
        $.each(Init.systemType, function(prop, data){
            if(systemTypeId === data.id){
                systemTypeInfo = data[option];
                return;
            }
        });
        return systemTypeInfo;
    };

    /**
     * get some info for a given effect string
     * @param effect
     * @param option
     * @returns {string}
     */
    let getEffectInfoForSystem = (effect, option) => {
        let effectInfo = '';
        if( Init.classes.systemEffects.hasOwnProperty(effect) ){
            effectInfo = Init.classes.systemEffects[effect][option];
        }
        return effectInfo;
    };

    /**
     * flag map component (map, system, connection) as "changed"
     * @param component
     */
    let markAsChanged = component => {
        if(component instanceof $ && component.hasClass(config.systemClass)){
            component.data('changed', true);
        }else if(component instanceof jsPlumb.Connection){
            component.setParameter('changed', true);
        }
    };

    /**
     * check if map component (system, connection) is flagged as "changed"
     * @param component
     * @returns {boolean}
     */
    let hasChanged = component => {
        let changed = false;
        if(component instanceof $ && component.hasClass(config.systemClass)){
            changed = component.data('changed') || false;
        }else if(component instanceof jsPlumb.Connection){
            changed = component.getParameter('changed') || false;
        }
        return changed;
    };

    /**
     * get system elements on a map
     * @returns {*|jQuery}
     */
    $.fn.getSystems = function(){
        return this.find('.' + config.systemClass);
    };

    /**
     * get all selected (NOT active) systems on a map
     * @returns {*}
     */
    $.fn.getSelectedSystems = function(){
        let mapElement = $(this);
        return mapElement.find('.' + config.systemSelectedClass);
    };

    /**
     * filter jsPlumb connection or endpoint types
     * -> remove default type(s)
     * @param types
     * @returns {*}
     */
    let filterDefaultTypes = types => {
        let defaultTypes = ['', 'default', 'state_active', 'state_process'];
        return types.diff(defaultTypes);
    };

    /**
     * returns "target/source"  label from endpoint
     * @param connection
     * @param endpoint
     * @returns {string}
     */
    let getEndpointLabel = (connection, endpoint) => {
        return endpoint.element === connection.source ? 'source' : endpoint.element === connection.target ? 'target' : false;
    };

    /**
     * get data from endpoint
     * @param connection
     * @param endpoint
     * @returns {{types: *, label: string}}
     */
    let getDataByEndpoint = (connection, endpoint) => {
        return {
            label: getEndpointLabel(connection, endpoint),
            types: filterDefaultTypes(endpoint.getType())
        };
    };

    /**
     * filter connections by type
     * @param map
     * @param type
     * @param exclude
     * @returns {Array}
     */
    let getConnectionsByType = (map, type, exclude = false) => {
        let connections = [];
        for(let data of map.select().hasType(type)){
            if(data[0] !== exclude){
                connections.push(data[1]);
            }
        }
        return connections;
    };

    /**
     * get endpoints data from connection
     * @param connection
     * @returns {{source: {}, target: {}}}
     */
    let getEndpointsDataByConnection = connection => {
        let endpointsData = {source: {}, target: {}};
        for(let endpoint of connection.endpoints){
            let endpointData = getDataByEndpoint(connection, endpoint);
            if(endpointData.label === 'source'){
                endpointsData.source = endpointData;
            }else if(endpointData.label === 'target'){
                endpointsData.target = endpointData;
            }
        }
        return endpointsData;
    };

    /**
     * get connection data from connection
     * @param connection
     * @param minimal
     * @returns {{id: (*|number), updated: (*|number)}}
     */
    let getDataByConnection = (connection, minimal = false) => {
        let source = $(connection.source);
        let target = $(connection.target);

        let connectionData = {
            id: connection.getParameter('connectionId') || 0,
            updated: connection.getParameter('updated') || 0,
            source: parseInt(source.data('id')),
            target: parseInt(target.data('id'))
        };

        if(minimal){
            connectionData = Object.assign(connectionData, {
                connection: connection
            });
        }else{
            connectionData = Object.assign(connectionData, {
                sourceName: source.data('name'),
                sourceAlias: source.getSystemInfo(['alias']) || source.data('name'),
                targetName: target.data('name'),
                targetAlias: target.getSystemInfo(['alias']) || target.data('name'),
                scope: connection.scope,
                type: filterDefaultTypes(connection.getType()),
                endpoints: getEndpointsDataByConnection(connection)
            });
        }

        return connectionData;
    };

    /**
     * @see getDataByConnection
     * @param connections
     * @returns {Array}
     */
    let getDataByConnections = connections => {
        let data = [];
        for(let connection of connections){
            data.push(getDataByConnection(connection));
        }
        return data;
    };

    /**
     * delete a connection and all related data
     * @param connections
     * @param callback
     */
    let deleteConnections = (connections, callback) => {
        if(connections.length > 0){

            // remove connections from map
            let removeConnections = connections => {
                for(let connection of connections){
                    connection._jsPlumb.instance.detach(connection, {fireEvent: false});
                }
            };

            // prepare delete request
            let map = connections[0]._jsPlumb.instance;
            let mapContainer = $(map.getContainer());

            // connectionIds for delete request
            let connectionIds = [];
            for(let connection of connections){
                connection.addType('state_process');

                let connectionId = connection.getParameter('connectionId');
                // drag&drop a new connection does not have an id yet, if connection is not established correct
                if(connectionId !== undefined){
                    connectionIds.push(connectionId);
                }
            }

            if(connectionIds.length > 0){
                Util.request('DELETE', 'connection', connectionIds, {
                    mapId: mapContainer.data('id')
                }, {
                    connections: connections
                }).then(
                    payload => {
                        for(let connection of payload.context.connections){
                            // connection might be removed rom global map update before this requests ends
                            if(connection._jsPlumb){
                                connection.removeType('state_process');
                            }
                        }

                        // check if all connections were deleted that should get deleted
                        let deletedConnections = payload.context.connections.filter(
                            function(connection){
                                // if a connection is manually (drag&drop) detached, the jsPlumb instance does not exist any more
                                // connection is already deleted!
                                return (
                                    connection._jsPlumb &&
                                    this.indexOf( connection.getParameter('connectionId') ) !== -1
                                );
                            }, payload.data
                        );

                        // remove connections from map
                        removeConnections(deletedConnections);

                        if(callback){
                            callback();
                        }
                    },
                    Util.handleAjaxErrorResponse
                );
            }
        }
    };

    /**
     * get connection related data from a connection
     * -> data requires a signature bind to that connection
     * @param connection
     * @param connectionData
     * @returns {{sourceLabels: Array, targetLabels: Array}}
     */
    let getConnectionDataFromSignatures = (connection, connectionData) => {
        let signatureTypeNames = {
            sourceLabels: [],
            targetLabels: []
        };

        if(
            connection &&
            connectionData.signatures   // signature data is required...
        ){
            let SystemSignatures = require('app/ui/module/system_signature');

            let sourceEndpoint      = connection.endpoints[0];
            let targetEndpoint      = connection.endpoints[1];
            let sourceSystem        = $(sourceEndpoint.element);
            let targetSystem        = $(targetEndpoint.element);
            let sourceId            = sourceSystem.data('id');
            let targetId            = targetSystem.data('id');

            // ... collect overlay/label data from signatures
            for(let signatureData of connectionData.signatures){
                // ... typeId is required to get a valid name
                if(signatureData.typeId > 0){

                    // whether "source" or "target" system is relevant for current connection and current signature...
                    let tmpSystem = null;
                    let tmpSystemType = null;

                    if(signatureData.system.id === sourceId){
                        // relates to "source" endpoint
                        tmpSystemType = 'sourceLabels';
                        tmpSystem = sourceSystem;
                    }else if(signatureData.system.id === targetId){
                        // relates to "target" endpoint
                        tmpSystemType = 'targetLabels';
                        tmpSystem = targetSystem;
                    }

                    // ... get endpoint label for source || target system
                    if(tmpSystem && tmpSystem){
                        // ... get all  available signature type (wormholes) names
                        let availableSigTypeNames = SystemSignatures.getAllSignatureNamesBySystem(tmpSystem, 5);
                        let flattenSigTypeNames = Util.flattenXEditableSelectArray(availableSigTypeNames);

                        if( flattenSigTypeNames.hasOwnProperty(signatureData.typeId) ){
                            let label = flattenSigTypeNames[signatureData.typeId];
                            // shorten label, just take the in game name
                            label = label.substr(0, label.indexOf(' '));
                            signatureTypeNames[tmpSystemType].push(label);
                        }
                    }
                }
            }
        }

        return signatureTypeNames;
    };

    /**
     * get Location [x,y] for Endpoint Overlays (e.g. wh type from Signature mapping)
     * -> Coordinates are relative to the Endpoint (not the system!)
     * -> jsPlumb specific format
     * @param endpoint
     * @param label
     * @returns {number[]}
     */
    let getLabelEndpointOverlayLocation = (endpoint, label) => {
        let chars   = label.length ? label.length : 2;
        let xTop    = chars === 2 ? +0.05 : chars <= 4 ? -0.75 : 3;
        let xLeft   = chars === 2 ? -1.10 : chars <= 4 ? -2.75 : 3;
        let xRight  = chars === 2 ? +1.25 : chars <= 4 ? +1.25 : 3;
        let xBottom = chars === 2 ? +0.05 : chars <= 4 ? -0.75 : 3;

        let yTop    = chars === 2 ? -1.10 : chars <= 4 ? -1.75 : 3;

        switch(endpoint._continuousAnchorEdge){
            case 'top': return [xTop, yTop];
            case 'left': return [xLeft, 0];
            case 'right': return [xRight, 0];
            case 'bottom': return [xBottom , 1.3];
            default: return [0.0, 0.0];
        }
    };

    /**
     * get overlay HTML for connection endpoints by Label array
     * @param label
     * @returns {string}
     */
    let getEndpointOverlayContent = label => {
        let colorClass = 'txt-color-grayLighter';

        if(label.length > 0){
            // check if multiple labels found => conflict
            if( label.includes(', ') ){
                colorClass = 'txt-color-orangeLight';
            }else if( !label.includes('K162') ){
                colorClass = 'txt-color-yellow';
            }
        }else{
            // endpoint not connected with a signature
            label = '<i class="fas fa-question-circle"></i>';
            colorClass = 'txt-color-red';
        }
        return '<span class="txt-color ' + colorClass + '">' + label + '</span>';
    };

    /**
     * get TabContentElement by any element on a map e.g. system
     * @param element
     * @returns {*}
     */
    let getTabContentElementByMapElement = element => $(element).closest('.' + config.mapTabContentClass);

    /**
     * checks if there is an "active" connection on a map
     * @param map
     * @returns {boolean}
     */
    let hasActiveConnection = map => {
        let activeConnections = getConnectionsByType(map, 'state_active');
        return activeConnections.length > 0;
    };

    /**
     * filter map by scopes
     * -> this effects visible systems and connections on UI
     * @param map
     * @param scopes
     */
    let filterMapByScopes = (map, scopes) => {
        if(map){
            // TODO ^^sometimes map is undefined -> bug
            let mapElement = $(map.getContainer());
            let allSystems = mapElement.getSystems();
            let allConnections = map.getAllConnections();

            if(scopes && scopes.length){
                // filter connections -------------------------------------------------------------------------------------
                let visibleSystems = [];
                let visibleConnections = searchConnectionsByScopeAndType(map, scopes);

                for(let connection of allConnections){
                    if(visibleConnections.indexOf(connection) >= 0){
                        setConnectionVisible(connection, true);
                        // source/target system should always be visible -> even if filter scope not matches system type
                        if(visibleSystems.indexOf(connection.endpoints[0].element) < 0){
                            visibleSystems.push(connection.endpoints[0].element);
                        }
                        if(visibleSystems.indexOf(connection.endpoints[1].element) < 0){
                            visibleSystems.push(connection.endpoints[1].element);
                        }
                    }else{
                        setConnectionVisible(connection, false);
                    }
                }

                // filter systems -----------------------------------------------------------------------------------------
                let visibleTypeIds = [];
                if(scopes.indexOf('wh') >= 0){
                    visibleTypeIds.push(1);
                }
                if(scopes.indexOf('abyssal') >= 0){
                    visibleTypeIds.push(4);
                }

                for(let system of allSystems){
                    if(
                        visibleTypeIds.indexOf($(system).data('typeId')) >= 0 ||
                        visibleSystems.indexOf(system) >= 0
                    ){
                        setSystemVisible(system, map, true);
                    }else{
                        setSystemVisible(system, map, false);
                    }
                }

                mapElement.getMapOverlay('info').updateOverlayIcon('filter', 'show');
            }else{
                // clear filter
                for(let system of allSystems){
                    setSystemVisible(system, map, true);
                }
                for(let connection of allConnections){
                    setConnectionVisible(connection, true);
                }

                mapElement.getMapOverlay('info').updateOverlayIcon('filter', 'hide');
            }
        }
    };

    /**
     * mark system as "selected" e.g. for dragging
     * @param map
     * @param system
     * @param select
     */
    let setSystemSelect = (map, system, select) => {
        if(select){
            system.addClass(config.systemSelectedClass);
            map.addToDragSelection(system);
        }else{
            system.removeClass(config.systemSelectedClass);
            map.removeFromDragSelection(system);
        }
    };

    /**
     * mark a system as "active"
     * @param map
     * @param system
     */
    let setSystemActive = (map, system) => {
        // deselect all selected systems on map
        let mapContainer = $( map.getContainer() );
        mapContainer.find('.' + config.systemClass).removeClass(config.systemActiveClass);

        // set current system active
        system.addClass(config.systemActiveClass);

        // collect all required data from map module to update the info element
        // store them global and assessable for each module
        Util.setCurrentSystemData({
            systemData: system.getSystemData(),
            mapId: parseInt( system.attr('data-mapid') )
        });
    };

    /**
     * set system visibility e.g. or filtered systems
     * @param system
     * @param map
     * @param visible
     */
    let setSystemVisible = (system, map, visible) => {
        system = $(system);
        if(!visible){
            // invisible systems should no longer be selected
            setSystemSelect(map, system, false);
        }
        system.toggleClass(config.systemHiddenClass, !visible);
    };

    /**
     * mark a connection as "active"
     * @param map
     * @param connections
     */
    let setConnectionsActive = (map, connections) => {
        // set all inactive
        for(let connection of getConnectionsByType(map, 'state_active')){
            connection.removeType('state_active');
        }

        for(let connection of connections){
            connection.addType('state_active');
        }
    };

    /**
     * set connection visibility e.g. for filtered systems
     * @param connection
     * @param visible
     */
    let setConnectionVisible = (connection, visible) => {
        for(let endpoint of connection.endpoints){
            endpoint.setVisible(visible);
        }
    };

    /**
     * toggle "selected" status of system
     * @param map
     * @param systems
     */
    let toggleSystemsSelect = (map, systems) => {
        for(let system of systems){
            system = $(system);
            if(system.data('locked') !== true){
                if(system.hasClass(config.systemSelectedClass)){
                    setSystemSelect(map, system, false);
                }else{
                    setSystemSelect(map, system, true);
                }
            }
        }
    };

    /**
     * toggle "selected" status of connections
     * @param map
     * @param connections
     */
    let toggleConnectionActive = (map, connections) => {
        let selectedConnections = [];
        let deselectedConnections = [];
        for(let connection of connections){
            if(connection.hasType('state_active')){
                connection.removeType('state_active');
                deselectedConnections.push(connection);
            }else{
                connection.addType('state_active');
                selectedConnections.push(connection);
            }
        }
        updateConnectionInfo(map, selectedConnections, deselectedConnections);
    };

    /**
     * show system info panels
     * @param map
     * @param system
     */
    let showSystemInfo = (map, system) => {
        setSystemActive(map, system);

        // get parent Tab Content and fire update event
        getTabContentElementByMapElement(system).trigger('pf:drawSystemModules');
    };

    /**
     * show connection info panels
     * @param map
     * @param connections
     */
    let showConnectionInfo = (map, connections) => {
        setConnectionsActive(map, connections);

        // get parent Tab Content and fire update event
        let mapContainer = $(map.getContainer());

        getTabContentElementByMapElement(mapContainer).trigger('pf:drawConnectionModules', {
            connections: connections,
            mapId: parseInt(mapContainer.data('id'))
        });
    };

    /**
     * update connection info panels
     * @param map
     * @param selectedConnections
     * @param deselectedConnections
     */
    let updateConnectionInfo = (map, selectedConnections, deselectedConnections) => {
        // get parent Tab Content and fire update event
        let mapContainer = $(map.getContainer());

        $(document).trigger('pf:updateConnectionInfoModule', {
            connectionsUpdate: selectedConnections,
            connectionsRemove: deselectedConnections,
            mapId: parseInt(mapContainer.data('id'))
        });
    };

    /**
     * show "find route" dialog -> trigger route panel
     * @param mapContainer
     * @param systemToData
     */
    let showFindRouteDialog = (mapContainer, systemToData) => {
        // get parent Tab Content and fire update event
        getTabContentElementByMapElement(mapContainer).trigger('pf:updateRouteModules', {
            task: 'showFindRouteDialog',
            systemToData: systemToData,
            mapId: parseInt(mapContainer.data('id'))
        });
    };

    /**
     * performs a new route search -> trigger route panel
     * @param mapContainer
     * @param systemToData
     */
    let findRoute = (mapContainer, systemToData) => {
        getTabContentElementByMapElement(mapContainer).trigger('pf:updateRouteModules', {
            task: 'findRoute',
            systemToData: systemToData,
            mapId: parseInt(mapContainer.data('id'))
        });
    };

    /**
     * search connections by systems
     * @param map
     * @param systems
     * @param scope
     * @returns {Array}
     */
    let searchConnectionsBySystems = (map, systems, scope) => {
        let connections = [];
        let withBackConnection = true;

        $.each(systems, function(i, system){
            // get connections where system is source
            connections = connections.concat( map.getConnections({scope: scope, source: system}) );
            if(withBackConnection === true){
                // get connections where system is target
                connections = connections.concat( map.getConnections({scope: scope, target: system}) );
            }
        });
        return connections;
    };

    /**
     * search connections by scope and/or type
     * -> scope and target can be an array
     * @param map
     * @param scope
     * @param type
     * @param noHidden
     * @returns {Array}
     */
    let searchConnectionsByScopeAndType = (map, scope, type = undefined, noHidden = false) => {
        let connections = [];
        let scopeArray = (scope === undefined) ? ['*'] : ((Array.isArray(scope)) ? scope : [scope]);
        let typeArray = (type === undefined) ? [] : ((Array.isArray(type)) ? type : [type]);

        map.select({scope: scopeArray}).each(function(connection){
            if(noHidden && !connection.isVisible()){
                // exclude invisible connection
                return;
            }

            if(typeArray.length > 0){
                // filter by connection type as well...
                for(let i = 0; i < typeArray.length; i++){
                    if( connection.hasType(typeArray[i]) ){
                        connections.push(connection);
                        break; // don´t add same connection multiple times
                    }
                }
            }else{
                // connection type is ignored
                connections.push(connection);
            }
        });

        return connections;
    };

    /**
     * get Connection Info by option
     * @param {string} connectionTyp
     * @param {string} option
     * @returns {string}
     */
    let getConnectionInfo = (connectionTyp, option) => {
        let connectionInfo = '';
        if(Init.connectionTypes.hasOwnProperty(connectionTyp)){
            connectionInfo = Init.connectionTypes[connectionTyp][option];
        }
        return connectionInfo;
    };

    /**
     * get CSS classes for connection types
     * @param types
     * @returns {string[]}
     */
    let getConnectionFakeClassesByTypes = (types) => {
        let connectionClasses = ['pf-fake-connection'];
        for(let i = 0; i < types.length; i++){
            connectionClasses.push(getConnectionInfo( types[i], 'cssClass'));
        }
        return connectionClasses;
    };

    /**
     * get all direct connections between two given systems
     * @param map
     * @param {JQuery} systemA
     * @param {JQuery} systemB
     * @returns {Array}
     */
    let checkForConnection = (map, systemA, systemB) => {
        let connections = [];
        connections = connections.concat( map.getConnections({scope: '*', source: systemA, target: systemB}) );
        // get connections where system is target
        connections = connections.concat( map.getConnections({scope: '*', source: systemB, target: systemA}) );
        return connections;
    };

    /**
     * get the default connection type for a scope
     * e.g. for new type after scope change
     * @param {string} scope
     * @returns {string}
     */
    let getDefaultConnectionTypeByScope = (scope) => {
        let type = '';
        switch(scope){
            case 'wh':
                type = 'wh_fresh';
                break;
            case 'jumpbridge':
                type = 'jumpbridge';
                break;
            case'stargate':
                type = 'stargate';
                break;
            case'abyssal':
                type = 'abyssal';
                break;
            default:
                console.error('Connection scope "' + scope + '" unknown!');
        }

        return type;
    };

    /**
     * set/change connection status of a wormhole
     * @param {Object} connection - jsPlumb object
     * @param {string} status
     */
    let setConnectionWHStatus = (connection, status) => {
        if(
            status === 'wh_fresh' &&
            connection.hasType('wh_fresh') !== true
        ){
            connection.removeType('wh_reduced');
            connection.removeType('wh_critical');
            connection.addType('wh_fresh');
        }else if(
            status === 'wh_reduced' &&
            connection.hasType('wh_reduced') !== true
        ){
            connection.removeType('wh_fresh');
            connection.removeType('wh_critical');
            connection.addType('wh_reduced');
        }else if(
            status === 'wh_critical' &&
            connection.hasType('wh_critical') !== true
        ){
            connection.removeType('wh_fresh');
            connection.removeType('wh_reduced');
            connection.addType('wh_critical');
        }else if(
            status === 'wh_eol' &&
            connection.hasType('wh_eol') !== true
        ){
            connection.addType('wh_eol');
        }else if(
            status === 'wh_eol' &&
            connection.hasType('wh_eol') !== true
        ){
            connection.addType('wh_eol');
        }
    };

    /**
     * get some scope info for a given info string
     * @param {string} info
     * @param {string} option
     * @returns {string}
     */
    let getScopeInfoForConnection = (info, option) => {
        let scopeInfo = '';
        if(Init.connectionScopes.hasOwnProperty(info)){
            switch(option){
                case 'connectorDefinition':
                    // json data in DB
                    let temp = '{ "data": ' + Init.connectionScopes[info][option] + '}';
                    scopeInfo = $.parseJSON( temp).data;
                    break;
                default:
                    scopeInfo = Init.connectionScopes[info][option];
                    break;
            }
        }

        return scopeInfo;
    };

    /**
     * store local data for current user (IndexDB)
     * @param key
     * @param value
     */
    let storeLocaleCharacterData = (key, value) => {
        if(key.length && value){
            let userData = Util.getCurrentUserData();
            if(
                userData &&
                userData.character
            ){
                storeLocalData('character', userData.character.id, key, value);
            }
        }
    };

    /**
     * get key prefix for local storage data
     * @param type
     * @returns {boolean}
     */
    let getLocalStoragePrefixByType = (type) => {
        let prefix = false;
        switch(type){
            case 'character':   prefix = config.characterLocalStoragePrefix; break;
            case 'map':   prefix = config.mapLocalStoragePrefix; break;
            default:   prefix = config.mapLocalStoragePrefix;
        }
        return prefix;
    };

    /**
     * get stored local data from client cache (IndexedDB)
     * @param type
     * @param objectId
     * @returns {*}
     */
    let getLocaleData = (type, objectId) => {
        if(objectId > 0){
            let storageKey = getLocalStoragePrefixByType(type) + objectId;
            return Util.getLocalStorage().getItem(storageKey);
        }else{
            console.warn('Local storage requires object id > 0');
        }
    };

    /**
     * store local config data to client cache (IndexedDB)
     * @param type
     * @param objectId
     * @param key
     * @param value
     */
    let storeLocalData = (type, objectId, key, value) => {
        if(objectId > 0){
            // get current map config
            let storageKey = getLocalStoragePrefixByType(type) + objectId;
            Util.getLocalStorage().getItem(storageKey).then(function(data){
                // This code runs once the value has been loaded
                // from the offline store.
                data = (data === null) ? {} : data;
                // set/update value
                data[this.key] = this.value;
                Util.getLocalStorage().setItem(this.storageKey, data);
            }.bind({
                key: key,
                value: value,
                storageKey: storageKey
            })).catch(function(err){
                // This code runs if there were any errors
                console.error('Map local storage can not be accessed!');
            });
        }else{
            console.warn('storeLocalData(): Local storage requires object id > 0');
        }
    };

    /**
     * show map animations when a new map gets visual
     * @param mapElement
     * @param show
     * @returns {Promise<any>}
     */
    let visualizeMap = (mapElement, show) => {

        let visualizeMapExecutor = (resolve, reject) => {
            // start map update counter -> prevent map updates during animations
            mapElement.getMapOverlay('timer').startMapUpdateCounter();

            let systemElements = mapElement.find('.' + config.systemClass);
            let endpointElements =  mapElement.find('.jsplumb-endpoint:visible');
            let connectorElements = mapElement.find('.jsplumb-connector:visible');
            let overlayElements = mapElement.find('.jsplumb-overlay:visible, .tooltip');

            let hideElements = (elements) => {
                if(elements.length > 0){
                    // disable transition for next opacity change
                    elements.addClass('pf-notransition');
                    // hide elements
                    elements.css('opacity', 0);
                    // Trigger a reflow, flushing the CSS changes
                    // -> http://stackoverflow.com/questions/11131875/what-is-the-cleanest-way-to-disable-css-transition-effects-temporarily
                    elements[0].offsetHeight; // jshint ignore:line
                    elements.removeClass('pf-notransition');
                }

                return elements;
            };

            let mapElements = systemElements.add(endpointElements).add(connectorElements);

            // show nice animation
            if(show === 'show'){
                hideElements(systemElements);
                hideElements(endpointElements);
                hideElements(connectorElements);
                hideElements(overlayElements);

                overlayElements.velocity('transition.fadeIn', {
                    duration: 60,
                    display: 'auto'
                });

                if(mapElements.length){
                    mapElements.velocity({
                        translateY: [ 0, -20],
                        opacity: [ 1, 0 ]
                    }, {
                        duration: 150,
                        easing: 'easeOut',
                        complete: function(){
                            resolve({
                                action: 'visualizeMap',
                                data: false
                            });
                        }
                    });
                }else{
                    // "complete" callback is not fired if no elements were animated
                    resolve({
                        action: 'visualizeMap',
                        data: false
                    });
                }

            }else if(show === 'hide'){

                overlayElements.velocity('transition.fadeOut', {
                    duration: 60,
                    display: 'auto'
                });

                if(mapElements.length){
                    mapElements.velocity({
                        translateY: [ -20, 0 ],
                        opacity: [ 0, 1 ]
                    }, {
                        duration: 150,
                        easing: 'easeOut',
                        complete: function(){
                            resolve({
                                action: 'visualizeMap',
                                data: false
                            });
                        }
                    });
                }else{
                    // "complete" callback is not fired if no elements were animated
                    resolve({
                        action: 'visualizeMap',
                        data: false
                    });
                }

            }
        };

        return new Promise(visualizeMapExecutor);
    };

    /**
     * set default map Options (
     * -> HINT: This function triggers Events! Promise is resolved before trigger completed
     * @param mapElement
     * @param mapConfig
     * @returns {Promise<any>}
     */
    let setMapDefaultOptions = (mapElement, mapConfig) => {

        let setMapDefaultOptionsExecutor = (resolve, reject) => {
            // update main menu options based on the active map -----------------------------------------------
            $(document).trigger('pf:updateMenuOptions', {
                mapConfig: mapConfig
            });

            // init compact system layout ---------------------------------------------------------------------
            mapElement.triggerMenuEvent('MapOption', {
                option: 'mapCompact',
                toggle: false
            });

            // init magnetizer --------------------------------------------------------------------------------
            mapElement.triggerMenuEvent('MapOption', {
                option: 'mapMagnetizer',
                toggle: false
            });

            // init grid snap ---------------------------------------------------------------------------------
            mapElement.triggerMenuEvent('MapOption', {
                option: 'mapSnapToGrid',
                toggle: false
            });

            // init endpoint overlay --------------------------------------------------------------------------
            mapElement.triggerMenuEvent('MapOption', {
                option: 'mapEndpoint',
                toggle: false
            });

            resolve({
                action: 'setMapDefaultOptions',
                data: false
            });
        };

        return new Promise(setMapDefaultOptionsExecutor);
    };

    /**
     * get system coordinates from systemElement
     * @param system
     * @returns {{x: number, y: number}}
     */
    let getSystemPosition = system => {
        let x = system.css('left');
        let y = system.css('top');

        return {
          x: parseInt(x.substring(0, x.length - 2)),
          y: parseInt(y.substring(0, y.length - 2))
        };
    };

    /**
     * scroll map to default (stored) x/y coordinates
     * @param mapElement
     * @returns {Promise<any>}
     */
    let scrollToDefaultPosition = (mapElement) => {

        let scrollToDefaultPositionExecutor = (resolve, reject) => {
            let mapWrapper = mapElement.parents('.' + config.mapWrapperClass);

            // auto scroll map to previous stored position
            let promiseStore = getLocaleData('map', mapElement.data('id'));
            promiseStore.then(data => {
                // This code runs once the value has been loaded from  offline storage
                if(data && data.scrollOffset){
                    mapWrapper.scrollToPosition([data.scrollOffset.y, data.scrollOffset.x]);
                }

                resolve({
                    action: 'scrollToDefaultPosition',
                    data: false
                });
            });
        };

        return new Promise(scrollToDefaultPositionExecutor);
    };

    /**
     * delete local map configuration by key (IndexedDB)
     * @param type
     * @param objectId
     * @param key
     */
    let deleteLocalData = (type, objectId, key) => {
        if(objectId > 0){
            // get current map config
            let storageKey = getLocalStoragePrefixByType(type) + objectId;
            Util.getLocalStorage().getItem(storageKey).then(function(data){
                if(
                    data &&
                    data.hasOwnProperty(key)
                ){
                    delete data[key];
                    Util.getLocalStorage().setItem(this.storageKey, data);
                }
            }.bind({
                storageKey: storageKey
            }));
        }else{
            console.warn('deleteLocalData(): Local storage requires object id > 0');
        }
    };

    /**
     * set or change rallyPoint for systems
     * @param rallyUpdated
     * @param options
     * @returns {*}
     */
    $.fn.setSystemRally = function(rallyUpdated, options){
        rallyUpdated = rallyUpdated || 0;
        let rallyPoke = false;

        let defaultOptions = {
            poke: false,
            hideNotification: false,    // do not show notification
            hideCounter: false          // do not start map update counter
        };
        options = $.extend({}, defaultOptions, options);

        return this.each(function(){
            let system = $(this);
            let rally = system.data('rallyUpdated') || 0;

            if(rallyUpdated !== rally){
                // rally status changed
                if( !options.hideCounter ){
                    system.getMapOverlay('timer').startMapUpdateCounter();
                }

                let rallyClass = getInfoForSystem('rally', 'class');

                if(rallyUpdated > 0){
                    // new rally point set OR update system with rally information
                    system.addClass(rallyClass);

                    // rallyUpdated > 0 is required for poke!
                    rallyPoke = options.poke;

                    let notificationOptions = {
                        title: 'Rally Point',
                        text: 'System: ' +  system.data('name')
                    };

                    if(rallyUpdated === 1){
                        // rally point not saved on DB
                        notificationOptions.type = 'success';
                        Util.showNotify(notificationOptions);
                    }else if(options.poke){
                        // rally saved AND poke option active

                        // check if desktop notification was already send
                        let mapId = system.data('mapid');
                        let systemId = system.data('id');
                        let promiseStore = getLocaleData('map', mapId);
                        promiseStore.then(function(data){
                            // This code runs once the value has been loaded
                            // from the offline store.
                            let rallyPokeData = {};

                            if(
                                data &&
                                data.rallyPoke
                            ){
                                // poke data exists
                                rallyPokeData = data.rallyPoke;
                            }

                            if(
                                !rallyPokeData.hasOwnProperty(this.systemId) || // rally poke was not already send to client
                                rallyPokeData[this.systemId] !== rallyUpdated // already send to that system but in the past
                            ){
                                rallyPokeData[this.systemId] = rallyUpdated;
                                storeLocalData('map', this.mapId, 'rallyPoke', rallyPokeData);

                                notificationOptions.type = 'info';
                                Util.showNotify(notificationOptions, {
                                    desktop: true,
                                    stack: 'barBottom',
                                    click: e => {window.location.href = getMapDeeplinkUrl(mapId, systemId);}
                                });
                            }
                        }.bind({
                            mapId: mapId,
                            systemId: systemId,
                            rallyUpdated: rallyUpdated
                        }));
                    }

                    // update active "route" module -> add rally point row --------------------------------------------
                    let mapContainer = system.parents('.' + config.mapClass);
                    findRoute(mapContainer, {
                        systemId: system.data('systemId'),
                        name: system.data('name'),
                        rally: 1
                    });
                }else{
                    // rally point removed
                    system.removeClass(rallyClass);

                    if( !options.hideNotification ){
                        Util.showNotify({title: 'Rally point removed', type: 'success'});
                    }
                }
            }

            system.data('rallyUpdated', rallyUpdated);
            system.data('rallyPoke', rallyPoke);
        });
    };

    /**
     * set map "shortcut" events
     */
    $.fn.setMapShortcuts = function(){
        return this.each((i, mapWrapper) => {
            mapWrapper = $(mapWrapper);
            let mapElement = mapWrapper.find('.' + config.mapClass);

            // dynamic require Map module -> otherwise there is a require(), loop
            let Map = require('app/map/map');
            let System = require('app/map/system');
            let map = Map.getMapInstance( mapElement.data('id'));

            mapWrapper.watchKey('mapSystemAdd', (mapWrapper) => {
                System.showNewSystemDialog(map, {position: {x: 0, y: 0}}, Map.saveSystemCallback);
            },{focus: true});

            mapWrapper.watchKey('mapSystemsSelect', (mapWrapper) => {
                mapElement.selectAllSystems();
            },{focus: true});

            mapWrapper.watchKey('mapSystemsDelete', (mapWrapper) => {
                let selectedSystems = mapElement.getSelectedSystems();
                $.fn.showDeleteSystemDialog(map, selectedSystems);
            },{focus: true});

        });
    };

    /**
     * add system pilot tooltip
     * @param systemUserData
     * @param options
     * @returns {*}
     */
    $.fn.addSystemPilotTooltip = function(systemUserData, options){
        let content = Util.getSystemPilotsTable(systemUserData);

        let defaultOptions = {
            placement: 'top',
            html: true,
            trigger: 'hover',
            container: 'body',
            title: 'Pilots',
            content: content,
            delay: {
                show: 150,
                hide: 0
            },
        };

        options = $.extend({}, defaultOptions, options);

        return this.each(function(){
            $(this).popover(options);
        });
    };

    /**
     * add system effect tooltip
     * @param security
     * @param effect
     * @param options
     * @returns {*}
     */
    $.fn.addSystemEffectTooltip = function(security, effect, options){
        let effectClass = getEffectInfoForSystem(effect, 'class');
        let systemEffectData = Util.getSystemEffectData(security, effect);

        let title = '<i class="fas fa-square fa-fw ' + effectClass + '"></i>&nbsp;' +
            getEffectInfoForSystem(effect, 'name') +
            '<span class="pull-right ' + Util.getSecurityClassForSystem(security) + '">' + security + '</span>';

        let content = Util.getSystemEffectTable(systemEffectData);

        let defaultOptions = {
            placement: 'top',
            html: true,
            trigger: 'hover',
            container: 'body',
            title: title,
            content: content,
            delay: {
                show: 150,
                hide: 0
            },
        };

        options = $.extend({}, defaultOptions, options);

        return this.each(function(){
            $(this).popover(options);
        });
    };

    /**
     * add system planets tooltip
     * @param planets
     * @param options
     * @returns {*}
     */
    $.fn.addSystemPlanetsTooltip = function(planets, options){

        let content = Util.getSystemPlanetsTable(planets);

        let defaultOptions = {
            placement: 'top',
            html: true,
            trigger: 'hover',
            container: 'body',
            title: 'Planets',
            content: content,
            delay: {
                show: 150,
                hide: 0
            },
        };

        options = $.extend({}, defaultOptions, options);

        return this.each(function(){
            if(planets.length){
                // Abyss systems don´t have planets -> no tooltip
                let element = $(this);
                element.popover(options);

                if(options.show){
                    element.popover('show');
                }
            }
        });
    };

    /**
     * add a wormhole tooltip with wh specific data to elements
     * @param tooltipData
     * @param options
     * @returns {*}
     */
    $.fn.addWormholeInfoTooltip = function(tooltipData, options){
        return this.each(function(){
            let element = $(this);

            requirejs(['text!templates/tooltip/wormhole_info.html', 'mustache'], (template, Mustache) => {

                // format tooltip data
                let data = {};
                if(tooltipData.massTotal){
                    data.massTotal = Util.formatMassValue(tooltipData.massTotal);
                }else{
                    data.massTotal = '<span class="txt-color txt-color-grayLight">unknown</span>';
                }
                if(tooltipData.massIndividual){
                    data.massIndividual = Util.formatMassValue(tooltipData.massIndividual);
                }else{
                    data.massIndividual = '<span class="txt-color txt-color-grayLight">unknown</span>';
                }
                if(tooltipData.massRegeneration){
                    data.massRegeneration = Util.formatMassValue(tooltipData.massRegeneration);
                }
                if(tooltipData.maxStableTime){
                    data.maxStableTime = tooltipData.maxStableTime + ' h';
                }
                if(tooltipData.signatureStrength){
                    data.signatureStrength = parseFloat(tooltipData.signatureStrength).toLocaleString() + '&nbsp;&#37;';
                }else{
                    data.signatureStrength = '<span class="txt-color txt-color-grayLight">unknown</span>';
                }

                let title = tooltipData.name;

                if(tooltipData.security){
                    // K162 has no security

                    if(!tooltipData.class){
                        tooltipData.class = Util.getSecurityClassForSystem(tooltipData.security);
                    }

                    title += '<span class="pull-right ' + tooltipData.class +'">' + tooltipData.security + '</span>';
                }

                let content = Mustache.render(template, data);

                let defaultOptions = {
                    placement: 'top',
                    html: true,
                    trigger: 'hover',
                    container: 'body',
                    title: title,
                    content: '',
                    delay: {
                        show: 150,
                        hide: 0
                    }
                };

                options = $.extend({}, defaultOptions, options);

                element.popover(options);

                // set new popover content
                let popover = element.data('bs.popover');
                popover.options.title = title;
                popover.options.content = content;

                if(options.smaller){
                    element.setPopoverSmall();
                }

                if(options.show){
                    element.popover('show');
                }
            });
        });
    };

    /**
     * get systemId string (selector
     * @param mapId
     * @param systemId
     * @returns {string}
     */
    let getSystemId = (mapId, systemId) => {
        return config.systemIdPrefix + mapId + '-' + systemId;
    };

    /**
     * check whether the current User has access for a given right
     * based on a given mapConfig
     * @param right
     * @param mapConfig
     * @returns {boolean}
     */
    let checkRight = (right, mapConfig) => {
        let hasAccess = false;
        let currentUserData = Util.getCurrentUserData();
        if(currentUserData){
            // ...there is an active user
            let currentCharacterData = Util.getObjVal(currentUserData, 'character');
            if(currentCharacterData){
                // ... there is an active character
                let currentCharacterRole = Util.getObjVal(currentCharacterData, 'role');
                if(currentCharacterRole){
                    // ... active character has a role assigned

                    let mapType = Util.getObjVal(mapConfig, 'type.name');
                    let mapAccess = Util.getObjVal(mapConfig, 'access.' + (mapType === 'private' ? 'character' : mapType)) || [];

                    // this is either Ally/Corp or Character Id
                    let accessObjectId = Util.getCurrentUserInfo(mapType + 'Id');

                    // check whether character has map access
                    let hasMapAccess = mapAccess.some((accessObj) => {
                        return (accessObj.id === accessObjectId);
                    });

                    if(hasMapAccess){
                        // ... this should ALWAYS be be true!
                        switch(mapType){
                            case 'private':
                                hasAccess = true;
                                break;
                            case 'corporation':
                                let objectRights = Util.getObjVal(currentCharacterData, mapType + '.rights') || [];

                                let objectRight = objectRights.find((objectRight) => {
                                    return objectRight.right.name === right;
                                });

                                if(objectRight){
                                    // ... Ally/Corp has the right we are looking for assigned with a required role
                                    if(
                                        currentCharacterRole.name === 'SUPER' ||
                                        objectRight.role.name === 'MEMBER' ||
                                        objectRight.role.name === currentCharacterRole.name
                                    ){
                                        hasAccess = true;
                                    }
                                }
                                break;
                            case 'alliance':
                                hasAccess = true;
                                break;
                        }
                    }
                }
            }
        }

        return hasAccess;
    };

    /**
     * get a unique map url for deeplinking
     * @param mapId
     * @param systemId
     * @returns {string}
     */
    let getMapDeeplinkUrl = (mapId, systemId) => {
        let url = location.protocol + '//' + location.host + '/map';
        url += mapId ? '/' + encodeURIComponent(window.btoa(mapId)) : '';
        url += systemId ? '_' + encodeURIComponent(window.btoa(systemId)) : '';
        return url;
    };

    return {
        config: config,
        mapOptions: mapOptions,
        setMapInstance: setMapInstance,
        getMapInstance: getMapInstance,
        existsMapInstance: existsMapInstance,
        clearMapInstance: clearMapInstance,
        getMapTypes: getMapTypes,
        getMapScopes: getMapScopes,
        getScopeInfoForMap: getScopeInfoForMap,
        getMapIcons: getMapIcons,
        getInfoForMap: getInfoForMap,
        getInfoForSystem: getInfoForSystem,
        getSystemData: getSystemData,
        getSystemTypeInfo: getSystemTypeInfo,
        getEffectInfoForSystem: getEffectInfoForSystem,
        markAsChanged: markAsChanged,
        hasChanged: hasChanged,
        toggleSystemsSelect: toggleSystemsSelect,
        toggleConnectionActive: toggleConnectionActive,
        setSystemActive: setSystemActive,
        showSystemInfo: showSystemInfo,
        showConnectionInfo: showConnectionInfo,
        showFindRouteDialog: showFindRouteDialog,
        getEndpointLabel: getEndpointLabel,
        getConnectionsByType: getConnectionsByType,
        getEndpointsDataByConnection: getEndpointsDataByConnection,
        getDataByConnection: getDataByConnection,
        searchConnectionsBySystems: searchConnectionsBySystems,
        searchConnectionsByScopeAndType: searchConnectionsByScopeAndType,
        getConnectionInfo: getConnectionInfo,
        getConnectionFakeClassesByTypes: getConnectionFakeClassesByTypes,
        checkForConnection: checkForConnection,
        getDefaultConnectionTypeByScope: getDefaultConnectionTypeByScope,
        setConnectionWHStatus: setConnectionWHStatus,
        getScopeInfoForConnection: getScopeInfoForConnection,
        getDataByConnections: getDataByConnections,
        deleteConnections: deleteConnections,
        getConnectionDataFromSignatures: getConnectionDataFromSignatures,
        getLabelEndpointOverlayLocation: getLabelEndpointOverlayLocation,
        getEndpointOverlayContent: getEndpointOverlayContent,
        getTabContentElementByMapElement: getTabContentElementByMapElement,
        hasActiveConnection: hasActiveConnection,
        filterMapByScopes: filterMapByScopes,
        storeLocaleCharacterData: storeLocaleCharacterData,
        getLocaleData: getLocaleData,
        storeLocalData: storeLocalData,
        deleteLocalData: deleteLocalData,
        visualizeMap: visualizeMap,
        setMapDefaultOptions: setMapDefaultOptions,
        getSystemPosition: getSystemPosition,
        scrollToDefaultPosition: scrollToDefaultPosition,
        getSystemId: getSystemId,
        checkRight: checkRight,
        getMapDeeplinkUrl: getMapDeeplinkUrl
    };
});
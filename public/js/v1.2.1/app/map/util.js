/**
 * Map util functions
 */

define([
    'jquery',
    'app/init',
    'app/util'
], function($, Init, Util) {
    'use strict';

    let config = {
        mapSnapToGridDimension: 20,                                     // px for grid snapping (grid YxY)

        // local storage
        characterLocalStoragePrefix: 'character_',                      // prefix for character data local storage key
        mapLocalStoragePrefix: 'map_',                                  // prefix for map data local storage key
        mapTabContentClass: 'pf-map-tab-content',                       // Tab-Content element (parent element)

        systemIdPrefix: 'pf-system-',                                   // id prefix for a system
        systemClass: 'pf-system',                                       // class for all systems
        mapGridClass: 'pf-grid-small'                                   // class for map grid snapping
    };

    // map menu options
    let mapOptions = {
        mapMagnetizer: {
            buttonId: Util.config.menuButtonMagnetizerId,
            description: 'Magnetizer',
            onEnable: 'initMagnetizer',     // jQuery extension function
            onDisable: 'destroyMagnetizer'  // jQuery extension function
        },
        mapSnapToGrid : {
            buttonId: Util.config.menuButtonGridId,
            description: 'Grid snapping',
            class: 'mapGridClass'
        }
    };

    /**
     * get all available map Types
     * optional they can be filtered by current access level of a user
     * @param {bool} filterByUser
     * @returns {Array}
     */
    let getMapTypes = function(filterByUser){
        let mapTypes = [];

        $.each(Init.mapTypes, function(prop, data){
            // skip "default" type -> just for 'add' icon
            if(data.label.length > 0){
                let tempData = data;
                tempData.name = prop;
                mapTypes.push(tempData);
            }
        });

        if(filterByUser === true){
            let corporationId = Util.getCurrentUserInfo('corporationId');
            let allianceId = Util.getCurrentUserInfo('allianceId');

            let authorizedMapTypes = [];
            // check if character data exists
            if(corporationId > 0) {
                authorizedMapTypes.push('corporation');
            }
            if(allianceId > 0){
                authorizedMapTypes.push('alliance');
            }

            // private maps are always allowed
            authorizedMapTypes.push('private');

            // compare "all" map types with "authorized" types
            let tempMapTypes = [];
            for(let i = 0; i < mapTypes.length; i++){
                for(let j = 0; j < authorizedMapTypes.length; j++){
                    if(mapTypes[i].name === authorizedMapTypes[j]){
                        tempMapTypes.push(mapTypes[i]);
                        break;
                    }

                }
            }
            mapTypes = tempMapTypes;
        }

        return mapTypes;
    };

    /**
     * get all available scopes for a map
     * @returns {Array}
     */
    let getMapScopes = function(){
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
    let getScopeInfoForMap = function(info, option){
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
    let getMapIcons = function(){
        return Init.mapIcons;
    };

    /**
     * get map info
     * @param {string} mapType
     * @param {string} option
     * @returns {string}
     */
    let getInfoForMap = function(mapType, option){
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
    let getInfoForSystem = function(info, option){
        let systemInfo = '';
        if(Init.classes.systemInfo.hasOwnProperty(info)){
            systemInfo = Init.classes.systemInfo[info][option];
        }
        return systemInfo;
    };

    /**
     * get system type information
     * @param {number} systemTypeId
     * @param {string} option
     * @returns {string}
     */
    let getSystemTypeInfo = function(systemTypeId, option){
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
    let getEffectInfoForSystem = function(effect, option){
        let effectInfo = '';
        if( Init.classes.systemEffects.hasOwnProperty(effect) ){
            effectInfo = Init.classes.systemEffects[effect][option];
        }
        return effectInfo;
    };

    /**
     * get system elements on a map
     * @returns {*|jQuery}
     */
    $.fn.getSystems = function(){
        return this.find('.' + config.systemClass);
    };

    /**
     * search connections by systems
     * @param {Object} map - jsPlumb
     * @param {JQuery[]} systems - system DOM elements
     * @returns {Array} connections - found connection, DOM elements
     */
    let searchConnectionsBySystems = function(map, systems){
        let connections = [];
        let withBackConnection = true;

        $.each(systems, function(i, system){
            // get connections where system is source
            connections = connections.concat( map.getConnections({source: system}) );
            if(withBackConnection === true){
                // get connections where system is target
                connections = connections.concat( map.getConnections({target: system}) );
            }
        });
        return connections;
    };

    /**
     * search connections by scope and/or type
     * -> scope and target can be an array
     * @param {Object} map - jsPlumb
     * @param {string|string[]} scope
     * @param {string|string[]} type
     * @returns {Array}
     */
    let searchConnectionsByScopeAndType = function(map, scope, type){
        let connections = [];
        let scopeArray = (scope === undefined) ? ['*'] : ((Array.isArray(scope)) ? scope : [scope]);
        let typeArray = (type === undefined) ? [] : ((Array.isArray(type)) ? type : [type]);

        map.select({scope: scopeArray}).each(function(connection){
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
    let getConnectionInfo = function(connectionTyp, option){
        let connectionInfo = '';
        if(Init.connectionTypes.hasOwnProperty(connectionTyp)){
            connectionInfo = Init.connectionTypes[connectionTyp][option];
        }
        return connectionInfo;
    };

    /**
     * get all direct connections between two given systems
     * @param map
     * @param {JQuery} systemA
     * @param {JQuery} systemB
     * @returns {Array}
     */
    let checkForConnection = function(map, systemA, systemB){
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
    let getDefaultConnectionTypeByScope = function(scope){
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
    let setConnectionWHStatus = function(connection, status){
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
    let getScopeInfoForConnection = function(info, option){
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
     * get TabContentElement by any element on a map e.g. system
     * @param element
     * @returns {*}
     */
    let getTabContentElementByMapElement = function(element){
        let tabContentElement = $(element).parents('.' + config.mapTabContentClass);
        return tabContentElement;
    };

    /**
     * store mapId for current user (IndexedDB)
     * @param mapId
     */
    let storeDefaultMapId = function(mapId){
        if(mapId > 0){
            let userData = Util.getCurrentUserData();
            if(
                userData &&
                userData.character
            ){
                storeLocalData('character', userData.character.id, 'defaultMapId', mapId);
            }
        }
    };

    /**
     * get key prefix for local storage data
     * @param type
     * @returns {boolean}
     */
    let getLocalStoragePrefixByType = function(type){
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
    let getLocaleData = function(type, objectId){
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
    let storeLocalData = function(type, objectId, key, value){
        if(objectId > 0){
            // get current map config
            let storageKey = getLocalStoragePrefixByType(type) + objectId;
            Util.getLocalStorage().getItem(storageKey).then(function(data) {
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
            })).catch(function(err) {
                // This code runs if there were any errors
                console.error('Map local storage can not be accessed!');
            });
        }else{
            console.warn('storeLocalData(): Local storage requires object id > 0');
        }
    };

    /**
     * delete local map configuration by key (IndexedDB)
     * @param type
     * @param objectId
     * @param key
     */
    let deleteLocalData = function(type, objectId, key){
        if(objectId > 0){
            // get current map config
            let storageKey = getLocalStoragePrefixByType(type) + objectId;
            Util.getLocalStorage().getItem(storageKey).then(function(data) {
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
            hideNotification: false,
            hideCounter: false,
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

                    system.addClass( rallyClass );
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
                        promiseStore.then(function(data) {
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
                                Util.showNotify(notificationOptions, {desktop: true, stack: 'barBottom'});
                            }
                        }.bind({
                            mapId: mapId,
                            systemId: systemId,
                            rallyUpdated: rallyUpdated
                        }));
                    }
                }else{
                    // rally point removed
                    system.removeClass( rallyClass );

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
     * get systemId string (selector
     * @param mapId
     * @param systemId
     * @returns {string}
     */
    let getSystemId = (mapId, systemId) => {
        return config.systemIdPrefix + mapId + '-' + systemId;
    };

    return {
        config: config,
        mapOptions: mapOptions,
        getMapTypes: getMapTypes,
        getMapScopes: getMapScopes,
        getScopeInfoForMap: getScopeInfoForMap,
        getMapIcons: getMapIcons,
        getInfoForMap: getInfoForMap,
        getInfoForSystem: getInfoForSystem,
        getSystemTypeInfo: getSystemTypeInfo,
        getEffectInfoForSystem: getEffectInfoForSystem,
        searchConnectionsBySystems: searchConnectionsBySystems,
        searchConnectionsByScopeAndType: searchConnectionsByScopeAndType,
        getConnectionInfo: getConnectionInfo,
        checkForConnection: checkForConnection,
        getDefaultConnectionTypeByScope: getDefaultConnectionTypeByScope,
        setConnectionWHStatus: setConnectionWHStatus,
        getScopeInfoForConnection: getScopeInfoForConnection,
        getTabContentElementByMapElement: getTabContentElementByMapElement,
        storeDefaultMapId: storeDefaultMapId,
        getLocaleData: getLocaleData,
        storeLocalData: storeLocalData,
        deleteLocalData: deleteLocalData,
        getSystemId: getSystemId
    };
});
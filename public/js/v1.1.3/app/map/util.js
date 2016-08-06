/**
 * Map util functions
 */

define([
    'jquery',
    'app/init',
    'app/util'
], function($, Init, Util) {
    'use strict';

    var config = {
        // local storage
        mapLocalStoragePrefix: 'map_',                                  // prefix for map local storage key
    };

    /**
     * get all available map Types
     * optional they can be filtered by current access level of a user
     * @param {bool} filterByUser
     * @returns {Array}
     */
    var getMapTypes = function(filterByUser){
        var mapTypes = [];

        $.each(Init.mapTypes, function(prop, data){
            // skip "default" type -> just for 'add' icon
            if(data.label.length > 0){
                var tempData = data;
                tempData.name = prop;
                mapTypes.push(tempData);
            }
        });

        if(filterByUser === true){
            var corporationId = Util.getCurrentUserInfo('corporationId');
            var allianceId = Util.getCurrentUserInfo('allianceId');

            var authorizedMapTypes = [];
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
            var tempMapTypes = [];
            for(var i = 0; i < mapTypes.length; i++){
                for(var j = 0; j < authorizedMapTypes.length; j++){
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
    var getMapScopes = function(){
        var scopes = [];
        $.each(Init.mapScopes, function(prop, data){
            var tempData = data;
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
    var getScopeInfoForMap = function(info, option){
        var scopeInfo = '';
        if(Init.mapScopes.hasOwnProperty(info)){
            scopeInfo = Init.mapScopes[info][option];
        }
        return scopeInfo;
    };

    /**
     * get all available map icons
     * @returns {Object[]}
     */
    var getMapIcons = function(){
        return Init.mapIcons;
    };

    /**
     * get map info
     * @param {string} mapType
     * @param {string} option
     * @returns {string}
     */
    var getInfoForMap = function(mapType, option){
        var mapInfo = '';
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
    var getInfoForSystem = function(info, option){
        var systemInfo = '';
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
    var getSystemTypeInfo = function(systemTypeId, option){
        var systemTypeInfo = '';
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
    var getEffectInfoForSystem = function(effect, option){
        var effectInfo = '';
        if( Init.classes.systemEffects.hasOwnProperty(effect) ){
            effectInfo = Init.classes.systemEffects[effect][option];
        }
        return effectInfo;
    };

    /**
     * search connections by systems
     * @param {Object} map - jsPlumb
     * @param {JQuery[]} systems - system DOM elements
     * @returns {Array} connections - found connection, DOM elements
     */
    var searchConnectionsBySystems = function(map, systems){
        var connections = [];
        var withBackConnection = false;

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
    var searchConnectionsByScopeAndType = function(map, scope, type){
        var connections = [];
        var scopeArray = (scope === undefined) ? ['*'] : ((Array.isArray(scope)) ? scope : [scope]);
        var typeArray = (type === undefined) ? [] : ((Array.isArray(type)) ? type : [type]);

        map.select({scope: scopeArray}).each(function(connection){
            if(typeArray.length > 0){
                // filter by connection type as well...
                for(var i = 0; i < typeArray.length; i++){
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
    var getConnectionInfo = function(connectionTyp, option){
        var connectionInfo = '';
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
    var checkForConnection = function(map, systemA, systemB){
        var connections = [];
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
    var getDefaultConnectionTypeByScope = function(scope){
        var type = '';
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
    var setConnectionWHStatus = function(connection, status){
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
    var getScopeInfoForConnection = function(info, option){
        var scopeInfo = '';
        if(Init.connectionScopes.hasOwnProperty(info)){
            switch(option){
                case 'connectorDefinition':
                    // json data in DB
                    var temp = '{ "data": ' + Init.connectionScopes[info][option] + '}';
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
     * set or change rallyPoint for systems
     * @param rallyUpdated
     * @param options
     * @returns {*}
     */
    $.fn.setSystemRally = function(rallyUpdated, options){
        rallyUpdated = rallyUpdated || 0;
        var rallyPoke = false;

        var defaultOptions = {
            poke: false,
            hideNotification: false,
            hideCounter: false,
        };
        options = $.extend({}, defaultOptions, options);

        return this.each(function(){
            var system = $(this);
            var rally = system.data('rallyUpdated') || 0;

            if(rallyUpdated !== rally){
                // rally status changed
                if( !options.hideCounter ){
                    system.getMapOverlay('timer').startMapUpdateCounter();
                }

                var rallyClass = getInfoForSystem('rally', 'class');

                if(rallyUpdated > 0){
                    // new rally point set OR update system with rally information

                    system.addClass( rallyClass );
                    // rallyUpdated > 0 is required for poke!
                    rallyPoke = options.poke;

                    var notificationOptions = {
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
                        var mapId = system.data('mapid');
                        var systemId = system.data('id');
                        var promiseStore = getMapData(mapId);
                        promiseStore.then(function(data) {
                            // This code runs once the value has been loaded
                            // from the offline store.
                            var rallyPokeData = {};

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
                                storeMapData(this.mapId, 'rallyPoke', rallyPokeData);

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
     * get stored map data from client cache (IndexedDB)
     * @param mapId
     * @returns {*} promise
     */
    var getMapData = function(mapId){
        if(mapId > 0){
            var mapStorageKey = config.mapLocalStoragePrefix + mapId;
            return Util.localforage.getItem(mapStorageKey);
        }else{
            console.error('Map local storage requires mapId > 0');
        }
    };

    /**
     * store local map config to client cache (IndexedDB)
     * @param mapId
     * @param key
     * @param value
     */
    var storeMapData = function(mapId, key, value){
        if(mapId > 0){
            // get current map config
            var mapStorageKey = config.mapLocalStoragePrefix + mapId;
            Util.localforage.getItem(mapStorageKey).then(function(data) {
                // This code runs once the value has been loaded
                // from the offline store.
                data = (data === null) ? {} : data;
                // set/update value
                data[this.key] = this.value;
                Util.localforage.setItem(this.mapStorageKey, data);
            }.bind({
                key: key,
                value: value,
                mapStorageKey: mapStorageKey
            })).catch(function(err) {
                // This code runs if there were any errors
                console.error('Map local storage can not be accessed!');
            });
        }else{
            console.error('storeMapData(): Local storage requires mapId > 0');
        }
    };

    /**
     * delete local map configuration by key (IndexedDB)
     * @param mapId
     * @param key
     */
    var deleteMapData = function(mapId, key){
        if(mapId > 0){
            // get current map config
            var mapStorageKey = config.mapLocalStoragePrefix + mapId;
            Util.localforage.getItem(mapStorageKey).then(function(data) {
                if(
                    data &&
                    data.hasOwnProperty(key)
                ){
                    delete data[key];
                    Util.localforage.setItem(this.mapStorageKey, data);
                }
            }.bind({
                mapStorageKey: mapStorageKey
            }));
        }else{
            console.error('deleteMapData(): Local storage requires mapId > 0');
        }
    };

    return {
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
        getMapData: getMapData,
        storeMapData: storeMapData,
        deleteMapData: deleteMapData
    };
});
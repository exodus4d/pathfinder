/**
 * Map "magnetizing" feature
 * jsPlumb extension used: http://morrisonpitt.com/farahey/
 */

define([
    'jquery',
    'app/map/util',
    'farahey'
], function($, MapUtil) {

    'use strict';

    /**
     * Cached current "Magnetizer" object
     * @type {Magnetizer}
     */
    var m8 = null;

    /**
     * init a jsPlumb (map) Element for "magnetised" function.
     * this is optional and prevents systems from being overlapped
     */
    $.fn.initMagnetizer = function(){
        var mapContainer = this;
        var systems = mapContainer.getSystems();

        /**
         * helper function
         * get current system offset
         * @param system
         * @returns {{left, top}}
         * @private
         */
        var _offset = function(system) {

            var _ = function(p) {
                var v = system.style[p];
                return parseInt(v.substring(0, v.length - 2));
            };

            return {
                left:_('left'),
                top:_('top')
            };
        };

        /**
         * helper function
         * set new system offset
         * @param system
         * @param o
         * @private
         */
        var _setOffset = function(system, o) {
            var markAsUpdated = false;

            // new position must be within parent container
            // no negative offset!
            if(
                o.left >= 0 &&
                o.left <= 2300
            ){
                markAsUpdated = true;
                system.style.left = o.left + 'px';
            }

            if(
                o.top >= 0 &&
                o.top <= 498
            ){
                markAsUpdated = true;
                system.style.top = o.top + 'px';
            }

            if(markAsUpdated === true){
                $(system).markAsChanged();
            }
        };

        /**
         * helper function
         * exclude current dragged element(s) from position update
         * @param id
         * @returns {boolean}
         * @private
         */
        var _dragFilter = function(id) {
            return !$('#' + id).is('.jsPlumb_dragged, .pf-system-locked');
        };

        var gridConstrain = function(gridX, gridY) {
            return function(id, current, delta) {
                if( mapContainer.hasClass(MapUtil.config.mapGridClass) ){
                    // active grid
                    return {
                        left:(gridX * Math.floor( (current[0] + delta.left) / gridX )) - current[0],
                        top:(gridY * Math.floor( (current[1] + delta.top) / gridY )) - current[1]
                    };
                }else{
                    // no grid
                    return delta;
                }
            };
        };

        // main init for "magnetize" feature ------------------------------------------------------
        m8 = new Magnetizer({
            container: mapContainer,
            getContainerPosition: function(c) {
                return c.offset();
            },
            getPosition:_offset,
            getSize: function(system) {
                return [ $(system).outerWidth(), $(system).outerHeight() ];
            },
            getId : function(system) {
                return $(system).attr('id');
            },
            setPosition:_setOffset,
            elements: systems,
            filter: _dragFilter,
            padding: [6, 6],
            constrain: gridConstrain(MapUtil.config.mapSnapToGridDimension, MapUtil.config.mapSnapToGridDimension)
        });
    };

    $.fn.destroyMagnetizer = function(){
        var mapContainer = this;

        // remove cached "magnetizer" instance
        m8 = null;
    };

    /**
     * update system positions for "all" systems that are effected by drag&drop
     * @param map
     * @param e
     */
    var executeAtEvent = function(map, e){
        if(m8 !== null && e ){
            m8.executeAtEvent(e);
            map.repaintEverything();
        }
    };

    /**
     * rearrange all systems of a map
     * needs "magnetization" to be active
     * @param map
     */
    var executeAtCenter = function(map){
        if(m8 !== null){
            m8.executeAtCenter();
            map.repaintEverything();
        }
    };

    /**
     * set/update elements for "magnetization"
     * -> (e.g. new systems was added)
     * @param map
     */
    var setElements = function(map){
        if(m8 !== null){
            var mapContainer = $(map.getContainer());
            var systems = mapContainer.getSystems();
            m8.setElements(systems);

            // re-arrange systems
            executeAtCenter(map);
        }
    };

    return {
        executeAtCenter: executeAtCenter,
        executeAtEvent: executeAtEvent,
        setElements: setElements
    };
});
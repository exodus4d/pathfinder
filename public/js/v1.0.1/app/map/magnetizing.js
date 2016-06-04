/**
 * Map "magnetizing" feature
 * jsPlumb extension used: http://morrisonpitt.com/farahey/
 */

define([
    'jquery',
    'farahey'
], function($) {

    'use strict';

    var config = {
        systemClass: 'pf-system'                                        // class for all systems
    };

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

        var systemsOnMap = mapContainer.find('.' + config.systemClass);

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
         * set new syste offset
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

            return !$('#' + id).hasClass('jsPlumb_dragged');
        };

        // main init for "magnetize" feature ------------------------------------------------------
        m8 = new Magnetizer({
            container: mapContainer,
            getContainerPosition:function(c) {
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
            elements: systemsOnMap,
            filter:_dragFilter,
            padding:[8, 8]
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

        // check if magnetizer is active
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

    return {
        executeAtCenter: executeAtCenter,
        executeAtEvent: executeAtEvent
    };
});
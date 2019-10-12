/**
 * Map "magnetizing" feature
 * jsPlumb extension used: https://github.com/ThomasChan/farahey
 */

define([
    'jquery',
    'app/map/util',
    'farahey'
], ($, MapUtil) => {

    'use strict';

    /**
     * active magnetizer instances (cache object)
     * @type {{}}
     */
    let magnetizerInstances = {};

    /**
     * magnetizer instance exists for mapId
     * @param mapId
     * @returns {boolean}
     */
    let hasInstance = mapId => magnetizerInstances.hasOwnProperty(mapId);

    /**
     * get magnetizer instance by mapId
     * @param mapId
     * @returns {null}
     */
    let getInstance = mapId => hasInstance(mapId) ? magnetizerInstances[mapId] : null;

    /**
     * set new magnetizer instance for mapId
     * @param mapId
     * @param magnetizer
     */
    let setInstance = (mapId, magnetizer) => {
        if(mapId && magnetizer){
            magnetizerInstances[mapId] = magnetizer;
        }
    };

    /**
     * init new magnetizer instance for a map
     * @param mapContainer
     */
    let initMagnetizer = mapContainer => {
        let mapId = mapContainer.data('id');

        if(!hasInstance(mapId)){
            // magnetizer not exist -> new instance
            let systems = mapContainer.getSystems();

            /**
             * function that takes an element from your list and returns its position as a JS object
             * @param system
             * @returns {{top: number, left: number}}
             * @private
             */
            let _offset = system => {
                let _ = p => {
                    let v = system.style[p];
                    return parseInt(v.substring(0, v.length - 2));
                };
                return {left: _('left'), top: _('top')};
            };

            /**
             * function that takes an element id and position, and applies that position to the related element
             * @param system
             * @param o
             * @private
             */
            let _setOffset = (system, o) => {
                o.left = Math.round(o.left);
                o.top = Math.round(o.top);
                let left = o.left + 'px';
                let top = o.top + 'px';
                let markAsUpdated = false;

                // new position must be within parent container
                // no negative offset!
                if(
                    o.left >= 0 && o.left <= 2300 &&
                    system.style.left !== left
                ){
                    system.style.left = left;
                    markAsUpdated = true;
                }

                if(
                    o.top >= 0 && o.top <= 1400 &&
                    system.style.top !== top
                ){
                    system.style.top = top;
                    markAsUpdated = true;
                }

                if(markAsUpdated){
                    MapUtil.markAsChanged($(system));
                }
            };

            /**
             * filter some element8s) from being moved
             * @param systemId
             * @returns {boolean}
             * @private
             */
            let _dragFilter = systemId => {
                let filterClasses = ['jtk-drag', 'pf-system-locked'];
                return ![...document.getElementById(systemId).classList].some(className => filterClasses.indexOf(className) >= 0);
            };

            /**
             * grid snap constraint
             * @param gridX
             * @param gridY
             * @returns {Function}
             */
            let gridConstrain = (gridX, gridY) => {
                return (id, current, delta) => {
                    if(mapContainer.hasClass(MapUtil.config.mapGridClass)){
                        // active grid
                        return {
                            left: (gridX * Math.floor( (Math.round(current[0]) + delta.left) / gridX )) - current[0],
                            top:  (gridY * Math.floor( (Math.round(current[1]) + delta.top) / gridY )) - current[1]
                        };
                    }else{
                        // no grid
                        delta.left = Math.round(delta.left);
                        delta.top = Math.round(delta.top);
                        return delta;
                    }
                };
            };

            // create new magnetizer instance -------------------------------------------------------------------------
            setInstance(mapId, window.Farahey.getInstance({
                container: mapContainer,
                getContainerPosition: mapContainer => mapContainer.offset(),
                getPosition:_offset,
                getSize: system => {
                    let clientRect = system.getBoundingClientRect();
                    return [Math.floor(clientRect.width), Math.floor(clientRect.height)];
                },
                getId : system => system.id,
                setPosition:_setOffset,
                elements: systems.toArray(),
                filter: _dragFilter,
                padding: [3, 3],
                constrain: gridConstrain(MapUtil.config.mapSnapToGridDimension, MapUtil.config.mapSnapToGridDimension),
                executeNow: false,                               // no initial rearrange after initialization
                excludeFocus: true
            }));
        }
    };

    /**
     * destroy Magnetizer instance
     */
    let destroyMagnetizer = mapContainer => {
        let mapId = mapContainer.data('id');
        let magnetizer = getInstance(mapId);
        if(magnetizer){
            magnetizer.reset();
            delete magnetizerInstances[mapId];
        }
    };

    /**
     * update system positions for "all" systems that are effected by drag&drop
     * @param map
     * @param e
     */
    let executeAtEvent = (map, e) => {
        let mapContainer = $(map.getContainer());
        let mapId = mapContainer.data('id');
        let magnetizer = getInstance(mapId);

        if(magnetizer && e){
            magnetizer.executeAtEvent(e, {
                iterations: 2,
                excludeFocus: true
            });
            map.repaintEverything();
        }
    };

    /**
     * add system to magnetizer instance
     * @param mapId
     * @param system
     * @param doNotTestForDuplicates
     */
    let addElement = (mapId, system, doNotTestForDuplicates) => {
        let magnetizer = getInstance(mapId);
        if(magnetizer){
            magnetizer.addElement(system, doNotTestForDuplicates);
        }
    };

    /**
     * remove system element from magnetizer instance
     * @param mapId
     * @param system
     */
    let removeElement = (mapId, system) => {
        let magnetizer = getInstance(mapId);
        if(magnetizer){
            magnetizer.removeElement(system);
        }
    };

    return {
        initMagnetizer: initMagnetizer,
        destroyMagnetizer: destroyMagnetizer,
        executeAtEvent: executeAtEvent,
        addElement: addElement,
        removeElement: removeElement
    };
});
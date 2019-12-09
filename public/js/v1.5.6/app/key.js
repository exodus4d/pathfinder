define([
    'jquery'
], ($) => {
    'use strict';

    let allCombo = {
        // global -------------------------------------------------------------------------------------------
        tabReload: {
            group:      'global',
            label:      'Close open dialog',
            keyNames:   ['ESC']
        },
        // map ----------------------------------------------------------------------------------------------
        mapMove: {
            group:      'map',
            label:      'Move map section',
            keyNames:   ['space', 'drag']
        },
        // signature ----------------------------------------------------------------------------------------
        signatureSelect: {
            group:      'signatures',
            label:      'Select multiple rows',
            keyNames:   ['CONTROL', 'CLICK']
        },
        signatureNavigate: {
            group:      'signatures',
            label:      'Table navigation',
            keyNames:   ['UP', 'RIGHT', 'DOWN', 'LEFT'],
            list: true
        }
    };

    let allEvents = {
        // global -------------------------------------------------------------------------------------------
        tabReload: {
            group:      'global',
            label:      'Reload tab',
            keyNames:   ['CONTROL', 'R']
        },
        clipboardPaste: {
            group:      'global',
            label:      'Update signatures/D-Scan from clipboard',
            keyNames:   ['CONTROL', 'V'],
            alias:      'paste'
        },
        renameSystem: {
            group:      'map',
            label:      'Rename system',
            keyNames:   ['ALT', 'N']
        },
        newSignature: {
            group:      'signatures',
            label:      'New Signature',
            keyNames:   ['ALT', '3']
        },

        // map ----------------------------------------------------------------------------------------------
        mapSystemAdd: {
            group:      'map',
            label:      'New system',
            keyNames:   ['ALT', '2']
        },
        mapSystemsSelect: {
            group:      'map',
            label:      'Select all systems',
            keyNames:   ['CONTROL', 'A']
        },
        mapSystemsDelete: {
            group:      'map',
            label:      'Delete selected systems',
            keyNames:   ['CONTROL', 'D']
        }
    };

    let groups = {
        global: {
            label: 'Global'
        },
        map: {
          label: 'Map'
        },
        signatures: {
            label: 'Signature'
        }
    };

    /**
     * enables some debug output in console
     * @type {boolean}
     */
    let debug                                   = false;

    /**
     * DOM data key for an element that lists all active events (comma separated)
     * @type {string}
     */
    let dataKeyEvents                           = 'key-events';

    /**
     * DOM data key prefix whether domElement that holds the trigger needs to be "focused"
     * @type {string}
     */
    let dataKeyFocusPrefix                      = 'key-focus-';

    /**
     * DOM data key that holds the callback function for that element
     * @type {string}
     */
    let dataKeyCallbackPrefix                   = 'key-callback-';

    /**
     * check if module is initiated
     */
    let isInit                                  = false;

    /**
     * global key map holds all active (hold down) keys
     * @type {{}}
     */
    let map                                     = {};

    /**
     * show debug information in console
     * @param msg
     * @param element
     */
    let debugWatchKey = (msg, element) => {
        if(debug){
            console.info(msg, element);
        }
    };

    /**
     * get all active (hold down) keys at this moment
     * @returns {Array}
     */
    let getActiveKeys = () => {
        return Object.keys(map);
    };

    /**
     * checks whether a key is currently active (keydown)
     * @param key
     * @returns {boolean}
     */
    let isActive = key => map.hasOwnProperty(key) && map[key] === true;

    /**
     * callback function that compares two arrays
     * @param element
     * @param index
     * @param array
     */
    let compareKeyLists = function(element, index, array){
        return this.find(x => x === element);
    };

    /**
     * get event names that COULD lead to a "full" event (not all keys pressed yet)
     * @param keyList
     * @returns {Array}
     */
    let checkEventNames = (keyList) => {
        let incompleteEvents = [];
        for(let event in allEvents){
            // check if "some" or "all" keys are pressed for en event
            if( keyList.every(compareKeyLists, allEvents[event].keyNames) ){
                incompleteEvents.push(event);
            }
        }

        return incompleteEvents;
    };

    /**
     * get all event names
     * @returns {Array}
     */
    let getAllEventNames = () => {
        let eventNames = [];
        for(let event in allEvents){
            eventNames.push(event);
        }
        return eventNames;
    };

    /**
     * get all event names that matches a given keyList
     * @param keyList
     * @param checkEvents
     * @returns {Array}
     */
    let getMatchingEventNames = (keyList, checkEvents) => {
        checkEvents = checkEvents || getAllEventNames();
        let events = [];

        for(let event of checkEvents){
            // check if both key arrays are equal
            if(
                allEvents[event].keyNames.every(compareKeyLists, keyList) &&
                keyList.every(compareKeyLists, allEvents[event].keyNames)
            ){
                events.push(event);
            }
        }

        return events;
    };

    /**
     * init global keyWatch interval and check for event trigger (hotKey combinations)
     */
    let init = () => {
        if( !isInit ){
            // key watch loop -------------------------------------------------------------------------------
            let prevActiveKeys = [];

            /**
             *
             * @param e
             * @returns {number} 0: no keys hold, 1: invalid match, 2: partial match, 3: match, 4: alias match, 5: event(s) fired
             */
            let checkForEvents = (e) => {
                let status = 0;

                // get all pressed keys
                let activeKeys = getActiveKeys();
                debugWatchKey('activeKeys', activeKeys);

                // check if "active" keys has changes since last loop
                if(activeKeys.length){
                    // check for "incomplete" events (not all keys pressed yet)
                    let incompleteEvents = checkEventNames(activeKeys);
                    if(incompleteEvents.length){
                        // "some" event keys pressed OR "all" keys pressed
                        status = 2;

                        // check if key combo matches a registered (valid) event
                        let events = getMatchingEventNames(activeKeys, incompleteEvents);
                        if(events.length){
                            status = 3;
                            // check events if there are attached elements to it
                            events.forEach((event) => {
                                // skip events that has an alias and should not be triggered by key combo
                                if( !allEvents[event].alias ){
                                    if(allEvents[event].elements){
                                        // search for callback functions attached to each element
                                        allEvents[event].elements.forEach((domElement) => {
                                            let domElementObj = $(domElement);
                                            // check if event on this element requires active "focus"
                                            let optFocus = domElementObj.data(dataKeyFocusPrefix + event);

                                            if( !(
                                                    optFocus &&
                                                    document.activeElement !== domElement
                                                )
                                            ){
                                                // execute callback if valid
                                                let callback = domElementObj.data(dataKeyCallbackPrefix + event);
                                                if(typeof callback === 'function'){
                                                    status = 5;
                                                    callback.call(domElement, domElement, e);
                                                }
                                            }
                                        });
                                    }
                                }else{
                                    status = 4;
                                }

                            });
                        }
                    }else{
                        // invalid combo
                        status = 1;
                    }
                }

                // store current keys for next loop check
                prevActiveKeys = activeKeys;

                return status;
            };

            // set key-events -------------------------------------------------------------------------------
            let evKeyDown = (e) => {
                // exclude some HTML Tags from watcher
                if(
                    e.target.tagName !== 'INPUT' &&
                    e.target.tagName !== 'TEXTAREA' &&
                    !e.target.classList.contains('note-editable')       // Summerstyle editor
                ){
                    let key = e.key.toUpperCase();
                    map[key] = true;

                    // check for any shortcut combo that triggers an event
                    let status = checkForEvents(e);

                    if(
                        status === 2 ||
                        status === 3 ||
                        status === 5
                    ){
                        // prevent SOME browser default actions -> we want 'Pathfinder' shortcuts :)
                        e.preventDefault();
                    }
                }
            };

            let evKeyUp = (e) => {
                if(e.key){
                    let key = e.key.toUpperCase();

                    if(map.hasOwnProperty(key)){
                        delete map[key];
                    }
                }
            };

            let container = $('body');
            container.on('keydown', evKeyDown);
            container.on('keyup', evKeyUp);

            // global dom remove listener -------------------------------------------------------------------
            // -> check whether the removed element had an event listener active and removes them.
            new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if(mutation.type === 'childList'){
                        for(let i = 0; i < mutation.removedNodes.length; i++){
                            let removedNode = mutation.removedNodes[i];
                            if(typeof removedNode.getAttribute === 'function'){
                                let eventNames = removedNode.getAttribute(dataKeyEvents);
                                if(eventNames){
                                    let events = eventNames.split(',');
                                    for(let j = 0; i < events.length; j++){
                                        let event = events[j];
                                        let index = allEvents[event].elements.indexOf(removedNode);
                                        if(index > -1){
                                            // remove element from event list
                                            allEvents[event].elements.splice(index, 1);
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
            }).observe(document.body, { childList: true, subtree: true });

            isInit = true;
        }
    };

    /**
     * add a new "shortCut" combination (event) to a DOM element
     * @param event
     * @param callback
     * @param options
     */
    $.fn.watchKey = function(event, callback, options){

        // default options for keyWatcher on elements
        let defaultOptions = {
            focus:              false,      // element must be focused (active)
            bubbling:           true        // elements deeper (children) in the DOM can bubble the event up
        };

        let customOptions = $.extend(true, {}, defaultOptions, options );

        return this.each((i, domElement) => {
            let element = $(domElement);

            // init global key events
            init();

            // check if event is "valid" (exists) and is not already set for this element
            let validEvent = false;
            if(allEvents[event].elements){
                if(allEvents[event].elements.indexOf(domElement) === -1){
                    validEvent = true;
                }else{
                    console.warn('Event "' + event + '" already set');
                }
            }else{
                validEvent = true;
                allEvents[event].elements = [];
            }

            if(validEvent){
                // store callback options to dom element
                if(customOptions.focus){
                    let dataAttr = dataKeyFocusPrefix + event;
                    element.data(dataAttr, true);

                    // check if DOM element has "tabindex" attr -> required to manually set focus() to it
                    if(!domElement.hasAttribute('tabindex')){
                        domElement.setAttribute('tabindex', 0);
                    }

                    // element requires a "focus" listener
                    element.off('click.focusKeyWatcher').on('click.focusKeyWatcher', function(e){
                        if(
                            e.target === this ||
                            customOptions.bubbling
                        ){
                            this.focus();
                            debugWatchKey('focus set:', this);
                        }
                    });
                }

                // check if is key combo has a native JS event that should be used instead
                if(allEvents[event].alias){
                    element.on(allEvents[event].alias, callback);
                }else{
                    // store callback function to dom element
                    let dataAttr = dataKeyCallbackPrefix + event;
                    element.data(dataAttr, callback);
                }

                // add eventName to dom element as attribute ----------------------------------------------------
                let currentEventNames = element.attr(dataKeyEvents) ?  element.attr(dataKeyEvents).split(',') : [];
                currentEventNames.push(event);
                element.attr(dataKeyEvents, currentEventNames.join(','));

                // store domElement to event (global)
                allEvents[event].elements.push(domElement);

                debugWatchKey('new event "' + event + '" registered', domElement);
            }
        });
    };

    /**
     * get a array with all available shortcut groups and their events
     * @returns {any[]}
     */
    let getGroupedShortcuts = () => {
        let result = $.extend(true, {}, groups);

        // add combos and events to groups
        let allEntries = [allCombo, allEvents];

        for(let entries of allEntries){
            for(let [event, data] of Object.entries(entries)){
                //format keyNames for UI
                let keyNames = data.keyNames.map(key => {
                    if(key === 'CONTROL'){
                        key = 'ctrl';
                    }
                    return key;
                });

                let newEventData = {
                    label:      data.label,
                    keyNames:   keyNames,
                    list:       data.list
                };

                if( result[data.group].events ){
                    result[data.group].events.push(newEventData);
                }else{
                    result[data.group].events = [newEventData];
                }
            }
        }

        // convert obj into array
        result = Object.values(result);

        return result;
    };

    return {
        isActive: isActive,
        getGroupedShortcuts: getGroupedShortcuts
    };
});
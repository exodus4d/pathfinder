define([
    'jquery',
    'mousewheel',
    'customScrollbar'
], ($) => {
    'use strict';

    let config = {
        autoScrollClass:                        'auto-scroll',
        autoScrollTopClass:                     'auto-scroll-top',
        autoScrollLeftClass:                    'auto-scroll-left',
        autoScrollBottomClass:                  'auto-scroll-bottom',
        autoScrollRightClass:                   'auto-scroll-right',
    };

    let defaultConfig = {
        axis: 'yx',
        theme: 'light-3',
        scrollInertia: 200,
        autoExpandScrollbar: false,
        scrollButtons: {
            enable: true,
            scrollAmount: 30,
            scrollType: 'stepless'
        },
        callbacks: {
            onTotalScrollOffset: 0,
            onTotalScrollBackOffset: 0,
            alwaysTriggerOffsets: true,
            onScroll: function(){
                if($(this).data('mCS').trigger === 'internal'){
                    autoScrollOff(this);
                }
            }
        },

        advanced: {
            autoUpdateTimeout: 120, // auto-update timeout (default: 60)
            updateOnContentResize: true,
            autoExpandHorizontalScroll: false,  // on resize css scale() scroll content should not change
            //autoExpandHorizontalScroll: 2,
            autoScrollOnFocus: 'div',
        },
        mouseWheel: {
            enable: false, // scroll wheel currently disabled
            scrollAmount: 'auto',
            axis: 'x',
            preventDefault: true
        },
        keyboard: {
            enable: false,  // not working with pathfinder "shortcuts"
            scrollType: 'stepless',
            scrollAmount: 'auto'
        },
        scrollbarPosition: 'inside',
        autoDraggerLength: true,
        autoHideScrollbar: false
    };

    let defaultScrollToOptions = {
        scrollInertia: 2000,
        scrollEasing: 'easeInOutSmooth',
        timeout: 0
    };

    /**
     * init map scrollbar
     * @param scrollWrapper
     * @param customConfig
     */
    let initScrollbar = (scrollWrapper, customConfig) => {
        customConfig = $.extend(true, {}, defaultConfig, customConfig);
        // wrap callbacks -> callbacks from defaultConfig should run first
        customConfig.callbacks = wrapObjectFunctions(customConfig.callbacks, defaultConfig.callbacks);
        scrollWrapper.mCustomScrollbar(customConfig);
    };

    /**
     * @param scrollWrapper
     * @param position
     * @param options
     */
    let autoScroll = (scrollWrapper, position, options) => {
        if(position.some(position => position !== null)){
            // scroll position -> start auto scroll
            autoScrollOn(scrollWrapper, position, options);
        }else{
            // no scroll position -> stop auto scroll
            autoScrollOff(scrollWrapper);
        }
    };

    /**
     * @param scrollWrapper
     * @param position
     * @param options
     */
    let autoScrollOn = (scrollWrapper, position, options) => {
        let scrollToOptions = Object.assign({}, defaultScrollToOptions, options);
        let scrollInertia = 0;
        let autoScrollClasses = [];
        ['top', 'left', 'bottom', 'right'].forEach((direction, i) => {
            if(position.includes(direction)){
                autoScrollClasses.push(config['autoScroll' + direction.capitalize() + 'Class']);
                if(i % 2){              // left || right
                    scrollInertia = scrollToOptions.scrollInertia * scrollWrapper.mcs.leftPct / 100;
                }else{                  // top || bottom
                    scrollInertia = scrollToOptions.scrollInertia * scrollWrapper.mcs.topPct / 100;
                }
                if(i === 2 || i === 3){ // bottom || right
                    scrollInertia = scrollToOptions.scrollInertia - scrollInertia;
                }
            }
        });

        if(autoScrollClasses.length){
            // scroll position -> check if scroll direction changed
            let compareClasses = getAutoScrollClasses();
            let currentClasses = [...scrollWrapper.classList].filter(cls => compareClasses.includes(cls));
            let newClasses = autoScrollClasses.diff(currentClasses);
            let oldClasses = currentClasses.diff(autoScrollClasses);

            if(newClasses.length || oldClasses.length){
                // changed scroll direction (e.g. null -> y; y -> x; y -> xy, xy -> null)
                // -> stop current autos scroll and start with new scroll direction
                autoScrollOff(scrollWrapper, oldClasses);

                scrollWrapper.classList.add(...newClasses);
                scrollToOptions.scrollInertia = scrollInertia;
                $(scrollWrapper).mCustomScrollbar('scrollTo', position, scrollToOptions);
            }
        }else{
            // no scroll position -> stop auto scroll
            autoScrollOff(scrollWrapper);
        }
    };

    /**
     * @param scrollWrapper
     * @param classes
     */
    let autoScrollOff = (scrollWrapper, classes) => {
        classes = classes || getAutoScrollClasses();
        scrollWrapper.classList.remove(...classes);
        $(scrollWrapper).mCustomScrollbar('stop');
    };

    /**
     * @returns {[string, string, string, string]}
     */
    let getAutoScrollClasses = () => {
        return [config.autoScrollTopClass, config.autoScrollLeftClass, config.autoScrollBottomClass, config.autoScrollRightClass];
    };

    /**
     * get mCustomScrollbar container
     * @param element
     * @returns {*|[]}
     */
    let getContainer = element =>  element.parents('.mCSB_container');

    /**
     *
     * @param container
     * @param element
     * @returns {{x: number, y: number}}
     */
    let getElementPos = (container, element) => {
        return {
            x: element.offset().left - container.offset().left,
            y: element.offset().top - container.offset().top
        };
    };

    /**
     * @param element
     * @returns {{x: number, y: number}}
     */
    let getElementDim = element => {
        return {
            x: element.outerWidth(false),
            y: element.outerHeight(false)
        };
    };

    /**
     * check if an element is 100% visible
     * -> scrolled into viewport
     * @param element
     * @returns {boolean}
     */
    let isInView = element => {
        let container = getContainer(element);
        let wrapper = container.parent();
        let cPos = {x: container[0].offsetLeft, y: container[0].offsetTop};
        let ePos = getElementPos(container, element);
        let eDim = getElementDim(element);

        return cPos.y + ePos.y >= 0 &&
            cPos.y + ePos.y < wrapper.height() - eDim.y &&
            cPos.x + ePos.x >= 0 &&
            cPos.x + ePos.x < wrapper.width() - eDim.x;
    };

    /**
     * get new scrollTo coordinates to center element in viewport
     * @param element
     * @returns {{x: number, y: number}}
     */
    let getCenterScrollPosition = element => {
        let container = getContainer(element);
        let wrapper = container.parent();
        let cDim = getElementDim(container);
        let wDim = {x: wrapper.width(), y: wrapper.height()};
        let eDim = getElementDim(element);
        let ePos = getElementPos(container, element);

        let eOff = {
            x: (-wDim.x / 2) + (eDim.x / 2),
            y: (-wDim.y / 2) + (eDim.y / 2)
        };

        return adjustPos(addOffset(ePos, eOff), cDim);
    };

    /**
     * scroll to a specific position on map
     * demo: http://manos.malihu.gr/repository/custom-scrollbar/demo/examples/scrollTo_demo.html
     * @param scrollArea
     * @param position
     * @param options
     */
    let scrollToPosition = (scrollArea, position, options) => {
        $(scrollArea).mCustomScrollbar('scrollTo', position, options);
    };

    /**
     * scroll to center an element
     * -> subtract some offset for tooltips/connections
     * @param scrollArea
     * @param element
     */
    let scrollToCenter = (scrollArea, element) => {
        // no scroll if element is already FULL visible in scrollable viewport
        if(!isInView(element)){
            // get scrollTo position for centered element
            scrollToPosition(scrollArea, getCenterScrollPosition(element));
        }
    };

    /**
     * add/subtract offset coordinates from position
     * @param {{x: number, y: number}} position
     * @param {{x: number, y: number}} offset
     * @returns {{x: number, y: number}}
     */
    let addOffset = (position, offset) => mapObject(position, (v, k) => v + offset[k]);

    /**
     * round position
     * @param {{x: number, y: number}} position
     * @returns {{x: number, y: number}}
     */
    let roundPos = position => mapObject(position, Math.round);

    /**
     *
     * @param {{x: number, y: number}} position
     * @param {{x: number, y: number}} dimension
     * @returns {{x: number, y: number}}
     */
    let adjustPos = (position, dimension) => mapObject(roundPos(position), (v, k) => Math.max(1, Math.min(dimension[k], v)) );

    /**
     * wrap functions that exists in both objects (same key)
     * -> o2 fkt run 1st (returned value ignored)
     * -> o1 fkt run 2nd
     * @param o1
     * @param o2
     * @returns {any}
     */
    let wrapObjectFunctions = (o1 = {}, o2 = {}) => {
        return mapObject(o1, function(v1, k1){
            // check both obj has the same key and are functions
            if([v1, o2[k1]].every(v => typeof v === 'function')){
                return function(...args){
                    // run 'default' fkt first, then orig fkt
                    o2[k1].apply(this, ...args);
                    return v1.apply(this, ...args);
                };
            }
            return v1;
        });
    };

    /**
     * like Array.map() for objects
     * -> callback f is called for each property
     * @see https://stackoverflow.com/a/38829074/4329969
     * @param o
     * @param f
     * @returns {Object}
     */
    let mapObject = (o, f) => Object.assign(...Object.entries(o).map(([k, v]) => ({[k]: f(v, k) })));

    return {
        initScrollbar: initScrollbar,
        scrollToPosition: scrollToPosition,
        scrollToCenter: scrollToCenter,
        autoScroll: autoScroll
    };
});
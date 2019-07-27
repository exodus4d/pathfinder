define(() => {
    'use strict';

    class Position {

        constructor(config){
            this._defaultConfig = {
                container: null,                        // parent DOM container element
                center: null,                           // DOM elements that works as center
                elementClass: 'pf-system',              // class for all elements
                defaultGapX: 50,
                defaultGapY: 50,
                gapX: 50,                               // leave gap between elements (x-axis)
                gapY: 50,                               // leave gap between elements (y-axis)
                loops: 2,                               // max loops around "center" for search
                grid: false,                            // set to [20, 20] to force grid snapping
                newElementWidth: 100,                   // width for new element
                newElementHeight: 22,                   // height for new element
                debug: false,                           // render debug elements
                debugElementClass: 'pf-system-debug'    // class for debug elements
            };

            this._config = Object.assign({}, this._defaultConfig, config);

            /**
             * convert degree into radial unit
             * @param deg
             * @returns {number}
             * @private
             */
            this._degToRad = (deg) => {
                return deg * Math.PI / 180;
            };

            /**
             * get element dimension/position of a DOM element
             * @param element
             * @returns {*}
             * @private
             */
            this._getElementDimension = element => {
                let dim = null;

                let left = 0;
                let top = 0;
                let a = 0;
                let b = 0;
                let width = this._config.newElementWidth;
                let height = this._config.newElementHeight;

                if(Array.isArray(element)){
                    // xy coordinates
                    let point = [
                        element[0] ? parseInt(element[0], 10) : 0,
                        element[1] ? parseInt(element[1], 10) : 0
                    ];

                    if(this._config.grid){
                        point = this._transformPointToGrid(point);
                    }

                    left = point[0];
                    top = point[1];
                    a = this._config.gapX;
                    b = this._config.gapY;
                }else if(element){
                    // DOM element
                    left = element.style.left ? parseInt(element.style.left, 10) : 0;
                    top = element.style.top ? parseInt(element.style.top, 10) : 0;
                    a = parseInt((element.offsetWidth / 2).toString(), 10) + this._config.gapX;
                    b = parseInt((element.offsetHeight / 2).toString(), 10) + this._config.gapY;
                    width = element.offsetWidth;
                    height = element.offsetHeight;
                }

                // add "gap" to a and b in order to have some space around elements
                return {
                    left: left,
                    top: top,
                    a: a,
                    b: b,
                    width: width,
                    height: height
                };
            };

            /**
             * get x/y coordinate on an eclipse around a 2D area by a given radial angle
             * @param dim
             * @param angle
             * @returns {*}
             * @private
             */
            this._getEllipseCoordinates = (dim, angle) => {
                let coordinates = null;
                if(dim){
                    angle = this._degToRad(angle);
                    coordinates = {
                        x: Math.round((dim.a * dim.b) / Math.sqrt(Math.pow(dim.b, 2) + Math.pow(dim.a, 2) * Math.pow(Math.tan(angle), 2) )),
                        y: Math.round((dim.a * dim.b) / Math.sqrt(Math.pow(dim.a, 2) + Math.pow(dim.b, 2) / Math.pow(Math.tan(angle), 2) ))
                    };

                    // invert coordinate based on quadrant ------------------------------------------------------------
                    if( angle > (Math.PI / 2) && angle < (3 * Math.PI / 2) ){
                        coordinates.x = coordinates.x * -1;
                    }

                    if( angle > Math.PI  && angle < (2 * Math.PI) ){
                        coordinates.y = coordinates.y * -1;
                    }
                }
                return coordinates;
            };

            /**
             * get dimensions of all surrounding elements
             * @returns {Array}
             * @private
             */
            this._getAllElementDimensions = () => {
                let dimensions = [];
                let surroundingElements = this._getContainer().getElementsByClassName(this._config.elementClass);
                for(let element of surroundingElements){
                    dimensions.push(this._getElementDimension(element));
                }
                return dimensions;
            };

            /**
             * transform a x/y point into a x/y point that snaps to grid
             * @param point
             * @returns {*}
             * @private
             */
            this._transformPointToGrid = (point) => {
                point[0] = Math.floor(point[0] / this._config.grid[0]) * this._config.grid[0];
                point[1] = Math.floor(point[1] / this._config.grid[1]) * this._config.grid[1];
                return point;
            };

            /**
             * Transform a x/y coordinate into a 2D element with width/height
             * @param centerDimension
             * @param coordinate
             * @returns {*}
             * @private
             */
            this._transformCoordinate = (centerDimension, coordinate) => {
                let dim = null;
                if(centerDimension && coordinate){
                    let left = 0;
                    let top = 0;

                    // calculate left/top based on coordinate system quadrant -----------------------------------------
                    // -> flip horizontal in Q2 and Q3
                    if(coordinate.x >= 0 && coordinate.y > 0){
                        // 1. quadrant
                        left = centerDimension.left + centerDimension.a - this._config.gapX + coordinate.x;
                        top = centerDimension.top + 2 * (centerDimension.b - this._config.gapY) - Math.abs(coordinate.y) - this._config.newElementHeight;
                    }else if(coordinate.x < 0 && coordinate.y > 0){
                        // 2. quadrant
                        left = centerDimension.left + centerDimension.a - this._config.gapX + coordinate.x - this._config.newElementWidth;
                        top = centerDimension.top + 2 * (centerDimension.b - this._config.gapY) - Math.abs(coordinate.y) - this._config.newElementHeight;
                    }else if(coordinate.x < 0 && coordinate.y <= 0){
                        // 3. quadrant
                        left = centerDimension.left + centerDimension.a - this._config.gapX + coordinate.x - this._config.newElementWidth;
                        top = centerDimension.top + Math.abs(coordinate.y);
                    }else{
                        // 4. quadrant
                        left = centerDimension.left + centerDimension.a - this._config.gapX + coordinate.x;
                        top = centerDimension.top + Math.abs(coordinate.y);
                    }

                    // center horizontal for x = 0 coordinate (top and bottom element) --------------------------------
                    if(coordinate.x === 0){
                        left -= Math.round(this._config.newElementWidth / 2);
                    }

                    // transform to grid coordinates (if grid snapping is enabled) ------------------------------------
                    if(this._config.grid){
                        let point = this._transformPointToGrid([left, top]);
                        left = point[0];
                        top = point[1];
                    }

                    dim = {
                        left: left,
                        top: top,
                        width: this._config.newElementWidth,
                        height: this._config.newElementHeight
                    };
                }

                return dim;
            };

            /**
             * calc overlapping percent of two given dimensions
             * @param dim1
             * @param dim2
             * @returns {number}
             * @private
             */
            this._percentCovered = (dim1, dim2) => {
                let percent = 0;

                if(
                    (dim1.left <= dim2.left) &&
                    (dim1.top <= dim2.top) &&
                    ((dim1.left + dim1.width) >= (dim2.left + dim2.width)) &&
                    ((dim1.top + dim1.height) > (dim2.top + dim2.height))
                ){
                    // The whole thing is covering the whole other thing
                    percent = 100;
                }else{
                    // Only parts may be covered, calculate percentage
                    dim1.right		= dim1.left + dim1.width;
                    dim1.bottom		= dim1.top + dim1.height;
                    dim2.right		= dim2.left + dim2.width;
                    dim2.bottom		= dim2.top + dim2.height;

                    let l = Math.max(dim1.left, dim2.left);
                    let r = Math.min(dim1.right, dim2.right);
                    let t = Math.max(dim1.top, dim2.top);
                    let b = Math.min(dim1.bottom, dim2.bottom);

                    if(b >= t && r >= l){
                        percent = (((r - l) * (b - t)) / (dim2.width * dim2.height)) * 100;
                    }
                }
                return percent;
            };

            /**
             * checks whether dim1 is partially overlapped by any other element
             * @param dim1
             * @param dimensionContainer
             * @param allDimensions
             * @returns {boolean}
             * @private
             */
            this._isOverlapping = (dim1, dimensionContainer, allDimensions) => {
                let isOverlapping = false;
                if(dim1){
                    if(this._percentCovered(dimensionContainer, dim1 ) === 100){
                        // element is within parent container
                        for(let dim2 of allDimensions){
                            let percentCovered = this._percentCovered(dim1, dim2);
                            if(percentCovered){
                                isOverlapping = true;
                                // render debug element
                                this._showDebugElement(dim1, percentCovered);
                                break;
                            }
                        }
                    }else{
                        isOverlapping = true;
                        this._showDebugElement(dim1, 100);
                    }
                }else{
                    isOverlapping = true;
                }

                return isOverlapping;
            };

            /**
             * find all dimensions around a centerDimension that are not overlapped by other elements
             * @param maxResults
             * @param steps
             * @param allDimensions
             * @param loops
             * @returns {Array}
             * @private
             */
            this._findDimensions = (maxResults, steps, allDimensions, loops) => {
                let dimensions = [];
                let start = 0;
                let end = 360;
                let angle = end / steps;
                let dimensionContainer = this._getElementDimension(this._getContainer());
                steps = steps || 1;
                loops = loops || 1;

                if(loops === 1){
                    // check center element
                    let centerDimension = this._getElementDimension(this._config.center);
                    if(!this._isOverlapping(centerDimension, dimensionContainer, allDimensions)){
                        dimensions.push({
                            left: centerDimension.left,
                            top: centerDimension.top,
                            width: centerDimension.width,
                            height: centerDimension.height
                        });
                        // render debug element
                        this._showDebugElement(centerDimension, 0);

                        maxResults--;
                    }
                }

                // increase the "gab" between center element and potential found dimensions...
                // ... for each recursive loop call, to get an elliptical cycle beyond
                this._config.gapX = this._config.defaultGapX + (loops - 1) * 20;
                this._config.gapY = this._config.defaultGapY + (loops - 1) * 20;
                let centerDimension = this._getElementDimension(this._config.center);

                while(maxResults > 0 && start < end){
                    // get all potential coordinates on an eclipse around a given "centerElementDimension"
                    let coordinate = this._getEllipseCoordinates(centerDimension, end);
                    // transform relative x/y coordinate into a absolute 2D area
                    let checkDimension = this._transformCoordinate(centerDimension, coordinate);
                    if(!this._isOverlapping(checkDimension, dimensionContainer, allDimensions)){
                        dimensions.push({
                            left: checkDimension.left,
                            top: checkDimension.top,
                            width: checkDimension.width,
                            height: checkDimension.height
                        });
                        // render debug element
                        this._showDebugElement(checkDimension, 0);

                        maxResults--;
                    }
                    end -= angle;
                }

                if(maxResults > 0 && loops < this._config.loops){
                    loops++;
                    steps *= 2;
                    dimensions = dimensions.concat(this._findDimensions(maxResults, steps, allDimensions, loops));
                }

                return dimensions;
            };

            /**
             * get container (parent) element
             * @returns {*}
             * @private
             */
            this._getContainer = () => {
                return this._config.container ? this._config.container : document.body;
            };

            /**
             * render debug element into parent container
             * -> checks overlapping dimension with other elements
             * @param dimension
             * @param percentCovered
             * @private
             */
            this._showDebugElement = (dimension, percentCovered) => {
                if(this._config.debug){
                    let element = document.createElement('div');
                    element.style.left              = dimension.left + 'px';
                    element.style.top               = dimension.top + 'px';
                    element.style.width             = dimension.width + 'px';
                    element.style.height            = dimension.height + 'px';
                    element.style.backgroundColor   = Boolean(percentCovered) ? 'rgba(255,0,0,0.1)' : 'rgba(0,255,0,0.1)';
                    element.innerHTML               = Math.round(percentCovered * 100) / 100  + '%';
                    element.classList.add(this._config.debugElementClass);
                    this._getContainer().appendChild(element);
                }
            };

            /**
             * hide all debug elements
             * @private
             */
            this._hideDebugElements = () => {
                let debugElements = this._getContainer().getElementsByClassName(this._config.debugElementClass);
                while(debugElements.length > 0){
                    debugElements[0].parentNode.removeChild(debugElements[0]);
                }
            };


            // public functions ---------------------------------------------------------------------------------------

            /**
             * search for surrounding, non overlapping dimensions
             * @param maxResults
             * @param steps
             * @returns {Array}
             */
            this.findNonOverlappingDimensions = (maxResults, steps) => {
                this._hideDebugElements();
                // element dimensions that exist and should be checked for overlapping
                let allDimensions = this._getAllElementDimensions();

                return this._findDimensions(maxResults, steps, allDimensions);
            };
        }
    }

    /**
     * return mouse coordinates from event
     * @param e
     * @returns {{x: number, y: number}}
     */
    let getEventCoordinates = e => {
        let posX = 0;
        let posY = 0;

        if(e.offsetX && e.offsetY){
            // Chrome
            posX = e.offsetX;
            posY = e.offsetY;
        }else if(e.originalEvent){
            // Firefox -> #415
            posX = e.originalEvent.layerX;
            posY = e.originalEvent.layerY;
        }

        return {x: posX, y: posY};
    };

    return {
        Position: Position,
        getEventCoordinates: getEventCoordinates
    };
});
define(['app/lib/eventHandler'], (EventHandler) => {
    'use strict';

    let DragSelect = class DragSelect {

        constructor(config){
            this._config                = Object.assign({}, this.constructor.defaultConfig, config);
            this._instanceId            = ++this.constructor.instanceCount;
            this._instanceName          = [this._config.namespace, this._instanceId].join('-');
            this._animationFrameId      = null;
            this._mouseIsDown           = false;
            this._cursorPosition        = {x: 0, y: 0};
            this._selectBoxDimHash      = undefined;
            this._deselectedElements    = [];

            this._targetDim = {
                left:	0,
                top:	0,
                width:	10,
                height:	10
            };

            this._selectBoxOrigin = {
                left: 0,
                top:  0
            };

            this.init();

            this.debug = (msg,...data) => {
                if(this._config.debug){
                    data = (data || []);
                    console.debug(msg, ...data);
                }
            };

            this.debugEvent = e => {
                if(this._config.debugEvents){
                    let arrow = '?';
                    switch(e.type){
                        case 'mousedown': arrow = '⯆'; break;
                        case 'mousemove': arrow = '⯈'; break;
                        case 'mouseup':   arrow = '⯅'; break;
                    }
                    this.debug('ON ' + arrow + ' %s currentTarget: %o event: %o', e.type, e.currentTarget, e);
                }
            };
        }

        /**
         * set/update target target element dimension
         * -> must be updated if target element is scrolled/or pushed by e.g. slide menu
         */
        setTargetDimensions(){
            let domRect = this._config.target.getBoundingClientRect();
            Object.assign(this._targetDim, this.filterDomRect(domRect));
        }

        /**
         * set/update boundary element dimension [optional]
         * -> required for 'intersection' check e.g. for scrollable target
         * @returns {DOMRect}
         */
        setBoundaryDimensions(){
            if(this._config.boundary){
                let boundary = this._config.target.closest(this._config.boundary);
                if(boundary){
                    return (this._boundaryDim = boundary.getBoundingClientRect());
                }
            }
            delete this._boundaryDim;
        }

        /**
         * set/update current cursor coordinates
         * @param e
         */
        setCursorPosition(e){
            Object.assign(this._cursorPosition, {
                x: e.pageX,
                y: e.pageY
            });
        }

        init(){
            this.initSelectBox();
            this.setTargetDimensions();

            EventHandler.addEventListener(this._config.target, this.getNamespaceEvent('mousedown'), this.onMouseDown.bind(this), {passive: false});
            EventHandler.addEventListener(this._config.container, this.getNamespaceEvent('mousemove'), this.onMouseMove.bind(this), {passive: true});
            EventHandler.addEventListener(this._config.container, this.getNamespaceEvent('mouseup'), this.onMouseUp.bind(this), {passive: true});
        }

        // Mouse events -----------------------------------------------------------------------------------------------
        onMouseDown(e){
            if(e.which === 1){
                this.debugEvent(e);
                this.setTargetDimensions();
                this.showSelectBox(e);
                this._mouseIsDown = true;
            }
        }

        onMouseMove(e){
            if(this._mouseIsDown){
                e.preventDefault();
                e.stopPropagation();

                if(this._animationFrameId){
                    cancelAnimationFrame(this._animationFrameId);
                }

                this._animationFrameId = requestAnimationFrame(() => {
                    this.debugEvent(e);
                    this.setCursorPosition(e);
                    this.update();
                    this._animationFrameId = null;
                });
            }
        }

        onMouseUp(e){
            this.debugEvent(e);
            this.selectElements();
            this.hideSelectBox();
            this._mouseIsDown = false;
            this._deselectedElements = [];
        }

        // SelectBox handler ------------------------------------------------------------------------------------------
        /**
         * create new selectBox and append to DOM
         * -> hidden by CSS until selectBox gets updated
         */
        initSelectBox(){
            this._selectBox = document.createElement('div');
            this._selectBox.id = this._instanceName;
            this._selectBox.classList.add(this._config.selectBoxClass);
            this._config.target.after(this._selectBox);
        }

        /**
         * show selectBox -> apply CSS for positioning and dimension
         * @param e
         */
        showSelectBox(e){
            Object.assign(this._selectBoxOrigin, {
                left: e.pageX - this._targetDim.left,
                top:  e.pageY - this._targetDim.top
            });

            // limit render "reflow" bny adding all properties at once
            this._selectBox.style.cssText = `--selectBox-left: ${this._selectBoxOrigin.left}px; ` +
                `--selectBox-top: ${this._selectBoxOrigin.top}px; ` +
                `--selectBox-width: 1px; ` +
                `--selectBox-height: 1px;`;

            this._selectBox.classList.add(this._config.activeClass);

            this.callback('onShow');
        }

        /**
         * update selectBox position and dimension based on cursorPosition
         * @returns {boolean}
         */
        updateSelectBox(){
            let updated = false;
            if(!this.isActiveSelectBox()){
                return updated;
            }

            let left		= this._cursorPosition.x - this._targetDim.left;
            let top			= this._cursorPosition.y - this._targetDim.top;
            let tempWidth	= this._selectBoxOrigin.left - left;
            let tempHeight	= this._selectBoxOrigin.top - top;

            let newLeft     = this._selectBoxOrigin.left;
            let newTop      = this._selectBoxOrigin.top;
            let newWidth	= left - this._selectBoxOrigin.left;
            let newHeight	= top - this._selectBoxOrigin.top;

            if(newWidth < 0){
                newLeft     = newLeft - tempWidth;
                newWidth    = newWidth * -1;
            }

            if(newHeight < 0){
                newTop      = newTop - tempHeight;
                newHeight   = newHeight * -1;
            }

            // check if dimension has changed -> improve performance
            let dimensionHash = [newWidth, newHeight].join('_');
            if(this._selectBoxDimHash !== dimensionHash){
                this._selectBoxDimHash = dimensionHash;
                this._selectBox.style.cssText = `--selectBox-left: ${newLeft}px; ` +
                    `--selectBox-top: ${newTop}px; ` +
                    `--selectBox-width: ${newWidth}px; ` +
                    `--selectBox-height: ${newHeight}px;`;

                // set drag position data (which corner)
                this._selectBox.dataset.origin = this.getSelectBoxDragOrigin(left, top, newLeft, newTop).join('|');

                updated = true;
                this.callback('onUpdate');
                this.dispatch(this._selectBox, 'update', this);
            }

            return updated;
        }

        /**
         * hide selectBox
         */
        hideSelectBox(){
            if(!this.isActiveSelectBox()){
                return;
            }

            if(this.callback('onHide', this._deselectedElements) !== false){
                this._selectBox.classList.remove(this._config.activeClass);
            }
        }

        /**
         * cursor position corner for selectBox
         * @param left
         * @param top
         * @param newLeft
         * @param newTop
         * @returns {[string, string]}
         */
        getSelectBoxDragOrigin(left, top, newLeft, newTop){
            let position = [];
            if(
                left === newLeft &&
                top === newTop
            ){
                position = ['top', 'left'];
            }else if(top === newTop){
                position = ['top', 'right'];
            }else if(left === newLeft){
                position = ['bottom', 'left'];
            }else{
                position = ['bottom', 'right'];
            }
            return position;
        }

        /**
         * check if there is currently an active selectBox visible
         * @returns {boolean}
         */
        isActiveSelectBox(){
            return this._selectBox.classList.contains(this._config.activeClass) &&
                !this._config.target.classList.contains(this._config.disabledClass);
        }

        // Element select methods -------------------------------------------------------------------------------------
        selectableElements(){
            return this._config.target.querySelectorAll(this._config.selectables);
        }

        selectElements(){
            if(!this.isActiveSelectBox()){
                return;
            }

            let selectables = this.selectableElements();
            let selectBoxDim = this.filterDomRect(this._selectBox.getBoundingClientRect());

            selectables.forEach(el => {
                let elDim = this.filterDomRect(el.getBoundingClientRect());

                if(this.percentCovered(selectBoxDim, elDim) > this._config.percentCovered){
                    el.classList.add(this._config.selectedClass);
                    // remove element from "deselected" elements (e.g on add -> remove -> add scenario)
                    this._deselectedElements = this._deselectedElements.filter(tempEl => tempEl !== el);
                }else{
                    if(el.classList.contains(this._config.selectedClass)){
                        el.classList.remove(this._config.selectedClass);
                        // add to "deselected" elements, if not already in array
                        if(this._deselectedElements.findIndex(tempEl => tempEl === el) === -1){
                            this._deselectedElements.push(el);
                        }
                    }
                }
            });
        }

        percentCovered(dim1, dim2){
            if(
                (dim1.left <= dim2.left) &&
                (dim1.top <= dim2.top) &&
                ((dim1.left + dim1.width) >= (dim2.left + dim2.width)) &&
                ((dim1.top + dim1.height) > (dim2.top + dim2.height))
            ){
                // The whole thing is covering the whole other thing
                return 100;
            }else{
                // Only parts may be covered, calculate percentage
                dim1.right  = dim1.left + dim1.width;
                dim1.bottom = dim1.top + dim1.height;
                dim2.right  = dim2.left + dim2.width;
                dim2.bottom = dim2.top + dim2.height;

                let l = Math.max(dim1.left, dim2.left);
                let r = Math.min(dim1.right, dim2.right);
                let t = Math.max(dim1.top, dim2.top);
                let b = Math.min(dim1.bottom, dim2.bottom);

                if(b >= t && r >= l){
                    return (((r - l) * (b - t)) / (dim2.width * dim2.height)) * 100;
                }
            }
            return 0;
        }

        // Boundary intersection methods ------------------------------------------------------------------------------
        getIntersection(){
            let intersection = [];
            if(this.isActiveSelectBox && this._boundaryDim){
                let selectBoxDim = this._selectBox.getBoundingClientRect();
                if(this._boundaryDim.top > selectBoxDim.top){
                    intersection.push('top');
                }
                if(this._boundaryDim.bottom < selectBoxDim.bottom){
                    intersection.push('bottom');
                }
                if(this._boundaryDim.left > selectBoxDim.left){
                    intersection.push('left');
                }
                if(this._boundaryDim.right < selectBoxDim.right){
                    intersection.push('right');
                }
            }
            return intersection;
        }

        // Util methods -----------------------------------------------------------------------------------------------
        update(){
            this.setTargetDimensions();
            this.setBoundaryDimensions();

            if(this.updateSelectBox() && this._config.selectOnDrag){
                this.selectElements();
            }
        }

        getNamespaceEvent(type){
            return [type, this._instanceName].join('.');
        }

        filterDomRect(domRect, filteredKeys = ['left', 'top', 'width', 'height']){
            let obj = {};
            filteredKeys.forEach(key => {
                if(domRect[key] !== undefined){
                    obj[key] = domRect[key];
                }
            });
            return obj;
            //return filteredKeys.reduce((obj, key) => ({ ...obj, [key]: domRect[key] }), {}); // same result but uses "object destruction" ES5
        }

        callback(callback, ...args){
            if(this._config[callback] instanceof Function){
                return this._config[callback](...args);
            }
        }

        dispatch(target, type, data = null){
            let event = new CustomEvent([type, this._config.namespace].join(':'), {
                bubbles: true,
                detail: data
            });
            target.dispatchEvent(event);
        }
    };

    DragSelect.defaultConfig = {
        container: document,
        target: document.body,
        namespace: 'dragSelect',
        activeClass: 'active',
        disabledClass: 'disabled',
        selectables: 'div',
        selectedClass: 'dragSelect-selected',
        selectBoxClass: 'dragSelect-selectBox',
        boundary: undefined,                        // optional selector for boundary parent box (e.g. scrollable viewport)
        selectOnDrag: true,
        percentCovered: 25,
        onShow: undefined,
        onHide: undefined,
        onUpdate: undefined,
        debug: false,
        debugEvents: false
    };

    DragSelect.instanceCount = 0;

    return DragSelect;
});
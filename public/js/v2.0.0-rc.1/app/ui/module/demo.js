define([                // dependencies for this module
    'module/base',      // abstract `parent` module class definition [required]
    'app/render'        // ... for demo purpose, we load a Render helper object
], (BaseModule, Render) => {
    'use strict';

    /**
     * DemoModule class
     * -> skeleton for custom module plugins
     * @type {DemoModule}
     */
    let DemoModule = class DemoModule extends BaseModule {
        constructor(config = {}) {
            super(Object.assign({}, new.target.defaultConfig, config));
        }

        /**
         * module header
         * @param text
         * @returns {HTMLDivElement}
         */
        newHeaderElement(text){
            let headEl = super.newHeaderElement(text);
            let toolbarEl = this.newHeadlineToolbarElement();
            let iconPlayEl = this.newIconElement([
                'fa-play', 'fa-fw',
                'txt-color', 'txt-color-success',
                this._config.moduleHeadlineIconClass
            ]);
            iconPlayEl.setAttribute('title', 'pause update()');
            iconPlayEl.onclick = e => this.toggleUpdates(e.target);

            toolbarEl.append(iconPlayEl);
            headEl.append(toolbarEl);
            return headEl;
        }

        /**
         * extends logHandler() from BaseModule
         * -> updates moduleBody (demo)
         * @param handler
         * @param increment
         */
        logHandler(handler, increment = 1){
            super.logHandler(handler, increment);

            /**
             * @param handler
             * @returns {[HTMLSpanElement, HTMLSpanElement]}
             */
            let newLiContent = handler => {
                let count = this._config.logHandler[handler] || 0;
                let label = count ? 'success' : false;
                let icon = 'fa-circle';
                let handlerQueueLength;
                if(this[`_${handler}Queue`]){
                    handlerQueueLength = this[`_${handler}Queue`].filterQueue(item => item.data === 'upd').length;
                    label = handlerQueueLength ? 'warning' : label;
                    icon = handlerQueueLength ? 'fa-sync fa-spin' : icon;
                }

                let iconLiEl = Object.assign(document.createElement('span'), {
                    className: 'fa-li'
                });
                iconLiEl.append(this.newIconElement([icon, 'fa-fw', 'txt-color', label ? `txt-color-${label}` : ``]));

                let textLiEl = Object.assign(document.createElement('span'), {
                    textContent: `${handler} [${count}]${Number.isInteger(handlerQueueLength) ? `[${handlerQueueLength}]`: ``}`,
                    className: label ? `pf-animation-pulse-${label}` : ``
                });
                return [iconLiEl, textLiEl];
            };

            let ulEl = this.queryGridItem('info').querySelector(`.fa-ul`);
            if(!ulEl){
                ulEl = Object.assign(document.createElement('ul'), {
                    className: 'fa-ul'
                });

                let liEls = BaseModule.handler.map(handler => {
                    let liEl = document.createElement('li');
                    liEl.dataset.handler = handler;
                    liEl.prepend(...newLiContent(handler));
                    return liEl;
                });

                ulEl.append(...liEls);
                this.queryGridItem('info').querySelector(`code`).insertAdjacentElement('beforebegin', ulEl);
            }else{
                ulEl.querySelector(`[data-handler="${handler}"]`).innerHTML = newLiContent(handler).map(el => el.outerHTML).join('');
            }
        }

        /**
         * initial module render method
         * -> implementation is enforced by BaseModule
         * -> must return a single node element
         * @param mapId
         * @param systemData
         * @returns {HTMLElement}
         */
        render(mapId, systemData){
            this._systemData = systemData;

            // ... append your custom module body
            let bodyEl = Object.assign(document.createElement('div'), {
                className: [this._config.bodyClassName, 'grid'].join(' ')
            });

            let gridItems = [];
            for(let [area, conf] of Object.entries(this._config.gridItems)){
                gridItems.push(this.newGridItemEl(area, conf.label));
            }
            bodyEl.append(...gridItems);
            this.moduleElement.append(bodyEl);

            this.renderJson('_config', this._config, 'info');
            this.renderJson('render()', {mapId, systemData});

            let {config, data} = BaseModule.Util.getCurrentMapData(this._systemData.mapId);
            this.renderJson('currentMapData', {config, data}, 'mapData');
            return this.moduleElement;
        }

        /**
         * update module
         * @param systemData
         * @returns {Promise}
         */
        update(systemData){
            return super.update(systemData).then(systemData => new Promise(resolve => {
                this.renderJson('update()', {systemData});

                // ... custom (async) code e.g. request external API and update module
                // -> resolve() Promise when module is updated.
                resolve({
                    action: 'update',
                    data: {
                        module: this
                    }
                });
            }));
        }

        /**
         * init module
         */
        init(){
            super.init();
            this.renderJson('init()', null);
            this.renderJson('currentUserData', BaseModule.Util.getCurrentUserData(), 'userData');
        }

        beforeHide(){
            super.beforeHide();
            this.renderJson('beforeHide()', null);
        }

        beforeDestroy(){
            super.beforeDestroy();
            this.renderJson('beforeDestroy()', null);
        }

        /**
         * @param name
         * @param e
         */
        onSortableEvent(name, e){
            super.onSortableEvent(name, e);
            this.renderJson(`${name}()`, e, 'sortableJs');
        }

        /**
         * @param label
         * @param data
         * @param area
         */
        renderJson(label, data, area = 'trigger'){
            let now = new Date();
            let codeEl = this.queryGridItem(area).querySelector(`code`);
            codeEl.prepend(Object.assign(document.createElement('section'), {
                className: this._config.highlightClassName,
                innerHTML: `${++this._config.counter}. ${now.toLocaleTimeString('en-GB')}.${String(now.getMilliseconds()).padStart(3, '0')} ${label} \n` +
                    `${Render.highlightJson(data, this._config.gridItems[area].jsonConf)}`
            }));
            // limit code blocks
            if(codeEl.childElementCount > this._config.maxCodeSections){
                codeEl.removeChild(codeEl.lastChild);
            }
        }

        /**
         * @param iconEl
         */
        toggleUpdates(iconEl){
            iconEl.classList.toggle('fa-pause');
            iconEl.classList.toggle('txt-color-danger');
            iconEl.classList.toggle('fa-play');
            iconEl.classList.toggle('txt-color-success');

            if(this._pauseUpdatesPromise){
                this._pauseUpdatesPromise.resolve();
            }else{
                this._pauseUpdatesPromise = BaseModule.newDeferredPromise();
                this._updateQueue.enqueue(() => this._pauseUpdatesPromise.then(() => {
                    this._pauseUpdatesPromise = null;
                }), 'start');
            }
        }

        /**
         * new gridItem element
         * @param area
         * @param label
         * @returns {HTMLPreElement}
         */
        newGridItemEl(area, label){
            if(!this._gridItemEl){
                // create blank gridItem element for later cloning
                this._gridItemEl = Object.assign(document.createElement('pre'), {
                    className: this._config.gridItemClassName,
                    innerHTML: '<code></code>'
                });
            }

            let iconClearEl = this.newIconElement([
                'fa-trash', 'fa-fw', 'pull-right',
                this._config.moduleHeadlineIconClass
            ]);
            iconClearEl.setAttribute('title', 'clear output');
            iconClearEl.onclick = e => e.target.closest(`.${this._config.gridItemClassName}`).querySelector('code').innerHTML = '';

            let toolbarEl = this.newHeadlineToolbarElement();
            toolbarEl.append(iconClearEl);

            let gridItemEl = this._gridItemEl.cloneNode(true);
            gridItemEl.dataset.area = area;
            gridItemEl.prepend(toolbarEl, this.newHeadlineElement(label));
            return gridItemEl;
        }

        /**
         * get gridItem <pre> element from module body
         * @param {string} area
         * @returns {HTMLPreElement}
         */
        queryGridItem(area){
            return this.moduleElement.querySelector(`.${this._config.bodyClassName} .${this._config.gridItemClassName}[data-area="${area}"]`);
        }
    };

    DemoModule.isPlugin = true;                            // module is defined as 'plugin'
    DemoModule.scope = 'system';                           // module scope controls how module gets updated and what type of data is injected
    DemoModule.sortArea = 'a';                             // default sortable area
    DemoModule.position = 10;                              // default sort/order position within sortable area
    DemoModule.label = 'Demo';                             // static module label (e.g. description)
    DemoModule.fullDataUpdate = true;                      // subscribe module for frequently updates see update() method

    DemoModule.defaultConfig = {
        className: 'pf-system-demo-module',                 // class for module
        sortTargetAreas: ['a', 'b', 'c'],                   // sortable areas where module can be dragged into
        headline: 'Demo Module',

        // ... custom config for DemoModule
        gridItemClassName: 'pf-dynamic-area',
        highlightClassName: 'pf-animation-pulse-success',
        counter: 0,
        maxCodeSections: 8,
        gridItems: {
            info: {
                label: `handler/config`,
                jsonConf: {
                    collapseDepth: 1,
                    maxDepth: 3
                }
            },
            trigger: {
                label: `trigger`,
                jsonConf: {
                    collapseDepth: 1,
                    maxDepth: 5
                }
            },
            userData: {
                label: `user/char data`,
                jsonConf: {
                    collapseDepth: 1,
                    maxDepth: 8
                }
            },
            mapData: {
                label: `map data`,
                jsonConf: {
                    collapseDepth: 2,
                    maxDepth: 8,
                    maxLinesFunctions: 2
                }
            },
            sortableJs: {
                label: `drag&drop events`,
                jsonConf: {
                    collapseDepth: 0,
                    maxDepth: 4,
                    maxLinesFunctions: 2
                }
            }
        }
    };

    return DemoModule;
});
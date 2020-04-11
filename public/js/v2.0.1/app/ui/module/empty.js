define([                // dependencies for this module
    'module/base',      // abstract `parent` module class definition [required]
    'app/render'        // ... for demo purpose, we load a Render helper object
], (BaseModule, Render) => {
    'use strict';

    /**
     * EmptyModule class
     * -> skeleton for custom module plugins
     * @type {EmptyModule}
     */
    let EmptyModule = class EmptyModule extends BaseModule {
        constructor(config = {}) {
            super(Object.assign({}, new.target.defaultConfig, config));
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
                className: this._config.bodyClassName
            });

            this.moduleElement.append(bodyEl);

            return this.moduleElement;
        }

        /**
         * init module
         */
        init(){
            super.init();
        }

        beforeHide(){
            super.beforeHide();
        }

        beforeDestroy(){
            super.beforeDestroy();
        }

        onSortableEvent(name, e){
            super.onSortableEvent(name, e);
        }
    };

    EmptyModule.isPlugin = true;                            // module is defined as 'plugin'
    EmptyModule.scope = 'system';                           // module scope controls how module gets updated and what type of data is injected
    EmptyModule.sortArea = 'a';                             // default sortable area
    EmptyModule.position = 15;                              // default sort/order position within sortable area
    EmptyModule.label = 'Empty';                            // static module label (e.g. description)

    EmptyModule.defaultConfig = {
        className: 'pf-system-empty-module',                // class for module
        sortTargetAreas: ['a', 'b', 'c'],                   // sortable areas where module can be dragged into
        headline: 'Empty Module',
    };

    return EmptyModule;
});
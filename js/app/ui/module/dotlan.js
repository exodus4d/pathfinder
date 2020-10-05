define([                // dependencies for this module
    'module/base',      // abstract `parent` module class definition [required]
    'app/render'        // ... for demo purpose, we load a Render helper object
], (BaseModule, Render) => {
    'use strict';

    /**
     * DotlanModule class
     * -> skeleton for custom module plugins
     * @type {DotlanModule}
     */
    let DotlanModule = class DotlanModule extends BaseModule {
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
            
            if (this.isWormhole(systemData.name)) {
                var moduleContent = 'Not available for Jspace'
            } else {
                var moduleContent = Object.assign(document.createElement('iframe'), {
                    src: this.dotlanPath(this._systemData),
                    className: 'dotlan-iframe',
                    style: "width: 100%; height: 650px;"
                })
            }
            bodyEl.append(moduleContent)
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

        dotlanPath(sysData){            
            let regionName = this.snakeCase(sysData.region.name);
            let systemName = this.snakeCase(sysData.name);
            return ["https://evemaps.dotlan.net/map/", regionName, "/", systemName, "#npc_delta"].join('');
        }

        snakeCase(str){
            const regex = /\ /g;
            return str.replace(regex, "_");
        }

        isWormhole(systemName){
            const jspace = /^[jJ][0-9]{4,6}/;
            return systemName.match(jspace) ? true : false;
        }

    };

    DotlanModule.isPlugin = true;                            // module is defined as 'plugin'
    DotlanModule.scope = 'system';                           // module scope controls how module gets updated and what type of data is injected
    DotlanModule.sortArea = 'a';                             // default sortable area
    DotlanModule.position = 15;                              // default sort/order position within sortable area
    DotlanModule.label = 'Dotlan';                            // static module label (e.g. description)

    DotlanModule.defaultConfig = {
        className: 'pf-system-dotlan-module',                // class for module
        sortTargetAreas: ['a'],                   // sortable areas where module can be dragged into
        headline: 'Dotlan Module',
    };

    return DotlanModule;
});

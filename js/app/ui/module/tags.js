define([                // dependencies for this module
  'module/base',      // abstract `parent` module class definition [required]
  'app/map/util',
  'app/util'
], (BaseModule, MapUtil, Util) => {
  'use strict';

  /**
   * TagsModule class
   * -> skeleton for custom module plugins
   * @type {TagsModule}
   */
    let TagsModule = class TagsModule extends BaseModule {
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
        render(mapId){
            this._mapId = mapId;

            // ... append your custom module body
            this._bodyEl = Object.assign(document.createElement('div'), {
                className: this._config.bodyClassName
            });

            this.moduleElement.append(this._bodyEl);
            let content = "nope";
            // var content = JSON.stringify(BaseModule.Util.getCurrentMapData(mapId, 'config.name'))
            let activeMap = BaseModule.Util.getMapModule().getActiveMap();
            if(activeMap){
               var mapData = Util.getCurrentMapData(mapId);
               content = mapData.config.name
            }
            

            this._bodyEl.append(content);

            this.initTagModule();

            return this.moduleElement;
        }

        /**
         * init module
         */
        initTagModule(){
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

        getNextBookmarksData(mapId){
            // return MapUtil.getMapInstance(mapId);
            // return BaseModule.Util.getCurrentMapData(mapId, config)
        }
        
        /**
         * update module
         * compare data and update module
         * @param mapId
         * @returns {Promise}
         */
        // update(mapId){
        //     return super.update(mapId).then(mapId => new Promise(resolve => {
        //         this.getNextBookmarksData('callBackUpdateTagsRows');

        //         resolve({
        //             action: 'update',
        //             data: {
        //                 module: this
        //             }
        //         });
        //     }));
        // }
    };

  TagsModule.isPlugin = true;                            // module is defined as 'plugin'
  TagsModule.scope = 'global';                           // module scope controls how module gets updated and what type of data is injected
  TagsModule.sortArea = 'b';                             // default sortable area
  TagsModule.position = 15;                              // default sort/order position within sortable area
  TagsModule.label = 'Bookmark Tags';                            // static module label (e.g. description)

  TagsModule.defaultConfig = {
      className: 'pf-system-tag-module',                // class for module
      sortTargetAreas: ['a', 'b', 'c'],                   // sortable areas where module can be dragged into
      headline: 'Bookmark Tags',
  };

  return TagsModule;
});
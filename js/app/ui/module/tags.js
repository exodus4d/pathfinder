define([      
    'jquery',           // dependencies for this module
    'module/base',      // abstract `parent` module class definition [required]
    'app/map/util',
    'app/util'
], ($, BaseModule, MapUtil, Util) => {
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
            this._bodyEl = Object.assign(document.createElement('div'), {
                className: this._config.bodyClassName
            });

            let tags = this.getTagList(mapId);
            
            // let content = "";        
            // tags.forEach(pair => content += (pair.join(': ') + ", "));
            // this._bodyEl.append(content + "\n");
                    
            // this.buildDisplayElements(tags);        
            
            this.moduleElement.append(this._bodyEl);
            this.initTagModule();

            return this.moduleElement;
        }

        /**
         * init tag list
         */
        initTagModule(){
            super.init();
        }   
        
        getTagList(mapId){                
                let currentTags = [];
                let securityClasses = ['H', 'L', '0.0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'];

                let activeMap = BaseModule.Util.getMapModule().getActiveMap();
                if(activeMap){
                    var mapData = Util.getCurrentMapData(mapId);
                    currentTags = mapData.config.nextBookmarks.split(',');
                    console.log(currentTags);
                }
                var displayTags = securityClasses.map(function(k, i) {
                    return [k, currentTags[i]];
                });
            return displayTags;
        }

        buildDisplayElements(tagsArr){
            tagsArr.forEach( tag => {
                let secClass = Util.getSecurityClassForSystem(tag[0]);
                let systemSpan  = Object.assign(document.createElement('span'), {                    
                    className: [this._config.systemSec, secClass].join(' '),
                    style: "margin-right: 5px;"
                })
                systemSpan.innerHTML = MapUtil.getSystemSecurityForDisplay(tag[0]).toLowerCase() + tag[1];
                this._bodyEl.append(systemSpan);
            })

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
TagsModule.label = 'Bookmark Tags';                    // static module label (e.g. description)

TagsModule.defaultConfig = {
    className: 'pf-system-tag-module',                // class for module
    innerClassName: 'pf-system-tag-inner',
    sortTargetAreas: ['a', 'b', 'c'],                 // sortable areas where module can be dragged into
    headline: 'Bookmark Tags',    
    systemSec: 'pf-system-sec'                        // system security classes
};

return TagsModule;
});
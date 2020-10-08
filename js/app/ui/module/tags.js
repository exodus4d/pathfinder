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
            
            for (var i = 0; i < tags.length; i += 3) {
                this.buildDisplayElements(tags.slice(i, i+3));    
            }                                
            
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
                currentTags = JSON.parse(mapData.config.nextBookmarks);
            }

            currentTags.forEach(function(item, index, arr){
                arr[index] = [securityClasses[index]];            
                item.forEach(tag => {
                   arr[index].push( MapUtil.getSystemSecurityForDisplay(securityClasses[index]).toLowerCase() + tag)
                })  
              })

            console.log(currentTags);
            return currentTags;
        }

        buildDisplayElements(tagsArr){
            let row = Object.assign(document.createElement('p'), {
                style: "margin-right: 0px 5px;"
            });
            tagsArr.forEach( tag => {
                let secClass = Util.getSecurityClassForSystem(tag[0]);
                if (row.childElementCount != 0){
                    let dividerSpan = document.createElement('span')
                    dividerSpan.innerHTML = "|";
                    row.append(dividerSpan);
                }
                let systemSpan  = Object.assign(document.createElement('span'), {                    
                    className: [this._config.systemSec, secClass].join(' '),
                    style: "margin: 0px 10px; width: 28%; text-align: center;"    
                })
                systemSpan.innerHTML = tag.slice(1).join('&nbsp;&nbsp;');                                
                row.append(systemSpan);
            })
            this._bodyEl.append(row);
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
    systemSec: 'pf-system-sec',                       // system security classes    
};

return TagsModule;
});
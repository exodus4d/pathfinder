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
         * @returns {HTMLElement}
         */
        render(mapId){            
            this._bodyEl = Object.assign(document.createElement('div'), {
                className: this._config.bodyClassName
            });
            this._mapId = mapId;


            // returns 2d array of data to create table from
            let tagsData = this.getTagList(mapId);

            // build the table
            this.buildTagsTable(tagsData)       

            //append to module body
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
                   arr[index].push(tag)
                })  
              })
            return currentTags;
        }

        buildTagsTable(tagsArr){
            let tagsTable = Object.assign(document.createElement('table'), {
                className: this._config.tagsTable,
                id: 'table-id',
                style: "width: 90%; text-align: center; margin-left: auto; margin-right: auto;"
            });            
            
            for (var i = 0; i < tagsArr[0].length; i++) {
                let tagsRow = tagsTable.insertRow();
                tagsArr.forEach(tags => {                    
                    let tagsCell = Object.assign(tagsRow.insertCell(), {                    
                        className: [this._config.systemSec, Util.getSecurityClassForSystem(tags[0])].join(' '),
                        style: "width: 10%; padding: 5px;"
                    });
                    let tagsText = document.createTextNode(i == 0 ? MapUtil.getSystemSecurityForDisplay(tags[i]).toLowerCase() : tags[i]); 
                    tagsCell.appendChild(tagsText);
                });                
            }            
            this._bodyEl.append(tagsTable);
        }

        updateTagsTable(){
            let table = document.getElementById('table-id');
            table.parentElement.removeChild(table);
            
            let tagsData = this.getTagList(this._mapId);
            this.buildTagsTable(tagsData);
            return true
        }
        
        update(mapId){
            return super.update(mapId).then(mapId => new Promise(resolve => {
                this.updateTagsTable(mapId);
                
                resolve({
                    action: 'update',
                    data: {
                        module: this
                    }
                });
            }));
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
TagsModule.scope = 'system';                           // module scope controls how module gets updated and what type of data is injected
TagsModule.sortArea = 'b';                             // default sortable area
TagsModule.position = 15;                              // default sort/order position within sortable area
TagsModule.label = 'Bookmark Tags';                    // static module label (e.g. description)

TagsModule.defaultConfig = {
    className: 'pf-system-tag-module',                // class for module
    innerClassName: 'pf-system-tag-inner',
    sortTargetAreas: ['a', 'b', 'c'],                 // sortable areas where module can be dragged into
    headline: 'Bookmark Tags',    
    systemSec: 'pf-system-sec',                       // system security classes    
    tagsTable: 'pf-tags-table'
};

return TagsModule;
});
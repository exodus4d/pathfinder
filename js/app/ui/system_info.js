/**
 *  System info module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render'
], function($, Init, Util, Render) {
    "use strict";

    var config = {
        // module info
        moduleClass: 'pf-module',                                               // class for each module

        // system info module
        systemInfoModuleClass: 'pf-system-info-module',                         // module wrapper
        systemInfoTableClass: 'pf-system-info-table'                            // class for system info table
    };

    /**
     *
     * @param parentElement
     * @param systemInfoData
     */
    var drawModule = function(parentElement, systemData){

        // create new module container
        var moduleElement = $('<div>', {
            class: [config.moduleClass, config.systemInfoModuleClass].join(' '),
            css: {opacity: 0}
        });

        parentElement.prepend(moduleElement);

        var effectName = Util.getEffectInfoForSystem(systemData.effect, 'name');
        var effectClass = Util.getEffectInfoForSystem(systemData.effect, 'class');

        // systemInfo template config
        var moduleConfig = {
            name: 'modules/system_info',
            position: moduleElement,
            link: 'append',
            functions: {
                after: function(){
                    // init tooltips
                    var tooltipElements = $('.' + config.systemInfoModuleClass + ' [data-toggle="tooltip"]');
                    tooltipElements.tooltip();

                    // init system effect popover
                    var systemEffectData = Util.getSystemEffectData( systemData.security, systemData.effect);

                    if(systemEffectData !== false){

                        var systemInfoTable = $(moduleElement).find('.' + config.systemInfoTableClass);

                        // transform data into table
                        var systemEffectTable = Util.getSystemEffectTable( systemEffectData );

                        systemInfoTable.popover({
                            html: true,
                            trigger: 'hover',
                            placement: 'top',
                            delay: 200,
                            title: 'System effects',
                            content: systemEffectTable
                        });
                    }

                    showModule(moduleElement);
                }
            }
        };

        // add security class for statics
        if(systemData.static){
            $.each(systemData.static, function(i, staticWH){
                system['static'][i]['class'] = Util.getSecurityClassForSystem( staticWH.security );
            });
        }

        var moduleData = {
            system: systemData,
            tableClass: config.systemInfoTableClass,
            systemTypeName: Util.getSystemTypeInfo(systemData.type.id, 'name'),
            securityClass: Util.getSecurityClassForSystem( systemData.security ),
            trueSec: systemData.trueSec.toFixed(1),
            trueSecClass: Util.getTrueSecClassForSystem( systemData.trueSec ),
            effectName: effectName,
            effectClass: effectClass
        };

        Render.showModule(moduleConfig, moduleData);
    };

    /**
     * show system info module with animation
     * @param moduleElement
     */
    var showModule = function(moduleElement){
        moduleElement.velocity('stop').velocity('transition.slideUpIn', {
            queue: false,
            duration: Init.animationSpeed.mapModule
        });
    };

    /**
     * update system info module
     * @param systemInfoData
     */
    $.fn.drawSystemInfoModule = function(systemData){

        var parentElement = $(this);

        // check if module already exists
        var moduleElement = parentElement.find('.' + config.systemInfoModuleClass);

        if(moduleElement.length > 0){
            moduleElement.velocity('stop').velocity('reverse', {
                complete: function(tempElement){
                    $(tempElement).remove();

                    drawModule(parentElement, systemData);
                }
            });
        }else{
            drawModule(parentElement, systemData);
        }



    };
});




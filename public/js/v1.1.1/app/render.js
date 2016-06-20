/**
 *  Render controller
 */

define(['jquery', 'mustache'], function($, Mustache) {

    "use strict";

    /**
     * init function will be called before and after a new module is loaded
     * @param functionName
     * @param config
     */
    var initModule = function(functionName, config){

        if(
            typeof config.functions === 'object' &&
            typeof config.functions[functionName] === 'function'
        ){
            config.functions[functionName]();
        }
    };

    /**
     * load a template and render is with Mustache
     * @param config
     * @param data
     */
    var showModule = function(config, data){

        // require module template
        requirejs(['text!templates/' + config.name + '.html'], function(template) {

            // check for an id, if module already exists, do not insert again
            if(
                data.id === 'undefined' ||
                 $("#" + data.id).length === 0
            ){

                var content = Mustache.render(template, data);

                // display module
                switch(config.link){
                    case 'prepend':
                        config.position.prepend(content);
                        break;
                    case 'before':
                        config.position.before(content);
                        break;
                    case 'after':
                        config.position.after(content);
                        break;
                    default:
                        config.position.append(content);
                }
            }

            // init module function after render
            initModule('after', config);


        });
    };


    return {
        showModule: showModule
    };
});
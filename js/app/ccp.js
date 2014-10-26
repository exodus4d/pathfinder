/**
 *  Global CCPEvE function wrapper
 */

define(["jquery", "app/render", "app/init"], function($, Render, Config) {

    "use strict";

    /**
     * in-game or out-of-game browser
     * @returns {boolean}
     */
    var isInGame = function(){
        var inGame = false;
        if(typeof CCPEVE === 'object'){
            inGame = true;
        }
return true;
        return inGame;
    }


    var requestTrust = function(){
        if(isInGame()){

            var config = {
                name: 'modules/dialog',
                position: $('body'),
                link: 'after',
                functions: {
                    after: function(){
                        $( "#pf_trust_dialog" ).dialog({
                            modal: true,
                            buttons: {
                                Ok: function(){
                                    $(this).dialog('close');
                                }
                            }
                        });
                    }
                }
            };

            var data = {
                id: 'pf_trust_dialog',
                titel: 'Trust page',
                content: 123 //CCPEVE.requestTrust(Config.baseUrl)
            };
           // Render.showModule(config, data);
        }
    };


    return {
        requestTrust: requestTrust
    };
});
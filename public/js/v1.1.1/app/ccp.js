/**
 *  Global CCPEvE function wrapper
 */

define(['jquery'], function($) {

    'use strict';

    /**
     * checks whether the program URL is IGB trusted or not
     * @returns {boolean}
     */
    var isTrusted = function(){
        var isPageTrusted = false;

        if(isInGameBrowser()){
            var trustedAttribute = $('body').attr('data-trusted');
            if(trustedAttribute === '1'){
                isPageTrusted = true;
            }
        }else{
            // out of game browser is always trusted
            isPageTrusted = true;
        }

        return isPageTrusted;
    };

    /**
     * show IGB trust message
     */
    var requestTrust = function(){

      if(
          isInGameBrowser() &&
          !isTrusted()
      ){
        CCPEVE.requestTrust( location.protocol + '//' + location.host );
      }
    };

    /**
     * in-game or out-of-game browser
     * @returns {boolean}
     */
    var isInGameBrowser = function(){
        var inGame = false;
        if(typeof CCPEVE === 'object'){
            inGame = true;
        }

        return inGame;
    };

    return {
        isInGameBrowser: isInGameBrowser,
        isTrusted: isTrusted,
        requestTrust: requestTrust
    };
});
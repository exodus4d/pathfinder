/**
 *  Client
 */

define(["jquery"], function($) {

    "use strict";

    // client object
    function Client(){}


    var getClient = function(){
        var headerData = getHeaderData();
    };

    // private functions ========================================================
    var getHeaderData = function(){
        console.log('TERST');
        $.ajax({
            url: 'http://localhost/exodus4d/pathfinder/',
            headers:{'foo':'bar'},
            complete: function() {
                alert(this.headers.foo);
            }
        });
    };

    return {
        getClient: getClient
    };
});
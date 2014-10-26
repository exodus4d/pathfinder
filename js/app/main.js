define(["jquery", "app/ccp", "app/map"], function($, CCP, Map) {

    "use strict";

    $(function() {
        //$('body').alpha().beta();

        CCP.requestTrust();

        Map.render();
    });
});
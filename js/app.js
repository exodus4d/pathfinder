
requirejs.config({
    "baseUrl": "js", // user build_js files, change to "js" for un-compressed source
    "paths": {
        layout: "layout",
        jquery: "lib/jquery-1.11.1.min",
        //jquery: "lib/jquery-2.1.1.min",
        //jqueryUI: "lib/jquery-ui.min",
        jqueryUI: "lib/jquery-ui-custom.min",                         // custom script (without tooltip -> conflict with bootstrap)
        bootstrap: "lib/bootstrap.min",
        text: "lib/requirejs/text",
        templates: "../templates",
        jsPlumb: "lib/jsPlumb-1.6.4-min",                             // main map draw plugin
        customScrollbar: "lib/jquery.mCustomScrollbar.concat.min",    // custom scroll bars
        datatables: "lib/jquery.dataTables.min",                      // tables
        datatablesBootstrap: "lib/dataTables.bootstrap",              // not used (bootstrap style)
        xEditable: "lib/bootstrap-editable.min",                      // in placed editing
        bootbox: "lib/bootbox.min"                                    // custom dialogs
    },
    shim: {
        jqueryUI: {
            export: '$',
            deps: ['jquery']
        },
        bootstrap: {
            deps: ['jquery', 'jqueryUI']
        },
        customScrollbar: {
            deps: ['jquery']
        },
        datatables: {
            deps: ['jquery']
        },
        datatablesBootstrap: {
            deps: ['datatables']
        },
        xEditable: {
            deps: ['bootstrap']
        },
        bootbox: {
            deps: ['jquery', 'bootstrap'],
            exports: 'bootbox'
        }
    }
});

/*
requirejs(['jquery', 'xEditable'], function($,  ) {
});
*/
// Load the main app module to start the app
requirejs(["app/main"]);

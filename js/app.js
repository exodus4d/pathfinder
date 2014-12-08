
requirejs.config({
    baseUrl: 'js', // user build_js files, change to "js" for un-compressed source
    paths: {
        layout: 'layout',
        jquery: 'lib/jquery-1.11.1.min',
        //jquery: "lib/jquery-2.1.1.min",
        //jqueryUI: "lib/jquery-ui.min",
        jqueryUI: 'lib/jquery-ui-custom.min',                           // custom script (without tooltip -> conflict with bootstrap)
        bootstrap: 'lib/bootstrap.min',                                 // Bootstrap js code - http://getbootstrap.com/javascript/
        text: 'lib/requirejs/text',                                     // A RequireJS/AMD loader plugin for loading text resources.
        templates: '../templates',                                      // template dir
        slidebars: 'lib/slidebars',                                     // Slidebars - side menu plugin http://plugins.adchsm.me/slidebars/
        jsPlumb: 'lib/jsPlumb-1.6.4-min',                               // jsPlumb - main map draw plugin http://www.jsplumb.org/
        customScrollbar: 'lib/jquery.mCustomScrollbar.concat.min',      // Custom scroll bars - http://manos.malihu.gr/
        datatables: 'lib/jquery.dataTables.min',                        // DataTables - tables
        datatablesBootstrap: 'lib/dataTables.bootstrap',                // DataTables - not used (bootstrap style)
        xEditable: 'lib/bootstrap-editable.min',                        // X-editable - in placed editing
        morris: 'lib/morris.min',                                       // Morris.js - graphs and charts
        raphael: 'lib/raphael-min',                                     // Raphaël - required for morris (dependency)
        bootbox: 'lib/bootbox.min',                                     // Bootbox.js - custom dialogs

        pnotify: 'lib/pnotify/pnotify.core',                            // PNotify - notification core file
        //'pnotify.buttons': 'lib/pnotify/pnotify.buttons',             // PNotify - buttons notification extension
        //'pnotify.confirm': 'lib/pnotify/pnotify.confirm',             // PNotify - confirmation notification extension
        'pnotify.nonblock': 'lib/pnotify/pnotify.nonblock',             // PNotify - notification non-block extension (hover effect)
        'pnotify.desktop': 'lib/pnotify/pnotify.desktop',               // PNotify - desktop push notification extension
        //'pnotify.history': 'lib/pnotify/pnotify.history',             // PNotify - history push notification history extension
        'pnotify.callbacks': 'lib/pnotify/pnotify.callbacks'           // PNotify - callbacks push notification extension
        // 'pnotify.reference': 'lib/pnotify/pnotify.reference'         // PNotify - reference push notification extension

    },
    shim: {
        jqueryUI: {
            export: '$',
            deps: ['jquery']
        },
        bootstrap: {
            deps: ['jquery', 'jqueryUI']
        },
        slidebars: {
            deps: ['jquery']
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
        },
        morris: {
            deps: ['jquery', 'raphael'],
            exports: 'Morris'
        },
        pnotify: {
            deps : ['jquery']
        }
    }
});

/*
requirejs(['jquery', 'xEditable'], function($,  ) {
});
*/
// load the main app module in order to start the app
requirejs(["app/main"]);

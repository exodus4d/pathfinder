
requirejs.config({
    baseUrl: 'js', // user build_js files, change to "js" for un-compressed source
    paths: {
        layout: 'layout',
        jquery: 'lib/jquery-1.11.1.min',                                // v1.11.1 jQuery
        //jquery: "lib/jquery-2.1.1.min",                               // v2.1.1 jQuery
        //jqueryUI: "lib/jquery-ui.min",                                // v1.11.2 jQuery UI default
        jqueryUI: 'lib/jquery-ui-custom.min',                           // v1.11.2 custom script (without tooltip -> conflict with bootstrap)
        bootstrap: 'lib/bootstrap.min',                                 // v3.3.0 Bootstrap js code - http://getbootstrap.com/javascript/
        text: 'lib/requirejs/text',                                     // v2.0.12 A RequireJS/AMD loader plugin for loading text resources.
        templates: '../templates',                                      // template dir
        slidebars: 'lib/slidebars',                                     // v0.10 Slidebars - side menu plugin http://plugins.adchsm.me/slidebars/
        jsPlumb: 'lib/jsPlumb-1.6.4-min',                               // v1.4.6 jsPlumb - main map draw plugin http://www.jsplumb.org/
        customScrollbar: 'lib/jquery.mCustomScrollbar.concat.min',      // v3.1.11 Custom scroll bars - http://manos.malihu.gr/
        datatables: 'lib/jquery.dataTables.min',                        // v1.10.3 DataTables - tables
        datatablesBootstrap: 'lib/dataTables.bootstrap',                // DataTables - not used (bootstrap style)
        xEditable: 'lib/bootstrap-editable.min',                        // v1.5.1 X-editable - in placed editing
        morris: 'lib/morris.min',                                       // v0.5.0 Morris.js - graphs and charts
        raphael: 'lib/raphael-min',                                     // v2.1.2 Raphaël - required for morris (dependency)
        bootbox: 'lib/bootbox.min',                                     // v4.3.0 Bootbox.js - custom dialogs
        easyPieChart: 'lib/jquery.easypiechart.min',                    // v2.1.6 Easy Pie Chart - HTML 5 pie charts - http://rendro.github.io/easy-pie-chart/
        dragToSelect: 'lib/jquery.dragToSelect',                        // v1.1 Drag to Select - http://andreaslagerkvist.com/jquery/drag-to-select/
        hoverIntent: 'lib/jquery.hoverIntent.minified',                 // v1.8.0 Hover intention - http://cherne.net/brian/resources/jquery.hoverIntent.html

        pnotify: 'lib/pnotify/pnotify.core',                            // v2.0.1 PNotify - notification core file
        //'pnotify.buttons': 'lib/pnotify/pnotify.buttons',             // PNotify - buttons notification extension
        //'pnotify.confirm': 'lib/pnotify/pnotify.confirm',             // PNotify - confirmation notification extension
        'pnotify.nonblock': 'lib/pnotify/pnotify.nonblock',             // PNotify - notification non-block extension (hover effect)
        'pnotify.desktop': 'lib/pnotify/pnotify.desktop',               // PNotify - desktop push notification extension
        //'pnotify.history': 'lib/pnotify/pnotify.history',             // PNotify - history push notification history extension
        'pnotify.callbacks': 'lib/pnotify/pnotify.callbacks'            // PNotify - callbacks push notification extension
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
        },
        easyPieChart: {
            deps : ['jquery']
        },
        dragToSelect: {
            deps : ['jquery']
        },
        hoverIntent: {
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

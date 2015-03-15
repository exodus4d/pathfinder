
requirejs.config({
    baseUrl: 'js', // user build_js files, change to "js" for un-compressed source
    stubModules: ['text'],                                              // Exclude these modules on build
    paths: {
        layout: 'layout',
        jquery: 'lib/jquery-1.11.2.min',                                // v1.11.2 jQuery
        //jquery: "lib/jquery-2.1.1.min",                               // v2.1.1 jQuery
        bootstrap: 'lib/bootstrap.min',                                 // v3.3.0 Bootstrap js code - http://getbootstrap.com/javascript/
        text: 'lib/requirejs/text',                                     // v2.0.12 A RequireJS/AMD loader plugin for loading text resources.
        mustache: 'lib/mustache.min',                                   // v1.0.0 Javascript template engine - http://mustache.github.io/
        velocity: 'lib/velocity.min',                                   // v1.2.1 animation engine - http://julian.com/research/velocity/
        velocityUI: 'lib/velocity.ui.min',                              // v5.0.3 plugin for velocity - http://julian.com/research/velocity/#uiPack
        templates: '../public/templates',                               // template dir
        slidebars: 'lib/slidebars',                                     // v0.10 Slidebars - side menu plugin http://plugins.adchsm.me/slidebars/
        jsPlumb: 'lib/dom.jsPlumb-1.7.2-min',                           // v1.7.2 jsPlumb (Vanilla)- main map draw plugin http://www.jsplumb.org/
        customScrollbar: 'lib/jquery.mCustomScrollbar.concat.min',      // v3.1.11 Custom scroll bars - http://manos.malihu.gr/
        datatables: 'lib/datatables/jquery.dataTables.min',             // v1.10.3 DataTables - https://datatables.net/
        datatablesBootstrap: 'lib/datatables/dataTables.bootstrap',     // DataTables - not used (bootstrap style)
        datatablesTableTools: 'lib/datatables/extensions/TableTools/js/dataTables.tableTools',   // v2.2.3 TableTools (PlugIn) - https://datatables.net/extensions/tabletools/
        xEditable: 'lib/bootstrap-editable.min',                        // v1.5.1 X-editable - in placed editing
        morris: 'lib/morris.min',                                       // v0.5.1 Morris.js - graphs and charts
        raphael: 'lib/raphael-min',                                     // v2.1.2 Raphaël - required for morris (dependency)
        bootbox: 'lib/bootbox.min',                                     // v4.3.0 Bootbox.js - custom dialogs
        easyPieChart: 'lib/jquery.easypiechart.min',                    // v2.1.6 Easy Pie Chart - HTML 5 pie charts - http://rendro.github.io/easy-pie-chart/
        dragToSelect: 'lib/jquery.dragToSelect',                        // v1.1 Drag to Select - http://andreaslagerkvist.com/jquery/drag-to-select/
        hoverIntent: 'lib/jquery.hoverIntent.minified',                 // v1.8.0 Hover intention - http://cherne.net/brian/resources/jquery.hoverIntent.html
        fullScreen: 'lib/jquery.fullscreen.min',                        // v0.5.0 Full screen mode - https://github.com/private-face/jquery.fullscreen
        select2: 'lib/select2.min',                                     // v4.0.0 Drop Down customization - https://select2.github.io/
        validator: 'lib/validator.min',                                 // v0.7.2 Validator for Bootstrap 3 - https://github.com/1000hz/bootstrap-validator


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
        bootstrap: {
            deps: ['jquery']
        },
        velocity: {
            deps: ['jquery']
        },
        velocityUI: {
            deps: ['velocity']
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
        datatablesTableTools: {
            deps: ['datatables']
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
        },
        fullScreen: {
            deps : ['jquery']
        },
        select2: {
            deps : ['jquery'],
            exports: 'Select2'
        },
        validator: {
            deps : ['jquery', 'bootstrap']
        }
    }
});



// load the main app module in order to start the app
requirejs(['app/main']);

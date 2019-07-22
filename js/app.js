'use strict';

// main script path
var mainScriptPath = document.body.getAttribute('data-script');

// js baseURL. Depends on the environment.
// e.g. use raw files (develop) or build files (production)
var jsBaseUrl = document.body.getAttribute('data-js-path');

// requireJs configuration
requirejs.config({
    baseUrl: 'js',                                                      // src root path - dynamically set !below! ("build_js" | "js")

    paths: {
        conf: 'app/conf',                                               // path     config files
        dialog: 'app/ui/dialog',                                        // path     dialog files
        layout: 'app/ui/layout',                                        // path     layout files
        module: 'app/ui/module',                                        // path     module files

        templates: '../../templates',                                   // path     template base dir
        img: '../../img',                                               // path     image base dir

        // main views
        login: './app/login',                                           // initial start "login page" view
        mappage: './app/mappage',                                       // initial start "map page" view
        setup: './app/setup',                                           // initial start "setup page" view
        admin: './app/admin',                                           // initial start "admin page" view
        notification: './app/notification',                             // "notification" view

        jquery: 'lib/jquery-3.3.1.min',                                 // v3.3.1   jQuery
        bootstrap: 'lib/bootstrap.min',                                 // v3.3.0   Bootstrap js code - http://getbootstrap.com/javascript
        text: 'lib/requirejs/text',                                     // v2.0.12  A RequireJS/AMD loader plugin for loading text resources.
        mustache: 'lib/mustache.min',                                   // v3.0.1   Javascript template engine - http://mustache.github.io
        localForage: 'lib/localforage.min',                             // v1.7.3   localStorage library - https://localforage.github.io/localForage/
        velocity: 'lib/velocity.min',                                   // v1.5.1   animation engine - http://julian.com/research/velocity
        velocityUI: 'lib/velocity.ui.min',                              // v5.2.0   plugin for velocity - http://julian.com/research/velocity/#uiPack
        slidebars: 'lib/slidebars',                                     // v2.0.2   Slidebars - side menu plugin https://www.adchsm.com/slidebars/
        jsPlumb: 'lib/jsplumb',                                         // v2.9.3   jsPlumb main map draw plugin http://jsplumb.github.io/jsplumb/home.html
        farahey: 'lib/farahey',                                         // v1.1.2   jsPlumb "magnetizing" plugin extension - https://github.com/ThomasChan/farahey
        customScrollbar: 'lib/jquery.mCustomScrollbar.min',             // v3.1.5   Custom scroll bars - http://manos.malihu.gr
        mousewheel: 'lib/jquery.mousewheel.min',                        // v3.1.13  Mousewheel - https://github.com/jquery/jquery-mousewheel
        xEditable: 'lib/bootstrap-editable.min',                        // v1.5.1   X-editable - in placed editing
        morris: 'lib/morris.min',                                       // v0.5.1   Morris.js - graphs and charts
        raphael: 'lib/raphael.min',                                     // v2.2.8   Raphaël - required for morris - https://dmitrybaranovskiy.github.io/raphael
        bootbox: 'lib/bootbox.min',                                     // v4.4.0   Bootbox.js - custom dialogs - http://bootboxjs.com
        easyPieChart: 'lib/jquery.easypiechart.min',                    // v2.1.6   Easy Pie Chart - HTML 5 pie charts - http://rendro.github.io/easy-pie-chart
        peityInlineChart: 'lib/jquery.peity.min',                       // v3.2.1   Inline Chart - http://benpickles.github.io/peity/
        dragToSelect: 'lib/jquery.dragToSelect',                        // v1.1     Drag to Select - http://andreaslagerkvist.com/jquery/drag-to-select
        hoverIntent: 'lib/jquery.hoverIntent.min',                      // v1.9.0   Hover intention - http://cherne.net/brian/resources/jquery.hoverIntent.html
        select2: 'lib/select2.min',                                     // v4.0.3   Drop Down customization - https://select2.github.io
        validator: 'lib/validator.min',                                 // v0.10.1  Validator for Bootstrap 3 - https://github.com/1000hz/bootstrap-validator
        lazylinepainter: 'lib/jquery.lazylinepainter-1.5.1.min',        // v1.5.1   SVG line animation plugin - http://lazylinepainter.info
        blueImpGallery: 'lib/blueimp-gallery',                          // v2.21.3  Image Gallery - https://github.com/blueimp/Gallery
        blueImpGalleryHelper: 'lib/blueimp-helper',                     //          helper function for Blue Imp Gallery
        blueImpGalleryBootstrap: 'lib/bootstrap-image-gallery',         // v3.4.2   Bootstrap extension for Blue Imp Gallery - https://blueimp.github.io/Bootstrap-Image-Gallery
        bootstrapConfirmation: 'lib/bootstrap-confirmation',            // v1.0.5   Bootstrap extension for inline confirm dialog - https://github.com/tavicu/bs-confirmation
        bootstrapToggle: 'lib/bootstrap-toggle.min',                    // v2.2.0   Bootstrap Toggle (Checkbox) - http://www.bootstraptoggle.com
        lazyload: 'lib/jquery.lazyload.min',                            // v1.9.7   LazyLoader images - https://appelsiini.net/projects/lazyload/
        sortable: 'lib/sortable.min',                                   // v1.6.0   Sortable - drag&drop reorder - https://github.com/rubaxa/Sortable

        'summernote.loader': './app/summernote.loader',                 // v0.8.10  Summernote WYSIWYG editor -https://summernote.org
        'summernote': 'lib/summernote/summernote.min',

        // header animation
        easePack: 'lib/EasePack.min',
        tweenLite: 'lib/TweenLite.min',

        // datatables                                                   // v1.10.18 DataTables - https://datatables.net
        'datatables.loader': './app/datatables.loader',
        'datatables.net': 'lib/datatables/DataTables-1.10.18/js/jquery.dataTables.min',
        'datatables.net-buttons': 'lib/datatables/Buttons-1.5.6/js/dataTables.buttons.min',
        'datatables.net-buttons-html': 'lib/datatables/Buttons-1.5.6/js/buttons.html5.min',
        'datatables.net-responsive': 'lib/datatables/Responsive-2.2.2/js/dataTables.responsive.min',
        'datatables.net-select': 'lib/datatables/Select-1.3.0/js/dataTables.select.min',
        'datatables.plugins.render.ellipsis': 'lib/datatables/plugins/render/ellipsis',

        // notification plugin
        pnotify: 'lib/pnotify/pnotify',                                 // v3.2.1 PNotify - notification core file - https://sciactive.com/pnotify/
        'pnotify.buttons': 'lib/pnotify/pnotify.buttons',               // PNotify - buttons notification extension
        'pnotify.confirm': 'lib/pnotify/pnotify.confirm',               // PNotify - confirmation notification extension
        'pnotify.nonblock': 'lib/pnotify/pnotify.nonblock',             // PNotify - notification non-block extension (hover effect)
        'pnotify.desktop': 'lib/pnotify/pnotify.desktop',               // PNotify - desktop push notification extension
        'pnotify.history': 'lib/pnotify/pnotify.history',               // PNotify - history push notification history extension
        'pnotify.callbacks': 'lib/pnotify/pnotify.callbacks',           // PNotify - callbacks push notification extension
        'pnotify.reference': 'lib/pnotify/pnotify.reference'            // PNotify - reference push notification extension
    },
    shim: {
        bootstrap: {
            deps: ['jquery']
        },
        farahey: {
            deps: ['jsPlumb']
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
            deps: ['jquery', 'mousewheel']
        },
        'datatables.loader': {
            deps: ['jquery']
        },
        'datatables.net': {
            deps: ['jquery']
        },
        'datatables.net-buttons': {
            deps: ['datatables.net']
        },
        'datatables.net-buttons-html': {
            deps: ['datatables.net-buttons']
        },
        'datatables.net-responsive': {
            deps: ['datatables.net']
        },
        'datatables.net-select': {
            deps: ['datatables.net']
        },
        'datatables.plugins.render.ellipsis': {
            deps: ['datatables.net']
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
            exports: 'Morris',
            init: function ($, Raphael) {
                window.Raphael = Raphael;
            }
        },
        pnotify: {
            deps: ['jquery']
        },
        easyPieChart: {
            deps: ['jquery']
        },
        peityInlineChart: {
            deps: ['jquery']
        },
        dragToSelect: {
            deps: ['jquery']
        },
        hoverIntent: {
            deps: ['jquery']
        },
        select2: {
            deps: ['jquery', 'mousewheel'],
            exports: 'Select2'
        },
        validator: {
            deps: ['jquery', 'bootstrap']
        },
        lazylinepainter: {
            deps: ['jquery', 'bootstrap']
        },
        blueImpGallery: {
            deps: ['jquery']
        },
        bootstrapConfirmation: {
            deps: ['bootstrap']
        },
        bootstrapToggle: {
            deps: ['jquery']
        },
        lazyload: {
            deps: ['jquery']
        },
        summernote: {
            deps: ['jquery']
        }
    }
});

// switch baseUrl to js "build_js" in production environment
// this has no effect for js build process!
// check build.js for build configuration
require.config({
    baseUrl: jsBaseUrl
});

// load the main app module -> initial app start
requirejs( [mainScriptPath] );

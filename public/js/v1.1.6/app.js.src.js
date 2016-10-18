// main script path
var mainScriptPath = document.body.getAttribute('data-script');

// js baseURL. Depends on the environment.
// e.g. use raw files (develop) or build files (production)
var jsBaseUrl = document.body.getAttribute('data-js-path');

// requireJs configuration
requirejs.config({
    baseUrl: 'js',                                                      // path for baseUrl - dynamically set !below! ("build_js" | "js")

    paths: {
        layout: 'layout',
        config: 'app/config',                                           // path for "configuration" files dir
        dialog: 'app/ui/dialog',                                        // path for "dialog" files dir
        templates: '../../templates',                                   // template dir
        img: '../../img',                                               // images dir

        // main views
        login: './app/login',                                           // initial start "login page" view
        mappage: './app/mappage',                                       // initial start "map page" view
        setup: './app/setup',                                           // initial start "setup page" view

        jquery: 'lib/jquery-3.0.0.min',                                 // v3.0.0 jQuery
        bootstrap: 'lib/bootstrap.min',                                 // v3.3.0 Bootstrap js code - http://getbootstrap.com/javascript
        text: 'lib/requirejs/text',                                     // v2.0.12 A RequireJS/AMD loader plugin for loading text resources.
        mustache: 'lib/mustache.min',                                   // v1.0.0 Javascript template engine - http://mustache.github.io
        localForage: 'lib/localforage.min',                             // v1.4.2 localStorage library - https://mozilla.github.io/localForage
        velocity: 'lib/velocity.min',                                   // v1.2.2 animation engine - http://julian.com/research/velocity
        velocityUI: 'lib/velocity.ui.min',                              // v5.0.4 plugin for velocity - http://julian.com/research/velocity/#uiPack
        slidebars: 'lib/slidebars',                                     // v0.10 Slidebars - side menu plugin http://plugins.adchsm.me/slidebars
        jsPlumb: 'lib/dom.jsPlumb-1.7.6',                               // v1.7.6 jsPlumb (Vanilla)- main map draw plugin https://jsplumbtoolkit.com
        farahey: 'lib/farahey-0.5',                                     // v0.5 jsPlumb "magnetizing" extension - https://github.com/jsplumb/farahey
        customScrollbar: 'lib/jquery.mCustomScrollbar.min',             // v3.1.3 Custom scroll bars - http://manos.malihu.gr
        mousewheel: 'lib/jquery.mousewheel.min',                        // v3.1.13 Mousewheel - https://github.com/jquery/jquery-mousewheel
        xEditable: 'lib/bootstrap-editable.min',                        // v1.5.1 X-editable - in placed editing
        morris: 'lib/morris.min',                                       // v0.5.1 Morris.js - graphs and charts
        raphael: 'lib/raphael-min',                                     // v2.1.2 Raphaël - required for morris (dependency)
        bootbox: 'lib/bootbox.min',                                     // v4.4.0 Bootbox.js - custom dialogs - http://bootboxjs.com
        easyPieChart: 'lib/jquery.easypiechart.min',                    // v2.1.6 Easy Pie Chart - HTML 5 pie charts - http://rendro.github.io/easy-pie-chart
        peityInlineChart: 'lib/jquery.peity.min',                       // v3.2.0 Inline Chart - http://benpickles.github.io/peity/
        dragToSelect: 'lib/jquery.dragToSelect',                        // v1.1 Drag to Select - http://andreaslagerkvist.com/jquery/drag-to-select
        hoverIntent: 'lib/jquery.hoverIntent.minified',                 // v1.8.0 Hover intention - http://cherne.net/brian/resources/jquery.hoverIntent.html
        fullScreen: 'lib/jquery.fullscreen.min',                        // v0.6.0 Full screen mode - https://github.com/private-face/jquery.fullscreen
        select2: 'lib/select2.min',                                     // v4.0.3 Drop Down customization - https://select2.github.io
        validator: 'lib/validator.min',                                 // v0.10.1 Validator for Bootstrap 3 - https://github.com/1000hz/bootstrap-validator
        lazylinepainter: 'lib/jquery.lazylinepainter-1.5.1.min',        // v1.5.1 SVG line animation plugin - http://lazylinepainter.info
        blueImpGallery: 'lib/blueimp-gallery',                          // v2.21.3 Image Gallery - https://github.com/blueimp/Gallery
        blueImpGalleryHelper: 'lib/blueimp-helper',                     // helper function for Blue Imp Gallery
        blueImpGalleryBootstrap: 'lib/bootstrap-image-gallery',         // v3.4.2 Bootstrap extension for Blue Imp Gallery - https://blueimp.github.io/Bootstrap-Image-Gallery
        bootstrapConfirmation: 'lib/bootstrap-confirmation',            // v1.0.1 Bootstrap extension for inline confirm dialog - https://github.com/tavicu/bs-confirmation
        bootstrapToggle: 'lib/bootstrap2-toggle.min',                   // v2.2.0 Bootstrap Toggle (Checkbox) - http://www.bootstraptoggle.com
        lazyload: 'lib/jquery.lazyload.min',                            // v1.9.5 LazyLoader images - http://www.appelsiini.net/projects/lazyload

        // header animation
        easePack: 'lib/EasePack.min',
        tweenLite: 'lib/TweenLite.min',

        // datatables                                                   // v1.10.12 DataTables - https://datatables.net
        'datatables.net': 'lib/datatables/DataTables-1.10.12/js/jquery.dataTables.min',
        'datatables.net-buttons': 'lib/datatables/Buttons-1.2.1/js/dataTables.buttons.min',
        'datatables.net-buttons-html': 'lib/datatables/Buttons-1.2.1/js/buttons.html5.min',
        'datatables.net-responsive': 'lib/datatables/Responsive-2.1.0/js/dataTables.responsive.min',
        'datatables.net-select': 'lib/datatables/Select-1.2.0/js/dataTables.select.min',

        // notification plugin
        pnotify: 'lib/pnotify/pnotify',                                 // v3.0.0 PNotify - notification core file - https://sciactive.com/pnotify/
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
        peityInlineChart: {
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
        },
        lazylinepainter: {
            deps : ['jquery', 'bootstrap']
        },
        blueImpGallery: {
            deps : ['jquery']
        },
        bootstrapConfirmation: {
            deps : ['bootstrap']
        },
        bootstrapToggle: {
            deps : ['jquery']
        },
        lazyload: {
            deps : ['jquery']
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

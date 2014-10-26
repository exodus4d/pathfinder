
requirejs.config({
    "baseUrl": "js", // user build_js files, change to "js" for un-compressed source
    "paths": {
        //"lib": "lib",
       // "app": "app",
        "layout": "layout",
        "jquery": "lib/jquery-1.11.1.min",
        //"jquery": "lib/jquery-2.1.1.min",
        "jqueryUI": "lib/jquery-ui.min",
        "bootstrap": "lib/bootstrap",
        "text": "lib/requirejs/text",
        "templates": "../templates",
        "jsPlumb": "lib/jsPlumb-1.6.4-min"
    },
    shim: {
        "bootstrap": {
            deps: ["jquery"]
        },
        "jqueryUI": {
            export:"$",
            deps: ["jquery"]
        }
    }
});

// Load the main app module to start the app
requirejs(["app/main"]);

({
    //The top level directory that contains your app. If this option is used
    //then it assumed your scripts are in a subdirectory under this path.
    //This option is not required. If it is not specified, then baseUrl
    //below is the anchor point for finding things. If this option is specified,
    //then all the files from the app directory will be copied to the dir:
    //output area, and baseUrl will assume to be a relative path under
    //this directory.
    appDir: "./js",

    //By default, all modules are located relative to this path. If baseUrl
    //is not explicitly set, then all modules are loaded relative to
    //the directory that holds the build file. If appDir is set, then
    //baseUrl should be specified as relative to the appDir.
    baseUrl: "./",

    //By default all the configuration for optimization happens from the command
    //line or by properties in the config file, and configuration that was
    //passed to requirejs as part of the app's runtime "main" JS file is *not*
    //considered. However, if you prefer the "main" JS file configuration
    //to be read for the build so that you do not have to duplicate the values
    //in a separate configuration, set this property to the location of that
    //main JS file. The first requirejs({}), require({}), requirejs.config({}),
    //or require.config({}) call found in that file will be used.
    //As of 2.1.10, mainConfigFile can be an array of values, with the last
    //value's config take precedence over previous values in the array.
    mainConfigFile: './js/app.js',

    //Specify modules to stub out in the optimized file. The optimizer will
    //use the source version of these modules for dependency tracing and for
    //plugin use, but when writing the text into an optimized bundle, these
    //modules will get the following text instead:
    //If the module is used as a plugin:
    //    define({load: function(id){throw new Error("Dynamic load not allowed: " + id);}});
    //If just a plain module:
    //    define({});
    //This is useful particularly for plugins that inline all their resources
    //and use the default module resolution behavior (do *not* implement the
    //normalize() method). In those cases, an AMD loader just needs to know
    //that the module has a definition. These small stubs can be used instead of
    //including the full source for a plugin.
    //stubModules: ['text'],

    //As of RequireJS 2.0.2, the dir above will be deleted before the
    //build starts again. If you have a big build and are not doing
    //source transforms with onBuildRead/onBuildWrite, then you can
    //set keepBuildDir to true to keep the previous dir. This allows for
    //faster rebuilds, but it could lead to unexpected errors if the
    //built code is transformed in some way.
    keepBuildDir: false,

    //Finds require() dependencies inside a require() or define call. By default
    //this value is false, because those resources should be considered dynamic/runtime
    //calls. However, for some optimization scenarios, it is desirable to
    //include them in the build.
    //Introduced in 1.0.3. Previous versions incorrectly found the nested calls
    //by default.
    findNestedDependencies: false,


    //Inlines the text for any text! dependencies, to avoid the separate
    //async XMLHttpRequest calls to load those dependencies.
    inlineText: false,

    //If set to true, any files that were combined into a build bundle will be
    //removed from the output folder.
    removeCombined: true,

    //List the modules that will be optimized. All their immediate and deep
    //dependencies will be included in the module's file when the build is
    //done. If that module or any of its dependencies includes i18n bundles,
    //only the root bundles will be included unless the locale: section is set above.
    modules: [
        //Just specifying a module name means that module will be converted into
        //a built file that contains all of its dependencies. If that module or any
        //of its dependencies includes i18n bundles, they may not be included in the
        //built file unless the locale: section is set above.
        {
            name: 'login',
            include: ['text'],
            excludeShallow: [
                'app'
            ]
        },{
            name: 'mappage',
            include: ['text'],
            excludeShallow: [
                'app'
            ]
        },{
            name: 'setup',
            excludeShallow: [
                'app'
            ]
        },{
            name: 'app/notification',
            excludeShallow: [
                'app',
                'jquery'
            ]
        }
    ],

    //By default, comments that have a license in them are preserved in the
    //output when a minifier is used in the "optimize" option.
    //However, for a larger built files there could be a lot of
    //comment files that may be better served by having a smaller comment
    //at the top of the file that points to the list of all the licenses.
    //This option will turn off the auto-preservation, but you will need
    //work out how best to surface the license information.
    //NOTE: As of 2.1.7, if using xpcshell to run the optimizer, it cannot
    //parse out comments since its native Reflect parser is used, and does
    //not have the same comments option support as esprima.
    preserveLicenseComments: false, // not working with "generate source maps" :(

    //Introduced in 2.1.2 and considered experimental.
    //If the minifier specified in the "optimize" option supports generating
    //source maps for the minified code, then generate them. The source maps
    //generated only translate minified JS to non-minified JS, it does not do
    //anything magical for translating minified JS to transpiled source code.
    //Currently only optimize: "uglify2" is supported when running in node or
    //rhino, and if running in rhino, "closure" with a closure compiler jar
    //build after r1592 (20111114 release).
    //The source files will show up in a browser developer tool that supports
    //source maps as ".js.src" files.
    generateSourceMaps: true,

    //Sets the logging level. It is a number. If you want "silent" running,
    //set logLevel to 4. From the logger.js file:
    //TRACE: 0,
    //INFO: 1,
    //WARN: 2,
    //ERROR: 3,
    //SILENT: 4
    //Default is 0.
    logLevel: 0,

    //How to optimize all the JS files in the build output directory.
    //Right now only the following values
    //are supported:
    //- "uglify": (default) uses UglifyJS to minify the code.
    //- "uglify2": in version 2.1.2+. Uses UglifyJS2.
    //- "closure": uses Google's Closure Compiler in simple optimization
    //mode to minify the code. Only available if running the optimizer using
    //Java.
    //- "closure.keepLines": Same as closure option, but keeps line returns
    //in the minified files.
    //- "none": no minification will be done.
    optimize: 'uglify2',

    //Introduced in 2.1.2: If using "dir" for an output directory, normally the
    //optimize setting is used to optimize the build bundles (the "modules"
    //section of the config) and any other JS file in the directory. However, if
    //the non-build bundle JS files will not be loaded after a build, you can
    //skip the optimization of those files, to speed up builds. Set this value
    //to true if you want to skip optimizing those other non-build bundle JS
    //files.
    //skipDirOptimize: true,

    //If using UglifyJS2 for script optimization, these config options can be
    //used to pass configuration values to UglifyJS2.
    //For possible `output` values see:
    //https://github.com/mishoo/UglifyJS2#beautifier-options
    //For possible `compress` values see:
    //https://github.com/mishoo/UglifyJS2#compressor-options
    uglify2: {
        //Example of a specialized config. If you are fine
        //with the default options, no need to specify
        //any of these properties.
        output: {
            beautify: false,
            comments: false
        },
        compress: {
            sequences: false,
            drop_console: true,
            global_defs: {
                DEBUG: false
            }
        },
        warnings: false,
        mangle: true
    },

    //A function that will be called for every write to an optimized bundle
    //of modules. This allows transforms of the content before serialization.
    onBuildWrite: function (moduleName, path, contents) {

        // show module names for each file
        if(moduleName === 'mappage'){
            // perform transformations on the original source
            contents = contents.replace( /#version/i, new Date().toString() );
        }

        return contents;
    },

    paths: {
        app: "./../js/app" // the main config file will not be build
    },

    //The directory path to save the output. If not specified, then
    //the path will default to be a directory called "build" as a sibling
    //to the build file. All relative paths are relative to the build file.
    dir: "./build_js"



})
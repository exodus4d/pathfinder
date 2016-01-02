/* GULP itself */
var gulp = require('gulp-param')(require('gulp'), process.argv);
var jshint = require('gulp-jshint');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var gzip   = require('gulp-gzip');
var gulpif = require('gulp-if');
var clean = require('gulp-clean');
var critical = require('critical');

var runSequence = require('run-sequence');
var exec = require('child_process').exec;
var path = require('path');
var stylish = require('jshint-stylish');

/*******************************************/
// Source and destination file paths

var _src = {
    GULP: './gulpfile.js',
    ICON: './public/img/notifications/logo.png',
    JS_SRC: './js/**/*',
    JS_LIBS: './js/lib/**/*',
    JS_BUILD: './build_js',
    JS_DIST: './public/js',
    CSS_SRC: './public/css/*.css',
    CSS_DIST: './public/css',
    PACKAGE: './package.json',
    CACHE: './tmp/**/*.*'
};

// Gulp plumber error handler
var onError = function(err) {
    'use strict';

    console.log(err);
};

/*******************************************/
// Build Configuration

var isProductionBuild = false;
/**
 * Version nr (e.g. v0.0.4)
 * required for "production" task
 * @type {null}
 */
var tagVersion = null;

/**
 * RequireJS build task using the r.js optimizer.
 */
gulp.task('requirejs', ['jshint'], function() {
    'use strict';

    var rjsPath = path.resolve(__dirname, './node_modules/requirejs/bin/r.js');
    var oPath = path.resolve(__dirname, './build.js');

    exec('node ' + rjsPath + ' -o ' + oPath, function(error, stdout, stderr) {
        var success = true;
        console.log('[RequireJS]', stderr);

        if (error !== null) {
            console.log('[RequireJS]', error);
            success = false;
        }

        runSequence(
            'copyJSBuildFiles',
            'removeBuildFiles',
            'gzipJS'
        );
    });
});

/*******************************************/
/**
 * JSHint JavaScript and JSON
 * see .jshintrc for configuration
 * http://jshint.com/docs/
 * http://jshint.com/docs/options/
 */
gulp.task('jshint', function(){
    'use strict';

    return gulp.src([
        _src.JS_SRC,
        '!' + _src.JS_LIBS
        ])
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(jshint())
        .pipe(jshint.reporter(stylish))
        .pipe(notify({
                icon: path.resolve(__dirname, _src.ICON),
                title: 'JSHint',
                message: 'Task complete',
                onLast: true
        }));
    // .pipe(jshint.reporter('fail')); // uncomment this line to stop build on error
});

/**
 * Copy optimized/uglyfied js files from "js_build" folder to "public/js/x.x.x/*" folder
 * for release deployment (cache busting)
 */
gulp.task('copyJSBuildFiles', ['removeDistFiles'], function () {
    'use strict';

    // raw files
    var source = _src.JS_SRC;

    if(isProductionBuild){
        // build files
        source = _src.JS_BUILD + '/**/*';
    }

    return gulp
        .src( source  )
        .pipe(
        gulpif(
            tagVersion !== null,
            gulp.dest( _src.JS_DIST + '/' + tagVersion  )
        )
    ).pipe(notify({
        icon: path.resolve(__dirname, _src.ICON),
        title: 'Copy JS to dist',
        message: 'Task complete',
        onLast: true
    }));
});

/**
 * task removes temp build js files
 */
gulp.task('removeBuildFiles', function () {
    'use strict';
    return gulp.src( _src.JS_BUILD ).pipe( clean( _src.JS_BUILD ) );
});

/**
 * task removes "dist" js files
 */
gulp.task('removeDistFiles', function () {
    'use strict';
    var dist = _src.JS_DIST + '/' + tagVersion;

    return gulp.src(dist).pipe( clean(dist) );
});

/**
 * create *.gz version from minimized *.css
 */
gulp.task('gzipCSS', function() {
    'use strict';

    return gulp.src(_src.CSS_SRC)
        .pipe(gzip({
            gzipOptions: { level: 8 }
        }))
        .pipe(gulp.dest(_src.CSS_DIST));
});

/**
 * create *.gz version from minimized *.js
 */
gulp.task('gzipJS', function() {
    'use strict';

    return gulp.src(_src.JS_DIST + '/' + tagVersion + '/**/*.js')
        .pipe(gzip({
            gzipOptions: { level: 8 }
        }))
        .pipe(gulp.dest(_src.JS_DIST + '/' + tagVersion));
});

/*******************************************/
// Watch
// execute only during continuous development!
gulp.task('watchJSFiles', function(tag) {
    'use strict';

    if(tag){
        tagVersion = tag;
    }

    gulp.watch([
        _src.JS_SRC,
        '!' + _src.JS_LIBS,
    ], ['jshint', 'copyJSBuildFiles']);
});

gulp.task('watchCSSFiles', function(tag) {
    'use strict';

    if(tag){
        tagVersion = tag;
    }

    gulp.watch([
        _src.CSS_SRC,
    ], ['gzipCSS']);
});

/*******************************************/
// Default Tasks

/**
 * Production task for deployment.
 * $ gulp production --tag v0.0.9
 * WARNING: DO NOT REMOVE THIS TASK!!!
 */
gulp.task('production', function(tag) {
    'use strict';

    if(tag !== null){
        tagVersion = tag;
        isProductionBuild = true;

        // use run-sequence until gulp v4.0 is released
        runSequence(
            'gzipCSS',
            'requirejs'
        );
    }
});

/**
 * Default task for continuous development.
 * $ gulp default --tag v0.0.9
 * WARNING: DO NOT REMOVE THIS TASK!!!
 */
gulp.task('default', function(tag) {
    'use strict';

    if(tag){
        tagVersion = tag;
    }

    runSequence(
        'gzipCSS',
        'jshint',
        'copyJSBuildFiles',
        'watchJSFiles',
        'watchCSSFiles'
    );
});

/*
// This removes all CSS styles "above the fold" from *.css and inlines them
// -> to improve pagespeed. The remaining (main) css file will be lazy loaded afterwards...
// https://github.com/addyosmani/critical
gulp.task('critical', function (cb) {
    critical.generate({
        inline: true,
        base: './',
        src: './public/templates/view/index.html',
        dest: './public/templates/view/index-critical.html',
        extract: true,
        minify: true,
        width: 2560,
        height: 1440
    });
});
*/


/**
 * clear all backend (fat free framework) cache files
 */
gulp.task('clearCache', function() {
    'use strict';
    return gulp.src( _src.CACHE ).pipe( clean() );
});
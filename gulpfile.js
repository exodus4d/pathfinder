/* GULP itself */
var gulp = require('gulp-param')(require('gulp'), process.argv);
var jshint = require('gulp-jshint');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var gulpif = require('gulp-if');
var clean = require('gulp-clean');

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
    PACKAGE: './package.json'
};

// Gulp plumber error handler
var onError = function(err) {
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
            'copyBuildFiles',
            'removeBuildFiles'
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
gulp.task('copyBuildFiles', ['removeDistFiles'], function () {

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

/*******************************************/
// Watch
// execute only during continuous development!
gulp.task('watch', function(tag) {

    if(tag){
        tagVersion = tag;
    }

    gulp.watch([
        _src.JS_SRC,
        '!' + _src.JS_LIBS,
    ], ['jshint', 'copyBuildFiles']);


});


/*******************************************/
// Default Tasks

/**
 * Production task for deployment.
 * Triggered by Maven Plugin.
 * $ gulp production --tag v0.0.9
 * WARNING: DO NOT REMOVE THIS TASK!!!
 */
gulp.task('production', function(tag) {

    if(tag !== null){
        tagVersion = tag;
        isProductionBuild = true;

        // use run-sequence until gulp v4.0 is released
        runSequence(
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

    if(tag){
        tagVersion = tag;
    }

    runSequence(
        'jshint',
        'copyBuildFiles',
        'watch'
    );
});
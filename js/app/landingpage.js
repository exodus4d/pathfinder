/**
 * Main landingPage application
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'blueImpGallery',
    'blueImpGalleryBootstrap',
    'app/ui/header',
    'app/ui/logo',
    'app/ui/demo_map',
    'dialog/settings',
], function($, Init, Util, Gallery) {

    'use strict';

    var config = {
        // header
        splashOverlayClass: 'pf-splash',                                        // class for "splash" overlay
        headerContainerId: 'pf-header-container',                               // id for header container
        logoContainerId: 'pf-logo-container',                                   // id for main header logo container
        headHeaderMapId: 'pf-header-map',                                       // id for header image (svg animation)

        // navigation
        navigationElementId: 'pf-navbar',                                       // id for navbar element

        // login form
        loginFormId: 'pf-login-form',                                           // id for login form
        loginButtonClass: 'pf-login-button',                                    // class for "login" button(s)
        registerButtonClass: 'pf-register-button',                              // class for "register" button(s)
        loginMessageContainerId: 'pf-login-message-container',                  // id for login form message container

        // gallery
        galleryId: 'pf-gallery',                                                // id for gallery container
        galleryThumbContainerId: 'pf-landing-gallery-thumb-container'           // id for gallery thumb images
    };


    var setPageObserver = function(){


        // login form =====================================================================================
        // register buttons ---------------------------------------------
        $('.' + config.registerButtonClass).on('click', function(e){
            e.preventDefault();

            // show register/settings dialog
            $.fn.showSettingsDialog(true);
        });


        // login buttons ------------------------------------------------
        $('.' + config.loginButtonClass).on('click', function(e){
            e.preventDefault();

            var loginForm = $('#' + config.loginFormId);
            var loginFormMessageContainer = $('#' + config.loginMessageContainerId);

            // validate form
            loginForm.validator('validate');

            // check weather the form is valid
            var formValid = loginForm.isValidForm();

            if(formValid === true){

                // show splash overlay
                $('.' + config.splashOverlayClass).showSplashOverlay(function(){

                    var loginData = {loginData: loginForm.getFormValues()};

                    $.ajax({
                        type: 'POST',
                        url: Init.path.logIn,
                        data: loginData,
                        dataType: 'json'
                    }).done(function(data){

                        // login error
                        if(data.error !== undefined){
                            $('.' + config.splashOverlayClass).hideSplashOverlay();
                            loginFormMessageContainer.showMessage({title: 'Login failed', text: ' please try again', type: 'error'});

                        }else if(data.reroute !== undefined){
                            window.location = Util.buildUrl(data.reroute);
                        }
                    }).fail(function( jqXHR, status, error) {
                        $('.' + config.splashOverlayClass).hideSplashOverlay();

                        var reason = status + ' ' + error;
                        Util.showNotify({title: jqXHR.status + ': login', text: reason, type: 'error'});

                        // show Form message
                        loginFormMessageContainer.showMessage({title: 'Login failed', text: ' internal server error', type: 'error'});
                    });


                });


            }

        });

        // tooltips --------------------------------------------------
        var mapTooltipOptions = {
            toggle: 'tooltip',
            placement: 'top',
            container: 'body',
            delay: 150
        };

        $('[title]').tooltip(mapTooltipOptions);

    };

    // =============================================================================================

    /**
     * init image gallery
     */
    var initGallery = function(){

        // thumb links
        var thumbLinks = $('#' + config.galleryThumbContainerId + ' a');

      //  requirejs(['blueImpGalleryBootstrap'], function() {
            var borderless = false;

            var galleryElement = $('#' + config.galleryId);
            galleryElement.data('useBootstrapModal', !borderless);
            galleryElement.toggleClass('blueimp-gallery-controls', borderless);

            // init gallery on click
            thumbLinks.on('click', function(e){
                e.preventDefault();

                e = e || window.event;
                var target = e.target || e.srcElement;
                var link = target.src ? target.parentNode : target;

                var options = {
                    index: link,
                    event: e,
                    container: '#' + config.galleryId
                };


                Gallery(thumbLinks, options);
            });


            // show gallery thumb images
            showGallery();
      //  });
    };

    /**
     * show gallery thumb images
     */
    var showGallery = function(){
        // thumb links
        var thumbLinks = $('#' + config.galleryThumbContainerId + ' a');

        // show thumbs
        thumbLinks.velocity('transition.slideRightBigIn', {
            duration: 1200,
            stagger: 120,
            //delay: 2000,
            visibility: 'visible'

        });
    };

    /**
     * init scrollspy for navigation bar
     */
    var initScrollspy = function(){
        // init scrollspy
        $('body').scrollspy({ target: '#' + config.navigationElementId });

        $('#' + config.navigationElementId).on('activate.bs.scrollspy', function (e) {

            var ancorTag = $(e.target).find('a').attr('href');
           console.log(ancorTag);
        });
    };

    // document ready
    $(function(){

        // init scrollspy
        initScrollspy();

        // hide splash loading animation
        $('.' + config.splashOverlayClass).hideSplashOverlay();

        // init gallery
        initGallery();

        // show logo
        $('#' + config.logoContainerId).drawLogo(function(){

            // init header animation
            $('#' + config.headerContainerId).initHeader(function(){
                // draw demo map
                $('#' + config.headHeaderMapId).drawDemoMap();


            });
        }, false);

        setPageObserver();

    });

});
/**
 * Main loginPage application
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'app/ccp',
    'blueImpGallery',
    'bootbox',
    'lazyload',
    'app/ui/header',
    'app/ui/logo',
    'app/ui/demo_map',
    'dialog/account_settings',
    'dialog/notification',
    'dialog/manual',
    'dialog/releases',
    'dialog/credit'
], function($, Init, Util, Render, CCP, Gallery, bootbox) {

    'use strict';

    var config = {
        splashOverlayClass: 'pf-splash',                                        // class for "splash" overlay

        // header
        headerContainerId: 'pf-header-container',                               // id for header container
        logoContainerId: 'pf-logo-container',                                   // id for main header logo container
        headHeaderMapId: 'pf-header-map',                                       // id for header image (svg animation)

        // map bg
        headMapBgId: 'pf-header-map-bg',                                        // id for header background container
        mapNeocomId: 'pf-map-neocom',                                           // id for map "neocom" image
        mapBrowserId: 'pf-map-browser',                                         // id for "browser" image
        mapBgImageId: 'pf-map-bg-image',                                        // id for "background" map image

        // navigation
        navigationElementId: 'pf-navbar',                                       // id for navbar element
        navigationLinkManualClass: 'pf-navbar-manual',                          // class for "manual" trigger link
        navigationLinkLicenseClass: 'pf-navbar-license',                        // class for "license" trigger link
        navigationVersionLinkClass: 'pf-navbar-version-info',                   // class for "version information"

        // login form
        loginFormId: 'pf-login-form',                                           // id for login form
        loginButtonClass: 'pf-login-button',                                    // class for "login" button(s)
        registerButtonClass: 'pf-register-button',                              // class for "register" button(s)
        loginMessageContainerId: 'pf-login-message-container',                  // id for login form message container

        // gallery
        galleryId: 'pf-gallery',                                                // id for gallery container
        galleryThumbImageClass: 'pf-landing-image-preview',                     // class for gallery thumb images
        galleryThumbContainerId: 'pf-landing-gallery-thumb-container',          // id for gallery thumb images
        galleryCarouselId: 'pf-landing-gallery-carousel',                       // id for "carousel" element

        // animation
        animateElementClass: 'pf-animate-on-visible'                            // class for elements that will be animated to show
    };


    /**
     * set page observer
     */
    var setPageObserver = function(){

        // login form =====================================================================================
        // register buttons ---------------------------------------------
        $('.' + config.registerButtonClass).on('click', function(e){
            e.preventDefault();

            // logout current user (if there e.g. to register a second account)
            Util.logout({
                ajaxData: {
                    reroute: 0
                }
            });

            // show register/settings dialog
            $.fn.showSettingsDialog({
                register: 1,
                invite : parseInt( $('body').data('invite') )
            });
        });

        // login buttons ------------------------------------------------
        var loginForm = $('#' + config.loginFormId);

        loginForm.on('submit', function(e){
            e.preventDefault();

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
                            loginFormMessageContainer.showMessage({title: 'Login failed', text: ' Invalid username or password', type: 'error'});

                        }else if(data.reroute !== undefined){
                            window.location = data.reroute;
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

        // releases -----------------------------------------------------
        $('.' + config.navigationVersionLinkClass).on('click', function(e){
            $.fn.releasesDialog();
        });

        // manual -------------------------------------------------------
        $('.' + config.navigationLinkManualClass).on('click', function(e){
            e.preventDefault();
            $.fn.showMapManual();
        });

        // license ------------------------------------------------------
        $('.' + config.navigationLinkLicenseClass).on('click', function(e){
            e.preventDefault();
            $.fn.showCreditsDialog(false, true);
        });

        // tooltips -----------------------------------------------------
        var mapTooltipOptions = {
            toggle: 'tooltip',
            container: 'body',
            delay: 150
        };

        $('[title]').not('.slide img').tooltip(mapTooltipOptions);
    };

    /**
     * show "registration key" dialog (see "Invite" feature)
     */
    var showRequestRegistrationKeyDialog = function(){
        var data = {
            id: config.signatureReaderDialogId,
            formErrorContainerClass: Util.config.formErrorContainerClass,
            formWarningContainerClass: Util.config.formWarningContainerClass
        };

        requirejs(['text!templates/dialog/registration.html', 'mustache'], function(template, Mustache) {

            var content = Mustache.render(template, data);

            var registrationKeyDialog = bootbox.dialog({
                title: 'Registration Key',
                message: content,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    success: {
                        label: '<i class="fa fa-envelope fa-fw"></i>&nbsp;send',
                        className: 'btn-success',
                        callback: function () {
                            var dialogElement = $(this);
                            var form = dialogElement.find('form');

                            // validate form
                            form.validator('validate');
                            var formValid = form.isValidForm();

                            if(formValid){
                                var formValues = form.getFormValues();

                                if( !$.isEmptyObject(formValues) ){

                                    // send Tab data and store values
                                    var requestData = {
                                        settingsData: formValues
                                    };

                                    var modalContent = registrationKeyDialog.find('.modal-content');
                                    modalContent.showLoadingAnimation();

                                    $.ajax({
                                        type: 'POST',
                                        url: Init.path.sendInviteKey,
                                        data: requestData,
                                        dataType: 'json'
                                    }).done(function(responseData){

                                        if(
                                            responseData.error &&
                                            responseData.error.length > 0
                                        ){
                                            form.showFormMessage(responseData.error);


                                        }else{
                                            $('.modal').modal('hide');
                                            Util.showNotify({title: 'Registration Key send', text: 'Check your Mails', type: 'success'});
                                        }

                                        modalContent.hideLoadingAnimation();
                                    }).fail(function( jqXHR, status, error) {
                                        modalContent.hideLoadingAnimation();

                                        var reason = status + ' ' + error;
                                        Util.showNotify({title: jqXHR.status + ': send Registration Key', text: reason, type: 'error'});
                                    });

                                }
                            }

                            return false;
                        }
                    }
                }
            });
        });
    };


    /**
     * init image carousel
     */
    var initCarousel = function(){

        // check if carousel exists (e.g. not in IGB browser
        if($('#' + config.galleryCarouselId).length === 0){
            return;
        }

        // extent "blueimp" gallery for a textFactory method to show HTML templates
        Gallery.prototype.textFactory = function (obj, callback) {
            var newSlideContent = $('<div>')
                .addClass('text-content')
                .attr('title', obj.title);

            var moduleConfig = {
                name: obj.href, // template name
                position: newSlideContent,
                functions: {
                    after: function(){
                        // element inserted -> load complete
                        callback({
                            type: 'complete',
                            target: newSlideContent[0]
                        });
                    }
                }
            };

            // render HTML file (template)
            var moduleData = {
                id: config.headHeaderMapId,
                bgId: config.headMapBgId,
                neocomId: config.mapNeocomId,
                browserId: config.mapBrowserId,
                mapBgImageId: config.mapBgImageId
            };

            Render.showModule(moduleConfig, moduleData);

            return newSlideContent[0];
        };

        // initialize carousel ------------------------------------------
        var carousel = new Gallery([
            {
                title: 'IGB',
                href: 'ui/map',
                type: 'text/html'
            },
            {
                href: 'public/img/landing/responsive.jpg',
                title: 'Responsive layout',
                type: 'image/jpg',
                thumbnail: ''
            },
            {
                href: 'public/img/landing/pathfinder_1.jpg',
                title: 'Map view',
                type: 'image/jpg',
                thumbnail: ''
            },
            {
                href: 'public/img/landing/pathfinder_3.jpg',
                title: 'Map information',
                type: 'image/jpg',
                thumbnail: ''
            },
            {
                href: 'public/img/landing/pathfinder_2.jpg',
                title: 'System information',
                type: 'image/jpg',
                thumbnail: ''
            }
        ], {
            container: '#' + config.galleryCarouselId,
            carousel: true,
            startSlideshow: false,
            titleProperty: 'title',
            transitionSpeed: 600,
            slideshowInterval: 5000,
            onopened: function () {
                // Callback function executed when the Gallery has been initialized
                // and the initialization transition has been completed.
                // -> show "demo" map

                $('#' + config.headHeaderMapId).drawDemoMap(function(){

                    // zoom map SVGs
                    $('#' + config.headHeaderMapId + ' svg').velocity({
                        scaleX: 0.66,
                        scaleY: 0.66
                    }, {
                        duration: 360
                    });

                    // position map container
                    $('#' + config.headHeaderMapId).velocity({
                        marginTop: '130px',
                        marginLeft: '-50px'
                    }, {
                        duration: 360,
                        complete: function(){
                            // show browser
                            $('#' +  config.mapBrowserId).velocity('transition.slideUpBigIn', {
                                duration: 360,
                                complete: function(){
                                    // show neocom
                                    $('#' +  config.mapNeocomId).velocity('transition.slideLeftIn', {
                                        duration: 180
                                    });

                                    // show background
                                    $('#' +  config.mapBgImageId).velocity('transition.shrinkIn', {
                                        duration: 360
                                    });

                                    // when map is shown -> start carousel looping
                                    carousel.play();
                                }
                            });
                        }
                    });
                });

            }
        });
    };

    /**
     * init image gallery
     */
    var initGallery = function(){

        requirejs(['blueImpGalleryBootstrap'], function() {
            // thumb links
            var thumbLinks = $('a[data-gallery="#pf-gallery"]');

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
                    container: '#' + config.galleryId,
                    titleProperty: 'description'
                };

                new Gallery(thumbLinks, options);
            });
        });
    };

    var initYoutube = function(){

        $(".youtube").each(function() {
            // Based on the YouTube ID, we can easily find the thumbnail image
            $(this).css('background-image', 'url(https://i.ytimg.com/vi/' + this.id + '/sddefault.jpg)');

            // Overlay the Play icon to make it look like a video player
            $(this).append($('<div/>', {'class': 'play'}));

            $(document).delegate('#'+this.id, 'click', function() {
                // Create an iFrame with autoplay set to true
                var iframe_url = "https://www.youtube.com/embed/" + this.id + "?autoplay=1&autohide=1";
                if ($(this).data('params')) iframe_url+='&'+$(this).data('params');

                // The height and width of the iFrame should be the same as parent
                var iframe = $('<iframe/>', {
                    frameborder: '0',
                    src: iframe_url,
                    width: $(this).width(),
                    height: $(this).height(),
                    class: 'pricing-big'
                });

                // Replace the YouTube thumbnail with YouTube HTML5 Player
                $(this).replaceWith(iframe);
            });
        });
    };


    /**
     * init scrollspy for navigation bar
     */
    var initScrollspy = function(){
        // init scrollspy

        // show elements that are currently in the viewport
        var showVisibleElements = function(){
            // find all elements that should be animated
            var visibleElements = $('.' + config.animateElementClass).isInViewport();

            $(visibleElements).removeClass( config.animateElementClass );

            $(visibleElements).velocity('transition.flipXIn', {
                duration: 600,
                stagger: 60,
                delay: 500,
                complete: function(element){
                    $(element).find('.fade').addClass('in');
                },
                visibility: 'visible'
            });
        };

        $( window ).scroll(function() {
            // check for new visible elements
            showVisibleElements();
        });

        // initial check for visible elements
        showVisibleElements();

        // event listener for navigation links
        $('.page-scroll').on('click', function(){
            // get element to scroll
            var anchorTag = $(this).attr('data-anchor');

            // scroll to container
            $(anchorTag).velocity('scroll', {
                duration: 300,
                easing: 'swing'
            });
        });
    };

    /**
     * main init "landing" page
     */
    $(function(){

        // show app information in browser console
        Util.showVersionInfo();

        // show log off message
        var isLogOut = location.search.split('logout')[1];
        if(isLogOut !== undefined){

            // show logout dialog
            var options = {
                buttons: {
                    close: {
                        label: 'close',
                        className: ['btn-default'].join(' ')
                    }
                },
                content: {
                    icon: 'fa-sign-out',
                    class: 'txt-color-warning',
                    title: 'Logout',
                    headline: 'Logout',
                    text: [
                        'For security reasons, you were logged out automatically',
                        'Please log in again'
                    ]
                }
            };

            $.fn.showNotificationDialog(options);

            // change url (remove logout parameter)
            if (history.pushState) {
                history.pushState({}, '', location.protocol + '//' + location.host + location.pathname);
            }
        }

        // show get registration key dialog
        var showRegistrationDialog = location.search.split('register')[1];
        if(showRegistrationDialog !== undefined){
            showRequestRegistrationKeyDialog();
        }

        // init "lazy loading" for images
        $('.' + config.galleryThumbImageClass).lazyload({
            threshold : 300
        });

        // hide splash loading animation
        $('.' + config.splashOverlayClass).hideSplashOverlay();

        // init carousel
        initCarousel();

        // init scrollspy
        initScrollspy();

        // init gallery
        initGallery();

        // init youtube videos
        initYoutube();

        // show logo -> hide animation in IGB
        if( !CCP.isInGameBrowser() ){
            $('#' + config.logoContainerId).drawLogo(function(){

                // init header animation
                $('#' + config.headerContainerId).initHeader(function(){

                });
            }, false);
        }

        setPageObserver();

    });


});
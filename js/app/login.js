/**
 * Main loginPage application
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
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
], function($, Init, Util, Render, Gallery, bootbox) {

    'use strict';

    var config = {
        splashOverlayClass: 'pf-splash',                                        // class for "splash" overlay

        // header
        headerId: 'pf-landing-top',                                             // id for header
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

        // cookie hint
        cookieHintId: 'pf-cookie-hint',                                         // id for "cookie hint" element

        // character select
        characterSelectionClass: 'pf-character-selection',                      // class for character panel wrapper
        characterRowAnimateClass: 'pf-character-row-animate',                   // class for character panel row during animation
        characterImageWrapperClass: 'pf-character-image-wrapper',               // class for image wrapper (animated)
        characterImageInfoClass: 'pf-character-info',                           // class for character info layer (visible on hover)
        dynamicMessageContainerClass: 'pf-dynamic-message-container',           // class for "dynamic" (JS) message container

        // gallery
        galleryId: 'pf-gallery',                                                // id for gallery container
        galleryThumbImageClass: 'pf-landing-image-preview',                     // class for gallery thumb images
        galleryThumbContainerId: 'pf-landing-gallery-thumb-container',          // id for gallery thumb images
        galleryCarouselId: 'pf-landing-gallery-carousel',                       // id for "carousel" element

        // notification panel
        notificationPanelId: 'pf-notification-panel',                           // id for "notification panel" (e.g. last update information)

        // server panel
        serverPanelId: 'pf-server-panel',                                       // id for EVE Online server status panel

        // animation
        animateElementClass: 'pf-animate-on-visible'                            // class for elements that will be animated to show
    };

    /**
     * set a cookie
     * @param cname
     * @param cvalue
     * @param exdays
     */
    var setCookie = function(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = 'expires=' + d.toUTCString();
        var path = 'path=' + Util.getDocumentPath();
        document.cookie = cname + '=' + cvalue + '; ' + expires + '; ' + path;
    };

    /**
     * get cookie value by name
     * @param cname
     * @returns {*}
     */
    var getCookie = function(cname) {
        var name = cname + '=';
        var ca = document.cookie.split(';');

        for(var i = 0; i <ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }

            if (c.indexOf(name) === 0) {
                return c.substring(name.length,c.length);
            }
        }
        return '';
    };

    /**
     * set link observer for "version info" dialog
     */
    var setVersionLinkObserver = function(){
        $('.' + config.navigationVersionLinkClass).off('click').on('click', function(e){
            $.fn.releasesDialog();
        });
    };

    /**
     * set page observer
     */
    var setPageObserver = function(){

        // cookie hint --------------------------------------------------------
        if(getCookie('cookie') !== '1'){
            // hint not excepted
            $('#' + config.cookieHintId).collapse('show');
        }

        $('#' + config.cookieHintId + ' .btn-success').on('click', function(){
           setCookie('cookie', 1, 365);
        });

        // manual -------------------------------------------------------------
        $('.' + config.navigationLinkManualClass).on('click', function(e){
            e.preventDefault();
            $.fn.showMapManual();
        });

        // license ------------------------------------------------------------
        $('.' + config.navigationLinkLicenseClass).on('click', function(e){
            e.preventDefault();
            $.fn.showCreditsDialog(false, true);
        });

        // releases -----------------------------------------------------------
        setVersionLinkObserver();

        // tooltips -----------------------------------------------------------
        var mapTooltipOptions = {
            toggle: 'tooltip',
            container: 'body',
            delay: 150
        };

        $('[title]').not('.slide img').tooltip(mapTooltipOptions);
    };

    /**
     * init image carousel
     */
    var initCarousel = function(){

        // check if carousel exists
        if($('#' + config.galleryCarouselId).length === 0){
            return;
        }

        // extent "blueimp" gallery for a textFactory method to show HTML templates
        Gallery.prototype.textFactory = function (obj, callback) {
            var newSlideContent = $('<div>')
                .addClass('text-content')
                .attr('imgTitle', obj.title);

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

        // initialize carousel ------------------------------------------------
        var carousel = new Gallery([
            {
                imgTitle: 'Browser',
                href: 'ui/map',
                type: 'text/html'
            },
            {
                href: 'public/img/landing/responsive.jpg',
                imgTitle: 'Responsive layout',
                type: 'image/jpg',
                thumbnail: ''
            },
            {
                href: 'public/img/landing/pathfinder_1.jpg',
                imgTitle: 'Map view',
                type: 'image/jpg',
                thumbnail: ''
            },
            {
                href: 'public/img/landing/pathfinder_3.jpg',
                imgTitle: 'Map information',
                type: 'image/jpg',
                thumbnail: ''
            },
            {
                href: 'public/img/landing/pathfinder_2.jpg',
                imgTitle: 'System information',
                type: 'image/jpg',
                thumbnail: ''
            }
        ], {
            container: '#' + config.galleryCarouselId,
            carousel: true,
            startSlideshow: false,
            titleProperty: 'imgTitle',
            transitionSpeed: 600,
            slideshowInterval: 5000,
            onopened: function () {
                // Callback function executed when the Gallery has been initialized
                // and the initialization transition has been completed.
                // -> show "demo" map

                // set title for first slide
                $( this.options.container ).find(  this.options.titleElement).text('Browser view');

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
     * get all thumbnail elements
     * @returns {*|jQuery|HTMLElement}
     */
    var getThumbnailElements = function(){
        return $('a[data-gallery="#' + config.galleryId + '"]');
    };

    /**
     * init gallery for thumbnail elements
     * @param newElements
     */
    var initGallery = function(newElements){
        if( newElements.length > 0){
            // We have to add ALL thumbnail elements to the gallery!
            // -> even those wthat are invisible (not lazyLoaded) now!
            // -> This is required for "swipe" through all images
            var allThumbLinks = getThumbnailElements();

            requirejs(['blueImpGalleryBootstrap'], function() {
                $(newElements).each(function() {
                    var borderless = false;

                    var galleryElement = $('#' + config.galleryId);
                    galleryElement.data('useBootstrapModal', !borderless);
                    galleryElement.toggleClass('blueimp-gallery-controls', borderless);

                    $(this).on('click', function(e){
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

                        new Gallery(allThumbLinks, options);
                    });
                });
            });
        }
    };

    /**
     * init "YouTube" video preview
     */
    var initYoutube = function(){

        $('.youtube').each(function() {
            // Based on the YouTube ID, we can easily find the thumbnail image
            $(this).css('background-image', 'url(https://i.ytimg.com/vi/' + this.id + '/sddefault.jpg)');

            // Overlay the Play icon to make it look like a video player
            $(this).append($('<div/>', {'class': 'play'}));

            $(document).delegate('#' + this.id, 'click', function() {
                // Create an iFrame with autoplay set to true
                var iFrameUrl = 'https://www.youtube.com/embed/' + this.id + '?autoplay=1&autohide=1';
                if ( $(this).data('params') ){
                    iFrameUrl += '&'+$(this).data('params');
                }

                // The height and width of the iFrame should be the same as parent
                var iFrame = $('<iframe/>', {
                    frameborder: '0',
                    src: iFrameUrl,
                    width: $(this).width(),
                    height: $(this).height(),
                    class: 'pricing-big'
                });

                // Replace the YouTube thumbnail with YouTube HTML5 Player
                $(this).replaceWith(iFrame);
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
                    // show "fade" modules (e.g. ribbons)
                    $(element).find('.fade').addClass('in');

                    // init gallery for "now" visible elements
                    var newGalleryElements = $(element).filter('[data-gallery="#' + config.galleryId + '"]');
                    initGallery(newGalleryElements);
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
     * get current EVE-Online server status
     * -> show "server panel"
     */
    var initServerStatus = function(){
        $.ajax({
            type: 'POST',
            url: Init.path.getServerStatus,
            dataType: 'json'
        }).done(function(responseData, textStatus, request){

            if(responseData.hasOwnProperty('status')){
                var data = responseData.status;
                data.serverPanelId = config.serverPanelId;

                var statusClass = '';
                switch(data.serviceStatus.toLowerCase()){
                    case 'online': statusClass = 'txt-color-green'; break;
                    case 'vip': statusClass = 'txt-color-orange'; break;
                    case 'offline': statusClass = 'txt-color-redDarker'; break;
                }
                data.serviceStatus = {
                    eve: data.serviceStatus,
                    style: statusClass
                };

                requirejs(['text!templates/ui/server_panel.html', 'mustache'], function(template, Mustache) {
                    var content = Mustache.render(template, data);
                    $('#' + config.headerId).prepend(content);
                    $('#' + config.serverPanelId).velocity('transition.slideLeftBigIn', {
                        duration: 240
                    });
                });
            }

        }).fail(handleAjaxErrorResponse);
    };

    /**
     * show "notification panel" to user
     * -> checks if panel not already shown
     */
    var initNotificationPanel = function(){
        var storageKey = 'notification_panel';
        var currentVersion = $('body').data('version');

        var showNotificationPanel = function(){
            var data = {};

            requirejs(['text!templates/ui/notice.html', 'mustache'], function(template, Mustache) {
                var content = Mustache.render(template, data);

                var notificationPanel = $('#' + config.notificationPanelId);
                notificationPanel.html(content);
                notificationPanel.velocity('transition.slideUpIn', {
                    duration: 300,
                    complete: function(){
                        setVersionLinkObserver();

                        // mark panel as "shown"
                        Util.getLocalStorage().setItem(storageKey, currentVersion);
                    }
                });
            });
        };

        Util.getLocalStorage().getItem(storageKey).then(function(data){
            // check if panel was shown before
            if(data){
                if(data !== this.version){
                    // show current panel
                    showNotificationPanel();
                }
            }else{
                // show current panel
                showNotificationPanel();
            }
        }.bind({
            version: currentVersion
        }));
    };

    /**
     * load character data from cookie information
     * -> all validation is done server side!
     */
    var initCharacterSelect = function(){

        /**
         * init panel animation for an element
         * @param imageWrapperElement
         */
        var initCharacterAnimation = function(imageWrapperElement){

            imageWrapperElement.velocity('stop').delay(300).velocity('transition.flipBounceXIn', {
                display: 'inline-block',
                stagger: 60,
                drag: true,
                duration: 600
            });

            // Hover effect for character info layer
            imageWrapperElement.hoverIntent(function(e){
                var characterInfoElement = $(this).find('.' + config.characterImageInfoClass);

                characterInfoElement.velocity('finish').velocity({
                    width: ['100%', [ 400, 15 ] ]
                },{
                    easing: 'easeInSine'
                });
            }, function(e){
                var characterInfoElement = $(this).find('.' + config.characterImageInfoClass);

                characterInfoElement.velocity('finish').velocity({
                    width: 0
                },{
                    duration: 150,
                    easing: 'easeInOutSine'
                });
            });
        };

        // --------------------------------------------------------------------

        /**
         * update all character panels -> set CSS class (e.g. after some panels were added/removed,..)
         */
        var updateCharacterPanels = function(){
            var characterRows = $('.' + config.characterSelectionClass + ' .pf-dynamic-area').parent();
            var rowClassIdentifier = ((12 / characterRows.length ) <= 3) ? 3 : (12 / characterRows.length);
            $(characterRows).removeClass().addClass('col-sm-' + rowClassIdentifier);
        };

        // --------------------------------------------------------------------

        var removeCharacterPanel = function(panelElement){
            $(panelElement).velocity('transition.expandOut', {
                duration: 250,
                complete: function () {
                    // lock row for CSS animations while removing...
                    $(this).parent().addClass(config.characterRowAnimateClass);

                    $(this).parent().velocity({
                        width: 0
                    },{
                        easing: 'ease',
                        duration: 300,
                        complete: function(){
                            $(this).remove();
                            // reset column CSS classes for all existing panels
                            updateCharacterPanels();
                        }
                    });
                }
            });
        };

        // --------------------------------------------------------------------
        // request character data for each character panel
        requirejs(['text!templates/ui/character_panel.html', 'mustache'], function(template, Mustache){

            $('.' + config.characterSelectionClass + ' .pf-dynamic-area').each(function(){
                var characterElement = $(this);

                characterElement.showLoadingAnimation();

                var requestData = {
                    cookie: characterElement.data('cookie')
                };

                $.ajax({
                    type: 'POST',
                    url: Init.path.getCookieCharacterData,
                    data: requestData,
                    dataType: 'json',
                    context: {
                        cookieName: requestData.cookie,
                        characterElement: characterElement
                    }
                }).done(function(responseData, textStatus, request){
                    this.characterElement.hideLoadingAnimation();

                    if(
                        responseData.error &&
                        responseData.error.length > 0
                    ){
                        $('.' + config.dynamicMessageContainerClass).showMessage({
                            type: responseData.error[0].type,
                            title: 'Character verification failed',
                            text: responseData.error[0].message
                        });
                    }

                    if(responseData.hasOwnProperty('character')){

                        var data = {
                            link: this.characterElement.data('href'),
                            cookieName: this.cookieName,
                            character: responseData.character
                        };

                        var content = Mustache.render(template, data);
                        this.characterElement.html(content);

                        // show character panel (animation settings)
                        initCharacterAnimation(this.characterElement.find('.' + config.characterImageWrapperClass));
                    }else{
                        // character data not available -> remove panel
                        removeCharacterPanel(this.characterElement);
                    }
                }).fail(function( jqXHR, status, error) {
                    var characterElement = this.characterElement;
                    characterElement.hideLoadingAnimation();

                    // character data not available -> remove panel
                    removeCharacterPanel(this.characterElement);
                });
            });
        });
    };

    /**
     * default ajax error handler
     * -> show user notifications
     * @param jqXHR
     * @param status
     * @param error
     */
    var handleAjaxErrorResponse = function(jqXHR, status, error){

        var type = status;
        var title = 'Status ' + jqXHR.status + ': ' + error;
        var message = '';

        if(jqXHR.responseText){
            var errorObj = $.parseJSON(jqXHR.responseText);

            if(
                errorObj.error &&
                errorObj.error.length > 0
            ){
                for(var i = 0; i < errorObj.error.length; i++){
                    var errorData = errorObj.error[i];
                    type = errorData.type;
                    title = 'Status  ' + errorData.code + ': ' + errorData.status;
                    message = errorData.message;

                    Util.showNotify({title: title, text: message, type: type});
                }
            }
        }else{
            Util.showNotify({title: title, text: message, type: type});
        }
    };

    /**
     * main init "landing" page
     */
    $(function(){
        // set Dialog default config
        Util.initDefaultBootboxConfig();

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

        // "Lock" default link action (=> open in new tab)!
        // -> until "gallery" is initialized (=> wait animation complete!)
        getThumbnailElements().on('click', function(e){
            e.preventDefault();
        });

        // init "lazy loading" for images
        $('.' + config.galleryThumbImageClass).lazyload({
            threshold : 300
        });

        // hide splash loading animation
        $('.' + config.splashOverlayClass).hideSplashOverlay();

        // init server status information
        initServerStatus();

        // init notification panel
        initNotificationPanel();

        // init character select
        initCharacterSelect();

        // init page observer
        setPageObserver();

        // init carousel
        initCarousel();

        // init scrollspy
        // -> after "Carousel"! required for correct "viewport" calculation (Gallery)!
        initScrollspy();

        // init youtube videos
        initYoutube();

        // draw header logo
        $('#' + config.logoContainerId).drawLogo(function(){
            // init header animation
            $('#' + config.headerContainerId).initHeader(function(){

            });
        }, false);

    });


});
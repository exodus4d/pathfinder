/**
 * context menu
 */

define([
    'jquery'
], function($) {

    'use strict';

    $.fn.contextMenu = function (settings) {

        // animation
        let animationInType = 'transition.flipXIn';
        let animationInDuration = 150;
        let animationOutType = 'transition.flipXOut';
        let animationOutDuration = 150;

        return this.each(function () {

            // Open context menu
            $(this).off('pf:openContextMenu').on('pf:openContextMenu', function (e, originalEvent, component, hiddenOptions, activeOptions) {

                // hide all other open context menus
               $('#pf-dialog-wrapper > .dropdown-menu').hide();

                let contextMenu = $(settings.menuSelector);

                let menuLiElements = contextMenu.find('li');

                // show all menu entries
                menuLiElements.show();

                // disable specific menu entries
                for(let i = 0; i < hiddenOptions.length; i++){
                    contextMenu.find('li[data-action="' + hiddenOptions[i] + '"]').hide();
                }

                // deactivate all menu entries
                menuLiElements.removeClass('active');

                //set active specific menu entries
                for(let j = 0; j < activeOptions.length; j++){
                    contextMenu.find('li[data-action="' + activeOptions[j] + '"]').addClass('active');
                }

                //open menu
                contextMenu.css({
                    position: 'absolute',
                    left: getLeftLocation(originalEvent),
                    top: getTopLocation(originalEvent)
                }).velocity(animationInType, {
                    duration: animationInDuration,
                    complete: function(){

                        let posX = 0;
                        let posY = 0;

                        if(
                            originalEvent.offsetX &&
                            originalEvent.offsetY
                        ){
                            // Chrome
                            posX = originalEvent.offsetX;
                            posY = originalEvent.offsetY ;
                        }else if(originalEvent.originalEvent){
                            // Firefox -> #415
                            posX =  originalEvent.originalEvent.layerX;
                            posY = originalEvent.originalEvent.layerY ;
                        }

                        let position = {
                            x: posX,
                            y: posY
                        };

                        $(this).off('click').one('click', {component: component, position: position}, function (e) {
                            // hide contextmenu
                            $(this).hide();

                            let params = {
                                selectedMenu: $(e.target),
                                component: e.data.component,
                                position: e.data.position
                            };

                            settings.menuSelected.call(this, params);
                            return false;
                        });
                    }
                });

                //make sure menu closes on any click
                $(document).one('click.closeContextmenu', function () {
                    $('.dropdown-menu[role="menu"]').velocity(animationOutType, {
                        duration: animationOutDuration
                    });
                });

                return false;
            });

        });

        function getLeftLocation(e) {
            let mouseWidth = e.pageX;
            let pageWidth = $(window).width();
            let menuWidth = $(settings.menuSelector).width();

            // opening menu would pass the side of the page
            if (mouseWidth + menuWidth > pageWidth &&
                menuWidth < mouseWidth) {
                return mouseWidth - menuWidth;
            }
            return mouseWidth;
        }

        function getTopLocation(e) {
            let mouseHeight = e.pageY;
            let pageHeight = $(window).height();
            let menuHeight = $(settings.menuSelector).height();

            // opening menu would pass the bottom of the page
            if (mouseHeight + menuHeight > pageHeight &&
                menuHeight < mouseHeight) {
                return mouseHeight - menuHeight;
            }
            return mouseHeight;
        }

    };
});
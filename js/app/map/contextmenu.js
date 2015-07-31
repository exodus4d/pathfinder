/**
 * context menu
 */

define(['jquery'], function($) {

    'use strict';

    $.fn.contextMenu = function (settings) {

        return this.each(function () {

            // Open context menu
            $(this).on('pf:openContextMenu', function (e, originalEvent, component, hiddenOptions, activeOptions) {

                // hide all other open context menus
               $('#pf-dialog-wrapper > .dropdown-menu').hide();

                var contextMenu = $(settings.menuSelector);

                var menuLiElements = contextMenu.find('li');

                // show all menu entries
                menuLiElements.show();

                // disable specific menu entries
                for(var i = 0; i < hiddenOptions.length; i++){
                    contextMenu.find('li[data-action="' + hiddenOptions[i] + '"]').hide();
                }

                // deactivate all menu entries
                menuLiElements.removeClass('active');

                //set active specific menu entries
                for(var j = 0; j < activeOptions.length; j++){
                    contextMenu.find('li[data-action="' + activeOptions[j] + '"]').addClass('active');
                }

                //open menu
                contextMenu.css({
                    position: 'absolute',
                    left: getLeftLocation(originalEvent),
                    top: getTopLocation(originalEvent)
                }).off('click').velocity('transition.flipXIn', {
                    duration: 180,
                    complete: function(){
                        // set context menu "click" observer
                        $(this).on('click', {component: component, position:{x: getLeftLocation(originalEvent), y: getTopLocation(originalEvent)}}, function (e) {
                            $(this).hide();

                            var params = {
                                selectedMenu: $(e.target),
                                component: e.data.component,
                                position: e.data.position
                            };


                            settings.menuSelected.call(this, params);
                        });
                    }
                });

                return false;
            });

            //make sure menu closes on any click
            $(document).off('click').on('click', function () {

                $('.dropdown-menu[role="menu"]').velocity('transition.flipXOut', {
                    duration: 180
                });
            });
        });

        function getLeftLocation(e) {
            var mouseWidth = e.pageX;
            var pageWidth = $(window).width();
            var menuWidth = $(settings.menuSelector).width();

            // opening menu would pass the side of the page
            if (mouseWidth + menuWidth > pageWidth &&
                menuWidth < mouseWidth) {
                return mouseWidth - menuWidth;
            }
            return mouseWidth;
        }

        function getTopLocation(e) {
            var mouseHeight = e.pageY;
            var pageHeight = $(window).height();
            var menuHeight = $(settings.menuSelector).height();

            // opening menu would pass the bottom of the page
            if (mouseHeight + menuHeight > pageHeight &&
                menuHeight < mouseHeight) {
                return mouseHeight - menuHeight;
            }
            return mouseHeight;
        }

    };
});
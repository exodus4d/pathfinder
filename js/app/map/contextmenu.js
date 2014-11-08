define(["jquery"], function($) {

    "use strict";

    $.fn.contextMenu = function (settings) {

        return this.each(function () {

            // Open context menu
            $(this).on("pf:openContextMenu", function (e, originalEvent, component) {



                //open menu
                $(settings.menuSelector)
                    .show()
                    .css({
                        position: "absolute",
                        left: getLeftLocation(originalEvent),
                        top: getTopLocation(originalEvent)
                    })
                    .off('click')
                    .on('click', {component: component, position:{x: getLeftLocation(originalEvent), y: getTopLocation(originalEvent)}}, function (e) {
                        $(this).hide();

                        var params = {
                            selectedMenu: $(e.target),
                            component: e.data.component,
                            position: e.data.position
                        };


                        settings.menuSelected.call(this, params);
                    });


                return false;
            });

            //make sure menu closes on any click
            $(document).click(function () {
                $(settings.menuSelector).hide();
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
/**
 *  releases dialog (GitHub API repository information)
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox'
], function($, Init, Util, Render, bootbox) {
    'use strict';

    var config = {
        releasesDialogClass: 'pf-releases-dialog'                             // class for "Releases" dialog
    };

    /**
     * load release information in dialog
     * @param releasesDialog
     */
    var loadDialogData = function(releasesDialog){

        // lock dialog
        var dialogContent = releasesDialog.find('.modal-content');
        dialogContent.showLoadingAnimation();

        $.ajax({
            type: 'POST',
            url: Init.path.gitHubReleases,
          //  data: updatedMapData,
            dataType: 'json'
        }).done(function(releasesData){
            requirejs(['text!templates/ui/timeline_element.html', 'mustache'], function(template, Mustache) {
                for(var i = 0; i < releasesData.length; i++){
                    var releaseData = releasesData[i];

                    // template vars
                    var data = {
                        isFirst: (i === 0),
                        isOdd: (i % 2 !== 0),
                        releaseDate: releaseData.published_at.substr(0, 10),
                        releaseData: releaseData
                    };

                    var content = Mustache.render(template, data);
                    releasesDialog.find('ul.timeline').append(content);
                }

                $('.timeline > li').velocity('transition.expandIn', {
                    stagger: 300,
                    duration: 240,
                    //display: 'auto',
                    complete: function(){

                    }
                });


            });
        }).fail(function( jqXHR, status, error) {
            var reason = status + ' ' + jqXHR.status + ': ' + error;
            Util.showNotify({title: jqXHR.status + ': login', text: reason, type: 'error'});
        }).always(function() {
            dialogContent.hideLoadingAnimation();
        });
    };

    /**
     * show releases dialog
     */
    $.fn.releasesDialog = function(){

        requirejs(['text!templates/dialog/releases.html', 'mustache'], function(template, Mustache) {

            var data = {
                test: 'blaBla'
            };

            var content = Mustache.render(template, data);

            var releasesDialog = bootbox.dialog({
                className: config.releasesDialogClass,
                title: 'Releases',
                size: 'large',
                message: content
            });

            // after modal is shown =======================================================================
            releasesDialog.on('shown.bs.modal', function(e) {

                loadDialogData(releasesDialog);
            });

        });

    };
});
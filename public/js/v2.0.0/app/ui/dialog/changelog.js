/**
 *  changelog dialog (GitHub API repository information)
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox'
], ($, Init, Util, bootbox) => {
    'use strict';

    let config = {
        changelogDialogClass: 'pf-changelog-dialog',                            // class for "changelog" dialog
        dynamicMessageContainerClass: 'pf-dynamic-message-container',           // class for "dynamic" (JS) message container
        timelineClass: 'timeline'                                               // class for "timeline"

    };

    /**
     * show version information
     * @param changelogDialog
     * @param versionData
     */
    let showVersion = (changelogDialog, versionData) => {
        let type = 'error';
        let title = versionData.current;
        let text = 'Installed version check failed';

        if(versionData.dev){
            // developer version
            type = 'info';
            title = versionData.current + ' (dev)';
            text = 'This installation is ahead of current stable version <kbd>' + versionData.last + '</kbd>.';
        }else{
            // standard version
            if(versionData.delta === 0){
                // last stable
                type = 'success';
                title = versionData.current;
                text = 'This installation is up2date.';
            }else{
                // outdated...
                type = 'warning';
                title = versionData.current;
                text = 'This installation is ' + versionData.delta + ' version behind current stable <kbd>' + versionData.last + '</kbd>.';
            }
        }

        changelogDialog.find('.' + config.dynamicMessageContainerClass).showMessage({
            dismissible: false,
            type: type,
            title: title,
            text: text
        });
    };

    /**
     * load changelog information in dialog
     * @param changelogDialog
     */
    let loadDialogData = (changelogDialog) => {

        // lock dialog
        let dialogContent = changelogDialog.find('.modal-content');
        dialogContent.showLoadingAnimation();

        $.ajax({
            type: 'POST',
            url: Init.path.gitHubReleases,
            dataType: 'json',
            context: {
                changelogDialog: changelogDialog
            }
        }).done(function(data){
            let changelogDialog = this.changelogDialog;
            let versionData = data.version;
            let releasesData = data.releasesData;

            showVersion(changelogDialog, versionData);

            requirejs(['text!templates/ui/timeline_element.html', 'mustache'], function(template, Mustache){
                for(let i = 0; i < releasesData.length; i++){
                    let releaseData = releasesData[i];

                    // template vars
                    let data = {
                        isFirst: (i === 0),
                        isOdd: (i % 2 !== 0),
                        releaseDate: releaseData.publishedAt.substr(0, 10),
                        releaseData: releaseData
                    };

                    let content = Mustache.render(template, data);
                    changelogDialog.find('ul.' + config.timelineClass).append(content);
                }

                changelogDialog.find('.timeline > li').velocity('transition.expandIn', {
                    stagger: 300,
                    duration: 240,
                    //display: 'auto',
                    complete: function(){}
                });
            });
        }).fail(function(jqXHR, status, error){
            let reason = status + ' ' + jqXHR.status + ': ' + error;
            Util.showNotify({title: jqXHR.status + ': login', text: reason, type: 'error'});
        }).always(function(){
            dialogContent.hideLoadingAnimation();
        });
    };

    /**
     * show changelog dialog
     */
    $.fn.changelogsDialog = function(){
        let content = $('<div>').append(
            $('<div>', {
                class: config.dynamicMessageContainerClass
            }),
            $('<ul>', {
                class: config.timelineClass
            })
        );

        let changelogDialog = bootbox.dialog({
            className: config.changelogDialogClass,
            title: 'Changelog',
            size: 'large',
            message: content
        });

        // after modal is shown =======================================================================
        changelogDialog.on('shown.bs.modal', function(e){
            loadDialogData(changelogDialog);
        });
    };

});
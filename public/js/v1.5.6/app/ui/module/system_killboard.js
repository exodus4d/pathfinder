/**
 * System killboard module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/lib/cache'
], ($, Init, Util, Cache) => {
    'use strict';

    let config = {
        // module info
        modulePosition: 2,
        moduleName: 'systemKillboard',
        moduleHeadClass: 'pf-module-head',                                      // class for module header
        moduleHandlerClass: 'pf-module-handler-drag',                           // class for "drag" handler

        // headline toolbar
        moduleHeadlineIconClass: 'pf-module-icon-button',                       // class for toolbar icons in the head

        // system killboard module
        moduleTypeClass: 'pf-system-killboard-module',                          // class for this module

        // system killboard list
        systemKillboardListClass: 'pf-system-killboard-list',                   // class for a list with kill entries
        systemKillboardListEntryClass: 'pf-system-killboard-list-entry',        // class for a list entry
        systemKillboardListImgShip: 'pf-system-killboard-img-ship',             // class for all ship images
        systemKillboardListImgChar: 'pf-system-killboard-img-char',             // class for all character logos
        systemKillboardListImgAlly: 'pf-system-killboard-img-ally',             // class for all alliance logos
        systemKillboardListImgCorp: 'pf-system-killboard-img-corp',             // class for all corp logos

        labelRecentKillsClass: 'pf-system-killboard-label-recent',              // class for "recent kills" label
        controlAreaClass: 'pf-module-control-area',                             // class for "control" areas

        minCountKills: 5,
        chunkCountKills: 5,
        maxCountKills: 43
    };

    let cache = new Cache({
        name: 'killboardModule',
        ttl: 60 * 60,
        maxSize: 600,
        debug: false
    });

    /**
     *
     * @param text
     * @param options
     * @returns {jQuery}
     */
    let getLabel = (text, options) => $('<span>', {
        class: ['label', options.type, options.align, options.class].join(' ')
    }).text(text);

    /**
     * get killmail data from ESI
     * @param requestData
     * @param context
     * @param callback
     */
    let loadKillmailData = (requestData, context, callback) => {
        let cacheKey = 'killmail_' + requestData.killId;
        let responseData = cache.get(cacheKey);
        if(responseData){
            // ... already cached -> return from cache
            callback(context, responseData)
                .then(payload => showKills(payload.data.killboardElement, payload.data.systemId, payload.data.chunkSize));
        }else{
            // ...not cached -> request data
            let url = 'https://esi.evetech.net/latest/killmails/' + requestData.killId + '/' + requestData.hash + '/';

            $.ajax({
                type: 'GET',
                url: url,
                dataType: 'json',
                context: context
            }).done(function(responseData){
                cache.set(cacheKey, responseData);

                callback(this, responseData)
                    .then(payload => showKills(payload.data.killboardElement, payload.data.systemId, payload.data.chunkSize));
            }).fail(function(jqXHR, status, error){
                // request failed -> skip this and load next
                showKills(this.killboardElement, this.systemId, this.chunkSize);
            });
        }

    };

    /**
     * load a chunk of killmails and render them
     * @param killboardElement
     * @param systemId
     * @param chunkSize
     */
    let showKills = (killboardElement, systemId, chunkSize) => {
        if(chunkSize){
            let cacheKey = 'zkb_' + systemId;
            let data = cache.getOrDefault(cacheKey, []);
            if(
                killboardElement.children().length < config.maxCountKills &&
                data.length
            ){
                // next killmail to load
                let nextZkb = data.shift();

                loadKillmailData({
                    killId: parseInt(nextZkb.killmail_id) || 0,
                    hash: nextZkb.zkb.hash
                }, {
                    chunkSize: --chunkSize,
                    zkb: nextZkb.zkb,
                    systemId: systemId,
                    killboardElement: killboardElement
                }, renderKillmail);
            }else{
                // no more kills available OR max kills reached
                killboardElement.closest('.' + config.moduleTypeClass).find('.' + config.controlAreaClass).hide();
            }

        }
    };

    /**
     * render a single killmail
     * @param context
     * @param killmailData
     * @returns {Promise<any>}
     */
    let renderKillmail = (context, killmailData) => {

        let renderKillmailExecutor = (resolve, reject) => {
            // calculate time diff in hours
            let serverDate= Util.getServerTime();
            let killDate = Util.convertDateToUTC(new Date(killmailData.killmail_time));

            // get time diff
            let timeDiffMin = Math.round((serverDate - killDate) / 1000 / 60);
            let timeDiffHour = Math.floor(timeDiffMin / 60);

            let data = {
                zkb: context.zkb,
                killmail: killmailData,
                systemKillboardListEntryClass: config.systemKillboardListEntryClass,
                systemKillboardListImgShip: config.systemKillboardListImgShip,
                systemKillboardListImgChar: config.systemKillboardListImgChar,
                systemKillboardListImgCorp: config.systemKillboardListImgCorp,
                systemKillboardListImgAlly: config.systemKillboardListImgAlly,
                zKillboardUrl: 'https://zkillboard.com',
                ccpImageServerUrl: Init.url.ccpImageServer,
                dateFormat: () => {
                    return (val, render) => {
                        let killDate = Util.convertDateToUTC(new Date(render(val)));
                        return  Util.convertDateToString(killDate);
                    };
                },
                iskFormat: () => {
                    return (val, render) => {
                        return Util.formatPrice(render(val));
                    };
                },
            };

            requirejs(['text!templates/modules/killmail.html', 'mustache'], (template, Mustache) => {
                // show hint for recent kills -------------------------------------------------------------------------
                if(timeDiffHour === 0){
                    context.killboardElement.siblings('.' + config.labelRecentKillsClass).css('display', 'block');
                }

                // render killmail entry ------------------------------------------------------------------------------
                let content = Mustache.render(template, data);
                context.killboardElement.append(content);

                // animate kill li-element ----------------------------------------------------------------------------
                context.killboardElement.children().last().velocity('transition.expandIn', {
                    complete: function(){
                        $(this).find('[title]').tooltip({
                            container: 'body'
                        });
                    }
                });

                resolve({
                    action: 'renderKillmail',
                    data: context
                });
            });
        };

        return new Promise(renderKillmailExecutor);
    };

    /**
     * updates the system info graph
     * @param systemData
     */
    $.fn.updateSystemInfoGraphs = function(systemData){
        let moduleElement = $(this);

        let labelOptions = {
            align: 'center-block'
        };
        let label = '';

        // get kills within the last 24h
        let timeFrameInSeconds = 60 * 60 * 24;

        // if system is w-space system -> add link modifier
        let wSpaceLinkModifier = '';
        if(systemData.type.id === 1){
            wSpaceLinkModifier = 'w-space/';
        }

        let url = Init.url.zKillboard + '/';
        url += 'no-items/' + wSpaceLinkModifier + 'no-attackers/npc/0/solarSystemID/' + systemData.systemId + '/pastSeconds/' + timeFrameInSeconds + '/';

        moduleElement.showLoadingAnimation();

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json'
        }).done(function(result){
            // zkb result needs to be cached and becomes reduced on "load more"
            let cacheKey = 'zkb_' + systemData.systemId;
            cache.set(cacheKey, result);

            if(result.length){
                // kills found -> insert hidden warning for recent kills
                labelOptions.type = 'label-warning';
                labelOptions.class = config.labelRecentKillsClass;
                let label = getLabel('recent kills within the last hour', labelOptions);
                moduleElement.append(label);

                let killboardElement = $('<ul>', {
                    class: config.systemKillboardListClass
                });
                moduleElement.append(killboardElement);
                moduleElement.append(getControlElement());

                showKills(killboardElement, systemData.systemId, config.chunkCountKills);
            }else{
                // no kills found
                labelOptions.type = 'label-success';
                label = getLabel('No kills found within the last 24h', labelOptions);
                moduleElement.append(label);
            }
        }).fail(function(e){
            labelOptions.type = 'label-danger';
            label = getLabel('zKillboard is not responding', labelOptions);
            moduleElement.find('.' + config.moduleHeadClass).after(label);

            Util.showNotify({title: e.status + ': Get system kills', text: 'Loading failed', type: 'error'});
        }).always(function(){
            moduleElement.hideLoadingAnimation();
        });

        // init tooltips
        let tooltipElements = moduleElement.find('[data-toggle="tooltip"]');
        tooltipElements.tooltip({
            container: 'body'
        });
    };

    /**
     * get module toolbar element
     * @param systemData
     * @returns {*|jQuery|HTMLElement|void}
     */
    let getHeadlineToolbar = (systemData) => {
        let headlineToolbar  = $('<h5>', {
            class: 'pull-right'
        }).append(
            $('<i>', {
                class: ['fas', 'fa-fw', 'fa-external-link-alt ', config.moduleHeadlineIconClass].join(' '),
                title: 'zkillboard.com'
            }).on('click', function(e){
                window.open(
                    '//zkillboard.com/system/' + systemData.systemId,
                    '_blank'
                );
            }).attr('data-toggle', 'tooltip')
        );

        headlineToolbar.find('[data-toggle="tooltip"]').tooltip({
            container: 'body'
        });

        return headlineToolbar;
    };

    /**
     * get info control element
     * @returns {void|jQuery|*}
     */
    let getControlElement = () => {
        let controlElement = $('<div>', {
            class: [Util.config.dynamicAreaClass, config.controlAreaClass, config.moduleHeadlineIconClass].join(' '),
            html: '<i class="fas fa-sync"></i>&nbsp;&nbsp;load more'
        });
        return controlElement;
    };

    /**
     * @param moduleElement
     * @param systemData
     */
    let setModuleObserver = (moduleElement, systemData) => {
        moduleElement.on('click', '.' + config.controlAreaClass, function(){
            let killboardElement = moduleElement.find('.' + config.systemKillboardListClass);
            showKills(killboardElement, systemData.systemId, config.chunkCountKills);
        });
    };

    /**
     * before module "show" callback
     * @param moduleElement
     * @param systemData
     */
    let beforeShow = (moduleElement, systemData) => {
        // update graph
        moduleElement.updateSystemInfoGraphs(systemData);
    };

    /**
     * get module element
     * @param parentElement
     * @param mapId
     * @param systemData
     * @returns {jQuery}
     */
    let getModule = (parentElement, mapId, systemData) => {
        let moduleElement = $('<div>').append(
            $('<div>', {
                class: config.moduleHeadClass
            }).append(
                $('<h5>', {
                    class: config.moduleHandlerClass
                }),
                $('<h5>', {
                    text: 'Killboard'
                }),
                getHeadlineToolbar(systemData)
            )
        );

        setModuleObserver(moduleElement, systemData);

        return moduleElement;
    };

    return {
        config: config,
        getModule: getModule,
        beforeShow: beforeShow
    };
});
define([
    'jquery',
    'app/init',
    'summernote'
], ($, Init) => {
    'use strict';

    // all Summernote stuff is available...
    let initDefaultSummernoteConfig = () => {
        // "length" hint plugin ---------------------------------------------------------------------------------------
        $.extend($.summernote.plugins, {
            /**
             * @param {Object} context - context object has status of editor.
             */
            lengthField: function (context){
                let self = this;
                let ui = $.summernote.ui;

                // add counter
                context.memo('button.lengthField', () => {
                    return $('<kbd>', {
                        class: ['text-right', 'txt-color'].join(' ')
                    });
                });

                /**
                 * update counter element with left chars
                 * @param contents
                 */
                let updateCounter = (contents) => {
                    let maxTextLength = context.options.maxTextLength;
                    let textLength = contents.length;
                    let counter = context.layoutInfo.toolbar.find('kbd');
                    let counterLeft = maxTextLength - textLength;

                    counter.text(counterLeft).data('charCount', counterLeft);
                    counter.toggleClass('txt-color-red', maxTextLength <= textLength);

                    // disable "save" button
                    let saveBtn = context.layoutInfo.toolbar.find('.btn-save');
                    saveBtn.prop('disabled', maxTextLength < textLength);
                };

                // events
                this.events = {
                    'summernote.init': function (we, e) {
                        updateCounter(context.$note.summernote('code'));
                    },
                    'summernote.change': function(we, contents){
                        updateCounter(contents);

                    }
                };
            }
        });

        // "discard" button plugin ------------------------------------------------------------------------------------
        $.extend($.summernote.plugins, {
            /**
             * @param {Object} context - context object has status of editor.
             */
            discardBtn: function (context){
                let self = this;
                let ui = $.summernote.ui;

                // add button
                context.memo('button.discardBtn', () => {
                    let button = ui.button({
                        contents: '<i class="fas fa-fw fa-ban"/>',
                        container: 'body',
                        click: function(){
                            // show confirmation dialog
                            $(this).confirmation('show');
                        }
                    });
                    let $button = button.render();

                    // show "discard" changes confirmation
                    let confirmationSettings = {
                        placement: 'top',
                        title: 'discard changes',
                        btnCancelIcon: '',
                        btnOkClass: 'btn btn-sm btn-warning',
                        btnOkLabel: 'discard',
                        btnOkIcon: 'fas fa-fw fa-ban',
                        onConfirm: (e, target) => {
                            // discard all changes
                            context.$note.summernote('reset');
                            context.$note.summernote('destroy');
                        }
                    };
                    $button.confirmation(confirmationSettings);

                    return $button;
                });
            }
        });
    };

    /**
     * init new Summernote editor
     * @param element
     * @param options
     */
    let initSummernote = (element, options) => {

        let defaultOptions = {
            dialogsInBody: true,
            dialogsFade: true,
            //textareaAutoSync: false,
            //hintDirection: 'right',
            //tooltip: 'right',
            //container: 'body',
            styleTags: ['p', 'h2', 'h3', 'blockquote'],
            linkTargetBlank: true,
            tableClassName: 'table table-condensed table-bordered',
            insertTableMaxSize: {
                col: 5,
                row: 5
            },
            icons: {
                //'align': 'note-icon-align',
                'alignCenter': 'fas fa-align-center',
                'alignJustify': 'fas fa-align-justify',
                'alignLeft': 'fas fa-align-left',
                'alignRight': 'fas fa-align-right',
                //'rowBelow': 'note-icon-row-below',
                //'colBefore': 'note-icon-col-before',
                //'colAfter': 'note-icon-col-after',
                //'rowAbove': 'note-icon-row-above',
                //'rowRemove': 'note-icon-row-remove',
                //'colRemove': 'note-icon-col-remove',
                'indent': 'fas fa-indent',
                'outdent': 'fas fa-outdent',
                'arrowsAlt': 'fas fa-expand-arrows-alt',
                'bold': 'fas fa-bold',
                'caret': 'fas fa-caret-down',
                'circle': 'fas fa-circle',
                'close': 'fas fa-time',
                'code': 'fas fa-code',
                'eraser': 'fas fa-eraser',
                'font': 'fas fa-font',
                //'frame': 'note-icon-frame',
                'italic': 'fas fa-italic',
                'link': 'fas fa-link',
                'unlink': 'fas fa-unlink',
                'magic': 'fas fa-magic',
                'menuCheck': 'fas fa-check',
                'minus': 'fas fa-minus',
                'orderedlist': 'fas fa-list-ol',
                'pencil': 'fa-pen',
                'picture': 'fas fa-image',
                'question': 'fas fa-question',
                'redo': 'fas fa-redo',
                'square': 'fas fa-square',
                'strikethrough': 'fas fa-strikethrough',
                'subscript': 'fas fa-subscript',
                'superscript': 'fas fa-superscript',
                'table': 'fas fa-table',
                'textHeight': 'fas fa-text-height',
                'trash': 'fas fa-trash',
                'underline': 'fas fa-underline',
                'undo': 'fas fa-undo',
                'unorderedlist': 'fas fa-list-ul',
                'video': 'fab fa-youtube'
            },
            colors: [
                ['#5cb85c', '#e28a0d', '#d9534f', '#e06fdf', '#9fa8da', '#e2ce48', '#428bca']
            ],
            colorsName: [
                ['Green', 'Orange', 'Red', 'Pink', 'Indigo', 'Yellow', 'Blue']
            ],
        };

        options = $.extend({}, defaultOptions, options);

        element.summernote(options);
    };

    initDefaultSummernoteConfig();

    return {
        initSummernote: initSummernote
    };
});
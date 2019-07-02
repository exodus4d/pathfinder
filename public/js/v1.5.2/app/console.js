/**
 * Console module
 * -> extends default window.console log object
 */

define([], () => {
    'use strict';

    /**
     * init custom window.console object
     * -> extend console obj with custom methods for styling and logging
     */
    let initConsole = () => {

        window.console = (origConsole => {
            // save orig methods for byPassing args to original methods
            let log = origConsole.log;
            let info = origConsole.info;
            let warn = origConsole.warn;
            let error = origConsole.error;

            let styles = {
                'indentDefault': {
                    'padding-left': '3px'
                },
                'global': {
                    'font-weight': 500,
                    'font-size': '11px',
                    'line-height': '19px',
                    'font-family': '"Fira Code", "Lucida Console"',
                },
                'ok': {
                    'color': '#5cb85c'
                },
                'log': {
                    'color': '#adadad'
                },
                'info': {
                    'color': '#428bca'
                },
                'warn': {
                    'color': '#ffdd9e'
                },
                'error': {
                    'color': '#ff8080'
                },
                'pf': {
                    'color': '#568a89'
                },
                'brand': {
                    'color': '#375959',
                    'line-height': '35px',
                    'font-size': '25px'
                }
            };

            let placeholders = {
                '%s': {
                    'style': ['color: #e93f3b; font-style: italic', 'color: inherit']
                },
                '%i': {
                    'style': ['color: #9980ff', 'color: inherit'],
                },
                '%d': {
                    'style': ['color: #9980ff', 'color: inherit']
                },
                '%f': {
                    'style': ['color: #9980ff', 'color: inherit']
                },
                '%o': {
                    'style': ['', '']
                },
                '%O': {
                    'style': ['', '']
                }
            };

            let findPlaceholders = str => {
                let exp = new RegExp(Object.keys(placeholders).join('|'), 'g');
                let matches = str.match(exp);
                return matches ? matches : [];
            };

            let addStylePlaceholder = str => {
                let exp = new RegExp(Object.keys(placeholders).join('|'), 'g');

                return str.replace(exp, function(matched){
                    return '%c' + matched + '%c';
                });
            };

            let getStyleByPlaceholder = (placeholder, clear = false) => {
                let css = '';
                if(placeholders.hasOwnProperty(placeholder)){
                    css = placeholders[placeholder].style[clear ? 1 : 0];
                }
                return css;
            };

            let getStyleByLogType = (logType, props = []) => {
                let css = '';
                if(styles.hasOwnProperty(logType)){
                    css = Object.keys(styles[logType])
                        .filter(prop => props.length ? props.includes(prop) : true)
                        .reduce((css, prop,i, affe) => {
                            css += prop + ':' + styles[logType][prop] + ';';
                            return css;
                        }, '');
                }
                return css;
            };

            let setLineStyleByLogType = (logType, args) => {
                if(args.length){
                    let lineStyle = getStyleByLogType('global') + getStyleByLogType(logType);
                    lineStyle += ['ok', 'log', 'info', 'pf'].includes(logType) ? getStyleByLogType('indentDefault') : '';
                    let bullet = ['ok', 'log', 'info', 'pf'].includes(logType) ? '●' : '';

                    if(typeof args[0] === 'string'){
                        // prepend placeholder to existing message
                        args[0] = '%c' + bullet + ' ' + args[0];
                    }else{
                        // prepend placeholder as new message
                        args.splice(0, 0, '%c' + bullet + ' ' + logType + ':');
                    }
                    // set line style as 2nd argument
                    args.splice(1, 0, lineStyle);
                }
            };

            let setMessageStyleByLogType = (logType, args) => {
                if(typeof args[0] === 'string') {
                    let placeholdersFound = findPlaceholders(args[0]);
                    let placeholderCount = placeholdersFound.length;

                    // add c% placeholders around other placeholders
                    args[0] = addStylePlaceholder(args[0]);

                    // add style args for  c% placeholders
                    let placeholderIndex = 0;
                    let argIndexStart = 1;
                    let argIndexEnd = argIndexStart + placeholderCount;
                    let argIndexOffset = 0;
                    for (let argIndex = argIndexStart; argIndex < argIndexEnd; argIndex++) {
                        args.splice(argIndex + argIndexOffset, 0, getStyleByPlaceholder(placeholdersFound[placeholderIndex]));
                        argIndexOffset += 2;
                        args.splice(argIndex + argIndexOffset, 0, getStyleByPlaceholder(placeholdersFound[placeholderIndex], true) + ';' + getStyleByLogType('global') + getStyleByLogType(logType));
                        placeholderIndex++;
                    }
                }
            };

            origConsole.ok = (...args) => {
                setMessageStyleByLogType('ok', args);
                setLineStyleByLogType('ok', args);
                info.apply(origConsole, args);
            };

            origConsole.info = (...args) => {
                setMessageStyleByLogType('info', args);
                setLineStyleByLogType('info', args);
                info.apply(origConsole, args);
            };

            origConsole.log = (...args) => {
                setMessageStyleByLogType('log', args);
                setLineStyleByLogType('log', args);
                log.apply(origConsole, args);
            };

            origConsole.warn = (...args) => {
                setMessageStyleByLogType('warn', args);
                setLineStyleByLogType('warn', args);
                warn.apply(origConsole, args);
            };

            origConsole.error = (...args) => {
                setMessageStyleByLogType('error', args);
                setLineStyleByLogType('error', args);
                error.apply(origConsole, args);
            };

            origConsole.pf = (...args) => {
                setMessageStyleByLogType('pf', args);
                setLineStyleByLogType('pf', args);
                info.apply(origConsole, args);
            };

            origConsole.brand = (...args) => {
                setMessageStyleByLogType('brand', args);
                setLineStyleByLogType('brand', args);
                info.apply(origConsole, args);
            };

            return origConsole;
        })(window.console);
    };

    initConsole();

    /**
     * show current program version information console
     * @param version
     */
    let showVersionInfo = (version) => {
        console.ok('%c     PATHFINDER',
            'color: #477372; font-size: 25px; margin-left: 10px; line-height: 50px; text-shadow: 1px 1px 0 #212C30; ' +
            'background: url(https://i.imgur.com/bhSr6LI.png) no-repeat;');
        console.pf('Release: %s', version);
    };

    return {
        showVersionInfo: showVersionInfo
    };
});
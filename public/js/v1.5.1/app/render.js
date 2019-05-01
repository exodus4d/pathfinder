/**
 *  Render controller
 */

define(['jquery', 'mustache'], ($, Mustache) => {

    'use strict';

    /**
     * render Mustache template
     * @param path
     * @param data
     * @returns {Promise<any>}
     */
    let render = (path, data) => {
        let renderExecutor = resolve => {
            requirejs(['text!templates/' + path + '.html'], template => {
                resolve(Mustache.render(template, data));
            });
        };
        return new Promise(renderExecutor);
    };

    /**
     * convert JSON object into HTML highlighted string
     * @param obj
     */
    let highlightJson = (obj) => {
        let multiplyString = (num, str) =>  {
            let sb = [];
            for(let i = 0; i < num; i++){
                sb.push(str);
            }
            return sb.join('');
        };

        let dateObj = new Date();
        let regexpObj = new RegExp();
        let tab = multiplyString(1, '  ');
        let isCollapsible = true;
        let quoteKeys = false;
        let expImageClicked = '(() => {let container=this.parentNode.nextSibling; container.style.display=container.style.display===\'none\'?\'inline\':\'none\'})();';

        let checkForArray = function(obj){
            return obj &&
                typeof obj === 'object' &&
                typeof obj.length === 'number' &&
                !(obj.propertyIsEnumerable('length'));
        };

        let getRow = function(indent, data, isPropertyContent){
            let tabs = '';
            for(let i = 0; i < indent && !isPropertyContent; i++) tabs += tab;
            if(data !== null && data.length > 0 && data.charAt(data.length - 1) !== '\n')
                data = data + '\n';
            return tabs + data;
        };

        let formatLiteral = function(literal, quote, comma, indent, isArray, style){
            if(typeof literal === 'string')
                literal = literal.split('<').join('&lt;').split('>').join('&gt;');
            let str = '<span class="' + style + '">' + quote + literal + quote + comma + '</span>';
            if(isArray) str = getRow(indent, str);
            return str;
        };

        let formatFunction = function(indent, obj){
            let tabs = '';
            for(let i = 0; i < indent; i++) tabs += tab;
            let funcStrArray = obj.toString().split('\n');
            let str = '';
            for(let i = 0; i < funcStrArray.length; i++){
                str += ((i === 0) ? '' : tabs) + funcStrArray[i] + '\n';
            }
            return str;
        };


        let highlight = (obj, indent, addComma, isArray, isPropertyContent) => {
            let html = '';

            let comma = (addComma) ? '<span class="pf-code-Comma">,</span> ' : '';
            let type = typeof obj;
            let clpsHtml = '';
            if(checkForArray(obj)){
                if(obj.length === 0){
                    html += getRow(indent, '<span class="pf-code-ArrayBrace">[ ]</span>' + comma, isPropertyContent);
                }else{
                    clpsHtml = isCollapsible ? '<span><i class="fas fa-fw fa-plus-square" onClick="' + expImageClicked + '"></i></span><span class="collapsible">' : '';
                    html += getRow(indent, '<span class="pf-code-ArrayBrace">[</span>' + clpsHtml, isPropertyContent);
                    for(let i = 0; i < obj.length; i++){
                        html += highlight(obj[i], indent + 1, i < (obj.length - 1), true, false);
                    }
                    clpsHtml = isCollapsible ? '</span>' : '';
                    html += getRow(indent, clpsHtml + '<span class="pf-code-ArrayBrace">]</span>' + comma);
                }
            }else if(type === 'object'){
                if(obj === null){
                    html += formatLiteral('null', '', comma, indent, isArray, 'pf-code-Null');
                }else if(obj.constructor === dateObj.constructor){
                    html += formatLiteral('new Date(' + obj.getTime() + ') /*' + obj.toLocaleString() + '*/', '', comma, indent, isArray, 'Date');
                }else if(obj.constructor === regexpObj.constructor){
                    html += formatLiteral('new RegExp(' + obj + ')', '', comma, indent, isArray, 'RegExp');
                }else{
                    let numProps = 0;
                    for(let prop in obj) numProps++;
                    if(numProps === 0){
                        html += getRow(indent, '<span class="pf-code-ObjectBrace">{ }</span>' + comma, isPropertyContent);
                    }else{
                        clpsHtml = isCollapsible ? '<span><i class="fas fa-fw fa-plus-square" onClick="' + expImageClicked + '"></i></span><span class="collapsible">' : '';
                        html += getRow(indent, '<span class="pf-code-ObjectBrace">{</span>' + clpsHtml, isPropertyContent);
                        let j = 0;
                        for(let prop in obj){
                            if(obj.hasOwnProperty(prop)){
                                let quote = quoteKeys ? '"' : '';
                                html += getRow(indent + 1, '<span class="pf-code-PropertyName">' + quote + prop + quote + '</span>: ' + highlight(obj[prop], indent + 1, ++j < numProps, false, true));
                            }
                        }
                        clpsHtml = isCollapsible ? '</span>' : '';
                        html += getRow(indent, clpsHtml + '<span class="pf-code-ObjectBrace">}</span>' + comma);
                    }
                }
            }else if(type === 'number'){
                html += formatLiteral(obj, '', comma, indent, isArray, 'pf-code-Number');
            }else if(type === 'boolean'){
                html += formatLiteral(obj, '', comma, indent, isArray, 'pf-code-Boolean');
            }else if(type === 'function'){
                if(obj.constructor === regexpObj.constructor){
                    html += formatLiteral('new RegExp(' + obj + ')', '', comma, indent, isArray, 'RegExp');
                }else{
                    obj = formatFunction(indent, obj);
                    html += formatLiteral(obj, '', comma, indent, isArray, 'pf-code-Function');
                }
            }else if(type === 'undefined'){
                html += formatLiteral('undefined', '', comma, indent, isArray, 'pf-code-Null');
            }else{
                html += formatLiteral(obj.toString().split('\\').join('\\\\').split('"').join('\\"'), '"', comma, indent, isArray, 'pf-code-String');
            }

            return html;
        };

        return highlight(obj, 0, false, false, false);
    };

    return {
        render: render,
        highlightJson: highlightJson
    };
});
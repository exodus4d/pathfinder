define([], () => {
    'use strict';

    class SVG {

        static updateSymbolSvg(svgEl, href){
            let useEl = svgEl.getElementsByTagNameNS(this.namespaces.svg, 'use')[0];
            if(useEl){
                useEl.setAttribute('href', href);
            }
        }

        static newSymbolSvg(href){
            let svgEl = this.newEl();
            let useEl = this.newEl('use');
            useEl.setAttribute('href', href);
            svgEl.appendChild(useEl);
            return svgEl;
        }

        static newEl(nodeName = 'svg', namespaceURI = this.namespaces.svg){
            return document.createElementNS(namespaceURI, nodeName);
        }
    }

    SVG.namespaces = {
        'svg': 'http://www.w3.org/2000/svg'
    };

    return SVG;
});
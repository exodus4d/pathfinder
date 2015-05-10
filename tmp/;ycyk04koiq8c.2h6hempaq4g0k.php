<svg id="pf-logo-svg" xmlns="http://www.w3.org/2000/svg">

    <filter id = "LogoFilter" width = "150%" height = "150%">
        <feOffset result = "offOut" in = "SourceAlpha" dx = "-3" dy = "3"/>
        <feGaussianBlur result = "blurOut" in = "offOut" stdDeviation = "3"/>
        <feBlend in = "SourceGraphic" in2 = "blurOut" mode = "normal"/>
    </filter>

    <symbol >
        <g id="layer2" filter="url(#LogoFilter)">
            <path class="logo-ploygon-top-right" data-animationX="50" data-animationY="-50" d="M226.9 297.1 354.2 365 196 9.7 Z" id="path3353" />
            <path class="logo-ploygon-bottom-left" data-animationX="-50" data-animationY="50" d="M73.9 284.9 177.9 287.3 1.6 361.6 Z" id="path3357" id="path3357" />
            <path class="logo-ploygon-bottom-right" data-animationX="50" data-animationY="50" d="M121.2 317.9 335.6 362.7 193.1 286 Z" id="path3359" />
            <path class="logo-ploygon-top-left" data-animationX="-50" data-animationY="-50" d="M0.2 352.6 94.7 176.7 189.1 0.8 202.8 141.6 Z" id="path3361" />
        </g>
    </symbol>

</svg>
/**
 * Header animation
 */

define([
    'jquery'
], ($) => {
    'use strict';

    let config = {
        headerId: 'pf-landing-top',                                 // id for page header
        canvasId: 'pf-header-canvas',                               // id for canvas background
        previewElementClass: 'pf-header-preview-element'            // class for "preview" elements
    };

    class Color {
        constructor(r, g, b, a = 1){
            this._r = r;
            this._g = g;
            this._b = b;
            this._a = a;
        }

        get r(){
            return this._r;
        }

        get g(){
            return this._g;
        }

        get b(){
            return this._b;
        }

        style(a = this.a){
            return `rgba(${this.r}, ${this.g}, ${this.b}, ${a})`;
        }
    }

    class Node {
        constructor(x, y, ctx, config = {}){
            this._anchorX = x;
            this._anchorY = y;
            this._ctx = ctx;
            this._config = config;
            this._x = Math.random() * (x - (x - this._config.anchorLength)) + (x - this._config.anchorLength);
            this._y = Math.random() * (y - (y - this._config.anchorLength)) + (y - this._config.anchorLength);
            this._vx = Math.random() * 2 - 1;
            this._vy = Math.random() * 2 - 1;
            this._energy = Math.random() * 100;
            this._radius = Math.random();
            this._siblings = [];
            this._brightness = 0;
            this._isPointer = false;
        }

        set x(x){
            this._x = x;
        }

        get x(){
            return this._x;
        }

        set y(y){
            this._y = y;
        }

        get y(){
            return this._y;
        }

        set siblings(siblings){
            this._siblings = siblings;
        }

        get siblings(){
            return this._siblings;
        }

        get radius(){
            if(this.isPointer){
                return 3;
            }
            return 2 * this._radius + 2 * this._siblings.length / this._config.siblingsLimit;
        }

        set brightness(brightness){
            this._brightness = brightness;
        }

        get brightness(){
            return this.isPointer ? 1 : this._brightness;
        }

        set color(color){
            this._color = color;
        }

        get color(){
            return this._color;
        }

        set isPointer(isPointer){
            this._isPointer = isPointer;
        }

        get isPointer(){
            return this._isPointer;
        }

        drawNode(){
            this._ctx.beginPath();
            this._ctx.arc(this.x, this.y, this.radius, 0, StarCanvas.circ);
            this._ctx.fillStyle = this.color.style(this.brightness * this._config.brightnessMultiplierNode);
            this._ctx.fill();
        }

        drawConnections(){
            for(let i = 0; i < this._siblings.length; i++){
                this._ctx.beginPath();
                this._ctx.moveTo(this.x, this.y);
                this._ctx.lineTo(this._siblings[i].x, this._siblings[i].y);
                this._ctx.lineWidth = 1 - StarCanvas.calcDistance(this, this._siblings[i]) / this._config.sensitivity;
                if(this.color === this._siblings[i].color){
                    // no gradient
                    this._ctx.strokeStyle = this.color.style(this.brightness * this._config.brightnessMultiplierConnection);
                }else{
                    // gradient
                    this._ctx.strokeStyle = this.gradient(this._siblings[i], StarCanvas.lineStyle(this, this._siblings[i])) ;
                }
                this._ctx.stroke();
            }
        }

        gradient(node2, midColor){
            let grad = this._ctx.createLinearGradient(Math.floor(this.x), Math.floor(this.y), Math.floor(node2.x), Math.floor(node2.y));
            grad.addColorStop(0, this.color.style(this.brightness * this._config.brightnessMultiplierConnection));
            grad.addColorStop(0.5, midColor);
            grad.addColorStop(1, node2.color.style(node2.brightness * this._config.brightnessMultiplierConnection));
            return grad;
        }

        moveNode(){
            this._energy -= 2;
            if(this._energy < 1){
                this._energy = Math.random() * 100;
                if(this.x - this._anchorX < -this._config.anchorLength){
                    this._vx = Math.random() * 2;
                }else if(this.x - this._anchorX > this._config.anchorLength){
                    this._vx = Math.random() * -2;
                }else{
                    this._vx = Math.random() * 4 - 2;
                }
                if(this.y - this._anchorY < -this._config.anchorLength){
                    this._vy = Math.random() * 2;
                }else if (this.y - this._anchorY > this._config.anchorLength){
                    this._vy = Math.random() * -2;
                }else{
                    this._vy = Math.random() * 4 - 2;
                }
            }
            this.x += this._vx * this._energy / 100;
            this.y += this._vy * this._energy / 100;
        }
    }

    class StarCanvas {
        constructor(canvas, config = {}) {
            this._canvas = canvas;
            this._config = Object.assign({}, new.target.defaultConfig, config);
            this._nodes = [];
            this._nodesQty = 0;
            this._updateActive = true;

            this.resizeWindow();
            this._mouse = this._config.startCoordinates(this._canvas);

            this._ctx = this._canvas.getContext('2d');
            this.initHandlers();
            this.initIntersectionObserver();
            this.initNodes();
            this.redrawCheck();
        }

        findSiblings(){
            let node1, node2, distance;
            for(let i = 0; i < this._nodesQty; i++){
                node1 = this._nodes[i];
                node1.siblings = [];
                for(let j = 0; j < this._nodesQty; j++){
                    node2 = this._nodes[j];
                    if(node1 !== node2){
                        distance = StarCanvas.calcDistance(node1, node2);
                        if(distance < this._config.sensitivity){
                            if(node1.siblings.length < this._config.siblingsLimit){
                                node1.siblings.push(node2);
                            }else{
                                let node_sibling_distance = 0;
                                let max_distance = 0;
                                let s;
                                for(let k = 0; k < this._config.siblingsLimit; k++){
                                    node_sibling_distance = StarCanvas.calcDistance(node1, node1.siblings[k]);
                                    if(node_sibling_distance > max_distance){
                                        max_distance = node_sibling_distance;
                                        s = k;
                                    }
                                }
                                if(distance < max_distance){
                                    node1.siblings.splice(s, 1);
                                    node1.siblings.push(node2);
                                }
                            }
                        }
                    }
                }
            }
        }

        redrawScene(){
            this.resizeWindow();
            this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
            this.findSiblings();
            // skip nodes move to move if they are outside the visible radius -> performance boost
            let haltRadius = this._config.mouseRadius + this._config.anchorLength;
            // mouse pointer node moves on mousemove
            this._pointerNode.x = this._mouse.x;
            this._pointerNode.y = this._mouse.y;
            let skipNodesMove = [this._pointerNode];

            let i, node, distance;
            for(i = 0; i < this._nodesQty; i++){
                node = this._nodes[i];
                distance = StarCanvas.calcDistance({
                    x: this._mouse.x,
                    y: this._mouse.y
                }, node);

                if(distance < this._config.mouseRadius){
                    node.brightness = 1 - distance / this._config.mouseRadius;
                }else{
                    node.brightness = 0;
                }

                if(distance > haltRadius){
                    skipNodesMove.push(node);
                }
            }

            for(i = 0; i < this._nodesQty; i++){
                node = this._nodes[i];
                if(node.brightness){
                    node.drawNode();
                    node.drawConnections();
                }

                if(!skipNodesMove.includes(node)){
                    node.moveNode();
                }
            }
        }

        redrawCheck(){
            if(this._updateActive){
                this.redrawScene();
            }
            requestAnimationFrame(() => this.redrawCheck());
        }

        initNodes(){
            this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
            this._nodes = [];
            for(let i = this._config.density; i < this._canvas.width; i += this._config.density) {
                for(let j = this._config.density; j < this._canvas.height; j += this._config.density) {
                    let node = new Node(i, j, this._ctx, this._config);
                    if(typeof this._config.colorBase === 'function'){
                        node.color = this._config.colorBase(node, this);
                    }else{
                        node.color = new Color(...this._config.colorBase);
                    }
                    this._nodes.push(node);
                    this._nodesQty++;
                }
            }

            // mouse cursor node
            this._pointerNode = new Node(
                this._mouse.x,
                this._mouse.y,
                this._ctx,
                this._config
            );
            this._pointerNode.color = new Color(...this._config.colorCursor);
            this._pointerNode.brightness = 1;
            this._pointerNode.isPointer = true;
            this._nodes.unshift(this._pointerNode);
            this._nodesQty++;
        }

        initHandlers(){
            document.addEventListener('resize', () => this.resizeWindow(), false);
            document.addEventListener('mousemove', e => this.mousemoveHandler(e), true);
        }

        initIntersectionObserver(){
            let intersectionCallback = entries => {
                let visiblePct = Math.floor(entries[0].intersectionRatio * 100);
                this._updateActive = visiblePct > 0;
            };

            this._intersectionObserver = new IntersectionObserver(intersectionCallback, {
                threshold: [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]
            });
            this._intersectionObserver.observe(this._canvas);
        }

        mousemoveHandler(e){
            this._mouse.x = e.clientX;
            this._mouse.y = e.clientY;
        }

        resizeWindow(){
            let dimension = this._config.newDimension(this);
            this._canvas.width = dimension.width;
            this._canvas.height = dimension.height;
        }
    }

    StarCanvas.circ = 2 * Math.PI;
    StarCanvas.calcDistance = (node1, node2) => {
        return Math.sqrt(Math.pow(node1.x - node2.x, 2) + (Math.pow(node1.y - node2.y, 2)));
    };

    StarCanvas.lineStyle = (node1, node2) => {
        let r = StarCanvas.mixComponents(node1.color.r, node2.color.r, node1.radius, node2.radius);
        let g = StarCanvas.mixComponents(node1.color.g, node2.color.g, node1.radius, node2.radius);
        let b = StarCanvas.mixComponents(node1.color.b, node2.color.b, node1.radius, node2.radius);
        let a = (node1.brightness + node2.brightness) / 2;
        return `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${a})`;
    };

    StarCanvas.mixComponents = (comp1, comp2, weight1, weight2) => {
        return (comp1*weight1 + comp2*weight2) / (weight1 + weight2);
    };

    StarCanvas.getRandomIntInclusive = (min, max) => {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min +1)) + min;
    };


    StarCanvas.defaultConfig = {
        // how close next node must be to activate connection (in px)
        // shorter distance == better connection (line width)
        sensitivity: 90,
        // note that siblings limit is not 'accurate' as the node can actually have more connections than this value
        // that's because the node accepts sibling nodes with no regard to their current connections this is acceptable
        // because potential fix would not result in significant visual difference
        // more siblings == bigger node
        siblingsLimit: 30,
        // default node margin
        density: 50,
        // avoid nodes spreading
        anchorLength: 120,
        // highlight radius
        mouseRadius: 200,
        // values < 1 will lower the calculated node brightness [0-1]
        brightnessMultiplierNode: 1,
        // values < 1 will lower the calculated connection brightness [0-1]
        brightnessMultiplierConnection: 1,
        colorBase: [108, 174, 173],     // teal
        colorCursor: [226, 138, 13],    // orange
        // callback for canvas dimension re-calc
        newDimension: () => ({width: window.innerWidth, height: window.innerHeight}),
        // start coordinates (before mouse move)
        startCoordinates: canvas => ({
            x: canvas.width / 2,
            y: canvas.height / 2
        })
    };

    let init = headerEl => {
        let previewEls = headerEl.getElementsByClassName(config.previewElementClass);

        $(previewEls).velocity('transition.bounceIn', {
            duration: 600,
            stagger: 60,
            delay: 120,
            complete: function(){
                let canvas = document.getElementById(config.canvasId);
                // not on mobile
                if(canvas){
                    new StarCanvas(canvas, {
                        brightnessMultiplierConnection: 0.9,
                        colorBase: (starCanvas, node) => {
                            let rgb = StarCanvas.defaultConfig.colorBase;
                            switch(StarCanvas.getRandomIntInclusive(0, 4)){
                                case 1: rgb = [ 92, 184,  92]; break; // green
                                case 2: rgb = [ 68, 170, 130]; break; // aqua
                                case 3: rgb = [194, 118,  12]; break; // orange dark
                                case 4: rgb = StarCanvas.defaultConfig.colorBase; break;
                            }
                            return  new Color(...rgb);
                        },
                        colorCursor: [200,  184,  71], // red dark
                        newDimension: starCanvas => ({
                            width: window.innerWidth,
                            height: starCanvas._canvas.closest(`#${config.headerId}`).getBoundingClientRect().height - 1 // border
                        }),
                        startCoordinates: canvas => ({
                            x: canvas.width / 2 + 500,
                            y: canvas.height / 2 + 50
                        })
                    });

                    canvas.classList.add('in');
                }
            }
        });
    };

    return {
        init
    };
});
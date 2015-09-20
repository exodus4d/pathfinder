/**
 * Header animation
 */

define([
    'jquery',
    'easePack',
    'tweenLite'
], function($) {
    'use strict';

    var config = {
        previewElementClass: 'pf-header-preview-element'                                // class for "preview" elements
    };


    var width, height, largeHeader, canvas, ctx, points, target, animateHeader = true;

    var canvasHeight = 450;
    var colorRGB = '108, 174, 173';
    var connectionCount = 4;


    var initHeader = function() {
        width = window.innerWidth;
        height = canvasHeight;
        target = {x: width * 0.8, y: 230};

        largeHeader.style.height = height+'px';

        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext('2d');

        // create points
        points = [];
        for(var x = 0; x < width; x = x + width/20) {
            for(var y = 0; y < height; y = y + height/15) {
                var px = x + Math.random()*width/15;
                var py = y + Math.random()*height/15;
                var p = {x: px, originX: px, y: py, originY: py };
                points.push(p);
            }
        }

        // for each point find the 5 closest points
        for(var i = 0; i < points.length; i++) {
            var closest = [];
            var p1 = points[i];
            for(var j = 0; j < points.length; j++) {
                var p2 = points[j];
                if(p1 !== p2) {
                    var placed = false;
                    for(var k = 0; k < connectionCount; k++) {
                        if(!placed) {
                            if(closest[k] === undefined) {
                                closest[k] = p2;
                                placed = true;
                            }
                        }
                    }

                    for(var m = 0; k < connectionCount; m++) {
                        if(!placed) {
                            if(getDistance(p1, p2) < getDistance(p1, closest[m])) {
                                closest[m] = p2;
                                placed = true;
                            }
                        }
                    }
                }
            }
            p1.closest = closest;
        }

        // assign a circle to each point
        for(var n in points) {
            var c = new Circle(points[n], 2+Math.random()*2, 'rgba(255,255,255,0.3)');
            points[n].circle = c;
        }
    };

    // Event handling
    var addListeners = function() {
        if(!('ontouchstart' in window)) {
            window.addEventListener('mousemove', mouseMove);
        }
        window.addEventListener('scroll', scrollCheck);
        window.addEventListener('resize', resize);
    };

    var mouseMove = function(e) {
        var posx = 0;
        var posy = 0;
        if (e.pageX || e.pageY) {
            posx = e.pageX;
            posy = e.pageY;
        }else if (e.clientX || e.clientY){
            posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }
        target.x = posx;
        target.y = posy;
    };

    var scrollCheck = function() {
        if(document.body.scrollTop > height){
            animateHeader = false;
        }else{
            animateHeader = true;
        }
    };

    var resize = function() {
        width = window.innerWidth;
        height = canvasHeight;
        largeHeader.style.height = height+'px';
        canvas.width = width;
        canvas.height = height;
    };

    // animation
    var initAnimation = function() {
        animate();
        for(var i in points) {
            shiftPoint(points[i]);
        }
    };

    var animate = function animate() {
        if(animateHeader) {
            ctx.clearRect(0,0,width,height);
            for(var i in points) {
                // detect points in range
                if(Math.abs(getDistance(target, points[i])) < 4000) {
                    points[i].active = 0.25;
                    points[i].circle.active = 0.45;
                } else if(Math.abs(getDistance(target, points[i])) < 20000) {
                    points[i].active = 0.1;
                    points[i].circle.active = 0.3;
                } else if(Math.abs(getDistance(target, points[i])) < 40000) {
                    points[i].active = 0.02;
                    points[i].circle.active = 0.1;
                } else {
                    points[i].active = 0;
                    points[i].circle.active = 0;
                }

                drawLines(points[i]);
                points[i].circle.draw();
            }
        }
        requestAnimationFrame(animate);
    };

    var shiftPoint = function (p) {
        TweenLite.to(p, 1 + 1 * Math.random(), {x: p.originX - 50 + Math.random() * 100,
            y: p.originY - 50 + Math.random() * 100, ease: Circ.easeInOut,
            onComplete: function () {
                shiftPoint(p);
            }});
    };

    // Canvas manipulation
    var drawLines = function (p) {
        if(!p.active) return;
        for(var i in p.closest) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.closest[i].x, p.closest[i].y);
            ctx.strokeStyle = 'rgba(' + colorRGB +','+ p.active+')';
            ctx.stroke();
        }
    };

    var Circle = function(pos,rad,color) {
        var _this = this;

        // constructor
        (function() {
            _this.pos = pos || null;
            _this.radius = rad || null;
            _this.color = color || null;
        })();

        this.draw = function() {
            if(!_this.active) return;
            ctx.beginPath();
            ctx.arc(_this.pos.x, _this.pos.y, _this.radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'rgba(' + colorRGB + ','+ _this.active+')';
            ctx.fill();
        };
    };

    // Util
    var getDistance = function(p1, p2) {
        return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
    };

    /**
     * init header animation
     * @param callback
     */
    $.fn.initHeader = function(callback){
        largeHeader = $(this)[0];
        canvas = $(this).find('canvas:visible')[0];

        // header preview elements
        $('.' + config.previewElementClass).velocity('transition.bounceIn', {
            duration: 600,
            stagger: 60,
            delay: 120,
            complete: function(){

                // show header canvas animation
                if(canvas){
                    // header animation
                    initHeader();
                    initAnimation();
                    addListeners();

                    $(canvas).velocity('fadeIn', {
                        duration: 900,
                        visibility: 'visible',
                        complete: function(){
                            if(callback !== undefined){
                                callback();
                            }
                        }
                    });
                }
            }

        });


    };

});
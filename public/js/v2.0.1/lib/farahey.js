;(function() {

    "use strict";

    var root = this;
    var Farahey = root.Farahey = {};
    if (typeof exports !== 'undefined') {
        exports.Farahey = Farahey;
    }

    var findInsertionPoint = function(sortedArr, val, comparator) {
            var low = 0, high = sortedArr.length;
            var mid = -1, c = 0;
            while(low < high)   {
                mid = parseInt((low + high)/2);
                c = comparator(sortedArr[mid], val);
                if(c < 0)   {
                    low = mid + 1;
                }else if(c > 0) {
                    high = mid;
                }else {
                    return mid;
                }
            }
            return low;
        },
        geomSupport = root.Biltong,
        insertSorted = function(array, value, comparator) {
            var ip = findInsertionPoint(array, value, comparator);
            array.splice(ip, 0, value);
        },
        EntryComparator = function(origin, getSize) {
            var _origin = origin,
                _cache = {},
                _get = function(entry) {
                    if (!_cache[entry[1]]) {
                        var s = getSize(entry[2]);
                        _cache[entry[1]] = {
                            l:entry[0][0],
                            t:entry[0][1],
                            w:s[0],
                            h:s[1],
                            center:[entry[0][0] + (s[0] / 2), entry[0][1] + (s[1] / 2) ]
                        };
                    }
                    return _cache[entry[1]];
                };

            this.setOrigin = function(o) {
                _origin = o;
                _cache = {};
            };
            this.compare = function(e1, e2) {
                var d1 = geomSupport.lineLength(_origin, _get(e1).center),
                    d2 = geomSupport.lineLength(_origin, _get(e2).center);

                return d1 < d2 ? -1 : d1 == d2 ? 0 : 1;
            };
        };

    var _isOnEdge = function(r, axis, dim, v) { return (r[axis] <= v && v <= r[axis] + r[dim]); },
        _xAdj = [ function(r1, r2) { return r1.x + r1.w - r2.x; }, function(r1, r2) { return r1.x - (r2.x + r2.w); } ],
        _yAdj = [ function(r1, r2) { return r1.y + r1.h - r2.y; }, function(r1, r2) { return r1.y - (r2.y + r2.h); } ],
        _adj = [ null, [ _xAdj[0], _yAdj[1] ], [ _xAdj[0], _yAdj[0] ], [ _xAdj[1], _yAdj[0] ], [ _xAdj[1], _yAdj[1] ] ],
        _genAdj = function(r1, r2, m, b, s) {
            if (isNaN(m)) m = 0;
            var y = r2.y + r2.h,
                x = (m == Infinity || m == -Infinity) ? r2.x + (r2.w / 2) :  (y - b) / m,
                theta = Math.atan(m),
                rise, hyp, run;

            if (_isOnEdge(r2, "x", "w", x)) {
                rise = _adj[s][1](r1, r2);
                hyp = rise / Math.sin(theta);
                run = hyp * Math.cos(theta);
                return { left:run, top:rise };
            }
            else {
                run = _adj[s][0](r1, r2);
                hyp = run / Math.cos(theta);
                rise = hyp * Math.sin(theta);
                return { left:run, top:rise };
            }
        },
    /*
     * Calculates how far to move r2 from r1 so that it no longer overlaps.
     * if origin is supplied, then it means we want r2 to move along a vector joining r2's center to that point.
     * otherwise we want it to move along a vector joining the two rectangle centers.
     */
        _calculateSpacingAdjustment = Farahey.calculateSpacingAdjustment = function(r1, r2) {
            var c1 = r1.center || [ r1.x + (r1.w / 2), r1.y + (r1.h / 2) ],
                c2 = r2.center || [ r2.x + (r2.w / 2), r2.y + (r2.h / 2) ],
                m = geomSupport.gradient(c1, c2),
                s = geomSupport.quadrant(c1, c2),
                b = (m == Infinity || m == -Infinity || isNaN(m)) ? 0 : c1[1] - (m * c1[0]);

            return _genAdj(r1, r2, m, b, s);
        },
    // calculate a padded rectangle for the given element with offset & size, and desired padding.
        _paddedRectangle = Farahey.paddedRectangle = function(o, s, p) {
            return { x:o[0] - p[0], y: o[1] - p[1], w:s[0] + (2 * p[0]), h:s[1] + (2 * p[1]) };
        },
        _magnetize = function(positionArray, positions, sizes, padding,
                              constrain, origin, filter,
                              updateOnStep, stepInterval, stepCallback, iterations,
                              exclude, excludeFocus)
        {
            origin = origin || [0,0];
            stepCallback = stepCallback || function() { };
            iterations = iterations || 2;

            var focus = _paddedRectangle(origin, [1,1], padding),
                iteration = 1, uncleanRun = true, adjustBy, constrainedAdjustment,
                _movedElements = {},
                _move = function(id, o, x, y) {
                    _movedElements[id] = true;
                    o[0] += x;
                    o[1] += y;
                },
                step = function() {
                    for (var i = 0; i < positionArray.length; i++) {

                        if (exclude(positionArray[i][1], positionArray[i][2])) {
                            continue;
                        }

                        var o1 = positions[positionArray[i][1]],
                            oid = positionArray[i][1],
                            a1 = positionArray[i][2], // angle to node from magnet origin
                            s1 = sizes[positionArray[i][1]],
                        // create a rectangle for first element: this encompasses the element and padding on each
                        //side
                            r1 = _paddedRectangle(o1, s1, padding);

                        if (!excludeFocus && filter(positionArray[i][1], positionArray[i][2]) && geomSupport.intersects(focus, r1)) {
                            adjustBy = _calculateSpacingAdjustment(focus, r1);
                            constrainedAdjustment = constrain(positionArray[i][1], o1, adjustBy);
                            _move(oid, o1, constrainedAdjustment.left, constrainedAdjustment.top);
                        }

                        // now move others to account for this one, if necessary.
                        // reset rectangle for node
                        r1 = _paddedRectangle(o1, s1, padding);
                        for (var j = 0; j < positionArray.length; j++) {
                            if (i != j) {

                                if (exclude(positionArray[j][1], positionArray[j][2])) {
                                    continue;
                                }

                                if (filter(positionArray[j][1], positionArray[j][2])) {
                                    var o2 = positions[positionArray[j][1]],
                                        s2 = sizes[positionArray[j][1]],
                                    // create a rectangle for the second element, again by putting padding of the desired
                                    // amount around the bounds of the element.
                                        r2 = _paddedRectangle(o2, s2, padding);

                                    // if the two rectangles intersect then figure out how much to move the second one by.
                                    if (geomSupport.intersects(r1, r2)) {
                                        // TODO (?), instead of moving neither, the other node should move.
                                        uncleanRun = true;
                                        adjustBy = _calculateSpacingAdjustment(r1, r2);
                                        constrainedAdjustment = constrain(positionArray[j][1], o2, adjustBy);
                                        _move(positionArray[j][1], o2, constrainedAdjustment.left, constrainedAdjustment.top);
                                    }
                                }
                            }
                        }
                    }

                    if (updateOnStep)
                        stepCallback();

                    if (uncleanRun && iteration < iterations) {
                        uncleanRun = false;
                        iteration++;
                        if (updateOnStep) {
                            window.setTimeout(step, stepInterval);
                        }
                        else
                            step();
                    }
                };

            step();
            return _movedElements;
        };

    var _convertElements = function(l) {
        if (l == null) return null;
        else if (Object.prototype.toString.call(l) === "[object Array]") {
            var a = [];
            a.push.apply(a, l);
            return a;
        }
        else {
            var o = [];
            for (var i in l) o.push(l[i]);
        }
        return o;
    };

    /**
     * Applies repulsive magnetism to a set of elements relative to a given point, with a specified
     * amount of padding around the point.
     * @class FaraheyInstance
     * @constructor
     * @param {Object} params Constructor parameters.
     * @param {Selector|Element} [params.container] Element that contains the elements to magnetize. Only required if you intend to use the `executeAtEvent` method.
     * @param {Function} [params.getContainerPosition] Function that returns the position of the container (as an object of the form `{left:.., top:..}`) when requested. Only required if you intend to use the `executeAtEvent` method.
     * @param {Function} params.getPosition A function that takes an element and returns its position. It does not matter to which element this position is computed as long as you remain consistent with this method, `setPosition` and the `origin` property.
     * @param {Function} params.setPosition A function that takes an element and position, and sets it. See note about offset parent above.
     * @param {Function} params.getSize A function that takes an element and returns its size, in pixels.
     * @param {Number[]} [params.padding] Optional padding for x and y directions. Defaults to 20 pixels in each direction.
     * @param {Function} [params.constrain] Optional function that takes an id and a proposed amount of movement in each axis, and returns the allowed amount of movement in each axis. You can use this to constrain your elements to a grid, for instance, or a path, etc.
     * @param {Number[]} [params.origin] The origin of magnetization, in pixels. Defaults to 0,0. You can also supply this to the `execute` call.
     * @param {Selector|String[]|Element[]} params.elements List, or object hash, of elements on which to operate.
     * @param {Boolean} [params.executeNow=false] Whether or not to execute the routine immediately.
     * @param {Function} [params.filter] Optional function that takes an element id and returns whether or not that element can be moved.
     * @param {Boolean} [params.orderByDistanceFromOrigin=false] Whether or not to sort elements first by distance from origin. Can have better results but takes more time.
     */
    var FaraheyInstance = function(params) {
        var getPosition = params.getPosition,
            getSize = params.getSize,
            getId = params.getId,
            setPosition = params.setPosition,
            padding = params.padding ||  [20, 20],
        // expects a { left:.., top:... } object. returns how far it can actually go.
            constrain = params.constrain || function(id, current, delta) { return delta; },
            positionArray = [],
            positions = {},
            sizes = {},
            elements = _convertElements(params.elements || []),
            origin = params.origin || [0,0],
            executeNow = params.executeNow,
        //minx, miny, maxx, maxy,
            getOrigin = this.getOrigin = function() { return origin; },
            filter = params.filter || function(_) { return true; },
            exclude = params.exclude || function(_) { return false;},
            orderByDistanceFromOrigin = params.orderByDistanceFromOrigin,
            comparator = new EntryComparator(origin, getSize),
            updateOnStep = params.updateOnStep,
            stepInterval = params.stepInterval || 350,
            originDebugMarker,
            debug = params.debug,
            createOriginDebugger = function() {
                var d = document.createElement("div");
                d.style.position = "absolute";
                d.style.width = "10px";
                d.style.height = "10px";
                d.style.backgroundColor = "red";
                document.body.appendChild(d);
                originDebugMarker = d;
            },
            _addToPositionArray = function(p) {
                if (!orderByDistanceFromOrigin || positionArray.length == 0)
                    positionArray.push(p);
                else {
                    insertSorted(positionArray, p, comparator.compare);
                }
            },
            _computeExtents = function(els) {
                var minx, miny, maxx, maxy;
                minx = miny = Infinity;
                maxx = maxy = -Infinity;
                for (var i = 0; i < els.length; i++) {
                    var p = getPosition(els[i]),
                        s = getSize(els[i]),
                        id = getId(els[i]);

                    positions[id] = [p.left, p.top];
                    _addToPositionArray([ [p.left, p.top], id, els[i]]);
                    sizes[id] = s;
                    minx = Math.min(minx, p.left);
                    miny = Math.min(miny, p.top);
                    maxx = Math.max(maxx, p.left + s[0]);
                    maxy = Math.max(maxy, p.top + s[1]);
                }

                return [ minx, maxx, miny, maxy ];

            },
            _updatePositions = function() {
                comparator.setOrigin(origin);
                positionArray = []; positions = {}; sizes = {};
                return _computeExtents(elements);
            },
            _run = function(options) {
                if (elements.length > 1) {
                    options = options || {};
                    var f = options.filter || filter;
                    var p = options.padding || padding;
                    var i = options.iterations;
                    var e = options.exclude || exclude;
                    var ef = options.excludeFocus;
                    var _movedElements = _magnetize(positionArray, positions, sizes, p, constrain, origin, f, updateOnStep, stepInterval, _positionElements, i, e, ef);
                    _positionElements(_movedElements);
                }
            },
            _positionElements = function(_movedElements) {
                for (var i = 0; i < elements.length; i++) {
                    var id = getId(elements[i]);
                    if (_movedElements[id])
                        setPosition(elements[i], { left:positions[id][0], top:positions[id][1] });
                }
            },
            setOrigin = function(o) {
                if (o != null) {
                    origin = o;
                    comparator.setOrigin(o);
                }
            };

        /**
         * Runs the magnetize routine.
         * @method execute
         * @param {Number[]} [o] Optional origin to use. You may have set this in the constructor and do not wish to supply it, or you may be happy with the default of [0,0].
         * @param {Function} [options] Options to override defaults.
         * @param {Function} [options.filter] Optional function to indicate whether a given element may be moved or not. Returning boolean false indicates it may not.
         * @param {Number[]} [options.padding] Optional [x,y] padding values for elements.
         * @param {Number} [options.iterations] Optional max number of iterations to run. The greater this number, the more comprehensive the magnetisation,
         * but the slower it runs. The default is 2.
         * @param {Function} [options.exclude] Optional function to return whether or not a given element should be completely excluded from the magnetisation: it neither
         * moves, nor has any bearing on the movement of other elements.
         * @param {Boolean} [options.excludeFocus=false] If true, do not pad any elements around the focus point.
         */
        this.execute = function(o, options) {
            setOrigin(o);
            _updatePositions();
            _run(options);
        };

        /**
         * Computes the center of all the nodes and then uses that as the magnetization origin when it runs the routine.
         * @method executeAtCenter
         * @param {Function} [options] Options to override defaults.
         * @param {Function} [options.filter] Optional function to indicate whether a given element may be moved or not. Returning boolean false indicates it may not.
         * @param {Number[]} [options.padding] Optional [x,y] padding values for elements.
         * @param {Number} [options.iterations] Optional max number of iterations to run. The greater this number, the more comprehensive the magnetisation,
         * but the slower it runs. The default is 2.
         * @param {Function} [options.exclude] Optional function to return whether or not a given element should be completely excluded from the magnetisation: it neither
         * moves, nor has any bearing on the movement of other elements.
         * @param {Boolean} [options.excludeFocus=false] If true, do not pad any elements around the focus point.
         */
        this.executeAtCenter = function(options) {
            var extents = _updatePositions();
            setOrigin([
                    (extents[0] + extents[1]) / 2,
                    (extents[2] + extents[3]) / 2
            ]);
            _run(options);
        };

        /**
         * Runs the magnetize routine using the location of the given event as the origin. To use this
         * method you need to have provided a `container`,  and a `getContainerPosition` function to the
         * constructor.
         * @method executeAtEvent
         * @param {Event} e Event to get origin location from.
         * @param {Function} [options] Options to override defaults.
         * @param {Function} [options.filter] Optional function to indicate whether a given element may be moved or not. Returning boolean false indicates it may not.
         * @param {Number[]} [options.padding] Optional [x,y] padding values for elements.
         * @param {Number} [options.iterations] Optional max number of iterations to run. The greater this number, the more comprehensive the magnetisation,
         * but the slower it runs. The default is 2.
         * @param {Function} [options.exclude] Optional function to return whether or not a given element should be completely excluded from the magnetisation: it neither
         * moves, nor has any bearing on the movement of other elements.
         * @param {Boolean} [options.excludeFocus=false] If true, do not pad any elements around the focus point.
         */
        this.executeAtEvent = function(e, options) {
            var c = params.container,
                o = params.getContainerPosition(c),
                x = e.pageX - o.left + c.scrollLeft,
                y = e.pageY - o.top + c.scrollTop;

            if (debug) {
                originDebugMarker.style.left = e.pageX + "px";
                originDebugMarker.style.top = e.pageY + "px";
            }

            this.execute([x,y], options);
        };

        /**
         * Sets the current set of elements on which to operate.
         * @method setElements
         * @param {Object[]|Object} _els List, or object hash, of elements, in whatever format the Magnetizer is setup to use. If you supply an object hash then a list is generated from the hash's values (the keys are ignored).
         */
        this.setElements = function(_els) {
            elements = _convertElements(_els);
            return this;
        };

        /**
         * Adds the given element to the set of elements on which to operate.
         * @method addElement
         * @param el {Object} Element to add.
         * @param {Boolean} [doNotTestForDuplicates=false] If true, we skip the check for duplicates. This makes
         * for a much faster call when there are lots of elements, just use it with care.
         */
        this.addElement = function(el, doNotTestForDuplicates) {
            if (el != null && (doNotTestForDuplicates || elements.indexOf(el) === -1)) {
                elements.push(el);
            }
            return this;
        };

        /**
         * Adds the given elements to the set of elements on which to operate.
         * @method addElements
         * @param els {Object[]} Elements to add.
         * @param {Boolean} [doNotTestForDuplicates=false] If true, we skip the check for duplicates. This makes
         * for a much faster call when there are lots of elements, just use it with care.
         */
        this.addElements = function(els, doNotTestForDuplicates) {
            if (doNotTestForDuplicates) {
                Array.prototype.push.apply(elements, els);
            }
            else {
                for (var i = 0; i < els.length; i++) {
                    this.addElement(els[i]);
                }
            }
            return this;
        };

        /**
         * Gets the list of elements currently being managed.
         * @method getElements
         */
        this.getElements = function() {
            return elements;
        };

        /**
         * Removes the given element from the set of elements on which to operate.
         * @method removeElement
         * @param el {Object} Element to remove.
         */
        this.removeElement = function(el) {
            var idx = -1;
            for (var i = 0; i < elements.length; i++) {
                if (elements[i] == el) {
                    idx = i; break;
                }
            }
            if (idx != -1) elements.splice(idx, 1);
            return this;
        };

        /**
         * Sets the padding to insert between magnetized elements.
         * @method setPadding
         * @param {Number[]} p Array of padding for each axis.
         */
        this.setPadding = function(p) {
            padding = p;
        };

        /**
         * Sets the function used to constrain the movement of some element that the magnetizer wishes to relocate.
         * The function is given an element ID and an array of [x,y] values, where each value indicates the proposed amount
         * of movement in the given axis. The function is expected to return an array of [x,y] that indicates the allowed
         * amount of movement in each axis.
         * @method setConstrain
         * @param {Function} c
         */
        this.setConstrain = function(c) {
            constrain = c;
        };

        /**
         * Sets the function used to determine whether or not a given element should be considered during the magnetization process.
         * @method setFilter
         * @param {Function} f Filter function to use. Takes an element ID and returns whether or not that element can be moved.
         */
        this.setFilter = function(f) {
            filter = f;
        };

        /**
         * Reset the Farahey instance. Use this to avoid memory leaks.
         * @method reset
         */
        this.reset = function() {
            elements.length = 0;
        };

        if (debug)
            createOriginDebugger();

        if (executeNow) this.execute();
        return this;

    };

    /**
     * Gets a new FaraheyInstance
     * @method
     * @param {Object} params Method parameters.
     * @param {Selector|Element} [params.container] Element that contains the elements to magnetize. Only required if you intend to use the `executeAtEvent` method.
     * @param {Function} [params.getContainerPosition] Function that returns the position of the container (as an object of the form `{left:.., top:..}`) when requested. Only required if you intend to use the `executeAtEvent` method.
     * @param {Function} params.getPosition A function that takes an element and returns its position. It does not matter to which element this position is computed as long as you remain consistent with this method, `setPosition` and the `origin` property.
     * @param {Function} params.setPosition A function that takes an element and position, and sets it. See note about offset parent above.
     * @param {Function} params.getSize A function that takes an element and returns its size, in pixels.
     * @param {Number[]} [params.padding] Optional padding for x and y directions. Defaults to 20 pixels in each direction.
     * @param {Function} [params.constrain] Optional function that takes an id and a proposed amount of movement in each axis, and returns the allowed amount of movement in each axis. You can use this to constrain your elements to a grid, for instance, or a path, etc.
     * @param {Number[]} [params.origin] The origin of magnetization, in pixels. Defaults to 0,0. You can also supply this to the `execute` call.
     * @param {Selector|String[]|Element[]} params.elements List, or object hash, of elements on which to operate.
     * @param {Boolean} [params.executeNow=false] Whether or not to execute the routine immediately.
     * @param {Function} [params.filter] Optional function that takes an element id and returns whether or not that element can be moved.
     * @param {Boolean} [params.orderByDistanceFromOrigin=false] Whether or not to sort elements first by distance from origin. Can have better results but takes more time.
     */
    Farahey.getInstance = function(params) {
        return new FaraheyInstance(params);
    };

}).call(typeof window !== 'undefined' ? window : this);


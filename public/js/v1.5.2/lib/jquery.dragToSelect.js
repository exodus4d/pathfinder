/*
@title:
Drag to Select

@version:
1.1

@author:
Andreas Lagerkvist

@date:
2009-04-06

@url:
http://andreaslagerkvist.com/jquery/drag-to-select/

@license:
http://creativecommons.org/licenses/by/3.0/

@copyright:
2008 Andreas Lagerkvist (andreaslagerkvist.com)

@requires:
jquery, jquery.dragToSelect.css

@does:
Use this plug-in to allow your users to select certain elements by dragging a "select box". Works very similar to how you can drag-n-select files and folders in most OS:es.

@howto:
$('#my-files').dragToSelect(selectables: 'li'); would make every li in the #my-files-element selectable by dragging. The li:s will recieve a "selected"-class when they are within range of the select box when user drops.

Make sure a parent-element of the selectables has position: relative as well as overflow: auto or scroll.

@exampleHTML:
<ul>
	<li><img src="http://exscale.se/__files/3d/lamp-and-mates/lamp-and-mates-01_small.jpg" alt="Lamp and Mates" /></li>
	<li><img src="http://exscale.se/__files/3d/stugan-winter_small.jpg" alt="The Cottage - Winter time" /></li>
	<li><img src="http://exscale.se/__files/3d/ps2_small.jpg" alt="PS2" /></li>
</ul>

@exampleJS:
$('#jquery-drag-to-select-example').dragToSelect({
	selectables: 'li', 
	onHide: function () {
		alert($('#jquery-drag-to-select-example li.selected').length + ' selected');
	}
});
*/
$.fn.dragToSelect = function (conf) {
	var c = typeof(conf) == 'object' ? conf : {};

	// Config
	var config = $.extend({
		className:			'pf-map-drag-to-select',
		activeClass:		'active',
		disabledClass:		'disabled',
		selectedClass:		'pf-system-selected',
        ignoreLockedClass:  'pf-system-locked', // do not select locked systems
        ignoreVisibleClass: 'pf-system-hidden', // do not select invisible systems
		scrollTH:			10,
		percentCovered:		25,
		selectables:		false,
		autoScroll:			false,
		selectOnMove:		false,
		onShow:				function () {return true;},
		onHide:				function () {return true;},
		onRefresh:			function () {return true;}
	}, c);

	var realParent			= $(this);
	var parent				= realParent;

	// container for lasso element
	// -> the only reason for NOT using the .pf-map is because of the zoom [scale()] feature or .pf-map
	var lassoContainer 		= realParent.parent();

	var animationFrameId;
	var mouseIsDown = false;
	var lastMousePosition = { x: 0, y: 0 };

    // deselected items
    var deselectedItems = $();

    /*
	do {
		if (/auto|scroll|hidden/.test(parent.css('overflow'))) {
			break;
		}
		parent = parent.parent();
	} while (parent[0].parentNode);
*/
	// Does user want to disable dragToSelect
	if (conf == 'disable') {
		parent.addClass(config.disabledClass);
		return this;
	}
	else if (conf == 'enable') {
		parent.removeClass(config.disabledClass);
		return this;
	}

    var parentDim = {
        left:	0,
        top:	0,
        width:	10,
        height:	10
    };

    // set parent dimensions
    // -> should be updated in case of left/right menu is open
    var setParentDimensions = (parent) => {
        var parentOffset	= parent.offset();
        parentDim		= {
            left:	parentOffset.left,
            top:	parentOffset.top,
            width:	parent.width(),
            height:	parent.height()
        };
    }

	setParentDimensions(parent);

	// Current origin of select box
	var selectBoxOrigin = {
		left:	0,
		top:	0
	};

	// Create select box
	var selectBox = $('<div>')
						.appendTo(lassoContainer)
						.attr('class', config.className)
						.css('position', 'absolute');

	// Shows the select box
	var showSelectBox = function (e) {
		if (parent.is('.' + config.disabledClass)) {
			return;
		}

		selectBoxOrigin.left	= e.pageX - parentDim.left + parent[0].scrollLeft;
		selectBoxOrigin.top		= e.pageY - parentDim.top + parent[0].scrollTop;

		var css = {
			left:		selectBoxOrigin.left + 'px', 
			top:		selectBoxOrigin.top + 'px', 
			width:		'1px', 
			height:		'1px'
		};
		selectBox.addClass(config.activeClass).css(css);

		config.onShow();
	};

	// Refreshes the select box dimensions and possibly position
	var refreshSelectBox = function () {
		var refreshed = false;

		if (!selectBox.is('.' + config.activeClass) || parent.is('.' + config.disabledClass)) {
			return refreshed;
		}

		var left		= lastMousePosition.x - parentDim.left + parent[0].scrollLeft;
		var top			= lastMousePosition.y - parentDim.top + parent[0].scrollTop;
        var tempWidth	= selectBoxOrigin.left - left;
        var tempHeight	= selectBoxOrigin.top - top;

        let newLeft     = selectBoxOrigin.left;// - leftScroll;
        let newTop      = selectBoxOrigin.top;// - topScroll;
        var newWidth	= left - selectBoxOrigin.left;
        var newHeight	= top - selectBoxOrigin.top;

        if(newWidth < 0){
            newLeft = newLeft - tempWidth;
            newWidth = newWidth * -1;
        }

        if(newHeight < 0){
            newTop = newTop - tempHeight;
            newHeight = newHeight * -1;
        }

		// check if dimension has changed -> save performance
		var dimensionHash = [newWidth, newHeight].join('_');

		if(selectBox.data('dimension-hash') !== dimensionHash){
			selectBox.data('dimension-hash', dimensionHash);
			var css = {
				left:	newLeft + 'px',
				top:	newTop + 'px',
				width:	newWidth + 'px',
				height:	newHeight + 'px'
			};

			selectBox.css(css);
			config.onRefresh();
			refreshed = true;
		}

		return refreshed;
	};

	// Hides the select box
	var hideSelectBox = function () {
		if (!selectBox.is('.' + config.activeClass) || parent.is('.' + config.disabledClass)) {
			return;
		}
		if (config.onHide(selectBox, deselectedItems) !== false) {
			selectBox.removeClass(config.activeClass);
		}
	};

	// Selects all the elements in the select box's range
	var selectElementsInRange = function () {
		if (!selectBox.is('.' + config.activeClass) || parent.is('.' + config.disabledClass)) {
			return;
		}

		var selectables		= realParent.find(config.selectables + ':not(.' + config.ignoreLockedClass + ')'+ ':not(.' + config.ignoreVisibleClass + ')');
		var selectBoxOffset	= selectBox.offset();
		var selectBoxDim	= {
			left:	selectBoxOffset.left, 
			top:	selectBoxOffset.top, 
			width:	selectBox.width(), 
			height:	selectBox.height()
		};

		selectables.each(function (i) {
			var el			= $(this);
			var elOffset	= el.offset();
			var elDim		= {
				left:	elOffset.left, 
				top:	elOffset.top, 
				width:	el.width(), 
				height:	el.height()
			};

			if (percentCovered(selectBoxDim, elDim) > config.percentCovered) {
				el.addClass(config.selectedClass);
				// remove element from "deselected" elements (e.g on add -> remove -> add scenario)
				deselectedItems = deselectedItems.not(el);
			}else {
                if(el.hasClass(config.selectedClass)){
                    el.removeClass(config.selectedClass);
					deselectedItems = deselectedItems.add(el);
                }
			}
		});

	};

	// Returns the amount (in %) that dim1 covers dim2
	var percentCovered = function (dim1, dim2) {
		// The whole thing is covering the whole other thing
		if (
			(dim1.left <= dim2.left) && 
			(dim1.top <= dim2.top) && 
			((dim1.left + dim1.width) >= (dim2.left + dim2.width)) && 
			((dim1.top + dim1.height) > (dim2.top + dim2.height))
		) {
			return 100;
		}
		// Only parts may be covered, calculate percentage
		else {
			dim1.right		= dim1.left + dim1.width;
			dim1.bottom		= dim1.top + dim1.height;
			dim2.right		= dim2.left + dim2.width;
			dim2.bottom		= dim2.top + dim2.height;

			var l = Math.max(dim1.left, dim2.left);
			var r = Math.min(dim1.right, dim2.right);
			var t = Math.max(dim1.top, dim2.top);
			var b = Math.min(dim1.bottom, dim2.bottom);

			if (b >= t && r >= l) {
			/*	$('<div/>').appendTo(document.body).css({
					background:	'red', 
					position:	'absolute',
					left:		l + 'px', 
					top:		t + 'px', 
					width:		(r - l) + 'px', 
					height:		(b - t) + 'px', 
					zIndex:		100
				}); */

				var percent = (((r - l) * (b - t)) / (dim2.width * dim2.height)) * 100;

			//	alert(percent + '% covered')

				return percent;
			}
		}
		// Nothing covered, return 0
		return 0;
	};

	// Event functions ----------------------------------------------------------------------------
	var mousemoveCallback = function(){
		if(mouseIsDown){
			var refreshed = refreshSelectBox();

			if(refreshed && config.selectables && config.selectOnMove){
				selectElementsInRange();
			}

			// recursive re-call on next render
			animationFrameId = requestAnimationFrame(mousemoveCallback);
		}
	}

	var mouseupCallback = function(){
		if(config.selectables){
			selectElementsInRange();
		}
		hideSelectBox();

		// stop animation frame and "reset" to default
		cancelAnimationFrame(animationFrameId);
		mouseIsDown = false;
		// reset deselected item array
		deselectedItems = $();
	}

	// Do the right stuff then return this --------------------------------------------------------

	selectBox.mousemove(function(e){
        setParentDimensions(parent);
		lastMousePosition.x = e.pageX;
		lastMousePosition.y = e.pageY;
		e.preventDefault();
	}).mouseup(mouseupCallback);

	parent.mousedown(function(e){
		if(
			e.which === 1 && // left mouse down
			e.target === realParent[0] // prevent while dragging a system :)
		){
			// Make sure user isn't clicking scrollbar (or disallow clicks far to the right actually)
			if ((e.pageX + 20) > $(document.body).width()) {
				return;
			}

			showSelectBox(e);
			mouseIsDown = true;
			animationFrameId = requestAnimationFrame(mousemoveCallback);
		}

		e.preventDefault();
	}).mousemove(function(e){
        setParentDimensions(parent);
		lastMousePosition.x = e.pageX;
		lastMousePosition.y = e.pageY;
		e.preventDefault();
	}).mouseup(mouseupCallback);

	// Be nice
	return this;
};
/*
 * Copyright 2005-2012 The Kuali Foundation
 *
 * Licensed under the Educational Community License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.opensource.org/licenses/ecl2.php
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function($) {
    $.fn.extend({
        spinit: function(options) {
            var settings = $.extend({ min: 0, max: 100, callback: null, stepInc: 1, pageInc: 10, width: 50, height: 15, btnWidth: 10, mask: '' }, options);
            return this.each(function() {
                var UP = 38;
                var DOWN = 40;
                var PAGEUP = 33;
                var PAGEDOWN = 34;
                var mouseCaptured = false;
                var mouseIn = false;
                var interval;
                var direction = 'none';
                var isPgeInc = false;

                var value = Number($(this).val());
                var el = $(this).css('width', (settings.width) + 'px').css('height', settings.height + 'px').addClass('smartspinner');
				
				if (settings.initValue) {
				  value = Math.max(settings.initValue, settings.min);
				  $(this).val(value);
                  raiseCallback(value);
				}
                
                if (settings.mask != '') el.val(settings.mask);
                $.fn.reset = function(val) {
                    if (isNaN(val)) val = 0;
                    value = Math.max(val, settings.min);
                    $(this).val(value);
                    raiseCallback(value);
                };
                function setDirection(dir) {
                    direction = dir;
                    isPgeInc = false;
                    switch (dir) {
                        case 'up':
                            setClass('up');
                            break;
                        case 'down':
                            setClass('down');
                            break;
                        case 'pup':
                            isPgeInc = true;
                            setClass('up');
                            break;
                        case 'pdown':
                            isPgeInc = true;
                            setClass('down');
                            break;
                        case 'none':
                            setClass('');
                            break;
                    }
                }
                el.focusin(function() {
                    el.val(value);
                });
                el.click(function(e) {
                    mouseCaptured = true;
                    isPgeInc = false;
                    clearInterval(interval);
                    onValueChange();
                });
                el.mouseenter(function(e) {
                    el.val(value);
                });
                el.mousemove(function(e) {

                    if (e.pageX > (el.offset().left + settings.width) - settings.btnWidth - 4) {
                        if (e.pageY < el.offset().top + settings.height / 2)
                            setDirection('up');
                        else
                            setDirection('down');
                    }
                    else
                        setDirection('none');
                });
                el.mousedown(function(e) {
                    isPgeInc = false;
                  //  clearInterval(interval);
                   // interval = setInterval(onValueChange, 100);
                });
                el.mouseup(function(e) {
                    mouseCaptured = false;
                    isPgeInc = false;
                  //  clearInterval(interval);

                });
                el.mouseleave(function(e) {
                    setDirection('none');
                    if (settings.mask != '') el.val(settings.mask);
                }); el.keydown(function(e) {
                    switch (e.which) {
                        case UP:
                            setDirection('up');
                            onValueChange();
                            break; // Arrow Up
                        case DOWN:
                            setDirection('down');
                            onValueChange();
                            break; // Arrow Down
                        case PAGEUP:
                            setDirection('pup');
                            onValueChange();
                            break; // Page Up
                        case PAGEDOWN:
                            setDirection('pdown');
                            onValueChange();
                            break; // Page Down
                        default:
                            setDirection('none');
                            break;
                    }
                });

                el.keyup(function(e) {
                    setDirection('none');
                });
                el.keypress(function(e) {
                    if (el.val() == settings.mask) el.val(value);

                    /*
 	 	 	 	     * Begin Kuali Customization
 	 	 	 	     * KULRICE-6382
 	 	 	 	     * The previous logic did not work well with tabbing through the form
 	 	 	 	     */
	                if (e.which >= 48 && e.which <= 57) {
                        var sText = getSelectedText();
 	 	 	 	        if (sText != '') {
 	 	 	 	            sText = el.val().replace(sText, '');
 	 	 	 	            el.val(sText);
                        }

                        var temp = parseFloat(el.val() + (e.which - 48));
                        if (temp >= settings.min && temp <= settings.max) {
                            value = temp;
                            raiseCallback(value);
                        }
                        else {
                            e.preventDefault();
                        }
                    }
                    else if (e.which != 0 && e.which != 13 && e.which != 8) {
 	 	 	 	        return false;
 	 	 	 	    }
                });
                el.blur(function() {
                    /*
 	 	 	 	     * Begin Kuali Customization
 	 	 	 	     * KULRICE-6382
 	 	 	 	     * The previous logic did not work well with tabbing through the form
 	 	 	 	     */
                    if (settings.mask == '') {
                        if (el.val() == '')
                            el.val(settings.min);
                        else
 	 	 	 	            value = parseFloat(el.val());
                    }
                    else {
                        el.val(settings.mask);
                    }
                });
                el.bind("mousewheel", function(e) {
                    if (e.wheelDelta >= 120) {
                        setDirection('down');
                        onValueChange();
                    }
                    else if (e.wheelDelta <= -120) {
                        setDirection('up');
                        onValueChange();
                    }

                    e.preventDefault();
                });
                if (this.addEventListener) {
                    this.addEventListener('DOMMouseScroll', function(e) {
                        if (e.detail > 0) {
                            setDirection('down');
                            onValueChange();
                        }
                        else if (e.detail < 0) {
                            setDirection('up');
                            onValueChange();
                        }
                        e.preventDefault();
                    }, false);
                }

                function raiseCallback(val) {
                    if (settings.callback != null) settings.callback(val);
                }
                function getSelectedText() {

                    var startPos = el.get(0).selectionStart;
                    var endPos = el.get(0).selectionEnd;
                    var doc = document.selection;

                    if (doc && doc.createRange().text.length != 0) {
                        return doc.createRange().text;
                    } else if (!doc && el.val().substring(startPos, endPos).length != 0) {
                        return el.val().substring(startPos, endPos);
                    }
                    return '';
                }
                function setValue(a, b) {
                    if (a >= settings.min && a <= settings.max) {
                        value = b;
                    } el.val(value);
                }
                function onValueChange() {
                    if (direction == 'up') {
                        value += settings.stepInc;
                        if (value > settings.max) value = settings.max;
                        setValue(parseFloat(el.val()), value);
                    }
                    if (direction == 'down') {
                        value -= settings.stepInc;
                        if (value < settings.min) value = settings.min;
                        setValue(parseFloat(el.val()), value);
                    }
                    if (direction == 'pup') {
                        value += settings.pageInc;
                        if (value > settings.max) value = settings.max;
                        setValue(parseFloat(el.val()), value);
                    }
                    if (direction == 'pdown') {
                        value -= settings.pageInc;
                        if (value < settings.min) value = settings.min;
                        setValue(parseFloat(el.val()), value);
                    }
                    raiseCallback(value);
                }
                function setClass(name) {
                    el.removeClass('up').removeClass('down');
                    if (name != '') el.addClass(name);
                }
            });
        }
    });
})(jQuery);
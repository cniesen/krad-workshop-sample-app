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

var bodyHeight;
var profilingOn = false;

/**
 * Handle checkbox label clicks to get around issue with rich message content.
 *
 * <p>When the label text itself is clicked, the checkbox should toggle.  When the field associated with
 * the checkbox is clicked, the checkbox should be checked regardless of state.
 * Clicking links or buttons in rich content should do nothing to the state.</p>
 *
 * @param checkboxId id of the checkbox to check/uncheck
 * @param event event with the associated clicked target
 */
function handleCheckboxLabelClick(checkboxId, event) {
    var checkbox = jQuery("#" + checkboxId);
    if (!checkbox.prop("disabled")) {
        if (jQuery(event.target).is("input, select, textarea, option")) {
            if (!checkbox.prop("checked")) {
                checkbox.prop("checked", true);
                checkbox.change();
            }
        }
        else if (jQuery(event.target).is("a, button")) {
            //do nothing
        }
        else {
            if (checkbox.prop("checked")) {
                checkbox.prop("checked", false);
                checkbox.change();
            }
            else {
                checkbox.prop("checked", true);
                checkbox.change();
            }
        }
    }
}

/**
 * Handle radio label clicks to get around issue with rich message content.
 *
 * @param radioId id of the radio to check
 * @param event event with the associated clicked target
 */
function handleRadioLabelClick(radioId, event) {
    var radio = jQuery("#" + radioId);
    if (!radio.prop("disabled") && !radio.prop("checked")) {
        radio.prop("checked", true);
        radio.change();
    }
}

/**
 * Takes a name that may have characters incompatible with jQuery selection and escapes them so they can
 * be used in selectors.  This method MUST be called when selecting on a name that can be ANY name on the page
 * to avoid issues with collections(mainly)
 *
 * @returns a string that has been escaped for use in jQuery selectors
 */
function escapeName(name) {
    name = name.replace(/\\'/g, "'");
    name = name.replace(/'/g, "\\'");
    name = name.replace(/\\"/g, "\"");
    name = name.replace(/"/g, "\\\"");
    name = name.replace(/\./g, "\\.");
    name = name.replace(/\[/g, "\\[");
    name = name.replace(/\]/g, "\\]");

    return name;
}

/**
 * Convert the text passed in from escapedHtml to html text.  Remove all anchor tags if flag is set to true.
 *
 * @param text the text with gt; and lt; and other escaped symbols that need to be translated
 * @param removeAnchors if true, do not include the anchor tags in the converted text
 * (but, still include their textual content)
 */
function convertToHtml(text, removeAnchors) {
    if (removeAnchors) {
        text = text.replace(/&lt;a.+?&gt;/gi, "");
        text = text.replace(/&lt;\/a&gt;/gi, "");
    }

    return jQuery("<span />", { html: text }).text();
}

/**
 * Can be used when the view is within a iframe to publish its height to the surrounding window (for
 * resizing the iframe if necessary)
 */
function publishHeight() {
    var parentUrl = "";
    if (navigator.cookieEnabled) {
        parentUrl = jQuery.cookie('parentUrl');
        var passedUrl = decodeURIComponent(document.location.hash.replace(/^#/, ''));
        if (passedUrl && passedUrl.substring(0, 4) === "http") {
            jQuery.cookie('parentUrl', passedUrl, {path: '/'});
            parentUrl = passedUrl;
        }
    }

    if (parentUrl === "") {
        //make the assumption for not cross-domain, will have no effect if cross domain (message wont be
        //received)
        parentUrl = window.location;
        parentUrl = decodeURIComponent(parentUrl);
    }

    var height = jQuery("body").outerHeight();
    jQuery("body").attr("style", "overflow-x: auto; padding-right: 20px;");
    if (parentUrl && !isNaN(height) && height > 0) {
        jQuery.postMessage({ if_height: height}, parentUrl, parent);
        bodyHeight = height;
    }
}

/**
 * Get the current context
 *
 * @returns the jQuery context that can be used to perform actions that must be global to the entire page
 * ie, showing lightBoxes and growls etc
 */
function getContext() {
    if (usePortalForContext()) {
        return top.jQuery;
    }
    else {
        return jQuery.noConflict();
    }
}

/**
 * Check if portal should be used for context
 *
 * <p>
 * To avoid cross server script errors the local context is used in case the portal window is on a different host.
 * </p>
 *
 * @return true if portal is used for context, false otherwise
 */
function usePortalForContext() {
    var usePortal = false;

    // for iframe use the outer window's context unless the outer window is hosted on a different domain.
    try {
        // For security reasons the browsers will not allow cross server scripts and
        // throw an exception instead.
        // Note that bad browsers (e.g. google chrome) will not catch the exception
        usePortal = (top != self) && (top.location.host == location.host);
    }
    catch (e) {
        usePortal = false;
    }

    return usePortal;
}

/**
 * Indicates whether the given window is the portal container
 *
 * @param window - window to test
 */
function isPortalContainer(window) {
    return window.jQuery('#' + kradVariables.PORTAL_IFRAME_ID).length;
}

/**
 * Sets a configuration parameter that will be accessible with script
 *
 * <p>
 * Configuration parameters are sent from the server and represent non-component
 * state, such as location of images
 * </p>
 *
 * @param paramName - name of the configuration parameter
 * @param paramValue - value for the configuration parameter
 */
function setConfigParam(paramName, paramValue) {
    var configParams = jQuery(document).data("ConfigParameters");
    if (!configParams) {
        configParams = new Object();
        jQuery(document).data("ConfigParameters", configParams);
    }
    configParams[paramName] = paramValue;
}

/**
 * Called when a view is rendered to initialize the state of components
 * that need to be accessed client side
 *
 * @param viewState - map (object) containing the view state
 */
function initializeViewState(viewState) {
    jQuery(document).data(kradVariables.VIEW_STATE, viewState);
}

/**
 * Updates the current view state with the given map of view state
 *
 * <p>
 * The given state will be merged with the current. Matching keys for simple properties will be overridden
 * if contained in the second map, in all cases except when the value is another map, in which case the map
 * value will be merged
 * </p>
 *
 * @param viewState - view state to merge in
 */
function updateViewState(viewState) {
    var currentViewState = jQuery(document).data(kradVariables.VIEW_STATE);
    if (currentViewState) {
        jQuery.extend(currentViewState, viewState);
    }
    else {
        jQuery(document).data(kradVariables.VIEW_STATE, viewState);
    }
}

/**
 * Sets a key/value pair in the view state
 *
 * @param key - name to reference state by
 * @param value - value for the state
 */
function setViewState(key, value) {
    var viewState = jQuery(document).data(kradVariables.VIEW_STATE);
    if (!viewState) {
        viewState = new Object();
        jQuery(document).data(kradVariables.VIEW_STATE, viewState);
    }
    viewState[key] = value;
}

/**
 * Retrieves the current value for a given key in the view state, if
 * not found empty string is returned
 *
 * @param key - name of the variable in view state to return
 */
function getViewState(key) {
    var viewState = jQuery(document).data(kradVariables.VIEW_STATE);
    if (viewState && viewState.hasOwnProperty(key)) {
        return viewState[key];
    }
    return "";
}

/**
 * Adds the given key/value pair to the state maintained for the give component
 *
 * @param componentId - id for the component the state should be associated with
 * @param key - name to reference the state by
 * @param value - value for the state
 */
function setComponentState(componentId, key, value) {
    var componentState = getViewState(componentId);
    if (!componentState) {
        componentState = new Object();
        setViewState(componentId, componentState);
    }
    componentState[key] = value;
}

/**
 * Retrieves the state value for the given key and given component
 *
 * @param componentId - id for the component the key is associated with
 * @param key - name of the state to retrieve
 */
function getComponentState(componentId, key) {
    var componentState = getViewState(componentId);
    if (componentState && componentState.hasOwnProperty(key)) {
        return componentState[key];
    }
    return "";
}

// gets the the label for field with the corresponding id
function getLabel(id) {
    var label = jQuery("#" + id + "_label");
    if (label) {
        return label.text();
    }
    else {
        return "";
    }
}
/**
 * runs hidden scripts. The hidden scripts are contained in hidden input elements
 *
 * @param id - the tag id or selector expression to use. If empty, run all hidden scripts
 * @param isSelector - when present and true, the value given for the id used as jquery selector expression
 * @param skipValidationBubbling - set to true to skip processing each field - ONLY is ever true for pages since
 * they handle this during the setupPage call
 */
function runHiddenScripts(id, isSelector, skipValidationBubbling) {
    if (id) {

        var selector = "#" + id;
        if (isSelector) {
            selector = id;
        }

        evaluateScripts(selector);
        runScriptsForId(id);

        //reinit dirty fields
        jQuery('#kualiForm').dirty_form({changedClass: kradVariables.DIRTY_CLASS, includeHidden: true});

        //reinitialize BubblePopup
        initBubblePopups();

        //Interpret new server message state for refreshed InputFields and write them out
        if (!skipValidationBubbling) {
            jQuery(selector).find("div[data-role='InputField']").andSelf().filter("div[data-role='InputField']").each(function () {
                var data = jQuery(this).data(kradVariables.VALIDATION_MESSAGES);
                handleMessagesAtField(jQuery(this).attr('id'));
            });
        }
    }
    else {
        evaluateScripts();

        //reinitialize BubblePopup
        initBubblePopups();
    }
}

/**
 * Evaluate scripts for the selection, if defined.  If no selector is defined, evaluate hidden scripts
 * for the entire document
 *
 * @param selector optional jQuery selector string to select the object to run scripts for
 */
function evaluateScripts(selector) {
    if (selector) {
        //run dataScript first always
        jQuery(selector).find("input[data-role='dataScript']").each(function () {
            evalHiddenScript(jQuery(this));
        });

        jQuery(selector).find("input[name='script']").each(function () {
            evalHiddenScript(jQuery(this));
        });
    }
    else {
        //run scripts for entire document if no selector defined
        //run dataScript first always
        jQuery("input[data-role='dataScript']").each(function () {
            evalHiddenScript(jQuery(this));
        });

        jQuery("input[name='script']").each(function () {
            evalHiddenScript(jQuery(this));
        });
    }
}

/**
 * runs hidden scripts. The hidden scripts are contained in hidden input elements
 *
 * <p>Finds all hidden inputs with the attribute data-role having a value of 'dataScript' or 'script'
 * then runs the script in the value attribute if the input's data-for attribute value is equal to the id provided</p>
 *
 * @param id - the tag id to use
 */
function runScriptsForId(id) {
    if (id) {
        jQuery("input[data-for='" + id + "']").filter("[data-role='dataScript']").each(function () {
            evalHiddenScript(jQuery(this));
        });

        jQuery("input[data-for='" + id + "']").filter("[data-role='script']").each(function () {
            evalHiddenScript(jQuery(this));
        });
    }
}

/**
 * do the actual work of evaluating a script once it has been located
 *
 * @param jqueryObj - a jquery object representing a hidden input element with a script in its value attribute
 */
function evalHiddenScript(jqueryObj) {
    eval(jqueryObj.val());
    jqueryObj.attr("script", "first_run");
    jqueryObj.removeAttr("name");
}

/**
 * run hidden scripts again
 *
 * <p>This is needed in situations where due to some bugs in page refreshes or progressive rendering,
 * the hidden scripts may have run but not accomplished the desired results</p>
 */
function runHiddenScriptsAgain() {
    jQuery("input[data-role='dataScript']").each(function () {
        eval(jQuery(this).val());
        jQuery(this).removeAttr("script");
    });
    jQuery("input[script='first_run']").each(function () {
        eval(jQuery(this).val());
        jQuery(this).removeAttr("script");
    });
}

/**
 * Writes a hidden for property 'methodToCall' set to the given value. This is
 * useful for submitting forms with JavaScript where the methodToCall needs to
 * be set before the form is submitted.
 *
 * @param methodToCall -
 *          the value that should be set for the methodToCall parameter
 */
function setMethodToCall(methodToCall) {
    jQuery("<input type='hidden' name='methodToCall' value='" + methodToCall + "'/>").appendTo(jQuery("#formComplete"));
}

/**
 * Writes a property name/value pair as a hidden input field on the form. Called
 * to dynamically set request parameters based on a chosen action. Assumes
 * existence of a div named 'formComplete' where the hidden inputs will be
 * inserted
 *
 * @param propertyName -
 *          name for the input field to write
 * @param propertyValue -
 *          value for the input field to write
 */
function writeHiddenToForm(propertyName, propertyValue) {
    //removing because of performFinalize bug
    jQuery('input[name="' + escapeName(propertyName) + '"]').remove();

    if (propertyValue.indexOf("'") != -1) {
        jQuery("<input type='hidden' name='" + propertyName + "'" + ' value="' + propertyValue + '"/>').appendTo(jQuery("#formComplete"));
    } else {
        jQuery("<input type='hidden' name='" + propertyName + "' value='" + propertyValue + "'/>").appendTo(jQuery("#formComplete"));
    }
}

/**
 * In some cases when an action is invoked, data that should be passed with
 * the request is written to the form as hiddens using the #writeHiddenToForm method. If
 * there are errors in the script that prevent the action from completing, this method can
 * be called to clear the hiddens
 */
function clearHiddens() {
    jQuery("#formComplete").html("");
}

/**
 * Retrieves the actual value from the input widget specified by name
 */
function coerceValue(name) {
    var value = "";
    var nameSelect = "[name='" + escapeName(name) + "']";
    if (jQuery(nameSelect + ":checkbox").length) {
        value = jQuery(nameSelect + ":checked").val();
    }
    else if (jQuery(nameSelect + ":radio").length) {
        value = jQuery(nameSelect + ":checked").val();
    }
    else if (jQuery(nameSelect).length) {
        if (jQuery(nameSelect).hasClass("watermark")) {
            jQuery.watermark.hide(nameSelect);
            value = jQuery(nameSelect).val();
            jQuery.watermark.show(nameSelect);
        }
        else {
            value = jQuery(nameSelect).val();
        }
    }

    if (value == null) {
        value = "";
    }

    return value;
}

/**
 * Sets a value on the control with the given name attribute
 *
 * @param name - name on control to set value for
 * @param value - value to set
 */
function setValue(name, value) {
    var nameSelect = "[name='" + escapeName(name) + "']";
    jQuery(nameSelect).val(value);
}

function isValueEmpty(value) {
    if (value != undefined && value != null && value != "") {
        return false;
    }
    else {
        return true;
    }
}

//returns true if the field with name of name1 occurs before field with name2
function occursBefore(name1, name2) {
    var field1 = jQuery("[name='" + escapeName(name1) + "']");
    var field2 = jQuery("[name='" + escapeName(name2) + "']");

    field1.addClass("prereqcheck");
    field2.addClass("prereqcheck");

    var fields = jQuery(".prereqcheck");

    field1.removeClass("prereqcheck");
    field2.removeClass("prereqcheck");

    if (fields.index(field1) < fields.index(field2)) {
        return true;
    }
    else {
        return false;
    }
}

/**
 * Validate dirty fields on the form
 *
 * <p>Whenever the user clicks on the action field which navigates away from the page,
 * form dirtyness is checked. It checks for any input elements which has "dirty" class. If present,
 * it pops a message to the user to confirm whether they want to stay on the page or want to navigate.
 * </p>
 *
 * @param event - the event which triggered the action
 * @returns true if the form has dirty fields, false if not
 */
function checkDirty(event) {
    var validateDirty = jQuery("#validateDirty").val();
    var dirty = jQuery("." + kradVariables.FIELD_CLASS).find("input." + kradVariables.DIRTY_CLASS);

    if (validateDirty == "true" && dirty.length > 0) {
        var dirtyMessage = getMessage(kradVariables.MESSAGE_KEY_DIRTY_FIELDS);
        var answer = confirm(dirtyMessage);

        if (answer == false) {
            event.preventDefault();
            event.stopImmediatePropagation();

            // change the current nav button class to 'current' if user doesn't wants to leave the page
            var ul = jQuery("#" + event.target.id).closest("ul");
            if (ul.length > 0) {
                var pageId = jQuery("[name='view.currentPageId']").val();
                if (ul.hasClass(kradVariables.TAB_MENU_CLASS)) {
                    jQuery("#" + ul.attr("id")).selectTab({selectPage: pageId});
                }
                else {
                    jQuery("#" + ul.attr("id")).selectMenuItem({selectPage: pageId});
                }
            }

            return true;
        }
    }

    return false;
}

/**
 * Gets the actual attribute id to use element manipulation related to this attribute.
 *
 * @param elementId
 * @param elementType
 */
function getAttributeId(elementId) {
    var id = elementId;
    id = elementId.replace(/_control\S*/, "");
    return id;
}

/**
 * Invoked after the page or a component is refreshed to perform any repositioning or setting
 * of focus
 *
 * @param setFocus - boolean that indicates whether focus should be set, if false just the jump will be performed
 * @param autoFocus - boolean that indicates where focus to top should happen if focus to not set
 * @param autoJump - boolean that indicates where jump to top should happen if jump to not set
 * @param focusId - id of the dom element to focus on
 * @param jumpToId - id of the dom element to jump to
 * @param jumpToName - name of the dom element to jump to
 */
function performFocusAndJumpTo(setFocus, autoFocus, autoJump, focusId, jumpToId, jumpToName) {
    if (setFocus) {
        performFocus(focusId);
    }

    if (jumpToId || jumpToName || autoJump) {
        performJumpTo(jumpToId, jumpToName);
    }
}

//performs a 'jump' - a scroll to the necessary html element
function performJumpTo(jumpToId, jumpToName) {
    if (jumpToId) {
        if (jumpToId.toUpperCase() === "TOP") {
            jumpToTop();
        }
        else if (jumpToId.toUpperCase() === "BOTTOM") {
            jumpToBottom();
        }
        else {
            jumpToElementById(jumpToId);
        }
    }
    else if (jumpToName) {
        jumpToElementByName(jumpToName);
    }
    else {
        jumpToTop();
    }
}

/**
 * Performs a focus on an the element with the id preset
 *
 * @param focusId - id of the dom element to focus on
 * @param autoFocus - boolean that indicates where focus to top should happen if focus to not set
 */
function performFocus(focusId, autoFocus) {
    if (focusId) {
        jQuery("#" + focusId).focus();
    }
    else if (autoFocus) {
        jQuery("div[data-role='InputField'] .uif-control:visible:first", "#kualiForm").focus();
    }
}

//performs a focus on an the element with the name specified
function focusOnElementByName(name) {
    var theElement = jQuery("[name='" + escapeName(name) + "']");
    if (theElement.length != 0) {
        theElement.focus();
    }
}

//performs a focus on an the element with the id specified
function focusOnElementById(focusId) {
    if (focusId) {
        jQuery("#" + focusId).focus();
    }
}

//Jump(scroll) to an element by name
function jumpToElementByName(name) {
    var theElement = jq("[name='" + escapeName(name) + "']");
    if (theElement.length != 0) {
        if (!usePortalForContext() || jQuery("#fancybox-frame", parent.document).length) {
            jQuery.scrollTo(theElement, 0);
        }
        else {
            var headerOffset = top.jQuery("#header").outerHeight(true) + top.jQuery(".header2").outerHeight(true);
            top.jQuery.scrollTo(theElement, 0, {offset: {top: headerOffset}});
        }
    }
}

//Jump(scroll) to an element by Id
function jumpToElementById(id) {
    var theElement = jq("#" + id);
    if (theElement.length != 0) {
        if (!usePortalForContext() || jQuery("#fancybox-frame", parent.document).length) {
            jQuery.scrollTo(theElement, 0);
        }
        else {
            var headerOffset = top.jQuery("#header").outerHeight(true) + top.jQuery(".header2").outerHeight(true);
            top.jQuery.scrollTo(theElement, 0, {offset: {top: headerOffset}});
        }
    }
}

//Jump(scroll) to the top of the current screen
function jumpToTop() {
    if (!usePortalForContext() || jQuery("#fancybox-frame", parent.document).length) {
        jQuery.scrollTo(jQuery("html"), 0);
    }
    else {
        top.jQuery.scrollTo(top.jQuery("html"), 0);
    }
}

//Jump(scroll) to the bottom of the current screen
function jumpToBottom() {
    if (!usePortalForContext() || jQuery("#fancybox-frame", parent.document).length) {
        jQuery.scrollTo("max", 0);
    }
    else {
        top.jQuery.scrollTo("max", 0);
    }
}

// The following javascript is intended to resize the route log iframe
// to stay at an appropriate height based on the size of the documents
// contents contained in the iframe.
// NOTE: this will only work when the domain serving the content of kuali
// is the same as the domain serving the content of workflow.
var routeLogResizeTimer = "";
var currentHeight = 500;
var safari = navigator.userAgent.toLowerCase().indexOf('safari');

function setRouteLogIframeDimensions() {
    var routeLogFrame = document.getElementById("routeLogIFrame");
    var routeLogFrame = document.getElementById("routeLogIFrame");
    var routeLogFrameWin = window.frames["routeLogIFrame"];
    var frameDocHeight = 0;
    try {
        frameDocHeight = routeLogFrameWin.document.documentElement.scrollHeight;
    } catch (e) {
        // unable to set due to cross-domain scripting
        frameDocHeight = 0;
    }

    if (frameDocHeight > 0) {
        if (routeLogFrame && routeLogFrameWin) {

            if ((Math.abs(frameDocHeight - currentHeight)) > 30) {
                if (safari > -1) {
                    if ((Math.abs(frameDocHeight - currentHeight)) > 59) {
                        routeLogFrame.style.height = (frameDocHeight + 30) + "px";
                        currentHeight = frameDocHeight;
                    }
                } else {
                    routeLogFrame.style.height = (frameDocHeight + 30) + "px";
                    currentHeight = frameDocHeight;
                }
            }
        }
    }

    if (routeLogResizeTimer == "") {
        routeLogResizeTimer = setInterval("resizeTheRouteLogFrame()", 300);
    }
}

function resizeTheRouteLogFrame() {
    setRouteLogIframeDimensions();
}

/**
 * Adds or adds value to the attribute on the element.
 *
 * @param id - element id
 * @param attributeName - name of the attribute to add/add to
 * @param attributeValue - value of the attribute
 * @param concatFlag - indicate if value should be added to current value
 */
function addAttribute(id, attributeName, attributeValue, concatFlag) {
    hasAttribute = jQuery("#" + id).is('[' + attributeName + ']');
    if (concatFlag && hasAttribute) {
        jQuery("#" + id).attr(attributeName, jQuery("#" + id).attr(attributeName) + " " + attributeValue);
    } else {
        jQuery("#" + id).attr(attributeName, attributeValue);
    }
}

/**
 * Open new browser window for the specified help url
 *
 * The help window is positioned in the center of the screen and resized to 1/4th of the screen.
 *
 * Browsers don't allow one to modify windows of other domains.  Thus to ensure that only one help window exist
 * and to guarantee it's placement, size and that the window is in the foreground the following process is performed:
 *   1) open the help window - this ensures that we get a window handle to any existing help window
 *   2) close the help window
 *   3) open a new help window with the correct placement, size and url
 *
 * @param url - url of the help window content
 */
function openHelpWindow(url) {
    var windowWidth = screen.availWidth / 2;
    var windowHeight = screen.availHeight / 2;
    var windowPositionY = parseInt((screen.availWidth / 2) - (windowWidth / 2));
    var windowPositionX = parseInt((screen.availHeight / 2) - (windowHeight / 2));

    var windowUrl = url;
    var windowName = 'HelpWindow';
    var windowOptions = 'width=' + windowWidth + ',height=' + windowHeight + ',top=' + windowPositionX + ',left=' + windowPositionY + ',scrollbars=yes,resizable=yes';

    var myWindow = window.open('', windowName);
    myWindow.close();
    myWindow = window.open(windowUrl, windowName, windowOptions);
}

/**
 * Uppercases the current value for the control with the given id
 *
 * @param controlId - id for the control whose value should be uppercased
 */
function uppercaseValue(controlId) {
    jQuery("#" + controlId).css('text-transform', 'uppercase');
}

/**
 * Profiling helper method will print out profile info in firefox console
 *
 * @param start true to start profiling, false to stop profiling
 * @param testingText text to be printed with this profile
 */
function profile(start, testingText) {
    if (profilingOn) {
        if (start) {
            console.time(testingText);
            console.profile(testingText);
        }
        else {
            console.profileEnd();
            console.timeEnd(testingText);
        }

    }
}

/**
 * Timing method for profiling use - will print out in console
 *
 * @param start true to start timing, false to stop timing
 * @param testingText text to be printed out with time results
 */
function time(start, testingText) {
    if (profilingOn) {
        if (start) {
            console.time(testingText);
        }
        else {
            console.timeEnd(testingText);
        }
    }
}

/**
 * Adds a class to the collection item related to the delete action
 *
 * @param deleteButton - the delete button that this event was triggered from
 * @param highlightItemClass - the class to add to the item that should be highlighted
 */
function deleteLineMouseOver(deleteButton, highlightItemClass) {
    var innerLayout = jQuery(deleteButton).parents('.' + kradVariables.TABLE_COLLECTION_LAYOUT_CLASS
            + ', .' + kradVariables.STACKED_COLLECTION_LAYOUT_CLASS).first().attr('class');
    if (innerLayout.indexOf(kradVariables.TABLE_COLLECTION_LAYOUT_CLASS) >= 0) {
        jQuery(deleteButton).closest('tr').addClass(highlightItemClass);
    } else {
        jQuery(deleteButton).closest('.' + kradVariables.COLLECTION_ITEM_CLASS).addClass(highlightItemClass);
    }
}

/**
 * Removes a class from the collection item related to the delete action
 *
 * @param deleteButton - the delete button that this event was triggered from
 * @param highlightItemClass - the class remove from the collection item
 */
function deleteLineMouseOut(deleteButton, highlightItemClass) {
    var innerLayout = jQuery(deleteButton).parents('.' + kradVariables.TABLE_COLLECTION_LAYOUT_CLASS
            + ', .' + kradVariables.STACKED_COLLECTION_LAYOUT_CLASS).first().attr('class');
    if (innerLayout.indexOf(kradVariables.TABLE_COLLECTION_LAYOUT_CLASS) >= 0) {
        jQuery(deleteButton).closest('tr').removeClass(highlightItemClass);
    } else {
        jQuery(deleteButton).closest('.' + kradVariables.COLLECTION_ITEM_CLASS).removeClass(highlightItemClass);
    }
}

/**
 * Adds a class to the collection group related to the add action
 *
 * @param addButton - the add button that this event was triggered from
 * @param highlightItemClass - the class to add to the group that should be highlighted
 */
function addLineMouseOver(addButton, highlightItemClass) {
    var innerLayout = jQuery(deleteButton).parents('.' + kradVariables.TABLE_COLLECTION_LAYOUT_CLASS
            + ', .' + kradVariables.STACKED_COLLECTION_LAYOUT_CLASS).first().attr('class');
    if (innerLayout.indexOf(kradVariables.TABLE_COLLECTION_LAYOUT_CLASS) >= 0) {
        jQuery(addButton).parent().find('table').addClass(highlightItemClass);
    } else {
        jQuery(addButton).parent().find('.' + kradVariables.STACKED_COLLECTION_LAYOUT_CLASS).addClass(highlightItemClass).children().addClass(highlightItemClass);
    }
}

/**
 * Removes a class from the collection group related to the add action
 *
 * @param addButton - the add button that this event was triggered from
 * @param highlightItemClass - the class remove from the collection group
 */
function addLineMouseOut(addButton, highlightItemClass) {
    var innerLayout = jQuery(deleteButton).parents('.' + kradVariables.TABLE_COLLECTION_LAYOUT_CLASS
            + ', .' + kradVariables.STACKED_COLLECTION_LAYOUT_CLASS).first().attr('class');
    if (innerLayout.indexOf(kradVariables.TABLE_COLLECTION_LAYOUT_CLASS) >= 0) {
        jQuery(addButton).parent().find('table').removeClass(highlightItemClass);
    } else {
        jQuery(addButton).parent().find('.' + kradVariables.STACKED_COLLECTION_LAYOUT_CLASS).removeClass(highlightItemClass).children().removeClass(highlightItemClass);
    }
}

/**
 * Enables and disables the save action
 *
 * @param inputField
 * @param highlightItemClass - the class to add to the collection item
 */
function collectionLineChanged(inputField, highlightItemClass) {
    // This is not very good for performance but because dirty_form gets binded after this event so we need to trigger
    // the dirty_form check before checking for the dirty fields
    jQuery(inputField).triggerHandler('blur');

    // Get the innerlayout to see if we are dealing with table or stack group
    var innerLayout = jQuery(inputField).parents('.' + kradVariables.TABLE_COLLECTION_LAYOUT_CLASS
            + ', .' + kradVariables.STACKED_COLLECTION_LAYOUT_CLASS).first().attr('class');

    if (innerLayout.indexOf(kradVariables.TABLE_COLLECTION_LAYOUT_CLASS) >= 0) {
        var row = jQuery(inputField).closest('tr');
        var enabled = row.find('.dirty').length > 0;
        var saveButton = row.find('.' + kradVariables.SAVE_LINE_ACTION_CLASS);

        if (enabled) {
            saveButton.removeAttr('disabled');
        } else {
            saveButton.attr('disabled', 'disabled');
        }

    } else {
        var itemGroup = jQuery(inputField).closest('.' + kradVariables.COLLECTION_ITEM_CLASS);
        var enabled = itemGroup.find('.dirty').length > 0;
        var saveButton = itemGroup.find('.' + kradVariables.SAVE_LINE_ACTION_CLASS);

        if (enabled) {
            saveButton.removeAttr('disabled');
        } else {
            saveButton.attr('disabled', 'disabled');
        }

    }
}

/**
 * Display the component of the id in a light box
 *
 * <p>
 * The specified component is used as the content of the fancy box.
 * The second argument is optional and allows the FancyBox options to be overridden.
 * </p>
 *
 * @param componentId the id of the component that will be used for the lightbox content (usually a group id)
 * @param overrideOptions the map of option settings (option name/value pairs) for the plugin. This is optional.
 */
function showLightboxComponent(componentId, overrideOptions) {
    if (overrideOptions === undefined) {
        overrideOptions = {};
    }

    // set renderedInLightBox indicator and remove it when lightbox is closed
    if (jQuery('#renderedInLightBox').val() != true) {
        jQuery('#renderedInLightBox').val(true);
        _appendCallbackFunctions(overrideOptions, {afterClose: function () {
            jQuery('#renderedInLightBox').val(false);
        }});
    }

    if (jQuery('#' + componentId).hasClass('uif-placeholder')) {
        retrieveComponent(componentId, undefined, function () {
            _showLightboxComponentHelper(componentId, overrideOptions)
        });
    } else {
        _showLightboxComponentHelper(componentId, overrideOptions)
    }
}

/**
 * This internal function continues the showLightboxComponent processing after the ajax content has been rendered.
 */
function _showLightboxComponentHelper(componentId, overrideOptions) {
    var component = jQuery('#' + componentId);
    var cssDisplay = component.css('display');

    // suppress scrollbar when not needed
    // undo the div.clearfix hack (KULRICE-7467)
    component.attr('class', component.attr('class').replace('clearfix', ''));
    component.find('div').each(function () {
        jQuery(this).attr('class', jQuery(this).attr('class').replace('clearfix', ''));
    });

    if (top == self) {
        // ensure that component of KualiForm gets updated after fancybox closes
        _appendCallbackFunctions(overrideOptions, {beforeClose: function () {
            // hack fancybox to prevent it from moving the original lightbox content into the body
            jQuery('#' + componentId).parents('.fancybox-wrap').unbind('onReset');

            jQuery('#tmpForm_' + componentId).replaceWith(jQuery('#' + componentId).detach());
            jQuery('#' + componentId).css('display', cssDisplay);
        }});
    } else {
        // reattach component to KualiForm after fancybox closes
        _appendCallbackFunctions(overrideOptions, {beforeClose: function () {
            // hack fancybox to prevent it from moving the original lightbox content into the body
            parent.jQuery('#' + componentId).parents('.fancybox-wrap').unbind('onReset');

            jQuery('#tmpForm_' + componentId).replaceWith(parent.jQuery('#' + componentId).detach());
            jQuery('#' + componentId).css('display', cssDisplay);
        }});
    }

    // clone the content for the lightbox and make the element id unique
    showLightboxContent(component.clone(true, true).css('display', ''), overrideOptions);
    addIdPrefix(component, 'tmpForm_');
}

/**
 * Display the content inside a light box
 *
 * <p>
 * The specified content is used as the content of the fancy box.
 * The second argument is optional and allows the FancyBox options to be overridden.
 * </p>
 *
 * @param content the html formatted content that is displayed inside the lightbox.
 * @param overrideOptions the map of option settings (option name/value pairs) for the plugin. This is optional.
 */
function showLightboxContent(content, overrideOptions) {
    if (overrideOptions === undefined) {
        overrideOptions = {};
    }

    _initAndOpenLightbox({type: 'html', content: content}, overrideOptions);
}

/**
 * Display the url inside a lightbox
 *
 * <p>
 * The specified content is used as the content of the fancy box.
 * The second argument is optional and allows the FancyBox options to be overridden.
 * </p>
 *
 * @param url of the page that is displayed inside the lightbox.
 * @param overrideOptions the map of option settings (option name/value pairs) for the plugin. This is optional.
 */
function showLightboxUrl(url, overrideOptions) {
    if (overrideOptions === undefined) {
        overrideOptions = {};
    }

    _initAndOpenLightbox({type: 'iframe', href: url, height: '95%', width: '75%', autoSize: false},
            overrideOptions);
}

/**
 * Internal function to initialize and open lightbox
 *
 * <p>
 * jQuery Fancybox is used to create the lightbox. The content type and the contents need to be passed as an option.
 * The second argument is optional and allows additional FancyBox options to be overridden.
 * </p>
 *
 * @param contentOptions the content type and content as fancybox options (eg. {type: 'iframe', href: '<url>'}).
 * @param overrideOptions the map of option settings (option name/value pairs) for the plugin. This is optional.
 */
function _initAndOpenLightbox(contentOptions, overrideOptions) {
    var options = {fitToView: true,
        openEffect: 'fade',
        closeEffect: 'fade',
        openSpeed: 200,
        closeSpeed: 200,
        minHeight: 10,
        minWidth: 10,
        helpers: {overlay: {css: {cursor: 'arrow'}, closeClick: false}}
    };

    // override fancybox content options
    jQuery.extend(true, options, contentOptions);

    // override fancybox options
    if (overrideOptions !== undefined) {
        jQuery.extend(true, options, overrideOptions);
    }

    // Open the light box
    if (top == self) {
        jQuery.fancybox(options);
        setupLightboxForm();
    } else {
        // Remove portal css and add lightbox css for the duration of the lightbox's life
        parent.jQuery('link[href="/kr-dev/rice-portal/css/portal.css"]').remove();
        parent.jQuery('head').append('<link href="/kr-dev/rice-portal/css/lightbox.css" rel="stylesheet" type="text/css">');
        _appendCallbackFunctions(options, {afterClose: function () {
            parent.jQuery('head').append('<link href="/kr-dev/rice-portal/css/portal.css" rel="stylesheet" type="text/css">');
            parent.jQuery('link[href="/kr-dev/rice-portal/css/lightbox.css"]').remove();
        }});

        parent.jQuery.fancybox(options);
    }
}

/**
 *  Wrap the div to display in the light box in a form and setup form for validation and dirty checks
 */
function setupLightboxForm() {
    jQuery(".fancybox-inner").children().wrap("<form id='kualiLightboxForm' class='uif-lightbox'>");

    var kualiLightboxForm = jQuery('#kualiLightboxForm');
    setupValidator(kualiLightboxForm);
    kualiLightboxForm.dirty_form({changedClass: kradVariables.DIRTY_CLASS, includeHidden: true});
}

/**
 * Internal function for appending callback function to fancybox options
 *
 * <p>
 * The callback functions are added after the existing callback functions.
 * </p>
 *
 * @param options the existing fancybox options
 * @param appendCallbackFunctions the callback fancybox options that should be added/appended
 */
function _appendCallbackFunctions(options, appendCallbackFunctions) {
    for (var appendCallbackFunction in appendCallbackFunctions) {
        if (typeof appendCallbackFunctions[appendCallbackFunction] === "function") {
            if (options[appendCallbackFunction] === undefined) {
                options[appendCallbackFunction] = appendCallbackFunctions[appendCallbackFunction];
            } else {
                var a = options[appendCallbackFunction];
                var b = appendCallbackFunctions[appendCallbackFunction];
                options[appendCallbackFunction] = function () {
                    a();
                    b();
                };
            }
        }
    }
}

/**
 * Add a prefix to the component id and all the ids of its children
 *
 * @param component
 * @param prefix to be added
 * @return updated component
 */
function addIdPrefix(component, prefix) {
    if (component.attr("id") != undefined) {
        component.attr("id", prefix + component.attr("id"));
    }
    component.find('*').each(function () {
        if (jQuery(this).attr("id") != undefined) {
            jQuery(this).attr("id", prefix + jQuery(this).attr("id"))
        }
    });
    return component;
}

/**
 * Remove a prefix from the component id and all the ids of its children
 *
 * @param component
 * @param prefix to be removed
 * @return updated component
 */
function removeIdPrefix(component, prefix) {
    if (component.length > 0) {
        var regexp = new RegExp("^" + prefix);
        if (component.attr("id") != undefined) {
            component.attr("id", component.attr("id").replace(regexp, ""));
        }
        component.find('*').each(function () {
            if (jQuery(this).attr("id") != undefined) {
                jQuery(this).attr("id", jQuery(this).attr("id").replace(regexp, ""));
            }
        });
    }
    return component;
}

/**
 * opens the lightbox upon return from the server
 *
 * @param dialogId - component id of the content for the lightbox
 */
function openLightboxOnLoad(dialogId) {
    showLightboxComponent(dialogId);
    jQuery('.uif-dialogButtons').button();
}

/**
 * script to run when a lightbox response button is selected.
 *
 * <p>
 * setup common return method for lightboxes, close the fancybox, and submit the form
 * </p>
 */
function lightboxButtonScript() {
    writeHiddenToForm('methodToCall', 'returnFromLightbox');
    jQuery.fancybox.close();
    jQuery('#kualiForm').submit();
}

/**
 * Initialize/recalculate the totals placed in the footer of a richTable.  Also, calculates and places
 * the totals related to group totalling, if present.
 *
 * @param nRow tr element for the footer
 * @param aaData full table data (as derived from the original HTML)
 * @param iStart index for the current display starting point of the current page in the display array
 * @param iEnd index for the current display ending point of the current page in the display array
 * @param aiDisplay index array to translate the visual position to the full data array
 * @param columns columns to total
 */
function initializeTotalsFooter(nRow, aaData, iStart, iEnd, aiDisplay, columns) {
    var footerRow = jQuery(nRow);
    var dataTable = footerRow.closest('table.dataTable');

    footerRow.addClass("uif-totalRow");

    if (jQuery(dataTable).hasClass("uif-hasAddLine")) {
        iEnd = iEnd + 1;
    }
    var onePage = iStart == 0 && iEnd == aaData.length;

    if (onePage) {
        footerRow.find("div[data-role='pageTotal'], label[data-role='pageTotal']").hide();
    }

    var groupTotalRows = dataTable.find("tr[data-groupvalue]");
    var hasGroups = dataTable.data("groups");

    //Only calculate totals if no grouping or when there is grouping, wait for those rows to become
    //generated - avoids unnecessary totalling
    if(!hasGroups || (hasGroups && groupTotalRows.length)){
        var nCells = footerRow.find("th").has("div[data-role='totalsBlock']");

        var groupLabel = footerRow.find("th:first span[data-role='groupTotalLabel']");
        var hasTotalsInFooter = false;

        // Total each column in the columns list
        for (var c = 0; c < nCells.length; c++) {
            var cell = jQuery(nCells[c]);
            var index = cell.index();

            //find the totalsBlocks in the column footer cell, and calculate the appropriate totals
            jQuery("div[data-role='totalsBlock']", cell).each(function () {
                var totalDiv = jQuery(this).find("div[data-role='total']");
                var skipTotal = totalDiv.data("skipTotal");

                if(!skipTotal && totalDiv.length){
                    calculateTotal(totalDiv, 0, aaData.length, columns[c], aaData, aiDisplay);
                    hasTotalsInFooter = true;
                }

                var pageTotalDiv = jQuery(this).find("div[data-role='pageTotal']");
                if (!onePage && pageTotalDiv.length) {
                    calculateTotal(pageTotalDiv, iStart, iEnd, columns[c], aaData, aiDisplay);
                    hasTotalsInFooter = true;
                }

                if(groupTotalRows.length){
                    var groupTotalDiv = jQuery(this).find("div[data-role='groupTotal']");
                    var rowIndex = 0;
                    //for each group total row calculate the group total for the column we are totalling
                    groupTotalRows.each(function(){
                        var groupTotalRow = jQuery(this);
                        var tds = groupTotalRow.find("td");
                        var td = jQuery(tds[index]);
                        var groupValue = groupTotalRow.data("groupvalue");

                        //This means if the group has data that goes into another page, do not display
                        //the group total here - iEnd is the index-1 of the last displayed item (currently displayed)
                        // in the display order list (aiDisplay)
                        var lastValue = aaData[aiDisplay[iEnd - 1]][0];
                        if(lastValue && lastValue.toLowerCase() == groupValue && iEnd < aiDisplay.length &&
                                aaData[aiDisplay[iEnd]][0] && aaData[aiDisplay[iEnd]][0].toLowerCase() == groupValue){
                            groupTotalRow.hide();
                        }
                        else{
                            var groupCellsToTotal = new Array();

                            for(var i = 0; i < aaData.length; i++){
                                var groupingValue = aaData[i][0];
                                if(groupingValue != undefined &&
                                        normalizeGroupString(groupingValue).toLowerCase() == groupValue){
                                    groupCellsToTotal.push(aaData[i][columns[c]]);
                                }
                            }
                            groupTotalRow.show();
                            calculateGroupTotal(groupCellsToTotal, td, groupTotalDiv, rowIndex, columns[c]);
                        }

                        //copy the label to the first column if a group left label exists
                        if(groupLabel.length && jQuery(tds[0]).is(":empty")){
                            groupLabel = groupLabel.clone();
                            //resetting ids to unique ids on the clone
                            groupLabel = groupLabel.attr("id", groupLabel.attr("id") + "_" + rowIndex + columns[c]);
                            groupLabel.find("[id]").each(function(){
                                jQuery(this).attr("id", jQuery(this).attr("id") + "_" + rowIndex + columns[c]);
                            });
                            groupLabel.show();
                            jQuery(tds[0]).append(groupLabel);
                        }

                        rowIndex++;
                    });
                }
            });
        }

        //Hide the footer row if no footer totals or page totals exist
        if(hasTotalsInFooter){
            footerRow.show();
        }
        else{
            footerRow.hide();
        }

    }

}

/**
 * Calculates the group total and places it in the totalTd provided using a clone of the
 *
 * @param cellsToTotal cell data to evaluate for the total
 * @param totalTd the td of the group total row to place the total
 * @param groupTotalDiv the totalDiv to clone and place the total in to be added to the totalTd
 * @param rowIndex index of the the group total row
 * @param columnIndex data column index
 */
function calculateGroupTotal(cellsToTotal, totalTd, groupTotalDiv, rowIndex, columnIndex){

    var total = 0;
    var values = new Array();
    var hasInvalidValues = false;
    var extraData = groupTotalDiv.data("params");
    var functionName = groupTotalDiv.data("function");

    for(var i = 0; i < cellsToTotal.length; i++){
        var currentCell = cellsToTotal[i];

        if (currentCell && jQuery(currentCell).find(":input[name^='newCollectionLines']").length == 0) {
            var value = coerceTableCellValue(currentCell);
            //set hasInvalidValues to true if value is undefined
            if (value == undefined) {
                hasInvalidValues = true;
                break;
            }

            //skip over value when blank
            if (value != "") {
                value = parseFloat(value);
                values.push(value);
            }
        }
    }

    if (!hasInvalidValues) {
        if(extraData != undefined){
            total = window[functionName](values, extraData);
        }
        else{
            total = window[functionName](values);
        }
    }
    else {
        total = "N/A";
    }

    var groupTotalDisplay = totalTd.find("div[data-role='groupTotal'][data-function='" + functionName + "']");
    //clone and append, if no place to display the total has been generated yet
    if(groupTotalDisplay.length == 0){
        groupTotalDisplay = groupTotalDiv.clone();
        //resetting ids to unique ids on the clone
        groupTotalDisplay = groupTotalDisplay.attr("id", groupTotalDisplay.attr("id") + "_" + rowIndex + columnIndex);
        groupTotalDisplay.find("[id]").each(function(){
            jQuery(this).attr("id", jQuery(this).attr("id") + "_" + rowIndex + columnIndex);
        });
        totalTd.append(groupTotalDisplay);
        groupTotalDisplay.show();
    }

    var totalValueSpan = groupTotalDisplay.find("span[data-role='totalValue']");

    if (totalValueSpan.length) {
        totalValueSpan.html(total);
    }
    else {
        var newSpan = jQuery("<span data-role='totalValue'>" + total + "</span>");
        groupTotalDisplay.append(newSpan);
    }

}

/**
 * Calculates a total/calculation for a column with the specified parameters
 *
 * @param totalDiv div of the total field
 * @param start start of the rows to total
 * @param end end of the rows to total
 * @param currentColumn the current column
 * @param aaData all the data
 * @param aiDisplay the rows display order
 */
function calculateTotal(totalDiv, start, end, currentColumn, aaData, aiDisplay) {
    if (totalDiv.length && totalDiv.is(":visible") && totalDiv.data("function")) {
        var totalType = totalDiv.data("role");
        var dataIndex = currentColumn;
        var functionName = totalDiv.data("function");
        var extraData = totalDiv.data("params");
        var total = 0;
        var values = new Array();
        var hasInvalidValues = false;

        // Calculate the total for all rows, even outside this page
        for (var i = start; i < end; i++) {
            var currentCell;
            if(totalType == "total"){
                currentCell = aaData[i][dataIndex];
            }
            else if (totalType = "pageTotal"){
                currentCell = aaData[aiDisplay[i]][dataIndex];
            }
            //skip over cells which contain add line content
            if (currentCell && jQuery(currentCell).find(":input[name^='newCollectionLines']").length == 0) {
                var value = coerceTableCellValue(currentCell);
                //set hasInvalidValues to true if value is undefined
                if (value == undefined) {
                    hasInvalidValues = true;
                    break;
                }

                //skip over value when blank
                if (value != "") {
                    value = parseFloat(value);
                    values.push(value);
                }
            }
        }

        if (!hasInvalidValues) {
            if (extraData != undefined) {
                total = window[functionName](values, extraData);
            }
            else {
                total = window[functionName](values);
            }
        }
        else {
            total = "N/A";
        }

        var totalValueSpan = totalDiv.find("span[data-role='totalValue']");

        if (totalValueSpan.length) {
            totalValueSpan.html(total);
        }
        else {
            var newSpan = jQuery("<span data-role='totalValue'>" + total + "</span>");
            totalDiv.append(newSpan);
        }
    }
}

/**
 * Get the sum of the values passed in
 *
 * @param values the values
 */
function sumValues(values) {
    var total = 0;
    for (var i = 0; i < values.length; i++) {
        total += values[i];
    }
    return total;
}

/**
 * Get the average value from an array of values
 *
 * @param values the values
 * @param decimalPlaces (optional) the number of the decimals to show, 2 if not set
 */
function averageValues(values, decimalPlaces) {
    var total = "N/A";

    if (!decimalPlaces) {
        decimalPlaces = 2;
    }

    if (values.length) {
        total = 0;
        for (var i = 0; i < values.length; i++) {
            total += values[i];
        }
        total = (total / (values.length)).toFixed(decimalPlaces);
    }

    return total;
}

/**
 * Get the maximum value from an array of values
 *
 * @param values the values
 */
function maxValue(values) {
    var max = "N/A";

    if (values.length) {
        max = values[0];
    }

    for (var i = 1; i < values.length; i++) {
        if (values[i] > max) {
            max = values[i];
        }
    }

    return max;
}

/**
 * Get the minimum value from an array of values
 *
 * @param values the values
 */
function minValue(values) {
    var min = "N/A";

    if (values.length) {
        min = values[0];
    }

    for (var i = 1; i < values.length; i++) {
        if (values[i] < min) {
            min = values[i];
        }
    }

    return min;
}

/**
 * Update the cell value on the Datatables data and redraw
 *
 * @param input - the table cell's input
 */
function refreshDatatableCellRedraw(input) {
    input = jQuery(input);
    var cell = input.closest("table.dataTable tr td");
    var fieldDiv = input.closest("div[data-role='InputField']");
    var table = input.closest('table.dataTable');
    var dataTable = jQuery(table).dataTable();
    var pos = dataTable.fnGetPosition(cell.get(0));
    // Have to update cell otherwise datatables does not read it
    dataTable.fnUpdate(fieldDiv, pos[0], pos[2], false, false);
    dataTable.fnCallFooterCallback();
}

/**
 * Get the value from a table cell
 *
 * @param td
 * @return value the value if a numeric value, if blank or disabled returns empty string, if an invalid value
 * returns undefined
 */
function coerceTableCellValue(td) {
    var tdObject = jQuery(td);

    var inputField = tdObject.find(':input');
    var inputFieldValue;

    if (inputField.length > 0) {
        //TODO : use coerceValue()? would we do totals on other types of input
        inputFieldValue = inputField.val();
    } else {
        // This might be after sorting or just read only
        inputField = tdObject.find('span');
        if (inputField.length > 0) {
            // readonly fields
            inputFieldValue = inputField.text().replace(/\s+/g, "");
        } else {
            // after sorting
            inputFieldValue = td;
        }
    }

    if (inputFieldValue === "" || inputField.prop("disabled") || tdObject.hasClass("uif-groupRow")) {
        //skip these situations - blank, disabled, grouping td
        return "";
    }
    else if (jQuery.isNumeric(inputFieldValue)) {
        return inputFieldValue;
    } else {
        return undefined;
    }
}

function normalizeGroupString(sGroup) {
    if (sGroup === "") return "-";
    return sGroup.toLowerCase().replace(/[^a-zA-Z0-9\u0080-\uFFFF]+/g, "-");
}

/**
 * Retrieves the text for a message from cache or server if necessary
 *
 * @param key - key for the message
 * @param namespace - (optional) namespace code for the message
 * @param componentCode - (optional) component code for the message
 */
function getMessage(key, namespace, componentCode) {
    var cacheKey = key;
    if (namespace) {
        cacheKey += "|" + namespace;
    }

    if (componentCode) {
        cacheKey += "|" + componentCode;
    }

    // check session cache first
    var messageText = retrieveFromSession(cacheKey);
    if (messageText) {
        return messageText;
    }

    // retrieve from server
    var params = {};
    params.key = key;

    if (namespace) {
        params.namespace = namespace;
    }

    if (componentCode) {
        params.componentCode = componentCode;
    }

    var response = invokeServerListener(kradVariables.RETRIEVE_MESSAGE_METHOD_TO_CALL, params);
    if (response && response.messageText) {
        messageText = response.messageText;
    }

    // store back to server for subsequent calls
    storeToSession(cacheKey, messageText);

    return messageText;
}

/**
 * Helper method for invoking the server listenering to make a query and get back
 * a JSON response that is then evaluated to a JS object and returned
 *
 * @param methodToCall - method on the listener to call
 * @param params - parameter key/value pairs for the request
 */
function invokeServerListener(methodToCall, params) {
    var serverResponse;

    params.methodToCall = methodToCall;
    params.ajaxRequest = true;
    params.ajaxReturnType = 'update-none';

    var postUrl = getConfigParam("kradUrl") + "/listener";

    jQuery.ajax({
        url: postUrl,
        dataType: "json",
        data: params,
        async: false,
        beforeSend: null,
        complete: null,
        error: null,
        success: function (data) {
            serverResponse = data;
        }
    });

    return serverResponse;
}

/**
 * Stores a key/value pair to session storage if available (if not an error is thrown)
 *
 * @param key - key for the pair to store, which will be used for retrieving the value
 * @param value - value for the pair to store
 */
function storeToSession(key, value) {
    if (sessionStorage) {
        sessionStorage[key] = value;
    }
    else {
        throw Error("Session storage not supported");
    }
}

/**
 * Retrieves the value for a key from session storage
 *
 * <p>
 * If session storage is not enabled an error is thrown and if the key is not found a null value is returned
 * </p>
 *
 * @param key - key for the value to return
 */
function retrieveFromSession(key) {
    if (sessionStorage) {
        if (sessionStorage[key]) {
            return sessionStorage[key];
        }
        return null;
    }
    else {
        throw Error("Session storage not supported");
    }
}

/**
 * Removes a key/value pair from session storage
 *
 * <p>
 * If session storage is not enabled an error is thrown
 * </p>
 *
 * @param key - key for the pair to remove
 */
function removeFromSession(key) {
    if (sessionStorage) {
        if (sessionStorage[key]) {
            delete sessionStorage[key];
        }
    }
    else {
        throw Error("Session storage not supported");
    }
}

/**
 * Makes a get request to the server so that the form with the specified formKey will
 * be cleared server side
 *
 * @param formKey key for the form to clear
 */
function clearServerSideForm(formKey) {
    var params = {};
    params.formKey = formKey;

    invokeServerListener(kradVariables.CLEAR_FORM_METHOD_TO_CALL, params);
}

/**
 * Just a dummy function that can be set as the action script for an Action component to prevent it
 * from doing anything
 */
function voidAction() {

}

/**
 * Tests whether a jQuery object is not empty by doing a null/undefined check and a length check
 *
 * @param jqObject - object to test
 */
function nonEmpty(jqObject) {
    return jqObject && jqObject.length;
}

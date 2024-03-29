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

/**
 * Hide the message tooltip associated with the field by id
 * @param fieldId the id of the field
 */
function hideMessageTooltip(fieldId) {
    var elementInfo = getHoverElement(fieldId);
    var element = elementInfo.element;
    if (elementInfo.type == "fieldset") {
        //for checkbox/radio fieldsets we put the tooltip on the label of the first input
        element = jQuery(element).filter(".uif-tooltip");
    }

    var data = jQuery("#" + fieldId).data(kradVariables.VALIDATION_MESSAGES);
    if (data && data.showTimer) {
        clearTimeout(data.showTimer);
    }

    var tooltipId = jQuery(element).GetBubblePopupID();

    if(tooltipId){
        //this causes the tooltip to be IMMEDIATELY hidden, rather than wait for animation
        jQuery("#" + tooltipId).css("opacity", 0);
        jQuery("#" + tooltipId).hide();
        jQuery(element).HideBubblePopup();
    }
    else{
        jQuery(element).HideBubblePopup();
    }
}

/**
 * Gets the hover elements for a field by id.  The hover elements are the elements which will cause the tooltip to
 * be shown, the element the tooltip is actually placed on is an item its hover elements.
 * @param fieldId the id of the field
 */
function getHoverElement(fieldId) {
    var fieldset = jQuery("#" + fieldId).find("fieldset");
    var hasFieldset = fieldset.length;
    var elementInfo = {};

    if (!hasFieldset || (hasFieldset && fieldset.data("type") == "InputSet")) {
        //regular case
        elementInfo.element = jQuery("#" + fieldId).find("input:text, input:password, input:file, input:checkbox, "
                + "select, textarea");
        elementInfo.type = "";
        if (elementInfo.element.is("input:checkbox")) {
            elementInfo.themeMargins = {
                total:'13px',
                difference:'2px'
            };
        }
    }
    else if (hasFieldset && jQuery("#" + fieldId).find("fieldset > span > input").length) {
        //radio and checkbox fieldset case
        //get the fieldset, the inputs its associated with, and the associated labels as hover elements
        elementInfo.element = jQuery("#" + fieldId).find("fieldset, fieldset > span > input:radio,"
                + "fieldset > span > input:checkbox, fieldset > span > label, .uif-tooltip");
        elementInfo.type = "fieldset";
        elementInfo.themeMargins = {
            total:'13px',
            difference:'2px'
        };
    }
    else {
        //not found or wrapping fieldset case
        elementInfo.element = [];
        elementInfo.type = "";
    }
    return elementInfo;
}

/**
 * Method to hide the messages when the mouse leave event was successful for the field
 * @param id id of the field
 * @param currentElement the current element be iterated on
 * @param elements all elements within the hover set
 * @param type type of field
 */
function mouseLeaveHideMessageTooltip(id, currentElement, elements, type, force) {
    var hide = true;
    var focus = jQuery(currentElement).is(":focus");
    var tooltipElement = jQuery(currentElement);

    if (type == "fieldset") {
        //hide only if mouseleave is on fieldset not its internal radios/checkboxes
        hide = force || jQuery(currentElement).is("fieldset");
        focus = elements.filter("fieldset").is(":focus")
                || elements.filter("input").is(":focus");
        tooltipElement = elements.filter(".uif-tooltip");
    }

    //hide only if hide flag is true, the field is not focused, and the tooltip is open
    if (hide && !focus && jQuery(tooltipElement).IsBubblePopupOpen()) {
        hideMessageTooltip(id);
    }
}

/**
 * Calculate the margin to be used based on the tooltipElement - adds left margin to allow center placement
 * @param tooltipElement to be evaluated to determin margin offset
 */
function getTooltipMargin(tooltipElement) {
    var tooltipElementWidth = (jQuery(tooltipElement).width()) / 2;
    return "0 0 0 " + (tooltipElementWidth - 20) + "px";
}

/**
 * Workaround to prevent hiding the tooltip when the mouse actually may still be hovering over the field
 * correctly, checks to see if the mouseleave event was entering the tooltip and if so dont continue the
 * hide action, rather add a mouseleave handler that will only be invoked once for that segment, when this
 * is left the check occurs again, until the user has either left the tooltip or the field - then the tooltip
 * is hidden appropriately
 * @param event - mouseleave event
 * @param fieldId - id of the field this logic is being applied to
 * @param triggerElements - the elements that can trigger mouseover
 * @param callingElement - original element that invoked the mouseleave
 * @param type - type of the field
 * @param data - the fields validation data - updates the mouseInTooltip property
 * @return false if the mouse is not out of the tooltip (mouse in tooltip), true if it is in the tooltip
 */
function mouseOutBubblePopupCheck(event, fieldId, triggerElements, callingElement, type, data) {
    if (event.relatedTarget &&
            jQuery(event.relatedTarget).length &&
            ((jQuery(event.relatedTarget).attr("class") != null &&
            jQuery(event.relatedTarget).attr("class").indexOf("jquerybubblepopup") >= 0)
            || jQuery(event.relatedTarget).parents('.jquerybubblepopup-innerHtml').length)) {
        //this bind is only every invoked once, then unbound - return false to stop hide
        jQuery(event.relatedTarget).one("mouseleave", function (event) {
            mouseOutBubblePopupCheck(event, fieldId, triggerElements, callingElement, type, data);
        });
        data.mouseInTooltip = true;
        return false;
    }
    //If target moving into is not a triggerElement for this hover
    // and if the source of the event is not a trigger element
    else if (!jQuery(event.relatedTarget).is(triggerElements) && !jQuery(event.target).is(triggerElements)) {
        //hide the tooltip for the original element
        data.mouseInTooltip = false;
        mouseLeaveHideMessageTooltip(fieldId, callingElement, triggerElements, type, true);
        return true;
    }
    else {
        data.mouseInTooltip = false;
        return true;
    }
}

/**
 * Shows the message tooltip if there are messages for this field, otherwise hides it.  The showAndClose flag allows
 * the message to be closed automatically after some predetermined amount of time, and the change flag forces the
 * show call on the plugin to deal with potential placement issues that can occur.
 * @param fieldId id of the field to show the tooltip on
 * @param showAndClose when true, this tooltip will be shown and then closed after a certain length of time
 * @param change forces the tooltip show call to deal with placement issues when changing internal content
 */
function showMessageTooltip(fieldId, showAndClose, change) {
    var data = jQuery("#" + fieldId).data(kradVariables.VALIDATION_MESSAGES);
    if(data && data.useTooltip && data.messagingEnabled && !haltValidationMessaging){
        var elementInfo = getHoverElement(fieldId);
        var tooltipElement = jQuery(elementInfo.element);
        if (elementInfo.type == "fieldset") {
            tooltipElement = tooltipElement.filter(".uif-tooltip");
        }

        var options = {
            position:"top",
            align:"left",
            divStyle:{margin:getTooltipMargin(tooltipElement)},
            distance:0,
            manageMouseEvents:false,
            themePath:"../krad/plugins/tooltip/jquerybubblepopup-theme/",
            alwaysVisible:false,
            tail:{align:"left"},
            themeMargins: {total: "13px",difference: "2px"}
        };

        if (elementInfo.themeMargins) {
            options.themeMargins = elementInfo.themeMargins;
        }

        var hasMessages = jQuery("[data-messagesFor='" + fieldId + "']").children().length;

        if (hasMessages) {
            if (data.tooltipTimer) {
                //if there is a timer for this field in place, stop the timer from completing, to handle the new
                //show logic
                clearTimeout(data.tooltipTimer);
            }

            options.innerHTML = jQuery("[data-messagesFor='" + fieldId + "']").html();
            options.themeName = data.tooltipTheme;

            var show = true;
            //only do a timed close if there are also server messages left - means you got a new client
            //side error that has to be demonstrated visually to the user (it would have no visual indication
            //if we just closed immediately)
            if(showAndClose && !(data.serverErrors.length || data.serverWarnings.length || data.serverInfo.length)){
                hideMessageTooltip(fieldId);
                show = false;
            }

            if(show){
                if (!tooltipElement.IsBubblePopupOpen()) {
                    if(showAndClose){
                        //close other bubble popups so we dont get too many during fast tabbing
                        hideBubblePopups();
                    }
                    tooltipElement.SetBubblePopupOptions(options, true);
                    tooltipElement.SetBubblePopupInnerHtml(options.innerHTML, true);
                    tooltipElement.ShowBubblePopup();
                    var tooltipId = jQuery(tooltipElement).GetBubblePopupID();
                    jQuery("#" + tooltipId).css("opacity", 1);
                }
                else if (tooltipElement.IsBubblePopupOpen()) {

                    if (change) {
                        //if the messages shown were changed, reshow to get around placement issues
                        if(showAndClose){
                            //close other bubble popups so we dont get too many during fast tabbing
                            hideBubblePopups();
                        }
                        tooltipElement.SetBubblePopupOptions(options, true);
                        tooltipElement.SetBubblePopupInnerHtml(options.innerHTML, true);
                        tooltipElement.ShowBubblePopup();
                        var tooltipId = jQuery(tooltipElement).GetBubblePopupID();
                        jQuery("#" + tooltipId).css("opacity", 1);
                    }
                }

                if (showAndClose) {
                    //setup a timer to close the tooltip automatically
                    data.tooltipTimer = setTimeout("hideMessageTooltip('" + fieldId + "')", 3000);
                    jQuery("#" + fieldId).data(kradVariables.VALIDATION_MESSAGES, data);
                }
            }

        }
        else {
            hideMessageTooltip(fieldId);
        }
    }
}

/**
 * Writes the any messages in the client or server side message arrays at the field level, applies the correct style
 * classes, and displays icons as necessary.  These messages are hidden content unless tooltips for messages are
 * turned off.
 * @param id id of the field to write messages to
 */
function writeMessagesAtField(id) {

    var data = jQuery("#" + id).data(kradVariables.VALIDATION_MESSAGES);

    if(data && data.displayMessages){
        //initialize data if not present
        if (!data.errors) {
            data.errors = [];
        }
        if (!data.warnings) {
            data.warnings = [];
        }
        if (!data.info) {
            data.info = [];
        }

        var messagesDiv = jQuery("[data-messagesFor='" + id + "']");
        //ensure the messagesDiv is hidden and empty
        if(data.useTooltip){
            messagesDiv.hide();
        }
        else{
            messagesDiv.show();
        }
        messagesDiv.empty();

        //generate client side based messages
        var clientMessages = jQuery("<div class='" + kradVariables.CLIENT_MESSAGE_ITEMS_CLASS + "'><ul>"
                + generateListItems(data.errors, kradVariables.ERROR_MESSAGE_ITEM_CLASS, 0, false, errorImage)
                + generateListItems(data.warnings, kradVariables.WARNING_MESSAGE_ITEM_CLASS, 0, false, warningImage)
                + generateListItems(data.info, kradVariables.INFO_MESSAGE_ITEM_CLASS, 0, false, infoImage) + "</ul></div>");

        //generate server side based messages
        var serverMessages = jQuery("<div class='" + kradVariables.SERVER_MESSAGE_ITEMS_CLASS + "'><ul>"
                + generateListItems(data.serverErrors, kradVariables.ERROR_MESSAGE_ITEM_CLASS, 0, false, errorImage)
                + generateListItems(data.serverWarnings, kradVariables.WARNING_MESSAGE_ITEM_CLASS, 0, false, warningImage)
                + generateListItems(data.serverInfo, kradVariables.INFO_MESSAGE_ITEM_CLASS, 0, false, infoImage) + "</ul></div>");

        var hasServerMessages = false;
        //only append if messages exist
        if (jQuery(clientMessages).find("ul").children().length) {
            jQuery(clientMessages).appendTo(messagesDiv);
        }

        if (jQuery(serverMessages).find("ul").children().length) {
            jQuery(serverMessages).appendTo(messagesDiv);
            hasServerMessages = true;
        }

        var showImage = true;
        //do not show the message icon next to field if this field is in a table collection layout
        if (jQuery("#" + id).parents(".uif-tableCollectionLayout").length) {
            showImage = false;
        }

        //remove any image and previous styles that may already be present
        jQuery("#" + id + " > .uif-validationImage").remove();
        jQuery("#" + id).removeClass(kradVariables.HAS_ERROR_CLASS);
        jQuery("#" + id).removeClass(kradVariables.HAS_MODIFIED_ERROR_CLASS);
        jQuery("#" + id).removeClass(kradVariables.HAS_WARNING_CLASS);
        jQuery("#" + id).removeClass(kradVariables.HAS_INFO_CLASS);

        //show appropriate icons/styles based on message severity level
        if (jQuery(messagesDiv).find(".uif-errorMessageItem-field").length) {
            if (data.errors.length) {
                jQuery(messagesDiv).find(".uif-clientMessageItems").addClass("uif-clientErrorDiv");
            }

            if(data.fieldModified && data.errors.length == 0){
                //This is to represent the field has been changed after a server error, but may or
                //may not be fixed - greyed out image/border
                jQuery("#" + id).addClass(kradVariables.HAS_MODIFIED_ERROR_CLASS);
                if (showImage) {
                    jQuery(messagesDiv).before(errorGreyImage);
                }
            }
            else{
                jQuery("#" + id).addClass(kradVariables.HAS_ERROR_CLASS);
                if (showImage) {
                    jQuery(messagesDiv).before(errorImage);
                }
            }


            if (hasServerMessages) {
                data.tooltipTheme = "kr-error-ss";
            }
            else {
                data.tooltipTheme = "kr-error-cs"
            }

            handleTabStyle(id, true, false, false);
        }
        else if (jQuery(messagesDiv).find(".uif-warningMessageItem-field").length) {
            if (data.warnings.length) {
                jQuery(messagesDiv).find(".uif-clientMessageItems").addClass(kradVariables.CLIENT_WARNING_DIV_CLASS);
            }
            jQuery("#" + id).addClass(kradVariables.HAS_WARNING_CLASS);
            if (showImage) {
                jQuery(messagesDiv).before(warningImage);
            }

            if (hasServerMessages) {
                data.tooltipTheme = "kr-warning-ss";
            }
            else {
                data.tooltipTheme = "kr-warning-cs"
            }

            handleTabStyle(id, false, true, false);
        }
        else if (jQuery(messagesDiv).find(".uif-infoMessageItem-field").length) {
            if (data.info.length) {
                jQuery(messagesDiv).find(".uif-clientMessageItems").addClass("uif-clientInfoDiv");
            }
            jQuery("#" + id).addClass(kradVariables.HAS_INFO_CLASS);
            if (showImage) {
                jQuery(messagesDiv).before(infoImage);
            }

            if (hasServerMessages) {
                data.tooltipTheme = "kr-info-ss";
            }
            else {
                data.tooltipTheme = "kr-info-cs"
            }

            handleTabStyle(id, false, false, true);
        }
        else {
            messagesDiv.hide();

            handleTabStyle(id, false, false, false);
        }

    }
}

/**
 * Handles the messages at the field level, this is different than writeMessagesAtField because it causes the messages
 * to bubble up multiple layers to obtain the summary effect - as well as making a call to writeMessagesAtField
 * - this call is made for client side messages only when
 * summary is already present
 * @param id - id of the field to handle messages
 */
function handleMessagesAtField(id, pageSetupPhase) {
    var skip = jQuery("#" + id).data("vignore");
    if(pageSetupPhase == undefined){
        pageSetupPhase = false;
    }
    if (!(skip == "yes")) {
        var data = jQuery("#" + id).data(kradVariables.VALIDATION_MESSAGES);
        if(data){
            if(!pageSetupPhase || (pageSetupPhase && data.hasOwnMessages)){
                writeMessagesAtField(id);

                var parent = jQuery("#" + id).data("parent");

                if (parent) {
                    handleMessagesAtGroup(parent, id, data, pageSetupPhase);
                }

                data.processed = true;
            }
        }
    }
}

/**
 * Handles the messages for a particular field at the group identified by id.  This data is bubbled up through parent
 * groups as appropriate and fieldLinks/summary links are updated to represent the new message status for the field
 * passed in.
 * @param id - the id of the group
 * @param fieldId - the id of the field with message updates
 * @param fieldData - the new validation data for the field being updated
 */
function handleMessagesAtGroup(id, fieldId, fieldData, pageSetupPhase) {
    var data = jQuery("#" + id).data(kradVariables.VALIDATION_MESSAGES);
    var pageLevel = false;
    var parent = jQuery("#" + id).data("parent");
    if (data) {
        var messageMap = data.messageMap;
        pageLevel = data.pageLevel;

        //init empty params
        if (!data.errors) {
            data.errors = [];
        }
        if (!data.warnings) {
            data.warnings = [];
        }
        if (!data.info) {
            data.info = [];
        }
        if (!messageMap) {
            messageMap = {};
            data.messageMap = messageMap;
        }

        //add fresh data to group's message data based on the new field info
        messageMap[fieldId] = fieldData;

        data = calculateMessageTotals(data);

        //write messages for this group
        if(!pageSetupPhase){
            //Display counts in the header even if messages aren't displayed at that level
            displayHeaderMessageCount(id, data);
            writeMessagesForGroup(id, data);
        }
    }

    if (!pageLevel && parent) {
        handleMessagesAtGroup(parent, fieldId, fieldData);
    }
}

/**
 * Write the messages out for the group that are present its data
 *
 * @param id id of the group
 * @param data validationData for the group
 */
function writeMessagesForGroup(id, data){
    var parent = jQuery("#" + id).data("parent");

    if(data){
        var messageMap = data.messageMap;
        var pageLevel = data.pageLevel;
        var order = data.order;
        var sections = data.sections;

        //retrieve header for section
        if(data.isSection == undefined){
            var sectionHeader = jQuery("[data-headerFor='" + id + "']").find("> :header, > label");
            data.isSection = sectionHeader.length;
        }

        //show messages if data is received as force show or if this group is considered a section
        var showMessages = data.isSection || data.forceShow;

        //TabGroups rely on tab error indication to indicate messages - don't show messages here
        var type = jQuery("#" + id).data("type");
        if (type && type == kradVariables.TAB_GROUP_CLASS) {
            showMessages = false;
        }

        //if this group is in a tab in a tab group show your messages because TabGroups will not
        if (parent) {
            var parentType = jQuery("#" + parent).data("type");
            if (parentType && parentType == kradVariables.TAB_GROUP_CLASS) {
                showMessages = true;
            }
        }

        if (showMessages) {

            var newList = jQuery("<ul class='" + kradVariables.VALIDATION_MESSAGES_CLASS + "'></ul>");

            if(data.messageTotal == undefined){
                //init empty params
                if (!data.errors) {
                    data.errors = [];
                }
                if (!data.warnings) {
                    data.warnings = [];
                }
                if (!data.info) {
                    data.info = [];
                }
                calculateMessageTotals(data);
            }

            if(data.messageTotal){
                if(data.hasOwnMessages){
                    newList = generateSectionLevelMessages(id, data, newList);
                }

                if (data.summarize) {
                    newList = generateSummaries(id, messageMap, sections, order, newList);
                }
                else {
                    //if not generating summaries just output field links
                    for (var key in messageMap) {
                        var link = generateFieldLink(messageMap[key], key, data.collapseFieldMessages, data.displayLabel);
                        newList = writeMessageItemToList(link, newList);
                    }
                }

                //clear and write the new list of summary items
                clearMessages(id, false);
                handleTabStyle(id, data.errorTotal, data.warningTotal, data.infoTotal);
                writeMessages(id, newList);
                //page level validation messsage header handling
                if (pageLevel) {
                    if (newList.children().length) {
                        var messagesDiv = jQuery("[data-messagesFor='" + id + "']");
                        var countMessage = generateCountString(data.errorTotal, data.warningTotal,
                                data.infoTotal);
                        var pageValidationHeader = jQuery("<h3 tabindex='0' class='" + kradVariables.VALIDATION_PAGE_HEADER_CLASS + "' "
                                + "id='pageValidationHeader'>This page has " + countMessage + "</h3>");

                        pageValidationHeader.find(".uif-validationImage").remove();
                        var pageSummaryClass = "";
                        if (data.errorTotal) {
                            pageSummaryClass = kradVariables.PAGE_VALIDATION_MESSAGE_ERROR_CLASS;
                            pageValidationHeader.prepend(errorImage);
                        }
                        else if (data.warningTotal) {
                            pageSummaryClass = kradVariables.PAGE_VALIDATION_MESSAGE_WARNING_CLASS;
                            pageValidationHeader.prepend(warningImage);
                        }
                        else if (data.infoTotal) {
                            pageSummaryClass = kradVariables.PAGE_VALIDATION_MESSAGE_INFO_CLASS;
                            pageValidationHeader.prepend(infoImage);
                        }

                        messagesDiv.prepend(pageValidationHeader);

                        //Handle special classes
                        pageValidationHeader.parent().removeClass(kradVariables.PAGE_VALIDATION_MESSAGE_ERROR_CLASS);
                        pageValidationHeader.parent().removeClass(kradVariables.PAGE_VALIDATION_MESSAGE_WARNING_CLASS);
                        pageValidationHeader.parent().removeClass(kradVariables.PAGE_VALIDATION_MESSAGE_INFO_CLASS);
                        pageValidationHeader.parent().addClass(pageSummaryClass);

                        messagesDiv.find(".uif-validationMessagesList").attr("id", "pageValidationList");
                        messagesDiv.find(".uif-validationMessagesList").attr("aria-labelledby",
                                "pageValidationHeader");
                    }
                }
            }
            else{
                clearMessages(id, true);
            }
        }
    }
}

/**
 * Write messages out for the page if any exist
 */
function writeMessagesForPage(){
    var page = jQuery("[data-type='Page']");
    var pageId = page.attr("id");
    var data = page.data(kradVariables.VALIDATION_MESSAGES);

    if(data){
        var messageMap = data.messageMap;
        if (!messageMap) {
            messageMap = {};
            data.messageMap = messageMap;
        }
    }

    writeMessagesForGroup(pageId, data);
    writeMessagesForChildGroups(pageId);
    jQuery(".uif-errorMessageItem > div").show();
}

/**
 * Write messages out for each of the child groups of the parent with parentId
 *
 * @param parentId - id of parent
 */
function writeMessagesForChildGroups(parentId){
    jQuery("[data-parent='"+ parentId +"']").each(function(){
        var currentGroup = jQuery(this);
        var id = currentGroup.attr("id");
        var data = currentGroup.data(kradVariables.VALIDATION_MESSAGES);

        if(data){
            var messageMap = data.messageMap;
            if (!messageMap) {
                messageMap = {};
                data.messageMap = messageMap;
            }
        }

        if(!(currentGroup.is("div[data-role='InputField']"))){
            writeMessagesForGroup(id, data);
            writeMessagesForChildGroups(id);
        }
    });
}

/**
 * Handles tab styling if a group is in a tab
 * @param id - the id of the group or field
 * @param error - true if errors exist
 * @param warning - true if warnings exist
 * @param info - true if info exist
 */
function handleTabStyle(id, error, warning, info) {
    var tabWrapper = jQuery("#" + id).closest("div[data-type='TabWrapper']");
    if (tabWrapper.length) {
        var tabId = jQuery(tabWrapper).data("tabwrapperfor");
        var tab = jQuery("[data-tabfor='" + tabId + "']");
        tab.find(".uif-validationImage").remove();
        if (error) {
            tab.find("a").append(errorImage);
        }
        else if (warning) {
            tab.find("a").append(warningImage);
        }
        else if (info) {
            tab.find("a").append(infoImage);
        }
    }
}

/**
 * Generates section level messages - messages that are only associated with a section by id or additionalKeysToMatch.
 * This does not include the field messages themselves.
 * @param id - id of the the group
 * @param data - the group's 'validationMessages' data
 * @param newList - the ul jQuery element being generated in this pass
 */
function generateSectionLevelMessages(id, data, newList) {
    if (data != undefined && data != null) {
        //Write all message items for section
        var errors = jQuery(generateListItems(data.errors, "uif-errorMessageItem", 0, true)
                + generateListItems(data.serverErrors, "uif-errorMessageItem", 0, true));
        var warnings = jQuery(generateListItems(data.warnings, "uif-warningMessageItem", 0, true)
                + generateListItems(data.serverWarnings, "uif-warningMessageItem", 0, true));
        var info = jQuery(generateListItems(data.info, "uif-infoMessageItem", 0, true)
                + generateListItems(data.serverInfo, "uif-infoMessageItem", 0, true));

        //Write all items to the list
        newList = writeMessageItemToList(errors, newList);
        newList = writeMessageItemToList(warnings, newList);
        newList = writeMessageItemToList(info, newList);
    }
    return newList;
}

/**
 * Calculates the message totals for the data passed in, appends these totals to the data map, and passes it back
 * @param data - 'validationMessages' data to count message totals on
 */
function calculateMessageTotals(data) {
    var errorTotal = 0;
    var warningTotal = 0;
    var infoTotal = 0;
    var messageMap = data.messageMap;
    //Add totals for messages of fields in group
    for (var id in messageMap) {
        var currentData = messageMap[id];
        errorTotal = errorTotal + currentData.serverErrors.length + currentData.errors.length;
        warningTotal = warningTotal + currentData.serverWarnings.length + currentData.warnings.length;
        infoTotal = infoTotal + currentData.serverInfo.length + currentData.info.length;
    }
    //Add totals for messages for THIS Group
    data.errorTotal = errorTotal + data.serverErrors.length + data.errors.length;
    data.warningTotal = warningTotal + data.serverWarnings.length + data.warnings.length;
    data.infoTotal = infoTotal + data.serverInfo.length + data.info.length;
    data.messageTotal = data.errorTotal + data.warningTotal + data.infoTotal;
    return data;
}

/**
 * Displays the message count string on the header for the section specified.  calculateMessageTotals must be called
 * before this call
 * @param sectionId - id of the section
 * @param sectionData - 'validationMessages' data of the section
 */
function displayHeaderMessageCount(sectionId, sectionData) {
    var sectionHeader = jQuery("[data-headerFor='" + sectionId + "']").find("> :header, > label");

    if(errorImage == undefined){
        setupImages();
    }

    if (sectionHeader.length) {

        var countMessage = generateCountString(sectionData.errorTotal, sectionData.warningTotal, sectionData.infoTotal);
        var image = "";
        if (sectionData.errorTotal) {
            image = errorImage;
        }
        else if (sectionData.warningTotal) {
            image = warningImage;
        }
        else if (sectionData.infoTotal) {
            image = infoImage;
        }

        jQuery(sectionHeader).find("div." + kradVariables.MESSAGE_COUNT_CLASS).remove();

        if (countMessage != "") {
            jQuery("<div class='" + kradVariables.MESSAGE_COUNT_CLASS + "'>[" + image + " " + countMessage + "]</div>").appendTo(sectionHeader);
        }
    }
}

/**
 * Generates a count message that can be used in a header or summary link based on total amount of errors, warnings,
 * and info messages totals passed in
 * @param errorTotal - total number of errors
 * @param warningTotal - total number of warnings
 * @param infoTotal - total number of infos
 */
function generateCountString(errorTotal, warningTotal, infoTotal) {
    var countMessage = "";
    if (errorTotal) {
        if (errorTotal == 1) {
            countMessage = errorTotal + " error";
        }
        else {
            countMessage = errorTotal + " errors";
        }
    }

    if ((errorTotal > 0) + (warningTotal > 0) + (infoTotal > 0) == 3) {
        countMessage = countMessage + " & " + (warningTotal + infoTotal) + " other messages";
    }
    else {

        if (warningTotal) {
            if (countMessage != "") {
                countMessage = countMessage + " & ";
            }

            if (warningTotal == 1) {
                countMessage = countMessage + warningTotal + " warning";
            }
            else {
                countMessage = countMessage + warningTotal + " warnings";
            }
        }

        if (infoTotal) {
            if (countMessage != "") {
                countMessage = countMessage + " & ";
            }

            if (infoTotal == 1) {
                countMessage = countMessage + infoTotal + " message";
            }
            else {
                countMessage = countMessage + infoTotal + " messages";
            }
        }
    }
    return countMessage;
}

/**
 * Clear all the messages in the messages div for this group or field by id
 * @param messagesForId - id of the group or field to clear messages for
 * @param hide - wherether or not to also hide the message div after clearing
 */
function clearMessages(messagesForId, hide) {
    var messagesDiv = jQuery("[data-messagesFor='" + messagesForId + "']");
    jQuery(messagesDiv).empty();
    if(hide){
        jQuery(messagesDiv).hide();
    }
}

/**
 * Write the new messages to the messages div
 * @param messagesForId - id of the group or field to write messages for
 * @param newList - the new content to write
 */
function writeMessages(messagesForId, newList) {
    var data = jQuery("#" + messagesForId).data(kradVariables.VALIDATION_MESSAGES);
    var messagesDiv = jQuery("[data-messagesFor='" + messagesForId + "']");
    if (newList.children().length && data.displayMessages) {
        jQuery(messagesDiv).show();
        jQuery(newList).appendTo(messagesDiv);
    }
    else if(newList.children().length && !data.displayMessages){
        jQuery(messagesDiv).hide();
        jQuery(newList).appendTo(messagesDiv);
    }
    else {
        jQuery(messagesDiv).hide();
    }
}

/**
 * Append an item to the list, checks for null
 * @param item - item to appendTo the list
 * @param newList - the ul jQuery element to append to
 */
function writeMessageItemToList(item, newList) {
    if (item != null) {
        jQuery(item).appendTo(newList);
    }
    return newList;
}

/**
 * Generate the message list items based on the content of the messageArray passed in.  Returns the html for the li
 * elements generated.
 * @param messageArray - array of messages to generate list items for
 * @param itemClass - class to apply to each li item generated
 * @param startIndex - where to start in the array passed in for generation, normally 0
 * @param focusable - whether or not this li element should be focusable by the user
 * @param image - the image to use at the beginning of each li element
 */
function generateListItems(messageArray, itemClass, startIndex, focusable, image) {
    var elements = "";
    if (!image) {
        image = "";
    }
    if (messageArray && messageArray.length) {
        for (var i = startIndex; i < messageArray.length; i++) {
            if (focusable) {
                elements = elements + "<li tabindex='0' class='" + itemClass + "'>" + image + " "
                        + convertToHtml(messageArray[i]) + "</li>";
            }
            else {
                elements = elements + "<li class='" + itemClass + "'>" + image + " "
                        + convertToHtml(messageArray[i]) + "</li>";
            }
        }
    }
    return elements;
}

/**
 * Generates the summaries for the group specified by id.  messageMap represents the message data for fields in this
 * group, sections are the sections of this group, order specifies the order that fields and sub-groups of this group
 * occur in, and newList is the ul element that is being generated for this particular group.  Returns newList (ul) with
 * the appropriate li items appended to it.
 * @param id - id of the group
 * @param messageMap - messageData for each field of this group
 * @param sections - sections of this group
 * @param order - order of the fields and sections in this group
 * @param newList - the ul being built by this call
 */
function generateSummaries(id, messageMap, sections, order, newList) {
    var data = jQuery("#" + id).data(kradVariables.VALIDATION_MESSAGES);
    //if no nested sections just output the fieldLinks
    if (sections.length == 0) {
        for (var key in messageMap) {
            var link = generateFieldLink(messageMap[key], key, data.collapseFieldMessages, data.displayLabel);
            newList = writeMessageItemToList(link, newList);
        }
    }
    else {
        var currentFields = {};
        var currentSectionId;

        //if sections are present iterate over the fields and sections in order by collecting fields that are considered
        //"direct" descendants of this section - contained in a group (not a section) or just on the section itself.
        //when the iterator hits a section generate a summary sublist which describes the fields that occur before
        //that section (or field group) and add it to the list - then generate the summary link for that section (or
        //or field group).  Add both to the list be generated.

        jQuery.each(order, function (index, value) {
            //if it doesn't start with an s$ its not a section or f$ its not a field group
            if (!(value.indexOf("s$") == 0) && !(value.indexOf("f$") == 0)) {
                currentFields[index] = value;
            }
            else {
                var sectionId = value.substring(2);
                if (jQuery("#" + sectionId).data("role") && jQuery("#" + sectionId).data("role") == "placeholder") {
                    //do nothing this is a blank/non-visible section
                }
                else {
                    currentSectionId = sectionId;
                    var sublist = generateFieldLinkSublist(data, currentFields, messageMap, currentSectionId, true);
                    newList = writeMessageItemToList(sublist, newList);
                    var summaryLink = generateSummaryLink(currentSectionId);
                    newList = writeMessageItemToList(summaryLink, newList);
                    currentFields = {};
                }
            }
        });

        //if there are more fields which occur after the final section - generate a sublist summary of those fields
        if (currentFields.length > 0) {
            var sublist = generateFieldLinkSublist(currentFields, messageMap, currentSectionId, false);
            newList = writeMessageItemToList(sublist, newList);
        }
    }
    return newList;
}

/**
 * Generate a link that focuses on a field when clicked, based on the messageData passed in.  This generates a link
 * that will summarize the messages involved, based on severity and type - server or client
 * @param messageData - messageData for this field
 * @param fieldId - id of the field to be linked to
 */
function generateFieldLink(messageData, fieldId, collapseMessages, showLabel) {
    var link = null;

    if (messageData != null) {
        //if messages aren't displayed at the field level - force uncollapse
        if(!messageData.displayMessages){
            collapseMessages = false;
        }
        var linkType;
        var highlight;
        var collapse = false;
        var linkText = "";
        var separator = "";
        var collapsedErrors = {};
        var collapsedWarnings = {};
        var collapsedInfo = {};
        var image = "";

        //Evaluate if there are errors first, warnings second, and info third, link text content is generated by
        //severity level, a higher severity present will "collapse" the following severity levels displayed by default

        if (messageData.serverErrors.length || messageData.errors.length) {
            collapse = true;
            image = errorImage;
            linkType = "uif-errorMessageItem";
            highlight = "uif-errorHighlight";
            if (messageData.errors.length) {
                linkText = messageData.errors[0];
                if (messageData.errors.length > 1) {
                    collapsedErrors.exist = true;
                    collapsedErrors.errorIndex = 1;
                }
            }
            if (messageData.serverErrors.length) {
                if (linkText) {
                    separator = ", ";
                }
                linkText = linkText + separator + messageData.serverErrors[0];
                if (messageData.serverErrors.length > 1) {
                    collapsedErrors.exist = true;
                    collapsedErrors.serverErrorIndex = 1;
                }
            }
        }
        if (messageData.serverWarnings.length || messageData.warnings.length) {
            if (collapse) {
                if (messageData.warnings.length) {
                    collapsedWarnings.exist = true;
                    collapsedWarnings.warningIndex = 0;
                }
                if (messageData.serverWarnings.length) {
                    collapsedWarnings.exist = true;
                    collapsedWarnings.serverWarningIndex = 0;
                }
            }
            else {
                collapse = true;
                image = warningImage;
                linkType = "uif-warningMessageItem";
                highlight = "uif-warningHighlight";
                if (messageData.warnings.length) {
                    linkText = messageData.warnings[0];
                    if (messageData.warnings.length > 1) {
                        collapsedWarnings.exist = true;
                        collapsedWarnings.warningIndex = 1;
                    }
                }
                if (messageData.serverWarnings.length) {
                    if (linkText) {
                        separator = ", ";
                    }
                    linkText = linkText + separator + messageData.serverWarnings[0];
                    if (messageData.serverWarnings.length > 1) {
                        collapsedWarnings.exist = true;
                        collapsedWarnings.serverWarningIndex = 1;
                    }
                }
            }
        }
        if (messageData.serverInfo.length || messageData.info.length) {
            if (collapse) {
                if (messageData.info.length) {
                    collapsedInfo.exist = true;
                    collapsedInfo.infoIndex = 0;
                }
                if (messageData.serverInfo.length) {
                    collapsedInfo.exist = true;
                    collapsedInfo.serverInfoIndex = 0;
                }
            }
            else {
                collapse = true;
                image = infoImage;
                linkType = "uif-infoMessageItem";
                highlight = "uif-infoHighlight";
                if (messageData.info.length) {
                    linkText = messageData.info[0];
                    if (messageData.info.length > 1) {
                        collapsedInfo.exist = true;
                        collapsedInfo.infoIndex = 1;
                    }
                }
                if (messageData.serverInfo.length) {
                    if (linkText) {
                        separator = ", ";
                    }
                    linkText = linkText
                            + separator + messageData.serverInfo[0];
                    if (messageData.serverInfo.length > 1) {
                        collapsedInfo.exist = true;
                        collapsedInfo.serverInfoIndex = 1;
                    }
                }
            }
        }

        if (linkText != "") {
            //generate collapsed information - messages that are present but not being shown at this level
            var collapsedElements = "";
            if (collapsedErrors.exist && collapseMessages) {
                var count = 0;
                if (collapsedErrors.errorIndex != undefined && collapsedErrors.errorIndex >= 0) {
                    count = count + messageData.errors.length - collapsedErrors.errorIndex;
                }
                if (collapsedErrors.serverErrorIndex != undefined && collapsedErrors.serverErrorIndex >= 0) {
                    count = count + messageData.serverErrors.length - collapsedErrors.serverErrorIndex;
                }

                if (count > 1) {
                    collapsedElements = collapsedElements + "<span class='" + kradVariables.COLLAPSED_ERRORS_CLASS + "'> [+"
                            + count + " errors]</span>";
                }
                else {
                    collapsedElements = collapsedElements + "<span class='" + kradVariables.COLLAPSED_ERRORS_CLASS + "'> [+"
                            + count + " error]</span>";
                }
            }
            else if(collapsedErrors.exist && !collapseMessages){
                if(collapsedErrors.errorIndex != undefined){
                    for(var i = collapsedErrors.errorIndex; i < messageData.errors.length; i++){
                        collapsedElements = collapsedElements + ", " + messageData.errors[i];
                    }
                }
                if(collapsedErrors.serverErrorIndex != undefined){
                    for(var i = collapsedErrors.serverErrorIndex; i < messageData.serverErrors.length; i++){
                        collapsedElements = collapsedElements + ", " + messageData.serverErrors[i];
                    }
                }
            }

            //collapsed warning handling
            if (collapsedWarnings.exist && collapseMessages) {
                var count = 0;
                if (collapsedWarnings.warningIndex != undefined && collapsedWarnings.warningIndex >= 0) {
                    count = count + messageData.warnings.length - collapsedWarnings.warningIndex;
                }
                if (collapsedWarnings.serverWarningIndex != undefined && collapsedWarnings.serverWarningIndex >= 0) {
                    count = count + messageData.serverWarnings.length - collapsedWarnings.serverWarningIndex;
                }

                if (count > 1) {
                    collapsedElements = collapsedElements + "<span class='" + kradVariables.COLLAPSED_WARNINGS_CLASS + "'> [+"
                            + count + " warnings]</span>";
                }
                else {
                    collapsedElements = collapsedElements + "<span class='" + kradVariables.COLLAPSED_WARNINGS_CLASS + "'> [+"
                            + count + " warning]</span>";
                }
            }
            else if(collapsedWarnings.exist && !collapseMessages){
                if(collapsedWarnings.warningIndex != undefined){
                    for(var i = collapsedWarnings.warningIndex; i < messageData.warnings.length; i++){
                        collapsedElements = collapsedElements + ", " + messageData.warnings[i];
                    }
                }
                if(collapsedWarnings.serverWarningIndex != undefined){
                    for(var i = collapsedWarnings.serverWarningIndex; i < messageData.serverWarnings.length; i++){
                        collapsedElements = collapsedElements + ", " + messageData.serverWarnings[i];
                    }
                }
            }
            

            //collapsed information handling
            if (collapsedInfo.exist && collapseMessages) {
                var count = 0;
                if (collapsedInfo.infoIndex != undefined && collapsedInfo.infoIndex >= 0) {
                    count = count + messageData.info.length - collapsedInfo.infoIndex;
                }
                if (collapsedInfo.serverInfoIndex != undefined && collapsedInfo.serverInfoIndex >= 0) {
                    count = count + messageData.serverInfo.length - collapsedInfo.serverInfoIndex;
                }

                if (count > 1) {
                    collapsedElements = collapsedElements + "<span class='" + kradVariables.COLLAPSED_INFO_CLASS + "'> [+"
                            + count + " messages]</span>";
                }
                else {
                    collapsedElements = collapsedElements + "<span class='" + kradVariables.COLLAPSED_INFO_CLASS + "'> [+"
                            + count + " message]</span>";
                }
            }
            else if(collapsedInfo.exist && !collapseMessages){
                if(collapsedInfo.infoIndex != undefined){
                    for(var i = collapsedInfo.infoIndex; i < messageData.info.length; i++){
                        collapsedElements = collapsedElements + ", " + messageData.info[i];
                    }
                }
                if(collapsedInfo.serverInfoIndex != undefined){
                    for(var i = collapsedInfo.serverInfoIndex; i < messageData.serverInfo.length; i++){
                        collapsedElements = collapsedElements + ", " + messageData.serverInfo[i];
                    }
                }
            }

            var name = jQuery("#" + fieldId).data("label");

            if (name && showLabel) {
                name = name.trim();
                if(name.indexOf(":") == name.length - 1){
                    name = name + " ";
                }
                else{
                    name = name + ": ";
                }

            }
            else {
                name = "";
            }

            link = jQuery("<li data-messageItemFor='" + fieldId + "'><a href='#'>"
                    + name + convertToHtml(linkText, true) + collapsedElements + "</a> </li>");

            if(messageData.fieldModified){
                jQuery(link).find("a").prepend("<span class='modified'>(Modified) </span>");
                if(!(messageData.errors.length)){
                    jQuery(link).addClass("uif-errorMessageItem-modified");
                }
            }
            jQuery(link).addClass(linkType);
            jQuery(link).find("a").click(function () {
                var control = jQuery("#" + fieldId + "_control");
                if (control.length) {

                    jQuery(control).focus();
                }
                else {
                    jQuery("#" + fieldId + "_control1").focus();
                }
            });
            jQuery(link).find("a").focus(function () {
                jQuery("#" + fieldId).addClass(highlight);
            });
            jQuery(link).find("a").blur(function () {
                jQuery("#" + fieldId).removeClass(highlight);
            });
            jQuery(link).find("a").hover(
                    function () {
                        jQuery("#" + fieldId).addClass(highlight);
                    },
                    function () {
                        jQuery("#" + fieldId).removeClass(highlight);
                    });
        }
    }

    return link;
}

/**
 * Generates a field link sub list summary that generates a list item which contains a sublist of items.  The text
 * of this li will be similar to: "3 errors before 'Section Name' section" (actual text dependant on what messages
 * are present) followed by an ul - the sublist - of field link items for each field specified in currentFields.
 *
 * @param parentSectionData - the data of the section this sublist will be provided for
 * @param currentFields - the fields to generate field links for by id
 * @param messageMap - map of the messageData associated with the fields; currentFields specifies a subset of these
 * @param sectionId - the id of the section that occurs after (or in some cases) before the fields to be contained in
 * the sublist
 * @param before - true if these field are before the section specified by id, false otherwise
 */
function generateFieldLinkSublist(parentSectionData, currentFields, messageMap, sectionId, before) {

    var sectionTitle = jQuery("[data-headerFor='" + sectionId + "']").find("> :header .uif-headerText-span, "
                + "> label .uif-headerText-span").text();
    var sectionType = "section";
    if (sectionTitle == null || sectionTitle == "") {
        //field group case
        sectionTitle = jQuery("#" + sectionId).data("label");
        sectionType = "field group";
    }

    var disclosureText = "";
    var links = [];
    var errorCount = 0;
    var warningCount = 0;
    var infoCount = 0;
    var disclosureLink = null;
    var image = "";
    var linkType = "";

    for (var i in currentFields) {
        if (currentFields[i] != null) {

            var fieldId = currentFields[i];

            var messageData = messageMap[fieldId];
            if (messageData != undefined && messageData != null) {
                errorCount = errorCount + messageData.serverErrors.length + messageData.errors.length;
                warningCount = warningCount + messageData.serverWarnings.length + messageData.warnings.length;
                infoCount = infoCount + messageData.serverInfo.length + messageData.info.length;

                var link = generateFieldLink(messageData, fieldId, parentSectionData.collapseFieldMessages,
                        parentSectionData.displayLabel);
                if (link != null) {
                    links.push(link);
                }
            }
        }
    }
    if (errorCount || warningCount || infoCount) {
        var locationText = "before";
        if (!before) {
            locationText = "after";
        }

        if (errorCount) {
            image = errorImage;
            linkType = "uif-errorMessageItem";
        }
        else if (warningCount) {
            image = warningImage;
            linkType = "uif-warningMessageItem";
        }
        else if (infoCount) {
            image = infoImage;
            linkType = "uif-infoMessageItem";
        }

        var countMessage = generateCountString(errorCount, warningCount, infoCount);

        disclosureText = countMessage + " " + locationText + " the \"" + sectionTitle + "\" " + sectionType;

        if (links.length) {
            var subSummary = jQuery("<ul></ul>");
            for (var i in links) {
                jQuery(links[i]).appendTo(subSummary)
            }
            //jQuery(subSummary).hide();
        }

        //write disclosure link and div
        disclosureLink = jQuery("<li tabindex='0' class='" + linkType + "'>" + disclosureText + "</li>");
        jQuery(subSummary).appendTo(disclosureLink);
    }
    return disclosureLink;
}

/**
 * Generates a summary link for the section specified by id, this link describes how many messages of each type can
 * be found in a particular section.  The link links, the 'header' of that section.
 * @param sectionId - the id of the section to create a summary link for
 */
function generateSummaryLink(sectionId) {
    //determine section title and section type
    var sectionTitle = jQuery("[data-headerFor='" + sectionId + "']").find("> :header .uif-headerText-span, "
            + "> label .uif-headerText-span").text();
    var sectionType = "section";
    if (sectionTitle == null || sectionTitle == "") {
        //field group case
        sectionTitle = jQuery("#" + sectionId).data("label");
        sectionType = "field group";
        sectionId = jQuery("#" + sectionId).data("group");
    }

    var sectionData = jQuery("#" + sectionId).data(kradVariables.VALIDATION_MESSAGES);
    var summaryLink = null;
    var summaryMessage = "";
    var image = "";
    var linkType = "";
    var highlight = "";

    if (sectionData && sectionData.messageTotal) {
        var countMessage = generateCountString(sectionData.errorTotal, sectionData.warningTotal, sectionData.infoTotal);

        summaryMessage = "The \"" + sectionTitle + "\" " + sectionType + " has " + countMessage;
    }

    if (summaryMessage != "") {
        if (sectionData.errorTotal) {
            image = errorImage;
            linkType = "uif-errorMessageItem";
            highlight = kradVariables.ERROR_HIGHLIGHT_SECTION_CLASS;
        }
        else if (sectionData.warningTotal) {
            image = warningImage;
            linkType = "uif-warningMessageItem";
            highlight = kradVariables.WARNING_HIGHLIGHT_SECTION_CLASS;
        }
        else if (sectionData.infoTotal) {
            image = infoImage;
            linkType = "uif-infoMessageItem";
            highlight = kradVariables.INFO_HIGHLIGHT_SECTION_CLASS;
        }
        summaryLink = jQuery("<li data-messageItemFor='" + sectionId + "' class='" + linkType + "'><a href='#'>"
                + summaryMessage + "</a></li>");

        summaryLink.find("a").click(function () {
            var header = jQuery("[data-headerFor='" + sectionId + "']").find("> :header, > label, > a > :header, > a > label");
            jumpToElementById(sectionId);
            if (header.length) {
                if (jQuery(header).parent().is("a")) {
                    jQuery(header).parent().focus();
                }
                else {
                    jQuery(header).bind("blur.validation", function () {
                        jQuery(this).removeAttr("tabindex");
                        jQuery(this).unbind("blur.validation");
                    });
                    jQuery(header).attr("tabindex", "0");
                    jQuery(header).focus();
                }
            }
            else {
                var firstItem = jQuery("[data-messagesFor='" + sectionId + "'] > ul > li:first > a");
                if (firstItem.length) {
                    jQuery(firstItem).focus();
                }
            }
        });

        summaryLink.find("a").focus(function () {
            jQuery("#" + sectionId).addClass(highlight);
        });
        summaryLink.find("a").blur(function () {
            jQuery("#" + sectionId).removeClass(highlight);
        });
        summaryLink.find("a").hover(
                function () {
                    jQuery("#" + sectionId).addClass(highlight);
                },
                function () {
                    jQuery("#" + sectionId).removeClass(highlight);
                });

        //case where this section is not showing its own messages, add them as a sublist of this li
        if(!sectionData.displayMessages){
            var sectionLinks = jQuery("[data-messagesfor='" + sectionId + "']");
            sectionLinks.removeAttr("class");
            sectionLinks.removeAttr("style");
            summaryLink.append(sectionLinks);
            jQuery(sectionLinks).show();
        }
    }
    return summaryLink;
}

/**
 * Runs the validation script if the validator is already setup, otherwise adds a handler
 * to the document which will run once when the 'validationSetup' event is fired
 *
 * @param scriptFunction
 */
function runValidationScript(scriptFunction) {
    if (pageValidatorReady) {
        scriptFunction();
    }
    else {
        jQuery(document).bind(kradVariables.VALIDATION_SETUP_EVENT, function (event) {
            jQuery(this).unbind(event);
            scriptFunction();
        });
    }
}

/**
 * Validate the a specific field's control defined by the selector/jQuery array passed in.  Also calls dependsOnCheck
 * to validate any dependant fields.
 *
 * @param fieldControl selector/jQuery array that represents the control to validate
 */
function validateFieldValue(fieldControl){
    //remove the ignore class if any due to a bug in the validate 
    //plugin for direct validation on certain types
    var hadIgnore = false;
    if(jQuery(fieldControl).hasClass("ignoreValid")){
        jQuery(fieldControl).removeClass("ignoreValid");
        hadIgnore = true;
    }
    var valid = jQuery(fieldControl).valid();
    dependsOnCheck(fieldControl, new Array());
    if(hadIgnore){
        jQuery(fieldControl).addClass("ignoreValid");
    }

    return valid;
}

/**
 * Checks to see if any controls depend on the control being validated, if they do calls validate
 * on them as well which will either add errors or remove them
 * Note: with the way that validation works the field must have been previously validated
 *
 * @param element control to check and validate dependent controls for
 * @param nameArray an array that is passed into this method that collects the names that have already been
 * validated/checked, to skip those names in future iterations because this method is recursive
 */
function dependsOnCheck(element, nameArray) {
    if(nameArray == undefined){
        nameArray = new Array();
    }
    var name;
    if (jQuery(element).is("option")) {
        name = jQuery(element).parent().attr('name');
    }
    else {
        name = jQuery(element).attr('name');
    }
    name = escapeName(name);
    jQuery("[name='" + name + "']").trigger("checkReq");
    nameArray.push(name);

    jQuery(".dependsOn-" + name).each(function () {

        var elementName;
        if (jQuery(this).is("option")) {
            elementName = jQuery(this).parent().attr('name');
        }
        else {
            elementName = jQuery(this).attr('name');
        }
        elementName = escapeName(elementName);

        //if it has one of these classes it means it was already visited by the user
        if (jQuery(this).hasClass("valid") || jQuery(this).hasClass("error")) {
            jQuery.watermark.hide(this);
            
            //remove the ignore class if any due to a bug in the validate plugin for direct validation on certain types
            var hadIgnore = false;
            if(jQuery(this).hasClass("ignoreValid")){
                jQuery(this).removeClass("ignoreValid");
                hadIgnore = true;
            }
            var valid = jQuery(this).valid();
            if(hadIgnore){
                jQuery(this).addClass("ignoreValid");
            }
            
            if (valid) {
                jQuery(element).removeAttr("aria-invalid");
            }
            else {
                jQuery(element).attr("aria-invalid", "true");
                if (!jQuery(this).is(":focus")) {
                    var id = getAttributeId(jQuery(this).attr('id'));
                    showMessageTooltip(id, true);
                }
            }
            jQuery.watermark.show(this);
            var namePresent = jQuery.inArray(elementName, nameArray);
            if (namePresent == undefined || namePresent == -1) {
                dependsOnCheck(this, nameArray);
            }
        }
    });
}

/**
 * Sets up a req indicator check for the controlName, when it changes, checks to see if it satisfies
 * some booleanFunction and then shows an indicator on the now required field (identified by requiredName).
 * If not satisfied, removes the indicator
 *
 * @param controlName
 * @param requiredName
 * @param booleanFunction
 */
function setupShowReqIndicatorCheck(controlName, requiredName, booleanFunction) {
    if (jQuery("[name='" + escapeName(controlName) + "']").length) {

        var id = jQuery("[name='" + escapeName(requiredName) + "']").attr("id");
        id = getAttributeId(id);
        var indicator;
        if (id) {
            var label = jQuery("#" + id + "_label_span");
            if (label.length) {
                indicator = label.find(".uif-requiredMessage");
            }
        }

        //check right now if it satisfies the condition, only if an indicator is not shown
        //(indicators that are shown stay shown for this check, as the server or another check must have shown them)
        if (indicator != null && indicator.length && indicator.is(':hidden')) {
            checkForRequiredness(controlName, requiredName, booleanFunction, indicator);
        }

        //also check condition when corresponding control is changed
        jQuery("[name='" + escapeName(controlName) + "']").change(function () {
            checkForRequiredness(controlName, requiredName, booleanFunction, indicator);
        });

        jQuery("[name='" + escapeName(controlName) + "']").bind("checkReq", function () {
            checkForRequiredness(controlName, requiredName, booleanFunction, indicator);
        });
    }
}

/**
 * Checks a particular field to see if it is now required, the field is considered required if the booleanFunction
 * evaluates to true.
 * @param controlName
 * @param requiredName
 * @param booleanFunction
 * @param indicator
 */
function checkForRequiredness(controlName, requiredName, booleanFunction, indicator) {
    if (indicator != null && indicator.length) {
        if (booleanFunction()) {
            indicator.show();
            jQuery("[name='" + escapeName(requiredName) + "']").attr("aria-required", "true");
            jQuery("[name='" + escapeName(requiredName) + "']").addClass("required");
        }
        else {
            indicator.hide();
            jQuery("[name='" + escapeName(requiredName) + "']").attr("aria-required", "false");
            jQuery("[name='" + escapeName(requiredName) + "']").removeClass("required");
        }
    }
}

//checks to see if the fields with names specified in the name array contain a value
//if they do - returns the total if the num of fields matched
function mustOccurTotal(nameArray, min, max) {
    var total = 0;
    for (i = 0; i < nameArray.length; i++) {
        if (coerceValue(nameArray[i])) {
            total++;
        }
    }

    return total;

}

//checks to see if the fields with names specified in the name array contain a value
//if they do - returns 1 if the num of fields with values are between min/max
//this function is used to for mustoccur constraints nested in others
function mustOccurCheck(total, min, max) {

    if (total >= min && total <= max) {
        return 1;
    }
    else {
        return 0;
    }
}
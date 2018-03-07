

function waitForPersonNames(callback){
	// A function that waits for a variable, personNames, to be defined on the webpage.
	// An entire function is passed as input (callback). While the variable is not defined, we 
	// set a timer to wait for 750 ms, then check again. Until the variable is loaded,
	// we set the 'loading' icon/div to be visible ('block'). This is a loading gif
	// to let the user know that things are happening.
	if (typeof personNames !== 'undefined'){
	 	document.getElementById("loading").style.display = "none" 
		callback()
	}else{
		console.log('waiting...')
		document.getElementById("loading").style.display = "block" 
		setTimeout(function(){ waitForPersonNames(callback)} , 750) 
	}
}


function constructOrUpdateCriteriaLine(divOfFields, isNew, divNumber, criteriaType, binaryValue, selectionValue) {
	/* The javascript constructor method for criteria fields. The inputs are: 
	*    difOfFields: The base name for criteria fields; it's usually going to be 'criteriaFieldsDiv'.
	*    isNew: is this a new line being created, or an update to a previous line.
	*    divNumber: Criteria divs are ID's by <divOfFields> + <divNumber>. If this is a new
	*  		field, then the div number will be determined automatically from a global variable.
	*			Otherwise, this value will be passed in by the callback
	*    criteriaType: A value, such as "Person" or "Year"
	*    binaryValue: Something along the lines of "is", "is not", or, in the case of "Date Range" types,
	*			the first date in the range.
	* 	  selectionValue: The value you want to set the criteria to match. 
	*  
	*    Now, many of these variables can have a null value passed to them and will be set to default values;
	*    the only thing that must be defined is the divOfFields, isNew, and criteriaType values.
 	*    This function will go through and set up/alter the line corresponding to the selected divNumber
	*    or create a new line, and set everything up so the line functions as planned.
	*/

	var mainDiv = document.getElementById(divOfFields);
	// The currently defined valid types of criteria
	var criteriaTypes = ["Date Range", "Person", "Year", "Month", "Special", "Location"]

	console.debug("Arguments passed to constructCriteriaAfterPersonNamesLoaded are: " + isNew + " " + divNumber + " " + criteriaType + ' ' + binaryValue + ' ' + selectionValue)

	if (isNew){
		// Get the next highest div number from the site, store it in a variable, and increment
		// it on the site. 
  		var divNumber = (document.getElementById('divNumID').value - 1)+ 2;
  		document.getElementById('divNumID').value = divNumber;

  		// Create a new line, of the appropriate class. Append to the main div (which holds all the criteria)
		var lineDiv = document.createElement('div');
		lineDiv.id = 'criteriaBox' + divNumber;
		lineDiv.className = "fieldParent";
		mainDiv.appendChild(lineDiv);

		///// Criteria type box
		// Create and classify the span for the criteria type box
		var span_criteria_type = document.createElement('span');
		span_criteria_type.id = 'typeBox' + divNumber
		lineDiv.appendChild(span_criteria_type);

		// Create and classify the select box, which goes in the span for the criteria type. 
		var select_criteria_type = document.createElement("select");
		span_criteria_type.appendChild(select_criteria_type);
		select_criteria_type.className = "criteriaType";
		select_criteria_type.id = 'selectCriteriaMenu' + divNumber

		// Populate the list with the various types of criteria
		for (var i = 0; i < criteriaTypes.length; i++){
			select_criteria_type.options.add(new Option(criteriaTypes[i], criteriaTypes[i]));
		}

		// If the selected criteria type is not valid, set it to default (Date Range, in this case, given ordering)
		if (criteriaTypes.indexOf(criteriaType) < 0){
			console.log("Error in choosing criteria type; selecting default. ")
			select_criteria_type.selectedIndex = 0
		}else{
			select_criteria_type.value = criteriaType
		}

		// Add a listener - if the first field (type box) changes, then change the rest of the line accordingly.
		// This is where a callback is defined - if the box changes, the entire rest of the line will 
		// change accordingly. I haven't gone and implemented state; that's too much hassle for not enough
		// benefit. So a change of criteria type will just set it to the default.
		select_criteria_type.addEventListener("change", function(){
			// Get the new field, create a construct for it, and construct the selection line again. 
			classType = select_criteria_type.value;
			constructOrUpdateCriteriaLine(divOfFields, 0, divNumber, classType, null, null);
		})

		// Make the binary selection field span
		var span_qualifier = document.createElement('span')
		span_qualifier.id = 'binarySelect' + divNumber
		lineDiv.appendChild(span_qualifier)

		// Make the criteria choice field span
		var span_filter_criteria = document.createElement('span')
		span_filter_criteria.id = 'selectionDiv' + divNumber
		lineDiv.appendChild(span_filter_criteria)

		// Create the remove button
		var removeSpan = document.createElement('span');
		lineDiv.appendChild(removeSpan);
		removeSpan.id = 'removeSubdiv' + divNumber;
		var removeLineButton = document.createElement('button');
		removeLineButton.id = 'button';
		removeLineButton.innerText = "Remove";
		removeLineButton.className = "fieldChild";
		removeSpan.appendChild(removeLineButton);

		// Set a callback for the remove button; it will go and remove the line,
		// based on the line ID. This is a different function.
		removeLineButton.onclick = function() { 
			removeElement(lineDiv.id);
		};

		// Grow the accordion if it is in display mode.
		var acc = document.getElementById("criteriaAccordion");
	    var panel = acc.nextElementSibling;
	    if (acc.className == "accordion"){  
	    // Toggle the criteria div on; it's clearly advantageous to see what you're adding.
	    	acc.classList.toggle("active");
	    }
	    if (acc.className == "accordion active"){
		    panel.style.maxHeight = panel.scrollHeight + "px";
		}

	}else{
		// This case is for when we are altering the criteria type box of an existing line; i.e.
		// this executes during that callback.

		// Get a reference to that line and to all the relevant elements that we will change in that line. 
		lineDiv = document.getElementById('criteriaBox' + divNumber)
		var select_criteria_type = document.getElementById('selectCriteriaMenu' + divNumber)
		var span_qualifier = document.getElementById('binarySelect' + divNumber)
		var span_filter_criteria = document.getElementById('selectionDiv' + divNumber)

		// Again, if (somehow, not expecting the site to be too maliciously used in my use case, but, for instance,
		// if I remove a type of criteria but it's in a saved show) the type of criteria doesn't exist,
		// get the default. 
		if (criteriaTypes.indexOf(criteriaType) < 0){
			console.log("Error in choosing criteria type; selecting default. ")
			select_criteria_type.selectedIndex = 0
		}else{
			select_criteria_type.value = criteriaType
		}

		// Remove the actual fields in the qualifier and filter criteria fields,
		// since those children can be different depending on the type of criteria. 
		// For instance, it's a text box for date range, but a drop-down menu in person. 
		while (span_qualifier.firstChild) {
		    span_qualifier.removeChild(span_qualifier.firstChild);
		}
			while (span_filter_criteria.firstChild) {
		    span_filter_criteria.removeChild(span_filter_criteria.firstChild);
		}
	}

	// OK, now everything is at a blank slate and equal whether it's a new line or an update
	// to an existing line. I will do a switch statement based on criteria type, and add the 
	// appropriate fields and values (if selected)
	switch(select_criteria_type.value){
		case "Date Range":
			/* Replace the traditional binary select with two calendars + text boxes  */
			var startLabel = document.createElement('span')
			startLabel.id = "spacing"
			startLabel.innerHTML = "From:"
			startLabel.className = "labelText"

			/*Calendar #1*/
			// Create the input (text box) element
			var i1 = document.createElement("input"); //input element, text
			i1.setAttribute('type',"text");
			i1.id = "binarySelectValues" + divNumber
			if (binaryValue == null){
				i1.value = "<none>"
			}else{
				i1.value = binaryValue
			}
			i1.className = "calendarBox"

			i1.onchange = function(){
				var regexYear = /^[0-9]+$/;
				if( regexYear.test(i1.value) ) {
					i1.value = '01/01/' + i1.value
				}
				var regexMDY = /^([0-1]?[0-9])[-/]([0-3]?[0-9])[-/]([0-9]+)/;
				mdyMatch = i1.value.match(regexMDY)
				month = parseInt(mdyMatch[1]).toString()
				day = parseInt(mdyMatch[2]).toString()
				year = parseInt(mdyMatch[3]).toString()

				while (month.length < 2){
					month = '0' + month
				}
				while (day.length < 2){
					day = '0' + day
				}
				if (year < 100  && year > 60){
					year = '19' + year
				}else if (year < 100 ){
					year = '20' + year
				}
				date = month + '/' + day + '/' + year
				i1.value = date
			}

			// Create a button that can be used to open the calendar
			var s1 = document.createElement('button'); //input element, Submit button
			s1.id = "anchor1_" + divNumber
			var linkText = document.createTextNode("Select");
			s1.appendChild(linkText)
			s1.className = "calSelect"
			s1.setAttribute('type', 'button')

			// Tack the calendars on to the span
			span_qualifier.appendChild(startLabel)
			span_qualifier.appendChild(i1);
			span_qualifier.appendChild(s1);

			// Onclick for the button for selecting the date via calendar
			s1.onclick=function(){
				cal.select(i1,'anchor1_'+ divNumber,'MM/dd/yyyy')
			}

			var endLabel = document.createElement('span')
			endLabel.innerHTML = "To:"
			endLabel.className = "labelText"

			/* Calendar #2 */
			// Almost identical formulation as calendar 1; won't re-comment. 
			var i2 = document.createElement("input"); //input element, text
			i2.setAttribute('type',"text");
			i2.id = "selectionValue" + divNumber
			if (selectionValue == null){
				i2.value = "<none>"
			}else{
				i2.value = selectionValue
			}
			i2.className = "calendarBox"
			//i2.setAttribute('size','25')

			i2.onchange = function(){
				var regexYear = /^[0-9]+$/;
				if( regexYear.test(i2.value) ) {
					i2.value = '12/31/' + i2.value
				}
				var regexMDY = /^([0-1]?[0-9])[-/]([0-3]?[0-9])[-/]([0-9]+)/;
				mdyMatch = i2.value.match(regexMDY)
				month = parseInt(mdyMatch[1]).toString()
				day = parseInt(mdyMatch[2]).toString()
				year = parseInt(mdyMatch[3]).toString()

				while (month.length < 2){
					month = '0' + month
				}
				while (day.length < 2){
					day = '0' + day
				}
				if (year < 100  && year > 60){
					year = '19' + year
				}else if (year < 100 ){
					year = '20' + year
				}
				date = month + '/' + day + '/' + year
				i2.value = date
			}

			var s2 = document.createElement('button'); //input element, Submit button
			s2.id = "anchor2_" + divNumber
			var linkText = document.createTextNode("Select");
			s2.appendChild(linkText)
			s2.className = "calSelect"
			s2.setAttribute('type', 'button')
			//s2.style.height="30px"

			span_filter_criteria.appendChild(endLabel)
			span_filter_criteria.appendChild(i2);
			span_filter_criteria.appendChild(s2);

			s2.onclick=function(){
				cal.select(i2,'anchor2_'+ divNumber,'MM/dd/yyyy')
			}

			break // Important, as in any case statement

		case "Person":
			// Create a binary selection box (i.e. 'is' or 'is not' said person) in the second span. 
			var binarySelect = document.createElement('select')
			binarySelect.id = 'binarySelectValues' + divNumber
			span_qualifier.appendChild(binarySelect)
			binarySelect.className = "binaryField"

			// Add the two options
			binarySelect.options.add(new Option("is", "is", true, true));
			binarySelect.options.add(new Option("is not", "is not", true, true));
			if (binaryValue == null) {
				binarySelect.selectedIndex = 0
			}else{
				possVals = ['is', 'is not']
				// Paranoia
				if (possVals.indexOf(binaryValue) < 0){
					console.error("Error in function constructOrUpdateCriteriaLine: Unknown binary switch value for Person. ")
					binarySelect.selectedIndex = 0
				}else{
					binarySelect.value = binaryValue
				}
			}

			// Get the second configurable field, and put a drop-down list of 
			// people. Since we've already taken care of waiting for the personNames
			// variable to be set, and we assume that that list won't change frequently
			// (given backend run rates and such), we just pull it from where it's defined
			// on the page and populate the list. 

			// So, create the select element
			var personSelect = document.createElement('select')
			personSelect.id = 'selectionValue' + divNumber
			span_filter_criteria.appendChild(personSelect)
			personSelect.className = "dropdownOptions"

			// Check the field that determines the minimum number of photos
			// a person must be in to appear in the list. This will be static;
			// if that field changes, I'm not going to go and change this list. a) that's 
			// too much work, and b) there may be someone selected that doesn't have
			// that many photos but should be on the list still, and I don't want to erase
			// that.

			numPhotosField = document.getElementById("minPhotos")
			minNumPhotos = numPhotosField.value

			console.debug(personNames[Object.keys(personNames)[1]])

			personSubArray = []

			// Iterate through the personNames list and copy anyone who has the requisite number
			// of photos to the personSubArray. If that minimum number of photos is 1, then
			// I take a shortcut and copy all the keys of the list.
			if (minNumPhotos == 1){
				personSubArray = Object.keys(personNames)
			}else{
				i = 0;
				while( personNames[Object.keys(personNames)[i]] >= minNumPhotos){
					personSubArray.push( Object.keys(personNames)[i] ) 
					i = i + 1;
				}
			}

			// Sort the list alphabetically. 
			personSubArray = personSubArray.sort()

			// Populate the list 
			for (var i = 0; i < personSubArray.length; i++){
				personSelect.options.add(new Option(personSubArray[i], personSubArray[i], true, true))
			}

			// If the person we asked for doesn't exist, then we've got a mild problem, so set to a default
			// value and log it in the console. 
			if (selectionValue == null) {
				personSelect.selectedIndex = 0
			}else{
				if (personSubArray.indexOf(selectionValue) < 0){
					console.log("Error in function constructOrUpdateCriteriaLine: Unknown person selected for Person field. ")
					personSelect.selectedIndex = 0
				}else{
					personSelect.value = selectionValue
				}
			}


			break;

		case "Year":
			// As in the Person case, the first field is a drop-down with binary values,
			// although we have 'is', 'is not', 'is before', and 'is after'. 

			// Standard create the element, give it an id and a class, etc. 
			var binarySelect = document.createElement('select')
			binarySelect.id = 'binarySelectValues' + divNumber
			span_qualifier.appendChild(binarySelect)
			binarySelect.className = "binaryField"

			binarySelect.options.add(new Option("is", "is", true, true));
			binarySelect.options.add(new Option("is not", "is not", true, true));
			binarySelect.options.add(new Option("is before", "is before", true, true));
			binarySelect.options.add(new Option("is after", "is after", true, true));

			// If a selected value was passed, populate that in the list. 
			binarySelect.selectedIndex = 0
			if (binaryValue == null) {
				binarySelect.selectedIndex = 0
			}else{
				possVals = ["is", "is not", "is before", "is after"]
				if (possVals.indexOf(binaryValue) < 0){
					console.log("Error in function constructOrUpdateCriteriaLine: Unknown binary switch value for Person. ")
					binarySelect.selectedIndex = 0
				}else{
					binarySelect.value = binaryValue
				}
			}

			// Create an 'input' element for putting in the year number.
			var yearSelect = document.createElement("input")
			yearSelect.setAttribute("type", "text")
			yearSelect.id = 'selectionValue' + divNumber
			yearSelect.className = "dropdownOptions"

			// Test that, when a value is put into the year, that it consists of 
			// all numbers; else, wipe it clean.
			yearSelect.onchange=function(){
				var regex = /^[0-9]+$/;
				if( !regex.test(yearSelect.value) ) {
					yearSelect.value = ""
				}
			}

			// Validate a passed value in the same manner as above (all numbers, else blank)
			var regex = /^[0-9]+$/;
			if (selectionValue != null && regex.test(selectionValue) ){
				yearSelect.value = selectionValue
			}else{
				yearSelect.value = '';
			}

			span_filter_criteria.appendChild(yearSelect)

			break;

		case "Month":
			// Copy past from the previous few; give it the options of 'is' or 'is not' a month for the first
			// drop-down box. Fairly straightforward as above. 
			var binarySelect = document.createElement('select')
			binarySelect.id = 'binarySelectValues' + divNumber
			span_qualifier.appendChild(binarySelect)
			binarySelect.className = "binaryField"

			binarySelect.options.add(new Option("is", "is", true, true));
			binarySelect.options.add(new Option("is not", "is not", true, true));
			if (binaryValue == null) {
				binarySelect.selectedIndex = 0
			}else{
				possVals = ['is', 'is not']
				if (possVals.indexOf(binaryValue) < 0){
					console.log("Error in function constructOrUpdateCriteriaLine: Unknown binary switch value for Person. ")
					binarySelect.selectedIndex = 0
				}else{
					binarySelect.value = binaryValue
				}
			}

			// Populate the second list with the months of the year, defined here. 
			var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

			// Build the list element
			var monthSelect = document.createElement('select')
			monthSelect.id = 'selectionValue' + divNumber
			span_filter_criteria.appendChild(monthSelect)
			monthSelect.className = "dropdownOptions"

			// Populate the list element
			for (var i = 0; i < months.length; i++){
				monthSelect.options.add(new Option(months[i], i + 1, true, true))
			}

			// Load the month list with either the saved value or the first value ("January")
			if (selectionValue == null) {
				monthSelect.selectedIndex = 0
			}else{
				if (months.indexOf(selectionValue) < 0){
					console.log("Error in function constructOrUpdateCriteriaLine: Unknown person selected for Person field. ")
					monthSelect.selectedIndex = 0
				}else{
					/* VValues are numerical, so we need to choose the selected index rather than the month name. */
					monthSelect.selectedIndex = months.indexOf(selectionValue)
				}
			}

			break;
		case "Special":

			// Copy past from the previous few; give it the options of 'is' or 'is not' a month for the first
			// drop-down box. Fairly straightforward as above. 
			var binarySelect = document.createElement('select')
			binarySelect.id = 'binarySelectValues' + divNumber
			span_qualifier.appendChild(binarySelect)
			binarySelect.className = "binaryField"

			binarySelect.options.add(new Option("Last N Years", "last n year", true, true));
			binarySelect.options.add(new Option("Other TBD", "other", true, true));
			possVals = ['last n year', "other"]
			//binarySelect.options.add(new Option("Special Day", "special day", true, true));
			if (binaryValue == null) {
				binarySelect.selectedIndex = 0
			}else{
				if (possVals.indexOf(binaryValue) < 0){
					console.log("Error in function constructOrUpdateCriteriaLine: Unknown binary switch value for Special. ")
					binarySelect.selectedIndex = 0
				}else{
					binarySelect.value = binaryValue
				}
			}

			if (binaryValue == null) {
				binarySelect.selectedIndex = 0
			}else{
				if (possVals.indexOf(binaryValue) < 0){
					console.log("Error in function constructOrUpdateCriteriaLine: Unknown person selected for Person field. ")
					binarySelect.selectedIndex = 0
				}else{
					/* VValues are numerical, so we need to choose the selected index rather than the month name. */
					binarySelect.selectedIndex = possVals.indexOf(binaryValue)

				}
			}

			binaryValue = binarySelect.value

			binarySelect.addEventListener("change", function(){
				// Get the new field, create a construct for it, and construct the selection line again. 
				binaryValue = binarySelect.value;
				constructOrUpdateCriteriaLine(divOfFields, 0, divNumber, "Special", binaryValue, null);
				//console.log("Change!")
			})

			if (binaryValue == 'other'){
				console.log("other")
			}else if (binaryValue == 'last n year'){

				var yearSelect = document.createElement("input")
				yearSelect.setAttribute("type", "text")
				yearSelect.id = 'selectionValue' + divNumber
				yearSelect.className = "dropdownOptions"

				// Test that, when a value is put into the year, that it consists of 
				// all numbers; else, wipe it clean.
				yearSelect.onchange=function(){
					var regex = /^[0-9\.]+$/;
					if( !regex.test(yearSelect.value) ) {
						yearSelect.value = ""
					}
				}

				span_filter_criteria.appendChild(yearSelect)
			}


			/*// Populate the second list with the months of the year, defined here. 
			var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

			// Build the list element
			var monthSelect = document.createElement('select')
			monthSelect.id = 'selectionValue' + divNumber
			span_filter_criteria.appendChild(monthSelect)
			monthSelect.className = "dropdownOptions"

			// Populate the list element
			for (var i = 0; i < months.length; i++){
				monthSelect.options.add(new Option(months[i], i + 1, true, true))
			}

			// Load the month list with either the saved value or the first value ("January")
			if (selectionValue == null) {
				monthSelect.selectedIndex = 0
			}else{
				if (months.indexOf(selectionValue) < 0){
					console.log("Error in function constructOrUpdateCriteriaLine: Unknown person selected for Person field. ")
					monthSelect.selectedIndex = 0
				}else{
					/* VValues are numerical, so we need to choose the selected index rather than the month name. */
					/*monthSelect.selectedIndex = months.indexOf(selectionValue)
				}
			}*/

			break;
		default:
			break;
	}

}


function dateValidate(divNumber, startOrEndDate){
	startVal = document.getElementById("binarySelectValues" + divNumber)
	console.log(startVal)
	startVal = startVal.value;

	console.log(startVal)
	if (startOrEndDate == 'begin'){

	}else{

	}
}
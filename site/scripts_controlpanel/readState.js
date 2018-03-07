
function criteriaToJSON(){

	console.debug('Starting criteriaJSON')

	// Read in the criteria that are currently defined on the page, push them into a struct, and 
	// convert the struct to JSON. 
	// The struct has the fields 'num', 'criteriaType', 'booleanValue', and 'criteriaVal'.
	var criteria = []
	var numElements = document.getElementById('divNumID').value + 1; // +1 so we have typical for loop indexing
	var num = 0
	for (var i = 0; i < numElements; i++){
		criteriaTypeField = 'selectCriteriaMenu' + i
		// Need to have ajax enabled, by including the script line : 
		// <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
		if ($("#" + criteriaTypeField).length > 0){
			criteriaType = document.getElementById(criteriaTypeField).value
			booleanValue = document.getElementById('binarySelectValues' + i).value
			criteriaValue = document.getElementById('selectionValue' + i).value

			criteria.push({num: num, criteriaType : criteriaType, booleanValue : booleanValue, criteriaVal : criteriaValue})
			num = num + 1
		}
	}

	var criteriaJSON = JSON.stringify(criteria); // generated by PHP
	console.debug("Criteria JSON: " + criteriaJSON)
	return criteriaJSON;
}

function readShowOptions(relaunch){
	buttonIdsList = [];

	var buttons = document.getElementsByClassName("option_chk");
	var i;
	
	var optionDictionary = {}

	for (i = 0; i < buttons.length; i++) {
		//console.log(buttons[i].value)
	    //console.log(buttons[i].checked)
	    if (buttons[i].value == 'Delay'){
	    	delayField = document.getElementById('delayForm')
	    	//console.log(delayField.value)
	    	optionDictionary[buttons[i].value] = delayField.value;
	    }else{
	    	optionDictionary[buttons[i].value] = buttons[i].checked;
	    }
	}
	optionDictionary['Relaunch'] = relaunch;

	var optionsJSON = JSON.stringify(optionDictionary);
	return optionsJSON;
}

function readSchedules(){

	var schedules = [];
	var numElements = document.getElementById('scheduleNumID').value + 1; // +1 so we have typical for loop indexing

	var num = 0
	for (var i = 0; i < numElements; i++){
		criteriaTypeField = 'scheduleBox' + i
		// Need to have ajax enabled, by including the script line : 
		// <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
		if ($("#" + criteriaTypeField).length > 0){
			dayOfWeek = document.getElementById('dayOfWeekBox' + i).value
			startTime = document.getElementById('showStartTime' + i).value
			stopTime = document.getElementById('showStopTime' + i).value
			showName = document.getElementById('showNameSelect' + i).value

			startTime = timeTo24h(startTime);
			stopTime = timeTo24h(stopTime);

			// No point saving shows that are the same start and stop time, since I define that as 0 minutes not 24 hours
			if (startTime != stopTime && startTime != false && stopTime != false){
				schedules.push({num: num, dayOfWeek : dayOfWeek, startTime : startTime, stopTime : stopTime, showName : showName})
				num = num + 1
			}
		}
	}

	var scheduleJSON = JSON.stringify(schedules); // generated by PHP
	return scheduleJSON;
}

function timeTo24h(time){

	var timePattern = /^([0]?[0-9]|1[0-2]):?([0-5][0-9])?\s?(AM|am|PM|pm)?$/;

	var timeMatch = time.match(timePattern)

	if (timeMatch == null) {
		//alert("Time is not in a valid format.");
		console.error('Time ' + time + ' not valid format')
		return false;
	}
	else{
		hours = parseInt(timeMatch[1]);
		minutes = parseInt(timeMatch[2]).toString();
		ampm = timeMatch[3].toUpperCase();

		if (ampm == 'PM'){
			hours += 12;
		}

		hours = hours.toString()
	}

	while (hours.length < 2){
		hours = '0' + hours
	}
	while (minutes.length < 2){
		minutes = '0' + minutes
	}

	return hours + minutes ;
}
<?php
header("Content-type: application/javascript");
?>  <!-- Do this because of https://stackoverflow.com/questions/23574306/executing-php-code-inside-a-js-file -->
/*
	var imported = document.createElement('script');
	imported.src = 'lineAdd.js';
	document.head.appendChild(imported);
	var imported2 = document.createElement('script');
	imported2.src = 'readState.js';
	document.head.appendChild(imported2);*/



	var loadSelectIdx = 0;

	// Get the modal
	var savemodal = document.getElementById('saveModal');
	var loadmodal = document.getElementById('loadModal');

	// Get the button that opens the modal
	var savebtn = document.getElementById("saveCriteria");

	var loadShowStartBtn = document.getElementById("loadShow");

	// Get the <button> element that closes the modal
	var closeSave = document.getElementById("cButtonSave");
	var closeLoad = document.getElementById("cButtonLoad");

	var formField = document.getElementById("nameForm");
	// Get the button that saves the field 
	var saveField = document.getElementById("saveNameSubmit");
	var loadSubmit = document.getElementById("loadShowSubmit");
	var deleteShowSubmit = document.getElementById("deleteShowSubmit");

	
	function getListOfSavedSlideshows(){
		$.ajax({
			type: 'POST',
			url: 'scripts_controlpanel/getDatabase.php',
			data: {'queryType': 'loadShowNames'},
			success: function(data){
		        decodedData = JSON.parse(data);

		        errors = decodedData['errors']
		        for (i = 0; i < errors.length; i++){
		        	console.error("Error in loading slideshow names (modalScript.php): " + errors[i]);
		        }
		        
		        warnings = decodedData['warnings']
		        for (i = 0; i < warnings.length; i++){
		        	console.warn("Warning in loading slideshow names (modalScript.php): " + warnings[i]);
		        }
		        
		        definedSlideshows = decodedData['savedVals'];

			}
		});
	}

	// When the user clicks the button, open the modal 
	savebtn.onclick = function() {
	    savemodal.style.display = "block"; 
	}

	deleteShowSubmit.onclick = function(){
		var select = document.getElementById("savedSlideshowSelect");

		slideshowSaveName = select.value
		queryType = 'removeShow'
		formField.value = slideshowSaveName;

		confirmed = confirm("Are you sure you want to delete " + slideshowSaveName + "?");
		if (confirmed == true){
			$.ajax({
				type: 'POST',
				url: 'scripts_controlpanel/getDatabase.php',
				data: {'queryType': queryType, 'selectedVal': slideshowSaveName},
				success: function(data){

					decodedData = JSON.parse(data);
			        jsonOfSavedShow = decodedData['savedVals'];

			        errors = decodedData['errors']
			        for (i = 0; i < errors.length; i++){
			        	console.error("Error in deleting slideshow  (modalScript.php): " + errors[i]);
			        }
			        warnings = decodedData['warnings']
			        for (i = 0; i < warnings.length; i++){
			        	console.warn("Warning in deleting slideshow  (modalScript.php): " + warnings[i]);
			        }

			        selectVals = select.options;
			        for (var i=0; i<select.length; i++){
						if (select.options[i].value == slideshowSaveName )
				     		select.remove(i);
				  		}
					}

			});
		}
		getListOfSavedSlideshows();
	}

	loadShowStartBtn.onclick = function(){
	    loadmodal.style.display = "block"; 

	    queryType = 'loadShowNames'

	    $.ajax({
			type: 'POST',
			url: 'scripts_controlpanel/getDatabase.php',
			data: {'queryType': queryType, selectedVal: ''},
			success: function(data){
		        decodedData = JSON.parse(data);
		        definedSlideshows = decodedData['savedVals'];

		        errors = decodedData['errors']
		        for (i = 0; i < errors.length; i++){
		        	console.error("Error in loading slideshow names (modalScript.php): " + errors[i]);
		        }
		        warnings = decodedData['warnings']
		        for (i = 0; i < warnings.length; i++){
		        	console.warn("Warning in loading slideshow names (modalScript.php): " + warnings[i]);
		        }

			    var select = document.getElementById("savedSlideshowSelect");

				var i;
			    for(i = select.options.length - 1 ; i >= 0 ; i--)
			    {
			        select.remove(i);
			    }

				for (var i = 0; i < definedSlideshows.length; i++){
					select.options.add(new Option(definedSlideshows[i], definedSlideshows[i]));
				}

				select.selectedIndex = loadSelectIdx;
			}
		});


	}

	loadSubmit.onclick = function() {
		var select = document.getElementById("savedSlideshowSelect");

		slideshowSaveName = select.value
		queryType = 'loadJSONofName'
		formField.value = slideshowSaveName;
		loadSelectIdx = select.selectedIndex


	    minNumField = document.getElementById("minPhotos")
	    minVal = minNumField.value
	    minNumField.value = 1

		$.ajax({
			type: 'POST',
			url: 'scripts_controlpanel/getDatabase.php',
			data: {'queryType': queryType, 'selectedVal': slideshowSaveName},
			success: function(data){
		        decodedData = JSON.parse(data);
		        jsonOfSavedShow = decodedData['savedVals'];

		        errors = decodedData['errors']
		        for (i = 0; i < errors.length; i++){
		        	console.error("Error in loading slideshow  (modalScript.php): " + errors[i]);
		        }
		        warnings = decodedData['warnings']
		        for (i = 0; i < warnings.length; i++){
		        	console.warn("Warning in loading slideshow  (modalScript.php): " + warnings[i]);
		        }

		        if (errors.length == 0){
		        	jdata = JSON.parse(jsonOfSavedShow);
		        	removeAllCriteria(); // Clear the criteria
		        	for (j = 0; j < jdata.length; j++){
		        		// constructOrUpdateCriteriaLine defined in constructCriteriaLine.js
		        		// isNew, divNumber, criteriaType, binaryValue, selectionValue, modAboveVal, andOrVal
		        		constructOrUpdateCriteriaLine('criteriaFieldsDiv', isNew = true, divNumber = null, criteriaType = jdata[j]['criteriaType'], 
		        			binaryValue = jdata[j]['booleanValue'], selectionValue = jdata[j]['criteriaVal'], modAboveVal = jdata[j]['modAbove'], 
		        			andOrVal = jdata[j]['andOr'] )
		        	}
		        }
				minNumField.value = minVal
			}
		});

	    loadmodal.style.display = "none";
	}

	// When the user clicks on <span> (x), close the modal
	closeSave.onclick = function() {
	    savemodal.style.display = "none";
	}

	closeLoad.onclick = function() {
	    loadmodal.style.display = "none";
	}
	// When the user clicks anywhere outside of the modal, close it
	window.onclick = function(event) {
	    if ( event.target == savemodal ) {
		    savemodal.style.display = "none";
	    }
	    if ( event.target == loadmodal ) {
		    loadmodal.style.display = "none";
	    }
	}

	saveField.onclick = function(){
		saveName = formField.value;
		formField.value = '';
		savemodal.style.display = "none";
		/*criteriaToJSON is defined in readState.js*/
		jsonOfParams = criteriaToJSON();

		console.log(jsonOfParams)

		queryType = 'saveValue'

		$.ajax({
			type: 'POST',
			url: 'scripts_controlpanel/getDatabase.php',
			data: {'queryType': queryType, 'selectedVal': jsonOfParams, 'name': saveName},
			success: function(data){
		        decodedData = JSON.parse(data);
		     	getListOfSavedSlideshows();   
			}
		});
	}

	function removeAllCriteria(){

		// Get the global variable that we're using for marking off the criteria divs.
  		var maxNum = (document.getElementById('divNumID').value -1)+ 1;

  		// Name all the criteria divs, and remove them if they still exist
  		for (var i = maxNum ; i >= 0; i--){
			parentName = 'criteriaBox' + i;
			// This line is used to determine if the div exists (by ID)
			if ($("#" + parentName).length > 0){
				parent = document.getElementById(parentName);
				parent.remove();
			}
  		}

  		// Reset the global variable to zero. 
  		document.getElementById('divNumID').value = 0;

	}


	

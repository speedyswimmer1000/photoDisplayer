<html>
<head>
	<title>HTML5 History API Demo</title>
</head>
<body>
	<textarea id="log" style="width:100%;height:400px;margin:1em;"></textarea>
	<div id="url" style="border:1px black dotted;height:1em;margin:1em;"></div>
	<div id="buttons" style="margin:1em;"></div>
	<script type="text/javascript">
			var $url = document.getElementById('url'), $log = document.getElementById('log');
			window.onpopstate = function(event) {
				var message =
					"onpopstate: "+
					"location: " + location.href + ", " +
					"data: " + JSON.stringify(event.state) +
					"\n\n"
					;
				$url.innerHTML = location.href;
				$log.innerHTML += message;
				console.log(message);
			};
			window.onhashchange = function(event) {
				var message =
					"onhashchange: "+
					"location: " + location.href + ", "+
					"hash: " + location.hash +
					"\n\n"
					;
				$url.innerHTML = location.href;
				$log.innerHTML += message;
				console.log(message);
			};
			// Prepare Buttons
			var
				buttons = document.getElementById('buttons'),
				scripts = [
					'history.pushState({state:1}, "State 1", "?state=1");',
					'history.pushState({state:2}, "State 2", "?state=2");',
					'history.replaceState({state:3}, "State 3", "?state=3");',
					'location.hash = Math.random();',
					'history.back();',
					'history.forward();',
					'document.location.href = document.location.href.replace(/[\#\?].*/,"");'
				],
				buttonsHTML = ''
				;
			// Add Buttons
			for ( var i=0,n=scripts.length; i<n; ++i ) {
				var _script = scripts[i];
				buttonsHTML +=
					'<li><button onclick=\'javascript:'+_script+'\'>'+_script+'</button></li>';
			}
			buttons.innerHTML = buttonsHTML;
	</script>
</body>
</html>
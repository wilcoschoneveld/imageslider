/* BEARSLIDER
*
* author: Wilco Schoneveld
*/

;(function($) {

	//default bearslider settings
	var bsdefault = {
		//IMAGE DATA
		images: [],					//Javascript image array
		stringJSON: "",				//JSON data string
		stringXML: "",				//XML data string
		dataUrl: "",				//AJAX data url
		dataType: "json",			//AJAX data type
		
		//OPTIONS
		autostart: true,			//should bearslider start automatically?
		random: false, 				//should bearslider randomize the image sequence?
		startid: "", 				//id of first image
		duration: 5,				//total duration each slide is in view
		transitiontime: 2, 			//animation time
		
		//ADVANCED
		preloadall: false, 			//should all images be preloaded at start?
		ups: 10 					//amount of updates per second
	};

	//find the prefix for css properties (taken from Jquery Transit v0.1.3)
	var div = document.createElement('div');
	var prefixes = ['-moz-', '-webkit-', '-o-', '-ms-'];
	var getVendorPropertyName = function(prop) {
		if (prop in div.style) { return prop; }
		for (var i=0; i<prefixes.length; ++i) {
		  var vendorProp = prefixes[i] + prop;
		  if (vendorProp in div.style) { return vendorProp; }
		}
	}
	delete div;
	
	//store the transform property names
	var bscss = {
		transform : getVendorPropertyName("transform"),
		transition : getVendorPropertyName("transition"),
		backface : getVendorPropertyName("backface-visibility") 
	}
	
	//main function called on slideshow frame
	$.fn.bearslider = function(options) {	
		//store namespace and frame reference
		var bslider = {};
		var bsframe = this;
		
		//set initial namespace values
		bslider.state = [];
		bslider.current = -1;
		bslider.next = 0;
		bslider.timestart = 0;
		bslider.timeleft = 0;
		bslider.maintimer = "";
		bslider.temptimer = "";
	
		//process initial input
		var init = function() {		
			//merge user settings with default
			bslider.settings = $.extend({}, bsdefault, options);
			
			//find images in the frame
			bslider.images = bsframe.children("img").not(".DNR");
			
			//find all DNR-elements in the frame
			var dnr = bsframe.children(".DNR");
			
			//clear the frame
			bsframe.empty();
			
			//create a viewport
			bslider.viewport = $("<div id='bsviewport'></div>");
			bslider.viewport.css({
				"position" : "absolute",
				"overflow" : "hidden",
				"left"     : "0",
				"top"      : "0",
				"width"    : "100%",
				"height"   : "100%"})
			
			//append the viewport and DNR elements back to the frame
			bsframe.append(bslider.viewport).append(dnr);
			
			//create temp objects for each image and destroy original
			bslider.images.each(function(index) {
				var tmp = new Object();
				tmp.src = bslider.images[index].src;
				tmp.id = bslider.images[index].id;
				tmp.info = bslider.images[index].alt;
				delete bslider.images[index];
				bslider.images[index] = tmp;
			});
			
			//merge the given image array with image list
			if(bslider.settings.images) $.merge(bslider.images, bslider.settings.images);
			
			//parse JSON and XML string and merge with image list
			if(bslider.settings.stringJSON) $.merge(bslider.images, jQuery.parseJSON(bslider.settings.stringJSON));
			if(bslider.settings.stringXML) $.merge(bslider.images, jQuery.parseJSON(bslider.settings.stringXML));
			
			//check if data needs to be retreived from an URL
			if(bslider.settings.dataUrl) {
				//perform an AJAX request
				$.ajax({
					url      : bslider.settings.dataUrl,
					dataType : bslider.settings.dataType,
					success  : function(data){
						//merge the data with image list
						$.merge(bslider.images, data);
						
						//continue to setup
						setup();
					}
				});
			} else {
				//continue to setup
				setup();
			}
		}
		
		//process the image list and start the slider
		var setup = function() {
			//stop if there are no images in the list
			if(bslider.images.length < 1) {
				return;
			}
			
			//if there is only one image, copy it
			if(bslider.images.length == 1) {
				tmp = new Object();
				tmp.src = bslider.images[0].src;
				tmp.id = bslider.images[0].id;
				tmp.info = bslider.images[0].info;
				bslider.images.push(tmp);
			}
			
			//set all images to initial non-preloaded
			bslider.images.each(function(i) {
				bslider.state[i] = 0;
			});
			
			//if needed, randomize order using the Fisher-Yates Shuffle
			if(bslider.settings.random) {
				var m = bslider.images.length, t, i;
				while(m) {
					i = Math.floor(Math.random() * m--);
					t = bslider.images[m];
					bslider.images[m] = bslider.images[i];
					bslider.images[i] = t;
				}
			}
			
			//if a startid was given, find its index and set as next image
			if(bslider.settings.startid) {
				bslider.images.each(function(index) {
					if(this.id == bslider.settings.startid) {
						bslider.next = index;
						return false;
					}
				});
			}

			//if set by user, start preloading all images
			if(bslider.settings.preloadall) {
				bslider.images.each(function(index) { preload(index); });
			}
			
			//go to the first frame!
			forcenext(bslider.settings.autostart);
		}
		
		//preload image by given index
		var preload = function(index) {
			//if image is not preloading or preloaded
			if(bslider.state[index] == 0) {
				//create a new image object
				var tmp = new Image();
				tmp.src = bslider.images[index].src;
				tmp.id = bslider.images[index].id;
				tmp.info = bslider.images[index].info;
				
				//delete the temporary object
				delete bslider.images[index];
				
				//store the new image object
				bslider.images[index] = tmp;
				
				//set state to preloading
				bslider.state[index] = 1;
				
				//when done loading, set state to preloaded
				$(bslider.images[index]).load(function() {
					bslider.state[index] = 2;
				});
			}
		}
		
		//update cycle handler
		var run = function() {
			//store current time
			var now = (new Date).getTime();
			
			//if current slide is displayed longer then required duration
			if(now - bslider.timestart > bslider.settings.duration*1000) {
				//if next image in queue is not preloaded (failsafe check)
				if(bslider.state[bslider.next] == 0) {
					//preload next image
					preload(bslider.next);
				}
				//if next image in queue is being preloaded (failsafe check)
				if(bslider.state[bslider.next] == 1) {
					//if the load event was not triggered but the imageload is complete
					if(bslider.images[bslider.next].complete || bslider.images[bslider.next].readyState == 'complete') {
						bslider.state[bslider.next] = 2;
					}
				}
				//if the next image in queue is preloaded -> let's roll!
				if(bslider.state[bslider.next] == 2) {
					//reset the timestart
					bslider.timestart = now;
					
					//if the view contains an image
					if(bslider.current != -1) {
						//trigger user event
						bsframe.trigger("beforeFadeOut", bslider.images[bslider.current]);

						//fadeout (old) current image
						$(bslider.images[bslider.current]).stop(true).animate({"opacity": "0"}, bslider.settings.transitiontime*1000, function() {
								//trigger user event
								bsframe.trigger("afterFadeOut", this);
								
								//remove object
								$(this).remove();
						});
					}
					
					//set the new current image as next image in the queue
					bslider.current = bslider.next;
					
					//set a temporary variable as the current image element
					var tmpcurrent = $(bslider.images[bslider.current]);
					
					//if the new image is active in the slider, stop and remove it (failsafe)
					tmpcurrent.stop(true);
					tmpcurrent.remove();
					
					//prepare image for (re)entry
					tmpcurrent.css({
						"display":"inline",
						"position":"absolute",
						"opacity":"0"
					});
					
					//add image to the viewport
					bslider.viewport.prepend(tmpcurrent);

					//calculate scale and positioning (temporary code)	
					var iw = tmpcurrent.width(), ih = tmpcurrent.height();
					var vw = bslider.viewport.width(), vh = bslider.viewport.height();

					//if image width will overlap
					if((iw/ih) > (vw/vh)) {
						//scale = Math.ceil((vh/ih)*100)/100;
						tmpcurrent.height(vh+"px").width(iw*(vh/ih)+"px");
						tmpcurrent.css("left",-(tmpcurrent.width()-vw)/2);
					}
					//else image height will overlap or perfect fit
					else {
						//scale = Math.ceil((vw/iw)*100)/100;
						tmpcurrent.width(vw+"px").height(ih*(vw/iw)+"px");
						tmpcurrent.css("top",-(tmpcurrent.height()-vh)/2);
					}
						
					//trigger user event
					bsframe.trigger("beforeFadeIn", tmpcurrent);
					
					//fade the image in
					tmpcurrent.animate({"opacity": "1"}, bslider.settings.transitiontime*1000, function() {
						//trigger user event
						bsframe.trigger("afterFadeIn", this);
					});
					
					//set the next image
					bslider.next = bslider.current + 1;
					if(bslider.next >= bslider.images.length) bslider.next = 0;
					
					//start preloading next image
					preload(bslider.next);
				}
				//if the image was not preloaded
				else {
					//if the maintimer is not running, temptimer was -> do another cycle
					if(bslider.maintimer == "") {
						clearTimeout(bslider.temptimer);
						bslider.temptimer = setTimeout(run, 1000/bslider.settings.ups);
					}
				}
			}
		}
		
		//force transition to next image
		var forcenext = function(st) {
			//if mainslider is not running
			if(bslider.maintimer == "") {
				//if slider start is requested
				if(st) {
					//start slider
					bsframe.start();
				} else {
					//clear the temptimer
					clearTimeout(bslider.temptimer);
					
					//start temptimer
					bslider.temptimer = setTimeout(run, 1000/bslider.settings.ups);
				}
			}
			//set framestart at midnight January 1, 1970
			bslider.timestart = 0;
		}
		
		//public start function
		bsframe.start = function() {
			if(bslider.maintimer == "") {
				clearTimeout(bslider.temptimer);
				
				bslider.maintimer = setInterval(run, 1000/bslider.settings.ups);
				bslider.timestart = ((new Date).getTime() + bslider.timeleft) - (bslider.settings.duration)*1000;

				bsframe.trigger("onStateChange", true);
			}
		}
		
		//public stop function
		bsframe.stop = function() {
			if(bslider.maintimer != "") {
				clearTimeout(bslider.temptimer);
				clearInterval(bslider.maintimer);
				
				bslider.maintimer = "";
				bslider.timeleft = (bslider.settings.duration)*1000 - ((new Date).getTime() - bslider.timestart);
				
				bsframe.trigger("onStateChange", false);
			}
		}
		
		//public next function
		bsframe.gotoNext = function(start) {
			forcenext(start);
		}
		
		//public prev function
		bsframe.gotoPrev = function(start) {
			bslider.next = bslider.current - 1;
			if(bslider.next < 0) bslider.next = bslider.images.length - 1;
			preload(bslider.next);

			forcenext(start);
		}
		
		//public goto function
		bsframe.gotoSlide = function(target, start) {
			//check if target is a string
			if(typeof target == "string" || target instanceof String) {
				var test = -1;
				//try to find the matching index
				bslider.images.each(function(index) {
					if(this.id == target) {
						test = index;
						return false;
					}
				});
				//if index is found, set target
				if(test != -1) target = test;
				else return false;
			}
			
			//check if target is a valid number
			if(target >= 0 && target < bslider.images.length) {
				if(bslider.current == target) {
					if(bslider.maintimer != "") {
						bslider.timestart = (new Date).getTime();
					}
				} else {
					bslider.next = target;
					preload(bslider.next);
					forcenext(start);
				}
				return true;
			}

			return false;
		}

		//now that all functions have been declared, run the init function!
		init();
		
		//return the frame element for public function calls
		return bsframe;
	}

})(jQuery);
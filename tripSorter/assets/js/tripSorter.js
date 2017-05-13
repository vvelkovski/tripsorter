/*
Custom script for Trip Sorter
*/

function tripSorter() {
    //an array of all trip deals parsed from the provided json file
	var deals = [];
    //graph representation of all nodes with speed as cost
	var graphFastest = {};
    //a map of nodes with their reference ids based on the fastest graph
	var graphFastestReference = {};
    //graph representation of all nodes with price as cost
	var graphCheapest = {};
    //a map of nodes with their reference ids based on the cheapset graph
	var graphCheapestReference = {};
    //dijkstra graph
	var graph;
    
	initGraphData();

    /*
    fill departing and arriving select fields with city names
     */
	function initCityNames() {
		var cities = [];
		$.each(deals, function (key, value) {
			if ($.inArray(value.departure, cities) == '-1') {
				cities.push(value.departure);
			}
		});
		$.each(cities, function (key, value) {
			$('#fromCity, #toCity').append('<option value="' + value + '">' + value + '</option>');
		});
	}

    /*
     initialize all data needed for the web app.
     */
	function initGraphData() {
        //fetch the json file with the deals and store it as an array
		$.ajax({
			url: "response.json",
			dataType: "json",
			success: function (data) {
				$.each(data.deals, function (key, value) {
					saveData(value);
				});
				createFastestGraph();
				createCheapestGraph();
				initCityNames();
                //initialize the dijkstra graph
				graph = new Graph(graphFastest);
				//register the buttons for 'search' and 'reset' paths
				$('#findTripPath').click(function () {
					findTripPath();
				});
				$('#resetTripPath').click(function () {
					resetTripPath();
				});
				//register check when selecting a city
				$('#fromCity, #toCity').change(function () {
					citySelectorCheck();
				});
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.log('ERROR', textStatus, errorThrown);
			}
		});
	}
    //save parsed json data into the deals array
	function saveData(trip) {
		deals.push(trip);
	}

    //find the trip path based on user selection
	function findTripPath() {
		var fromCity = $('#fromCity').val();
		var toCity = $('#toCity').val();
		var tripType = $('input[name="tripType"]:checked').val();
		var totalMinutes = 0;
		var totalPrice = 0;
		if(fromCity != '' && toCity) {
			$('.departingCityError, .arrivingCityError').addClass('hidden');
			/*
			find the best path based on the Dijkstra algorithm
			 */
			var fastestDeals = findPath(tripType, fromCity, toCity);
			$('#sortedTrip').html('');
			$.each(fastestDeals, function (key, value) {
				var pathDeal = {};
				var html = '';
				/*
				the 'findPath' function returns an array of references,
				 we use that reference to find the whole deal object
				 */
				pathDeal = findDealByReference(value);
				//calculate the price based on the base price and the discount
				var dealPrice = calculatePrice(pathDeal.cost, pathDeal.discount);
				dealPrice = parseFloat(dealPrice).toFixed(2);
				//use euro currency format
				var dealPricePrint = dealPrice.toString().replace(".", ",");
				html = '<div class="tripDeal bg-primary"><div>'+
					'<span class="city from">' + pathDeal.departure + '</span>'+
					'<span class="gt"> > </span>' +
					'<span class="city to">' + pathDeal.arrival + '</span>' +
					'<span class="price">'+ dealPricePrint +'€</span></div>' +
					'<div class="extraInfo">' +
					'<span class="by"><b>' + pathDeal.transport + '</b></span>'+
					'<span class="reference">' + pathDeal.reference + '</span>'+
					'<span>for</span>'+
					'<span class="time">' + pathDeal.duration.h + 'h' + pathDeal.duration.m + '</span></div></div>';

				$('#sortedTrip').append(html);
				totalPrice = (parseFloat(totalPrice)+parseFloat(dealPrice)).toFixed(2);
				totalMinutes = totalMinutes + calculateMinutes(pathDeal.duration.h, pathDeal.duration.m);
			});
			//calculate the total time and total price of the whole path
			var hours = Math.floor( totalMinutes / 60);
			if(parseInt(hours) < 10) {
				hours = 0+''+hours;
			}
			var minutes = totalMinutes % 60;
			var totalPricePrint = totalPrice.toString().replace(".", ",");
			html = '<div class="tripDeal bg-primary">'+
				'<span><b>Total</b></span>'+
				'<span class="totalTime">' + hours + 'h' + minutes + '</span>' +
				'<span class="price">'+ totalPricePrint +'€</span></div>';
			$('#sortedTrip').append(html);
			$('#resetTripPath').removeClass('hidden');
		}
		else {
			/*
			if the user has not selected both the 'from' and 'to' display error messages
			 */
			if(fromCity == '') {
				$('.departingCityError').removeClass('hidden');
			}
			if(toCity == '') {
				$('.arrivingCityError').removeClass('hidden');
			}
		}
	}
	/*
	resets the trip display
	 */
	function resetTripPath() {
		$('#sortedTrip').html('');
		$('#resetTripPath').addClass('hidden');
		$('#fromCity, #toCity').val('');
	}
	/*
	make sure the user does not select the same city for departing and arriving
	 */
	function citySelectorCheck() {
		var fromCity = $('#fromCity').val();
		var toCity = $('#toCity').val();
		if(fromCity != '') {
			$('#toCity option').each(function () {
				if($(this).val() == fromCity) {
					$(this).addClass('hidden');
				}
				else {
					$(this).removeClass('hidden');
				}
			});
		}
		if(toCity != '') {
			$('#fromCity option').each(function () {
				if($(this).val() == toCity) {
					$(this).addClass('hidden');
				}
				else {
					$(this).removeClass('hidden');
				}
			});
		}
	}
	/*
	finds deal object based on the reference
	 */
	function findDealByReference(reference) {
		var returnDeal;
		$.each(deals, function (key, value) {
			if (value.reference == reference) {
				returnDeal = value;
				return false;
			}
		});
		return returnDeal;
	}
	/*
	finds the shortest path based on the Dijkstra algorithm
 	*/
	function findPath(sorting, departure, arrival) {
		var path = graph.findShortestPath(departure, arrival);
		var deals = [];
		var index = 0;
		/*
		find the reference of each deal and return it
		 */
		while (1) {
			if (typeof path[index] != 'undefined' && typeof path[index + 1] != 'undefined') {
				if (sorting == 'fastest') {
					deals.push(graphFastestReference[path[index]][path[++index]]);
				}
				else {
					deals.push(graphCheapestReference[path[index]][path[++index]]);
				}
			}
			else {
				break;
			}
		}
		return deals;
	}

	/*
	create a graph with speed as the cost of the links in it
	 */
	function createFastestGraph() {
		$.each(deals, function (key, value) {
			var cost = calculateMinutes(value.duration.h, value.duration.m);
			var dealArrival = value.arrival;
			if (typeof graphFastest[value.departure] == 'undefined') {
				graphFastest[value.departure] = {};
				graphFastestReference[value.departure] = {}
			}
			if (typeof graphFastest[value.departure][dealArrival] == 'undefined') {
				graphFastest[value.departure][dealArrival] = cost;
				graphFastestReference[value.departure][dealArrival] = value.reference;
			}
			else {
				if (cost < graphFastest[value.departure][dealArrival]) {
					graphFastest[value.departure][dealArrival] = cost;
					graphFastestReference[value.departure][dealArrival] = value.reference;
				}
			}
		});
	}

	/*
	 create a graph with price as the cost of the links in it
	 */
	function createCheapestGraph() {
		$.each(deals, function (key, value) {
			var cost = calculatePrice(value.cost, value.discount);
			var dealArrival = value.arrival;
			if (typeof graphCheapest[value.departure] == 'undefined') {
				graphCheapest[value.departure] = {};
				graphCheapestReference[value.departure] = {}
			}
			if (typeof graphCheapest[value.departure][dealArrival] == 'undefined') {
				graphCheapest[value.departure][dealArrival] = cost;
				graphCheapestReference[value.departure][dealArrival] = value.reference;
			}
			else {
				if (cost < graphCheapest[value.departure][dealArrival]) {
					graphCheapest[value.departure][dealArrival] = cost;
					graphCheapestReference[value.departure][dealArrival] = value.reference;
				}
			}
		});
	}
	/*
	calculate the minutes based on hours and minutes
	 */
	function calculateMinutes(hour, minutes) {
		hour = hour.replace(/^0+/, '');
		minutes = parseInt(minutes) + (parseInt(hour) * 60);
		return minutes;
	}
	/*
	calculate the final price, based on the base price and the discount of the deal
	 */
	function calculatePrice(price, discount) {
		if (discount == '0') {
			return parseInt(price);
		}
		return (price - ( price * discount / 100 )).toFixed(2);
	}
}
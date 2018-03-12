/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
/*
var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
        this.receivedEvent('deviceready');
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    }
};

app.initialize();*/

//Map variable
var map;
//Icon for garda stations
var gsIcon = L.ExtraMarkers.icon({
    icon: 'fa-shield',
    markerColor: 'blue',
    iconColor: 'white',
    prefix: 'fa'
});
//Divicon for stations, made because icon with extramarkers cause performance hitches
var myMarker = L.divIcon({
    className: 'map-marker marker-color-gray a-class',
    iconSize: [28,28],
    html:'<i class="fa fa-fw fa-shield"></i>'
});

//Icon for user location
var userIcon = L.ExtraMarkers.icon({
    icon: 'fa-arrow-down',
    prefix: 'fa'
})
//Var to store user lat and lon
var userLoc;
//Array for storing all garda station markers, for creating layer group
var markers = [];
//Layer group var
var markerLayer;
//Boolean used for removing markers on zoom and replacing on zoomend, used for debugging in browser
var removed = false;
//Var for storing the user marker
var user;
//Var for storing the route control
//var route;
//Made the closest index var public so that I could have seperate buttons for find closest station and get route
var closestIndex;

var lCtrl;

var stats = [];
var vals = [];
var allVals = [];
var hmap = [];
var year = "";
var crime = "";
var maxVal = 0;
var selected = null;
var myChart = null;
var selectNo = null;
var openStation = null;
var selectData1 = [];


var heatmapLayer = null;
var cfg = {
  // radius should be small ONLY if scaleRadius is true (or small radius is intended)
  // if scaleRadius is false it will be the constant radius used in pixels
  "radius": .1,
  "maxOpacity": .6,
  // scales the radius based on map zoom
  "scaleRadius": true,
  // if set to false the heatmap uses the global maximum for colorization
  // if activated: uses the data maximum within the current map boundaries
  //   (there will always be a red spot with useLocalExtremas true)
  "useLocalExtrema": false,
  // which field name in your data represents the latitude - default "lat"
  latField: 'lat',
  // which field name in your data represents the longitude - default "lng"
  lngField: 'lng',
  // which field name in your data represents the data value - default "value"
  valueField: 'count'
};

function  onLoad() {
    console.log("In onLoad.");
    document.addEventListener('deviceready', onDeviceReady, false);
}






//When device is ready make the map and load the garda stations via ajax query
function onDeviceReady() {
    console.log("In onDeviceReady.");
    makeBasicMap();
    loadGardaStations();

    //Stalls phone app while re-adding layer, just for debugging on web browser

    //Zooming would sometimes crash in Firefox browser with markers displayed so now layer is removed at the start
    //of a zoom and re-added at the end of a zoom.
    map.on("zoomstart", function(){
        //Upon implementation I realised that zooming would now always add the layer
        //But wrapping the 2 on zoom functions was too slow and the zoom would start and end before either could trigger
        //So now it checks if it has the layer and marks a boolean that it had to remove it when starting zoom
        //Then re-adds at the end of the zoom if this boolean is true and changes the boolean back to false
        if(map.hasLayer(markerLayer)){
            removed = !removed;
            map.removeLayer(markerLayer);
        }
    })

    map.on("zoomend", function(){
        if(removed == true) {
            map.addLayer(markerLayer);
            removed = !removed;
        }
    })

    map.on('click', findMyNearestGardaStation);

}



//Creates the map, gets tiles from the openstreetmap url and adds tiles to the map object
function makeBasicMap() {
    console.log("In makeBasicMap.");
    //Initialize map
    // set up the map
	map = new L.Map('map', {zoomControl:false});

	// Url for getting map, attribution for map tiles, and tile layer variable
	var mapUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	var mapAttrib='Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
	var mapLayer = new L.TileLayer(mapUrl, {minZoom: 4, maxZoom: 16, attribution: mapAttrib});

	// Set initial map view to roughly middle of Ireland and add the tile layer
	map.setView(new L.LatLng(53.33743, -7),8);
	map.addLayer(mapLayer);


}

function updateMapData() {
  year = document.getElementById("yearDd").value;
  crime = document.getElementById("crimeDd").value;
  console.log(year);
  console.log(crime);
  //$.when( loadData() ).done(heatmapStart());
  if(year != "" && crime != "")
  loadData();
}


//Function to locate the user's position, places a cursor at the point and pans and zooms to location
function locateMe() {
    console.log("In locateMe");
    map.locate();

    function onLocationFound(e) {
        if(map.hasLayer(user))
            map.removeLayer(user);

        var radius = e.accuracy / 2;
        userLoc = e.latlng;
        console.log(userLoc);
        map.flyTo(e.latlng, 15);
        user = L.marker(e.latlng, {icon: userIcon, draggable: true}).addTo(map)
            .bindPopup("You are within " + radius + " meters from this point").openPopup();

        L.circle(e.latlng, radius).addTo(map);
    }

    map.on('locationfound', onLocationFound);

    function onLocationError(e) {
        alert(e.message);
    }

    map.on('locationerror', onLocationError);
}

//Loops through marker array, if distance of current index's marker from user marker is shorter
//than the current shortest stored distance make the closest index var equal the current index
//and make the closest distance var equal the current distance
//At the end of the loop open the popup of the closest garda station.
function findMyNearestGardaStation(e) {
    var closestDist =  Number.MAX_SAFE_INTEGER;
    var currentDist;
    for(var i = 0; i < markers.length; i++)
    {
        currentDist = map.distance(e.latlng, markers[i].getLatLng());
        if (currentDist < closestDist){
            closestIndex = i;
            closestDist = currentDist;
        }
    }
    var dTable = document.getElementById("dTable").getElementsByTagName("tBody")[0];
    dTable.rows[closestIndex].dispatchEvent(new Event("mousedown"));
    selectData1 = Object.values(allVals[closestIndex]);
    makeChart();
}

function changeComp() {
  var comp = $("input[name=compSel]:checked").val();
  $("div[class=valSel]").toggle();
}

//Get route from user position to closest garda station
// function getRoute() {
//     route.setWaypoints([
//         user.getLatLng(),
//         markers[closestIndex].getLatLng()
//     ])
// }


//Makes ajax call to django application, receives json and creates a marker for every object in the json from lat and lon
//Binds a popup to each marker with the name, address, county, and phone number for the station
//Adds each marker to the markers array
//Once loop is finished and the array has every marker in it, it runs the showGardaStations function
function loadGardaStations() {
    $.ajax({
    url: 'http://139.59.162.120/stations/',
    //data: data,
    success: function(stations) {
      stats = stations.map(stat => ({ name: stat.name, county: stat.County, lat: stat.Latitude, long: stat.Longitude }));;

      for(var i = 0; i < stats.length; i++)
      {
          var marker = L.marker([stats[i].lat, stats[i].long], {icon: gsIcon});
          markers.push(marker);
      }

      //showGardaStations();
    }
    //dataType: dataType
    });

}


function loadData() {
  $.ajax({
    dataType: "json",
    url: "data/" + crime + ".json",
    mimeType: "application/json",
    success: function(values){

        //console.log(stats);
        vals = values.map(val => (parseInt(val[year]) ));
        allVals = values.map(function(val) {
          delete val.Name;
          for(var i = 2003; i <= 2016; i++){
            val[i] = parseInt(val[i]);
          }
          return val;
        });
        //console.log(vals);
        maxVal = 0;
        for(var i = 0; i < stats.length; i++)
        {
          stats[i].value = vals[i];
          if(vals[i] > maxVal){
            maxVal = vals[i];
          }
        }

        //console.log(Math.max(vals));

        for(var i = 0; i < stats.length; i++)
        {
            markers[i].bindPopup("<b>" + stats[i].name + " Garda Station</b>"
                + "<br>County: " + stats[i].county + "<br>Reported Cases: " + stats[i].value);
        }

        hmap = {max: maxVal, data: stats.map(x => ({ lat: x.lat, lng: x.long, count: x.value}))};

        //HMAP NOT UPDATING¬!!!!
        //console.log(stats[0]);
        if(heatmapLayer == null){
          heatmapLayer = new HeatmapOverlay(cfg);
          lCtrl = L.control.layers(null).addTo(map);
          map.addLayer(heatmapLayer);
          lCtrl.addOverlay(heatmapLayer, "Heatmap");
        }
        heatmapLayer.setData(hmap);
        populateTable();
        //makeChart();
        //$("#dTable").selectable();
        //console.log(hmap);
        //alert(hmap[1].toSource())
      }
    });
    //setTimeout(heatmapStart(), 5000);
}

function heatmapStart() {
  //console.log("Second HMAP", hmap);
  //console.log(hmap.max);

}

function heatmapUpdate() {
  heatmapLayer.setData(hmap);
}

function populateTable() {
  var dTable = document.getElementById("dTable").getElementsByTagName("tBody")[0];
  if(dTable.rows.length <= 1){
    for(var i=0; i<stats.length; i++){
      //console.log(stats[i]);
      var row = dTable.insertRow(dTable.rows.length);

      row.onmouseover=function(){
        // 'highlight' color is set in tablelist.css
        if ( this.className === '') {
            this.className='highlight';
        }
        return false
      }
      row.onmouseout=function(){
        if ( this.className === 'highlight') {
            this.className='';
        }
        return false
      }

      row.onmousedown=function(){
        //
        // Toggle the selected state of this row
        //

        // 'clicked' color is set in tablelist.css.
        if ( this.className !== 'clicked' ) {
          // Clear previous selection
          if ( selected !== null ) {
              selected.className='';
              markers[selected.rowIndex -1].remove();
          }

          // Mark this row as selected
          this.className='clicked';
          selected = this;
          selectNo = selected.rowIndex - 1;
          openStation = markers[selectNo];
          openStation.addTo(map).openPopup();

        }
        else {
          this.className='';
          selected = null;
        }

        return true
      }

      var cell1 = row.insertCell(0);
      var cell2 = row.insertCell(1);
      var cell3 = row.insertCell(2);

      cell1.innerHTML = stats[i].name;
      cell2.innerHTML = stats[i].county;
      cell3.innerHTML = stats[i].value;
    }
  }
  else{
    for(var i=0; i<stats.length; i++){
      //console.log(stats[i]);
      dTable.rows[i].cells[2].innerHTML = stats[i].value;
      //cell3.innerHTML = stats[i].value;
    }
  }
}

function genRGB(){
  var r = Math.floor((Math.random() * 130) + 120);
  var g = Math.floor((Math.random() * 130) + 100);
  var b = Math.floor((Math.random() * 130) + 100);

  return 'rgba(' + r + ', ' + g + ', ' + b + ', 0.3)'
}

function makeChart(){
  var ctx = document.getElementById("myChart").getContext('2d');
  if(myChart !== null){
    myChart.destroy();
  }
  myChart = new Chart(ctx, {
    type: $("input[name=chartSel]:checked").val(),
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: '# of Reported Cases ',
        data: selectData1,
        backgroundColor: [
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB()
        ],
        borderColor: [
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB(),
          genRGB()
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero:true
          }
        }]
      }
    }
  });

}

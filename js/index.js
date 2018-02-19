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
var hmap = [];
var year = "2010";
var crime = "threats";
var maxVal = 0;

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

  var yearSel = L.control({position: 'topleft'});
  yearSel.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'dropdown');
    div.innerHTML = '<select onChange=updateMapYear(this)><option>2003</option><option>2004</option><option>2005</option><option>2006</option>\
    <option>2007</option><option>2008</option><option>2009</option><option>2010</option><option>2011</option><option>2012</option>\
    <option>2013</option><option>2014</option><option>2015</option><option>2016</option></select>';
    div.firstChild.onmousedown = div.firstChild.ondblclick = L.DomEvent.stopPropagation;
    return div;
  };
  yearSel.addTo(map);

  var crimeSel = L.control({position: 'topright'});
  crimeSel.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'dropdown');
    div.innerHTML = '<select onChange=updateMapCrime(this)><option>Attempts/threats to murder, assaults, harassments and related offences</option>\
    <option>Dangerous or negligent acts</option><option>Kidnapping and related offences</option><option>Robbery, extortion and hijacking offences</option>\
    <option>Burglary and related offences</option><option>Theft and related offences</option><option>Fraud, deception and related offences</option>\
    <option>Controlled drug offences</option><option>Weapons and Explosives Offences</option><option>Damage to property and to the environment</option>\
    <option>Public order and other social code offences</option><option>Offences against government, justice procedures and organisation of crime</option></select>';
    div.firstChild.onmousedown = div.firstChild.ondblclick = L.DomEvent.stopPropagation;
    return div;
  };
  crimeSel.addTo(map);
}

function updateMapYear(yr) {
  year = yr.value;
  //console.log(yr);
  $.when( loadData() ).done(heatmapStart());
}

function updateMapCrime(cr) {
  switch(cr.value) {
    case "Attempts/threats to murder, assaults, harassments and related offences":
      crime = "threats";
      break;
    case "Dangerous or negligent acts":
      crime = "dangActs";
      break;
    case "Kidnapping and related offences":
      crime = "kidnap";
      break;
    case "Robbery, extortion and hijacking offences":
      crime = "robbery";
      break;
    case "Burglary and related offences":
      crime = "burglary";
      break;
    case "Theft and related offences":
      crime = "theft";
      break;
    case "Fraud, deception and related offences":
      crime = "fraud";
      break;
    case "Controlled drug offences":
      crime = "drugs";
      break;
    case "Weapons and Explosives Offences":
      crime = "weapons";
      break;
    case "Damage to property and to the environment":
      crime = "property";
      break;
    case "Public order and other social code offences":
      crime = "social";
      break;
    case "Offences against government, justice procedures and organisation of crime":
      crime = "govmnt";
      break;
  }

  $.when( loadData() ).done(heatmapStart());
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

//Creates layer group from markers array, creates a layer control to allow user to toggle layer on and off
function showGardaStations() {

  markerLayer = L.layerGroup(markers);
  var overlay = { "Garda Stations": markerLayer};
  lCtrl = L.control.layers(null, overlay).addTo(map);
  //Shows routing object, put after layer control for the sake of presenting them in the desired order
  //showRouting();

}

//Creates a routing control object, empty at first, popuplated after finding closest garda station
// function showRouting() {
//     route = L.Routing.control({
//         createMarker: function() { return null; }
//     }).addTo(map);
// }

//Loops through marker array, if distance of current index's marker from user marker is shorter
//than the current shortest stored distance make the closest index var equal the current index
//and make the closest distance var equal the current distance
//At the end of the loop open the popup of the closest garda station.
function findMyNearestGardaStation() {
    //console.log(map.getBounds());
    //console.log(map.getBounds().contains(user.getLatLng()));
    //console.log(user.getLatLng().distanceTo(markers[311].getLatLng()));

    var closestDist =  Number.MAX_SAFE_INTEGER;
    var currentDist;
    for(var i = 0; i < markers.length; i++)
    {
        currentDist = user.getLatLng().distanceTo(markers[i].getLatLng())
        if (currentDist < closestDist){
            closestIndex = i;
            closestDist = currentDist;
        }

    }
    markers[closestIndex].openPopup();

    if(map.hasLayer(route))
        map.removeLayer(route);
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
    success: function(data) {
        console.log(data[311].name);
        for(var i = 0; i < data.length; i++)
        {
            var marker = L.marker([data[i].Latitude, data[i].Longitude], {icon: gsIcon});
            marker.bindPopup("<b>" + data[i].name + " Garda Station</b><br>Address: "
                + data[i].Address + "<br> County: " + data[i].County
                + "<br> Phone No: " + data[i].Phone);
            markers.push(marker);
        }
        showGardaStations();
    }
    //dataType: dataType
    });

}


function loadData() {
  $.when($.ajax("http://139.59.162.120/stations/"), $.getJSON("data/" + crime + ".json"))
    .done(function (stations, values) {
      if(stats.length==0){
        stats = stations[0];
        stats = stats.map(stat => ({ name: stat.name, county: stat.County, lat: stat.Latitude, long: stat.Longitude }));;
      }
      //console.log(stats);
      vals = values[0];
      vals = vals.map(val => ({ amt: parseInt(val[year]) }));
      //console.log(vals);
      maxVal = 0;
      for(var i = 0; i < stats.length; i++)
      {
        stats[i].value = vals[i].amt;
        if(vals[i].amt > maxVal){
          maxVal = vals[i].amt;
        }
      }
      if(markers.length < 500){
        for(var i = 0; i < stats.length; i++)
        {
            var marker = L.marker([stats[i].lat, stats[i].long], {icon: gsIcon});
            marker.bindPopup("<b>" + stats[i].name + " Garda Station</b>"
                + "<br>County: " + stats[i].county + "<br>Reported Cases: " + stats[i].value);
            markers.push(marker);
        }
        console.log("Hi!");
        showGardaStations();
      }
      else{
        for(var i = 0; i < stats.length; i++)
        {
            markers[i].bindPopup("<b>" + stats[i].name + " Garda Station</b>"
                + "<br>County: " + stats[i].county + "<br>Reported Cases: " + stats[i].value);
        }
      }


      //console.log(stats[0]);
      hmap = {max: maxVal, data: stats.map(x => ({ lat: x.lat, lng: x.long, count: x.value}))};

      //console.log(hmap);
      //alert(hmap[1].toSource())
    });
}

function heatmapStart() {
  console.log(hmap);
  if(heatmapLayer == null){
    heatmapLayer = new HeatmapOverlay(cfg);
    map.addLayer(heatmapLayer);
    lCtrl.addOverlay(heatmapLayer, "Heatmap");
  }
  heatmapLayer.setData(hmap);
}

function heatmapUpdate() {
  heatmapLayer.setData(hmap);
}

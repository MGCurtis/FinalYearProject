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

var closestIndex;

var lCtrl;

var stats = [];
var vals = [];
var allVals = [];
var hmap = [];

var extraStats = [];
var extraVals = [];
var extraAllVals = [];
var extraHmap = [];

var year = "";
var crime = "";

var extraYear = [];
var extraCrime = [];

var selected = null;
var myChart = null;
var selectNo = null;
var openStation = null;
var selectData = [];

var extraSelectData = [];
var extraSelected = [null, null, null, null, null];
var extraOpenStation = [];
var extraSelectedStat = [];
var selectedIndex = null;
var extraSelectNo = [];
var statName = ["", "", "", "", "", ""];

var comp = null;


var heatmapLayer = null;
var extraHeatmapLayer = [];
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
    changeComp();
    $("input[name=statSel][value=main]").click();

    map.on("zoomstart", function(){
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


  L.control.heading({ position: 'bottomleft' }).addTo(map);
  L.control.zoom({
    position: 'topright'
  }).addTo(map);

}

L.control.Heading = L.Control.extend({
  onAdd: function(map){
    var p = L.DomUtil.create('p', 'heading');
    return p;
  },

  onRemove: function(map){

  }
})

L.control.heading = function(opts) {
  return new L.control.Heading(opts);
}



function updateMapData() {
  year = document.getElementById("yearDd").value;
  crime = document.getElementById("crimeDd").value;
  console.log(year);
  console.log(crime);
  if(year != "" && crime != ""){
    loadData();
    document.getElementById("map").getElementsByClassName("heading")[0].innerHTML = "Number of " + $("#crimeDd option:selected").text() + " cases for the year " + $("#yearDd option:selected").text()
  }
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
}

function changeComp() {
  var comp = $("input[name=compSel]:checked").val();
  switch (comp) {
    case "stations":
      clearCrimes();
      document.getElementById("statSelect").style.display = "inline-block";
      document.getElementById("crimeSelect").style.display = "none";
      comp = "stations";
      console.log(comp);
      break;
    case "crimes":
      $("input[name=statSel][value=main]").click();
      clearExtraStations();
      document.getElementById("statSelect").style.display = "none";
      document.getElementById("crimeSelect").style.display = "inline-block";
      comp = "crimes";
      console.log(comp);
      makeChart();
      break;
  }
}

function changeStat() {
  if($("input[name=statSel]:checked").val() != "main"){
    selectedIndex = $("input[name=statSel]:checked").val();
    console.log(selectedIndex);
  }
  else{
    selectedIndex = null;
    console.log(selectedIndex);
  }
}

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
    url: "http://139.59.162.120/" + crime + "/",
    mimeType: "application/json",
    success: function(values){

      var maxVal = 0;
      var maxAllVal = 0;

      vals = values.map(val => (parseInt(val["v" + year]) ));
      allVals = values.map(function(val) {
        delete val.Name;
        for(var i = 2003; i <= 2016; i++){
          val["v" + i] = parseInt(val["v" + i]);
          if(val["v" + i] > maxAllVal){
            maxAllVal = val["v" + i];
          };
        }
        return val;
      });
      console.log(maxAllVal);


      //console.log(vals);
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
      if($("input[name=max]").is(":checked")) {
        hmap = {max: maxAllVal, data: stats.map(x => ({ lat: x.lat, lng: x.long, count: x.value}))};

      }
      else {
        hmap = {max: maxVal, data: stats.map(x => ({ lat: x.lat, lng: x.long, count: x.value}))};
      }

      if(heatmapLayer == null){
        heatmapLayer = new HeatmapOverlay(cfg);
        lCtrl = L.control.layers(null).addTo(map);
        map.addLayer(heatmapLayer);
        lCtrl.addOverlay(heatmapLayer, "Heatmap");
        $("input[name=max]").prop('disabled', false);

      }
      heatmapLayer.setData(hmap);
      populateTable();
    }
  });
}

function heatmapStart() {
  //console.log("Second HMAP", hmap);
  //console.log(hmap.max);

}

function heatmapUpdate() {
  heatmapLayer.setData(hmap);
}

function clearMainCrimes() {
  heatmapLayer.setData({data:[]});
  //console.log(extraAllVals);
  allVals = null;
  selectData = null;

  $("#yearDd").prop('selectedIndex', 0);
  $("#crimeDd").prop('selectedIndex', 0);
  makeChart();
}

function clearSelectedStation() {
  if (selectedIndex == null){
    selected.className='';
    markers[selectNo].remove();
    selected = null;
    selectData = null;
    statName[0] = "";
  }
  else{
    extraSelected[selectedIndex].className='';
    markers[extraSelectNo[selectedIndex]].remove();
    extraSelected[selectedIndex] = null;
    extraSelectedStat[selectedIndex] = null;
    statName[selectedIndex+1] = "";
  }
  makeChart();
}

function clearAllStations() {
  if ( selectData !== null ) {
    selected.className='';
    markers[selectNo].remove();
    selected = null;
    selectData = null;
    statName[0] = "";
  }
  clearExtraStations();
  makeChart();
}

function clearExtraStations() {
  for(var i = 0; i < extraSelected.length; i++){
    if ( extraSelected[i] !== null ) {
      console.log("Hi");
      extraSelected[i].className='';
      markers[extraSelectNo[i]].remove();
      extraSelected[i] = null;
      extraSelectedStat[i] = null;
      statName[i+1] = "";
      console.log(statName);
    }
  }
}

function clearCrimes() {
  for(var i = 0; i < extraHeatmapLayer.length; i++){
    extraHeatmapLayer[i].setData({data:[]});
    //console.log(extraAllVals);
    extraAllVals[i] = null;
    extraSelectData[i] = null;
  }
  $(".extraDd").prop('selectedIndex', 0);
  makeChart();
}

function hideHeatmaps() {
  for(var i = 0; i < extraHeatmapLayer.length; i++){
    if(map.hasLayer(extraHeatmapLayer[i]))
      map.removeLayer(extraHeatmapLayer[i]);
  }
}

function populateTable() {
  var dTable = document.getElementById("dTable").getElementsByTagName("tBody")[0];
  if(dTable.rows.length <= 1){
    for(var i=0; i<stats.length; i++){
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
        if ( selectedIndex == null ) {
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
            map.panTo(openStation.getLatLng());

            selectData = Object.values(allVals[selectNo]);
            statName[0] = stats[selectNo].name;
            //console.log(selectedIndex);

              //selectData = Object.values(allVals[closestIndex]);
            for(var i = 0; i < extraAllVals.length; i++)
            {
              if(extraAllVals[i] !== null)
              {
                console.log("not null");
                extraSelectData[i] = Object.values(extraAllVals[i][selectNo]);
              }
            }
            console.log(statName);
            makeChart();

          }
          else {
            this.className='';
            markers[selected.rowIndex -1].remove();
            selected = null;
          }
        }
        else {

          if ( this.className !== 'clicked' ) {
            // Clear previous selection

            if ( extraSelected[selectedIndex] !== null ) {
                extraSelected[selectedIndex].className='';
                markers[extraSelectNo[selectedIndex]].remove();
            }
            // Mark this row as selected
            this.className='clicked';
            extraSelected[selectedIndex] = this;
            extraSelectNo[selectedIndex] = extraSelected[selectedIndex].rowIndex - 1;
            extraOpenStation[selectedIndex] = markers[extraSelectNo[selectedIndex]];
            extraOpenStation[selectedIndex].addTo(map).openPopup();
            map.panTo(extraOpenStation[selectedIndex].getLatLng());


            extraSelectedStat[selectedIndex] = Object.values(allVals[extraSelectNo[selectedIndex]]);
            var tempIndex = selectedIndex;
            tempIndex ++;
            statName[tempIndex] = stats[extraSelectNo[selectedIndex]].name;

            makeChart();

          }
          else {
            this.className='';
            markers[extraSelected[selectedIndex].rowIndex - 1].remove();
            extraSelected[selectedIndex] = null;
          }
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
      dTable.rows[i].cells[2].innerHTML = stats[i].value;
      //cell3.innerHTML = stats[i].value;
    }
  }
}

function genRGB(a){
  var r = Math.floor((Math.random() * 130) + 120);
  var g = Math.floor((Math.random() * 130) + 100);
  var b = Math.floor((Math.random() * 130) + 100);

  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')'
}

function makeChart(){
  var ctx = document.getElementById("myChart").getContext('2d');
  if(myChart !== null){
    myChart.destroy();
  }
  switch ($("input[name=chartSel]:checked").val()) {
    case "pie":
      makePie(ctx);
      break;
    case "line":
      if($("input[name=compSel]:checked").val() == "crimes") {
        makeLineCrimes(ctx);
      }
      else{
        makeLineStations(ctx);
      }
      break;
    case "bar":
      if($("input[name=compSel]:checked").val() == "crimes") {
        makeBarCrimes(ctx);
      }
      else{
        makeBarStations(ctx);
      }
      break;
    case "barSing":
      makeBarSing(ctx);
      break;

    case "point":
      if($("input[name=compSel]:checked").val() == "crimes") {
        makePointCrime(ctx);
      }
      else{
        makePointStations(ctx);
      }
      break;

  }
}

function extraMapData(n) {
  extraYear[n] = document.getElementById("yearDd" + n).value;
  extraCrime[n] = document.getElementById("crimeDd" + n).value;
  console.log(extraYear[n]);
  console.log(extraCrime[n]);
  if(extraYear[n] != "" && extraCrime[n] != "")
  loadExtraData(n);
}

function loadExtraData(n) {
  $.ajax({
    dataType: "json",
    url: "http://139.59.162.120/" + extraCrime[n] + "/",
    mimeType: "application/json",
    success: function(values){

      var newMaxAllVal = 0;
      //console.log(stats);
      var newVals = values.map(val => (parseInt(val["v" + extraYear[n]]) ));
      //console.log(extraVals[n]);
      extraVals[n] = newVals;
      var newAllVals = values.map(function(val) {
        delete val.Name;
        for(var i = 2003; i <= 2016; i++){
          val["v" + i] = parseInt(val["v" + i]);
          if(val["v" + i] > newMaxAllVal){
            newMaxAllVal = val["v" + i];
          };
        }
        return val;
      });

      extraAllVals[n] = newAllVals;
      //console.log(vals);
      var newmaxVal = 0;
      var newStats = stats;

      for(var i = 0; i < newStats.length; i++)
      {
        newStats[i].value = newVals[i];
        if(newVals[i] > newmaxVal){
          newmaxVal = newVals[i];
        }
      }

      console.log(newStats);

      if($("input[name=max]").is(":checked")) {
        extraHmap[n] = {max: newMaxAllVal, data: newStats.map(x => ({ lat: x.lat, lng: x.long, count: x.value}))};
      }
      else {
        extraHmap[n] = {max: newmaxVal, data: newStats.map(x => ({ lat: x.lat, lng: x.long, count: x.value}))};
      }
      //console.log(extraVals[n]);
      //console.log(extraAllVals[n]);
      console.log(extraHmap[n]);
      //console.log(stats[0]);
      if(extraHeatmapLayer[n] == null){
        console.log("hello");
        extraHeatmapLayer[n] = new HeatmapOverlay(cfg);
        //lCtrl = L.control.layers(null).addTo(map);
        map.addLayer(extraHeatmapLayer[n]);
        lCtrl.addOverlay(extraHeatmapLayer[n], "Heatmap " + (n + 2));
      }
      extraHeatmapLayer[n].setData(extraHmap[n]);
      //populateTable();

      //$("#dTable").selectable();
      //console.log(hmap);
      //alert(hmap[1].toSource())
    }
  });
  //setTimeout(heatmapStart(), 5000);
}

function makePie(ctx) {
  myChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: '# of Reported Cases ',
        data: selectData,
        backgroundColor: [
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6)
        ],
        borderColor: [
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6),
          genRGB(0.6)
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

function makeBarStations(ctx) {
  myChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: '# of Cases in ' + statName[0],
        fill: false,
        borderColor: 'rgba(0, 0, 255, 0.5)',
        backgroundColor: 'rgba(0, 0, 255, 0.5)',
        data: selectData
      },
      {
        label: '# of Cases in ' + statName[1],
        fill: false,
        data: extraSelectedStat[0],
        borderColor: 'rgba(0, 150, 200, 0.5)',
        backgroundColor: 'rgba(0, 150, 200, 0.5)'
      },
      {
        label: '# of Cases in ' + statName[2],
        fill: false,
        data: extraSelectedStat[1],
        borderColor: 'rgba(0, 255, 0, 0.5)',
        backgroundColor: 'rgba(0, 255, 0, 0.5)'
      },
      {
        label: '# of Cases in ' + statName[3],
        fill: false,
        data: extraSelectedStat[2],
        borderColor: 'rgba(255, 0, 0, 0.5)',
        backgroundColor: 'rgba(255, 0, 0, 0.5)'
      },
      {
        label: '# of Cases in ' + statName[4],
        fill: false,
        data: extraSelectedStat[3],
        borderColor: 'rgba(255, 204, 0, 0.5)',
        backgroundColor: 'rgba(255, 204, 0, 0.5)'
      },
      {
        label: '# of Cases in ' + statName[5],
        fill: false,
        data: extraSelectedStat[4],
        borderColor: 'rgba(204, 51, 153, 0.5)',
        backgroundColor: 'rgba(204, 51, 153, 0.5)'
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
        }],
        // xAxes: [{
        //   stacked: true
        // }]
      },
      tooltips: {
        mode: "index",
        intersect: false
      }
    }
  });
}

function makeBarCrimes(ctx) {
  myChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: '# of Cases ',
        data: selectData,
        backgroundColor: 'rgba(0, 0, 255, 0.5)',
        borderColor: 'rgba(0, 0, 255, 0.5)',
        borderWidth: 1
      },
      {
        label: '# of Reported Cases ',
        data: extraSelectData[0],
        backgroundColor: 'rgba(0, 150, 200, 0.5)',
        borderColor: 'rgba(0, 150, 200, 0.5)',
        borderWidth: 1
      },
      {
        label: '# of Reported Cases ',
        data: extraSelectData[1],
        backgroundColor: 'rgba(0, 255, 0, 0.5)',
        borderColor: 'rgba(0, 255, 0, 0.5)',
        borderWidth: 1
      },
      {
        label: '# of Reported Cases ',
        data: extraSelectData[2],
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
        borderColor: 'rgba(255, 0, 0, 0.5)',
        borderWidth: 1
      },
      {
        label: '# of Reported Cases ',
        data: extraSelectData[3],
        backgroundColor: 'rgba(255, 204, 0, 0.5)',
        borderColor: 'rgba(255, 204, 0, 0.5)',
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
        }],
        // xAxes: [{
        //   stacked: true
        // }]
      },
      tooltips: {
        mode: "index",
        intersect: false
      }
    }
  });
}

function makeBarSing(ctx) {
  myChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: '# of Cases in ' + statName[0],
        data: selectData,
        backgroundColor: genRGB(0.7),
        borderColor: genRGB(0.7),
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
        }],
        xAxes: [{
          stacked: true
        }]
      },
      tooltips: {
        mode: "index",
        intersect: false
      }
    }
  });
}

function makeLineStations(ctx) {
  myChart = new Chart(ctx, {
      type: "line",
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: '# of Cases in ' + statName[0],
        fill: false,
        borderColor: 'rgba(0, 0, 255, 0.5)',
        backgroundColor: 'rgba(0, 0, 255, 0.5)',
        data: selectData,
        lineTension: 0.2
      },
      {
        label: '# of Cases in ' + statName[1],
        fill: false,
        data: extraSelectedStat[0],
        borderColor: 'rgba(0, 150, 200, 0.5)',
        backgroundColor: 'rgba(0, 150, 200, 0.5)',
        lineTension: 0.2
      },
      {
        label: '# of Cases in ' + statName[2],
        fill: false,
        data: extraSelectedStat[1],
        borderColor: 'rgba(0, 255, 0, 0.5)',
        backgroundColor: 'rgba(0, 255, 0, 0.5)',
        lineTension: 0.2
      },
      {
        label: '# of Cases in ' + statName[3],
        fill: false,
        data: extraSelectedStat[2],
        borderColor: 'rgba(255, 0, 0, 0.5)',
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
        lineTension: 0.2
      },
      {
        label: '# of Cases in ' + statName[4],
        fill: false,
        data: extraSelectedStat[3],
        borderColor: 'rgba(255, 204, 0, 0.5)',
        backgroundColor: 'rgba(255, 204, 0, 0.5)',
        lineTension: 0.2
      },
      {
        label: '# of Cases in ' + statName[5],
        fill: false,
        data: extraSelectedStat[4],
        borderColor: 'rgba(204, 51, 153, 0.5)',
        backgroundColor: 'rgba(204, 51, 153, 0.5)',
        lineTension: 0.2
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
      },
      tooltips: {
        mode: "index",
        intersect: false
      }
    }
  });
}

function makeLineCrimes(ctx) {
  console.log(extraSelectData);
  myChart = new Chart(ctx, {
      type: "line",
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: $("#crimeDd option:selected").text(),
        fill: false,
        borderColor: 'rgba(0, 0, 255, 0.5)',
        backgroundColor: 'rgba(0, 0, 255, 0.5)',
        data: selectData,
        lineTension: 0.2
      },
      {
        label: $("#crimeDd0 option:selected").text(),
        fill: false,
        data: extraSelectData[0],
        borderColor: 'rgba(0, 150, 200, 0.5)',
        backgroundColor: 'rgba(0, 150, 200, 0.5)',
        lineTension: 0.2
      },
      {
        label: $("#crimeDd1 option:selected").text(),
        fill: false,
        data: extraSelectData[1],
        borderColor: 'rgba(0, 255, 0, 0.5)',
        backgroundColor: 'rgba(0, 255, 0, 0.5)',
        lineTension: 0.2
      },
      {
        label: $("#crimeDd2 option:selected").text(),
        fill: false,
        data: extraSelectData[2],
        borderColor: 'rgba(255, 0, 0, 0.5)',
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
        lineTension: 0.2
      },
      {
        label: $("#crimeDd3 option:selected").text(),
        fill: false,
        data: extraSelectData[3],
        borderColor: 'rgba(255, 204, 0, 0.5)',
        backgroundColor: 'rgba(255, 204, 0, 0.5)',
        lineTension: 0.2
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
      },
      tooltips: {
        mode: "index",
        intersect: false
      }
    }
  });
}

function makePointStations(ctx) {
  myChart = new Chart(ctx, {
      type: "line",
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: '# of Cases in ' + statName[0],
        fill: false,
        borderColor: 'rgba(0, 0, 255, 0.7)',
        backgroundColor: 'rgba(0, 0, 255, 0.7)',
        data: selectData,
        showLine: false
      },
      {
        label: '# of Cases in ' + statName[1],
        fill: false,
        data: extraSelectedStat[0],
        borderColor: 'rgba(0, 150, 200, 0.7)',
        backgroundColor: 'rgba(0, 150, 200, 0.7)',
        showLine: false
      },
      {
        label: '# of Cases in ' + statName[2],
        fill: false,
        data: extraSelectedStat[1],
        borderColor: 'rgba(0, 255, 0, 0.7)',
        backgroundColor: 'rgba(0, 255, 0, 0.7)',
        showLine: false
      },
      {
        label: '# of Cases in ' + statName[3],
        fill: false,
        data: extraSelectedStat[2],
        borderColor: 'rgba(255, 0, 0, 0.7)',
        backgroundColor: 'rgba(255, 0, 0, 0.7)',
        showLine: false
      },
      {
        label: '# of Cases in ' + statName[4],
        fill: false,
        data: extraSelectedStat[3],
        borderColor: 'rgba(255, 204, 0, 0.7)',
        backgroundColor: 'rgba(255, 204, 0, 0.7)',
        showLine: false
      },
      {
        label: '# of Cases in ' + statName[5],
        fill: false,
        data: extraSelectedStat[4],
        borderColor: 'rgba(204, 51, 153, 0.7)',
        backgroundColor: 'rgba(204, 51, 153, 0.7)',
        showLine: false
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
      },
      tooltips: {
        mode: "index",
        intersect: false
      }
    }
  });
}

function makePointCrime(ctx) {
  console.log(extraSelectData);
  myChart = new Chart(ctx, {
      type: "line",
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: $("#crimeDd option:selected").text(),
        fill: false,
        borderColor: 'rgba(0, 0, 255, 0.7)',
        backgroundColor: 'rgba(0, 0, 255, 0.7)',
        data: selectData,
        showLine: false
      },
      {
        label: $("#crimeDd0 option:selected").text(),
        fill: false,
        data: extraSelectData[0],
        borderColor: 'rgba(0, 150, 200, 0.7)',
        backgroundColor: 'rgba(0, 150, 200, 0.7)',
        showLine: false
      },
      {
        label: $("#crimeDd1 option:selected").text(),
        fill: false,
        data: extraSelectData[1],
        borderColor: 'rgba(0, 255, 0, 0.7)',
        backgroundColor: 'rgba(0, 255, 0, 0.7)',
        showLine: false
      },
      {
        label: $("#crimeDd2 option:selected").text(),
        fill: false,
        data: extraSelectData[2],
        borderColor: 'rgba(255, 0, 0, 0.7)',
        backgroundColor: 'rgba(255, 0, 0, 0.7)',
        showLine: false
      },
      {
        label: $("#crimeDd3 option:selected").text(),
        fill: false,
        data: extraSelectData[3],
        borderColor: 'rgba(255, 204, 0, 0.7)',
        backgroundColor: 'rgba(255, 204, 0, 0.7)',
        showLine: false
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
      },
      tooltips: {
        mode: "index",
        intersect: false
      }
    }
  });
}

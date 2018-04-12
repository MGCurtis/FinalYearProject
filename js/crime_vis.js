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

//Map variable
var map;
//Icon for garda stations
var gsIcon = L.ExtraMarkers.icon({
    icon: 'fa-shield',
    markerColor: 'blue',
    iconColor: 'white',
    prefix: 'fa'
});

//Array for storing all garda station markers, for creating layer group
var markers = [];
//Index of closest station to where the user has clicked
var closestIndex;
//Layer control menu, let's user switch individual heatmap layers on and off
var lCtrl;
//Array of stations, houses location data, names, counties etc
var stats = [];
//Array for the selected crime rates for the selected year
var vals = [];
//Array for the selected crime rates for all years, used in charts
var allVals = [];
//Array for creating the heatmap, populated with max value
//location data, and crime values for the selected year
var hmap = [];
//Array of arrays for the extra selected crime and year
var extraVals = [];
//Array of arrays for the selected crime across all years
var extraAllVals = [];
//Array of arrays for extra heatmaps
var extraHmap = [];
//Vars for storing selected crime and year
var year = "";
var crime = "";
//Array of extra selected crimes and years
var extraYear = [];
var extraCrime = [];
//Var for storing selected station index
var selected = null;
//Var for storing instantiated chart
var myChart = null;
//Var for storing the selected station's position in the table
var selectNo = null;
//Var refers to the opened marker for the selected station
//Used to remove marker when another position is clicked
var openStation = null;
//Var for the selected crime rate for the selected station across all years
//Used for plotting selected station on the chart
var selectData = [];
//Array for extra selected crime rates for the selected station across all years
//Used for plotting extra crimes for one station on the chart
var extraSelectData = [];
//Arrya  for storing extra selected stations indexes
var extraSelected = [null, null, null, null, null];
//Var refers to the opened marker for the selected station
//Used to remove marker when another position is clicked
var extraOpenStation = [];
//Array for selected crime rates for extra selected stations across all years
//Used for plotting extra stations on the chart
var extraSelectedStat = [];
//Var for storing which station radio button in the UI is selected
//Lets the application know which selected station to update
//When a knew location / table row is clicked i.e. if Station 3
//is selected then the map is clicked update the stored Station 3
var selectedIndex = null;
//Array for storing the extra selected stations' positions in the table
var extraSelectNo = [];
//Array for storing names of selected stations, used for labelling chart
var statName = ["", "", "", "", "", ""];

//rbga colours for charts so that there is some transparency
var cols = [
			'rgba(0, 0, 255, 0.7)',
			'rgba(0, 150, 200, 0.7)',
			'rgba(0, 255, 0, 0.7)',
			'rgba(255, 0, 0, 0.7)',
			'rgba(255, 204, 0, 0.7)',
			'rgba(153, 51, 153, 0.7)'
			]
//Colour for primary marker
var markerCol = 'blue';
//Colours for additional markers
var markerCols = ['cyan', 'green-light', 'orange-dark', 'yellow', 'violet']
//Var for the primary heatmap layer of the map
var heatmapLayer = null;
//Array for extra heatmap layers of the map
var extraHeatmapLayer = [];
//Configuration for generating heatmaps
//Default cfg from https://www.patrick-wied.at/static/heatmapjs/plugin-leaflet-layer.html
//used as base and then modified
var cfg = {
  // radius of the heat intensity from a point
  "radius": .1,
  //transparency of the heatmap
  "maxOpacity": .6,
  // scales radius of the heat intensity from a point depending on zoom level
  "scaleRadius": true,
  //Regenerate heatmap with reference to only the points that are in view
  //So the highest value currently on screen will be red and other points will
  //be relative to this
  "useLocalExtrema": false,
  // field name in the hmap array that contains the latitude
  latField: 'lat',
  // field name in the hmap array that contains the longitude
  lngField: 'lng',
  // field name in the hmap array that contains the value for this point
  valueField: 'count'
};

//Triggers on the application loading, then listens for the 'deviceready'
function  onLoad() {
    console.log("In onLoad.");
    document.addEventListener('deviceready', onDeviceReady, false);
}

//When device is ready make the map and load the garda stations via ajax query
//Also ensures the "Stations / Crimes" radio button is set to stations on start
//Sets the onClick function of the map to findMyNearestGardaStation
function onDeviceReady() {
    console.log("In onDeviceReady.");
    makeBasicMap();
    loadGardaStations();
    changeComp();
    $("input[name=statSel][value=main]").click();

    map.on('click', findMyNearestGardaStation);

}

//Creates the map, gets tiles from the openstreetmap url and adds tiles to the map object
function makeBasicMap() {
  console.log("In makeBasicMap.");
  //Initialize map
  // set up the map latitude and longitude bounds to stop user from scrolling away from Ireland
  bounds = new L.LatLngBounds(new L.LatLng(51, -11.3), new L.LatLng(55.7, -5));

	map = new L.Map('map', {zoomControl:false, maxBounds: bounds});

	// Url for getting map, attribution for map tiles, and tile layer variable
	var mapUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	var mapAttrib='Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
	var mapLayer = new L.TileLayer(mapUrl, {minZoom: 6, maxZoom: 16, attribution: mapAttrib});

	// Set initial map view to roughly middle of Ireland and add the tile layer
	map.setView(new L.LatLng(53.33743, -7), 7);
	map.addLayer(mapLayer);

  // Add heading to the bottom left of the map
  L.control.heading({ position: 'bottomleft' }).addTo(map);
  // Add zoom control to top right of the map
  L.control.zoom({
    position: 'topright'
  }).addTo(map);

}

//Create the heading object to add to the map, extends L.Control class
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

//Gets the selected crime and year from dropdowns, gets rid of selected station markers if present
//If there is a selection in the crime and year dropdowns then loadData is called and the heading is updated
//Function is called upon changing one of the dropdowns
function updateMapData() {
  year = document.getElementById("yearDd").value;
  crime = document.getElementById("crimeDd").value;
  if(selected !== null)
  clearAllStations();
  if(year != "" && crime != ""){
    loadData();
    document.getElementById("map").getElementsByClassName("heading")[0].innerHTML = "Number of " + $("#crimeDd option:selected").text() + " cases for the year " + $("#yearDd option:selected").text()
  }
}

//Loops through marker array, if distance of current index's marker from clicked location is shorter
//than the current shortest stored distance make the closest index var equal the current index
//and make the closest distance var equal the current distance
//At the end of the loop select the table row for the nearest garda station.
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

//Gets the checked radio button between Stations and Crimes in second section of menu
//Changes the third section of the menu accordingly showing either the Stations
//or Crimes comparison menu, calls makeChart after changing so that it reflects
//what is looking to be compared. Called when one of those radio buttons is clicked
function changeComp() {
  var comp = $("input[name=compSel]:checked").val();
  switch (comp) {
    case "stations":
      clearCrimes();
      document.getElementById("statSelect").style.display = "inline-block";
      document.getElementById("crimeSelect").style.display = "none";
      comp = "stations";
      break;
    case "crimes":
      $("input[name=statSel][value=main]").click();
      clearExtraStations();
      document.getElementById("statSelect").style.display = "none";
      document.getElementById("crimeSelect").style.display = "inline-block";
      comp = "crimes";
      makeChart();
      break;
  }
}

//This is called if the user clicks one of the radio buttons in the Stations section
//for Stations 1 - 6. Changes the selected index to reflect which station is selected.
function changeStat() {
  if($("input[name=statSel]:checked").val() != "main"){
    selectedIndex = $("input[name=statSel]:checked").val();
  }
  else{
    selectedIndex = null;
  }
}

//Makes AJAX call to Django API, receives json and creates a marker for every object in the json from lat and lon
//Adds each marker to the markers array
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

    }
    //dataType: dataType
    });

}

//Called in teh updateMapData function. Makes another AJAX call, this time for crime data.
//Makes an array of the values for the selected year and one for all years.
//Gets a max value for both of these arrays. Binds a popup to each station marker
//with station name, county, and number of cases of selected crime in selected year.
//Creates formatted array for generating heatmap with the max value, lat, long, and value.
//Depending on status of checkbox in top menu max value with either be for the selected
//year or across all years. Heatmap is then generated and table is populated.
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

      for(var i = 0; i < stats.length; i++)
      {
        stats[i].value = vals[i];
        if(vals[i] > maxVal){
          maxVal = vals[i];
        }
      }

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

//Clears primary heatmap and resets dropdowns and chart
function clearMainCrimes() {
  heatmapLayer.setData({data:[]});
  allVals = null;
  selectData = null;

  $("#yearDd").prop('selectedIndex', 0);
  $("#crimeDd").prop('selectedIndex', 0);
  makeChart();
}

//Clear the selected station, e.g. if there are six station markers on the map
//and Station 4 is selected this function will only clear Station 4
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

//Clears all stations
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
  $("input[name=statSel][value=main]").click();
}

//Clears all but the primary station, Station 1
function clearExtraStations() {
  for(var i = 0; i < extraSelected.length; i++){
    if ( extraSelected[i] !== null ) {
      extraSelected[i].className='';
      markers[extraSelectNo[i]].remove();
      extraSelected[i] = null;
      extraSelectedStat[i] = null;
      statName[i+1] = "";
    }
  }
}

//Clears all the extra heatmaps and resets extra dropdowns
function clearCrimes() {
  for(var i = 0; i < extraHeatmapLayer.length; i++){
    extraHeatmapLayer[i].setData({data:[]});
    extraAllVals[i] = null;
    extraSelectData[i] = null;
  }
  $(".extraDd").prop('selectedIndex', 0);
  makeChart();
}

//Does not clear heatmaps but hides the layers from the map.
//This lets the user keep the extra crime values for the charts, but clears up
//the potentially cluttered map to just the primary heatmap
function hideHeatmaps() {
  for(var i = 0; i < extraHeatmapLayer.length; i++){
    if(map.hasLayer(extraHeatmapLayer[i]))
      map.removeLayer(extraHeatmapLayer[i]);
  }
}

//Function for populating the table and making it selectable.
//This function was written with some reference to https://sweetcode.io/scrollable-selectable-html-table/
function populateTable() {
  var dTable = document.getElementById("dTable").getElementsByTagName("tBody")[0];
  //If the table hasn't been populated already populate it and add the functions for mouseover, mouseout and mousedown
  if(dTable.rows.length <= 1){
    for(var i=0; i<stats.length; i++){
      var row = dTable.insertRow(dTable.rows.length);
      //If the mouse is on a row change its class to 'highlight' so CSS changes
      row.onmouseover=function(){
        if ( this.className === '') {
            this.className='highlight';
        }
        return false
      }
      //If the mouse moves off then remove the 'highlight' class
      row.onmouseout=function(){
        if ( this.className === 'highlight') {
            this.className='';
        }
        return false
      }
      //If a row is clicked change its class to 'clicked' so css changes
      row.onmousedown=function(){
        //If Station 1 is selected in the menu
        if ( selectedIndex == null ) {
          //If this row is not 'clicked' then deselect if there is a currently selected row
          if ( this.className !== 'clicked' ) {
            if ( selected !== null ) {
                selected.className='';
                markers[selected.rowIndex -1].remove();
            }

            //Then mark this row as clicked, make 'selected' equal to this,
            //make 'selectNo' equal to one less than the row index, as row index starts at 1.
            //Make 'openStation' equal the marker that corresponds to this station.
            //Coour the marker accordingly, add it to the map, open the popup, and pan it into view.
            this.className='clicked';
            selected = this;
            selectNo = selected.rowIndex - 1;
            openStation = markers[selectNo];
      			openStation.options.icon.options.markerColor = markerCol;
            openStation.addTo(map).openPopup();
            map.panTo(openStation.getLatLng());

            //'selectData' equals every years value for selected crime at this station
            //statName entry at the corresponding position equals this station's name
            selectData = Object.values(allVals[selectNo]);
            statName[0] = stats[selectNo].name;

            //For each extra crime selected put the value of the crime across all years at this station
            //into the 'extraSelectData' array
            for(var i = 0; i < extraAllVals.length; i++)
            {
              if(extraAllVals[i] !== null)
              {
                extraSelectData[i] = Object.values(extraAllVals[i][selectNo]);
              }
            }
            //Make the chart with the selected data
            makeChart();

          }
          //If this row is 'clicked' then remove the marker and remove the 'clicked' class
          else {
            this.className='';
            markers[selected.rowIndex -1].remove();
            selected = null;
          }
        }
        //Same as above but for extra stations (Station 2 - 6) instead of primary station
        else {

          if ( this.className !== 'clicked' ) {
            if ( extraSelected[selectedIndex] !== null ) {
                extraSelected[selectedIndex].className='';
                markers[extraSelectNo[selectedIndex]].remove();
            }
            this.className='clicked';
            extraSelected[selectedIndex] = this;
            extraSelectNo[selectedIndex] = extraSelected[selectedIndex].rowIndex - 1;
            extraOpenStation[selectedIndex] = markers[extraSelectNo[selectedIndex]];
      			extraOpenStation[selectedIndex].options.icon.options.markerColor = markerCols[selectedIndex];
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

      //Code for populating the cells, first col is name, second is county, third is value
      var cell1 = row.insertCell(0);
      var cell2 = row.insertCell(1);
      var cell3 = row.insertCell(2);

      cell1.innerHTML = stats[i].name;
      cell2.innerHTML = stats[i].county;
      cell3.innerHTML = stats[i].value;
    }
  }
  //If table is already populated then just update the value for the rows
  else{
    for(var i=0; i<stats.length; i++){
      dTable.rows[i].cells[2].innerHTML = stats[i].value;
    }
  }
}

//Function to generate the chart. Destroys existing chart if there is one,
//gets the selected chart type, and through switch statment generates the appropriate chart
function makeChart(){
  //Variable refers to the HTML canvas for the chart
  var ctx = document.getElementById("myChart").getContext('2d');
  if(myChart !== null){
    myChart.destroy();
  }
  switch (document.getElementById("chartDd").value) {
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

//Called if one of the extra dropdowns is changed, functions same as updateMapData.
//Generates another heatmap to overlay if crime and year are selected
function extraMapData(n) {
  extraYear[n] = document.getElementById("yearDd" + n).value;
  extraCrime[n] = document.getElementById("crimeDd" + n).value;
  if(extraYear[n] != "" && extraCrime[n] != "")
  loadExtraData(n);
}

//Same as lodaData, loads extra crime data selected in extra dropdowns,
//generate the heatmap, and overlay it on top of exisitng heatmap(s).
function loadExtraData(n) {
  $.ajax({
    dataType: "json",
    url: "http://139.59.162.120/" + extraCrime[n] + "/",
    mimeType: "application/json",
    success: function(values){

      var newMaxAllVal = 0;
      var newVals = values.map(val => (parseInt(val["v" + extraYear[n]]) ));
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
      var newmaxVal = 0;
      var newStats = stats;

      for(var i = 0; i < newStats.length; i++)
      {
        newStats[i].value = newVals[i];
        if(newVals[i] > newmaxVal){
          newmaxVal = newVals[i];
        }
      }

      if($("input[name=max]").is(":checked")) {
        extraHmap[n] = {max: newMaxAllVal, data: newStats.map(x => ({ lat: x.lat, lng: x.long, count: x.value}))};
      }
      else {
        extraHmap[n] = {max: newmaxVal, data: newStats.map(x => ({ lat: x.lat, lng: x.long, count: x.value}))};
      }
      if(extraHeatmapLayer[n] == null){
        extraHeatmapLayer[n] = new HeatmapOverlay(cfg);
        //lCtrl = L.control.layers(null).addTo(map);
        map.addLayer(extraHeatmapLayer[n]);
        lCtrl.addOverlay(extraHeatmapLayer[n], "Heatmap " + (n + 2));
      }
      extraHeatmapLayer[n].setData(extraHmap[n]);
      //populateTable();

      //$("#dTable").selectable();
      //alert(hmap[1].toSource())
    }
  });
  //setTimeout(heatmapStart(), 5000);
}

//Function for making pie chart.
//Labels colours with years, data is only primary crime and station.
//Titled with crime type and station name
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
          'rgba(0, 0, 204, 0.5)',
          'rgba(0, 102, 153, 0.5)',
          'rgba(102, 153, 153, 0.5)',
          'rgba(0, 204, 102, 0.5)',
          'rgba(0, 153, 51, 0.5)',
          'rgba(102, 153, 0, 0.5)',
          'rgba(204, 204, 0, 0.5)',
          'rgba(255, 153, 51, 0.5)',
          'rgba(255, 0, 0, 0.5)',
          'rgba(255, 0, 102, 0.5)',
          'rgba(204, 0, 204, 0.5)',
          'rgba(153, 153, 255, 0.5)',
          'rgba(102, 0, 204, 0.5)',
          'rgba(0, 0, 102, 0.5)'
        ],
        borderColor: [
          'rgba(0, 0, 255, 0.5)',,
          'rgba(0, 0, 204, 0.5)',
          'rgba(0, 102, 153, 0.5)',
          'rgba(102, 153, 153, 0.5)',
          'rgba(0, 204, 102, 0.5)',
          'rgba(0, 153, 51, 0.5)',
          'rgba(102, 153, 0, 0.5)',
          'rgba(204, 204, 0, 0.5)',
          'rgba(255, 153, 51, 0.5)',
          'rgba(255, 0, 0, 0.5)',
          'rgba(255, 0, 102, 0.5)',
          'rgba(204, 0, 204, 0.5)',
          'rgba(153, 153, 255, 0.5)',
          'rgba(102, 0, 204, 0.5)',
          'rgba(0, 0, 102, 0.5)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      title: {
        display: true,
        padding: 1,
        text: $("#crimeDd option:selected").text() + ' in ' + statName[0]
      },
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

//Function for making bar chart comparing stations.
//Labels colours with station names, data is primary crime for each selected station.
//Titled with crime type. Colours are defined in 'cols' arrary
function makeBarStations(ctx) {
  myChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: '# in ' + statName[0],
        fill: false,
        borderColor: cols[0],
        backgroundColor: cols[0],
        data: selectData
      },
      {
        label: '# in ' + statName[1],
        fill: false,
        data: extraSelectedStat[0],
        borderColor: cols[1],
        backgroundColor: cols[1],
      },
      {
        label: '# in ' + statName[2],
        fill: false,
        data: extraSelectedStat[1],
        borderColor: cols[2],
        backgroundColor: cols[2]
      },
      {
        label: '# in ' + statName[3],
        fill: false,
        data: extraSelectedStat[2],
        borderColor: cols[3],
        backgroundColor: cols[3]
      },
      {
        label: '# in ' + statName[4],
        fill: false,
        data: extraSelectedStat[3],
        borderColor: cols[4],
        backgroundColor: cols[4]
      },
      {
        label: '# in ' + statName[5],
        fill: false,
        data: extraSelectedStat[4],
        borderColor: cols[5],
        backgroundColor: cols[5]
      }]
    },
    options: {
      title: {
        display: true,
        padding: 1,
        text: $("#crimeDd option:selected").text()
      },
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

//Function for making bar chart comparing crimes at a single station.
//Labels colours with selected crimes, data is all selected crimes for selected station.
//Titled with selected station name. Colours are defined in 'cols' arrary
function makeBarCrimes(ctx) {
  myChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: $("#crimeDd option:selected").text(),
        data: selectData,
        borderColor: cols[0],
        backgroundColor: cols[0],
        borderWidth: 1
      },
      {
        label: $("#crimeDd0 option:selected").text(),
        data: extraSelectData[0],
        borderColor: cols[1],
        backgroundColor: cols[1],
        borderWidth: 1
      },
      {
        label: $("#crimeDd1 option:selected").text(),
        data: extraSelectData[1],
        borderColor: cols[2],
        backgroundColor: cols[2],
        borderWidth: 1
      },
      {
        label: $("#crimeDd2 option:selected").text(),
        data: extraSelectData[2],
        borderColor: cols[3],
        backgroundColor: cols[3],
        borderWidth: 1
      },
      {
        label: $("#crimeDd3 option:selected").text(),
        data: extraSelectData[3],
        borderColor: cols[4],
        backgroundColor: cols[4],
        borderWidth: 1
      }]
    },
    options: {
      title: {
        display: true,
        padding: 1,
        text: statName[0]
      },
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

//Function for making bar chart for just primary station and primary crime.
//Just one colour, deep blue for primary station / crime. Data is primary crime for primary station.
//Titled with crime type, colour labelled with station name. Colour is defined in 'cols' arrary
function makeBarSing(ctx) {
  myChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: '# in ' + statName[0],
        data: selectData,
        borderColor: cols[0],
        backgroundColor: cols[0],
        borderWidth: 1
      }]
    },
    options: {
      title: {
        display: true,
        padding: 1,
        text: $("#crimeDd option:selected").text()
      },
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

//Function for making line chart comparing stations.
//Labels colours with station names, data is primary crime for each selected station.
//Titled with crime type. Colours are defined in 'cols' arrary
function makeLineStations(ctx) {
  myChart = new Chart(ctx, {
      type: "line",
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: '# in ' + statName[0],
        fill: false,
        borderColor: cols[0],
        backgroundColor: cols[0],
        data: selectData,
        lineTension: 0.2
      },
      {
        label: '# in ' + statName[1],
        fill: false,
        data: extraSelectedStat[0],
        borderColor: cols[1],
        backgroundColor: cols[1],
        lineTension: 0.2
      },
      {
        label: '# in ' + statName[2],
        fill: false,
        data: extraSelectedStat[1],
        borderColor: cols[2],
        backgroundColor: cols[2],
        lineTension: 0.2
      },
      {
        label: '# in ' + statName[3],
        fill: false,
        data: extraSelectedStat[2],
        borderColor: cols[3],
        backgroundColor: cols[3],
        lineTension: 0.2
      },
      {
        label: '# in ' + statName[4],
        fill: false,
        data: extraSelectedStat[3],
        borderColor: cols[4],
        backgroundColor: cols[4],
        lineTension: 0.2
      },
      {
        label: '# in ' + statName[5],
        fill: false,
        data: extraSelectedStat[4],
        borderColor: cols[5],
        backgroundColor: cols[5],
        lineTension: 0.2
      }]
    },
    options: {
      title: {
        display: true,
        padding: 1,
        text: $("#crimeDd option:selected").text()
      },
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

//Function for making line chart comparing crimes at a single station.
//Labels colours with selected crimes, data is all selected crimes for selected station.
//Titled with selected station name. Colours are defined in 'cols' arrary
function makeLineCrimes(ctx) {
  myChart = new Chart(ctx, {
      type: "line",
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: $("#crimeDd option:selected").text(),
        fill: false,
        borderColor: cols[0],
        backgroundColor: cols[0],
        data: selectData,
        lineTension: 0.2
      },
      {
        label: $("#crimeDd0 option:selected").text(),
        fill: false,
        data: extraSelectData[0],
        borderColor: cols[1],
        backgroundColor: cols[1],
        lineTension: 0.2
      },
      {
        label: $("#crimeDd1 option:selected").text(),
        fill: false,
        data: extraSelectData[1],
        borderColor: cols[2],
        backgroundColor: cols[2],
        lineTension: 0.2
      },
      {
        label: $("#crimeDd2 option:selected").text(),
        fill: false,
        data: extraSelectData[2],
        borderColor: cols[3],
        backgroundColor: cols[3],
        lineTension: 0.2
      },
      {
        label: $("#crimeDd3 option:selected").text(),
        fill: false,
        data: extraSelectData[3],
        borderColor: cols[4],
        backgroundColor: cols[4],
        lineTension: 0.2
      }]
    },
    options: {
      title: {
        display: true,
        padding: 1,
        text: statName[0]
      },
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

//Function for making point chart comparing stations.
//Labels colours with station names, data is primary crime for each selected station.
//Titled with crime type. Colours are defined in 'cols' arrary
function makePointStations(ctx) {
  myChart = new Chart(ctx, {
      type: "line",
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: '# in ' + statName[0],
        fill: false,
        borderColor: cols[0],
        backgroundColor: cols[0],
        data: selectData,
        showLine: false
      },
      {
        label: '# in ' + statName[1],
        fill: false,
        data: extraSelectedStat[0],
        borderColor: cols[1],
        backgroundColor: cols[1],
        showLine: false
      },
      {
        label: '# in ' + statName[2],
        fill: false,
        data: extraSelectedStat[1],
        borderColor: cols[2],
        backgroundColor: cols[2],
        showLine: false
      },
      {
        label: '# in ' + statName[3],
        fill: false,
        data: extraSelectedStat[2],
        borderColor: cols[3],
        backgroundColor: cols[3],
        showLine: false
      },
      {
        label: '# in ' + statName[4],
        fill: false,
        data: extraSelectedStat[3],
        borderColor: cols[4],
        backgroundColor: cols[4],
        showLine: false
      },
      {
        label: '# in ' + statName[5],
        fill: false,
        data: extraSelectedStat[4],
        borderColor: cols[5],
        backgroundColor: cols[5],
        showLine: false
      }]
    },
    options: {
      title: {
        display: true,
        padding: 1,
        text: $("#crimeDd option:selected").text()
      },
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

//Function for making point chart comparing crimes at a single station.
//Labels colours with selected crimes, data is all selected crimes for selected station.
//Titled with selected station name. Colours are defined in 'cols' arrary
function makePointCrime(ctx) {
  myChart = new Chart(ctx, {
      type: "line",
    data: {
      labels: ["2003", "2004", "2005", "2006", "2007", "2008", "2009",
      "2010", "2011", "2012", "2013", "2014", "2015", "2016"],
      datasets: [{
        label: $("#crimeDd option:selected").text(),
        fill: false,
        borderColor: cols[0],
        backgroundColor: cols[0],
        data: selectData,
        showLine: false
      },
      {
        label: $("#crimeDd0 option:selected").text(),
        fill: false,
        data: extraSelectData[0],
        borderColor: cols[1],
        backgroundColor: cols[1],
        showLine: false
      },
      {
        label: $("#crimeDd1 option:selected").text(),
        fill: false,
        data: extraSelectData[1],
        borderColor: cols[2],
        backgroundColor: cols[2],
        showLine: false
      },
      {
        label: $("#crimeDd2 option:selected").text(),
        fill: false,
        data: extraSelectData[2],
        borderColor: cols[3],
        backgroundColor: cols[3],
        showLine: false
      },
      {
        label: $("#crimeDd3 option:selected").text(),
        fill: false,
        data: extraSelectData[3],
        borderColor: cols[4],
        backgroundColor: cols[4],
        showLine: false
      }]
    },
    options: {
      title: {
        display: true,
        padding: 1,
        text: statName[0]
      },
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

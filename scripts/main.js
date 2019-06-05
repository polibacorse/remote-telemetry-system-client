const mqtt = require('mqtt');
var LinearGauge = require('canvas-gauges');
const Highcharts = require('highcharts');
require('highcharts/highcharts-more')(Highcharts);
const mapboxgl = require('mapbox-gl/dist/mapbox-gl.js');
const ipc = require('electron').ipcRenderer;

/* EDITABLE VARIABLES */
const topicBasePath = 'data/formatted/';
const requiredTopics = {
    RPM: 'rpm',
    TH2O: 'th20',
    TOIL: 'toil',
    GEAR: 'gear',
    VBATT: 'vbattdir',
    POSITION: 'position',
    SPEED: 'speed',
};

/* PRIVATE VARIABLES */

let map, lat = 41.822, lng = 12.573, tracked = false;
const mqttConnection = {
    CONNECTING: {
        className: 'mqtt-connecting',
        label: 'in connessione...',
    },
    CONNECTED: {
        className: 'mqtt-success',
        label: 'connesso',
    },
    ERROR: {
        className: 'mqtt-connecting',
        label: 'errore',
    },
    WARNING: {
        className: 'mqtt-connecting',
        label: 'limitata',
    },
};
let _rpmChart = undefined;

// Tracks coordinates
const tracks = {
    binetto: {
        center: {lat: 40.99455, lng: 16.742},
        zoom: 15.5
    },
    varano: {
        center: {lat: 44.681, lng: 10.022},
        zoom: 14.5
    },
    hockenhein: {
        center: {lat: 49.330, lng: 8.574},
        zoom: 14.90
    },
};

$(document).ready(function() {

    ipc.on('login', (event, message) => {
        initMqtt(message, requiredTopics);
    });

    initializeGUI();

    // Configure map token
    mapboxgl.accessToken = 'pk.eyJ1IjoicG90aXRvIiwiYSI6ImNqdzBrNzNkODBiMmI0Nmt0cWJqem8ydnEifQ.F2_I71YUhWDeuzEJMqG50g';

    initMap();

});

$(window).on('resize', onResize);

function initMqtt(loginCredentials, requiredTopics) {

    changeMQTTStatus(mqttConnection.CONNECTING);

    // Try to connect with mqtt
    const client  = mqtt.connect('mqtt://' + loginCredentials.server, {
        clientId: 'telemetry',
        username: loginCredentials.username,
        password: loginCredentials.password
    });

    // On connected
    client.on('connect', function () {

        changeMQTTStatus(mqttConnection.CONNECTED);

        // Subscribe to required topics
        Object.values(requiredTopics).forEach((topic) => subscribe(topic));
    });

    client.on('message', function (topic, message) {

        // Update time
        updateTime(message);

        switch (topic) {
            case topicBasePath + requiredTopics.RPM:
                updateRPM(message);
                break;
            case topicBasePath + requiredTopics.TH2O:
                updateTH2O(message);
                break;
            case topicBasePath + requiredTopics.TOIL:
                updateTOIL(message);
                break;
            case topicBasePath + requiredTopics.GEAR:
                updateGEAR(message);
                break;
            case topicBasePath + requiredTopics.VBATT:
                updateVBATT(message);
                break;
            case topicBasePath + requiredTopics.POSITION:
                updatePOSITION(message);
                break;
            case topicBasePath + requiredTopics.SPEED:
                updateSPEED(message);
                break;
        }
    });

    // Subscribe to required topic
    const subscribe = (topic) => client.subscribe(topicBasePath + topic, function(err) {
        if (err) {
            $('.mqttStatus').text('Error during subscription to ' + topic);
        }
    });

    function showData(data) {
        $('.mqttData').text(data);
    }

}

function initMap() {

    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/potito/cjwi6b3mt0jax1cmvczaz81im',
        center: {lat: 41.822, lng: 12.573},
        zoom: 4.4,
        interactive: false
    });

    // TODO remove this line
    //changeCarPosition();

}

/**
 * Functions to update dashboard
 */

function initializeGUI() {

    renderRPM();
    adjustMapHeight();

}

function onResize() {
    adjustMapHeight();
}

function adjustMapHeight() {
    $('#map-section').height($('#stats-section').height() - 15);
}

function renderRPM() {
    Highcharts.chart('rpm', {

        chart: {
            type: 'gauge',
            plotBackgroundColor: null,
            plotBackgroundImage: null,
            plotBorderWidth: 0,
            plotShadow: false
        },

        title: {
            text: 'RPM',
            style: { "fontSize": "24px" },
        },

        pane: {
            startAngle: -150,
            endAngle: 150,
            background: [{
                backgroundColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#FFF'],
                        [1, '#333']
                    ]
                },
                borderWidth: 0,
                outerRadius: '109%'
            }, {
                backgroundColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#333'],
                        [1, '#FFF']
                    ]
                },
                borderWidth: 1,
                outerRadius: '107%'
            }, {
                // default background
            }, {
                backgroundColor: '#DDD',
                borderWidth: 0,
                outerRadius: '105%',
                innerRadius: '103%'
            }]
        },

        // the value axis
        yAxis: {
            min: 0,
            max: 13000,

            minorTickInterval: 'auto',
            minorTickWidth: 1,
            minorTickLength: 10,
            minorTickPosition: 'inside',
            minorTickColor: '#666',

            tickPixelInterval: 50,
            tickWidth: 2,
            tickPosition: 'inside',
            tickLength: 10,
            tickColor: '#666',
            labels: {
                step: 2,
                rotation: 'auto'
            },
            title: {
                text: 'RPM'
            },
            plotBands: [{
                from: 0,
                to: 8000,
                color: '#55BF3B' // green
            }, {
                from: 8000,
                to: 9000,
                color: '#DDDF0D' // yellow
            }, {
                from: 9000,
                to: 13000,
                color: '#DF5353' // red
            }]
        },

        series: [{
            name: 'RPM',
            data: [0],
            tooltip: {
                valueSuffix: ''
            }
        }]

    },
    function (chart) {
        _rpmChart = chart;
    });
}

function updateTime(value) {
    var date = new Date(value * 1000);
    $('.time > span').text(date);
}

function updateRPM(value) {
    _rpmChart.series[0].points[0].update(JSON.parse(value).value);
}

function updateTH2O(value) {
    var newValue = JSON.parse(value).value;

    if(newValue != $('#th2o-chart').attr('data-value')) {
        $('#th2o-chart').attr('data-value', newValue);
        $('.th2o-value > span').text(newValue);
    }
}

function updateTOIL(value) {
    if(JSON.parse(value).value != $('#toil-chart').attr('data-value')) {
        $('#toil-chart').attr('data-value', JSON.parse(value).value);
    }
}

function updateGEAR(value) {
    $('#gear-value').text(JSON.parse(value).value);
}

function updateVBATT(value) {
    $('#vbatt-value').text(round(JSON.parse(value).value));
}

function updatePOSITION(value) {

    lat = JSON.parse(value).latitude;
    lng = JSON.parse(value).longitude;

    $('#lat-value').text(lag);
    $('#lng-value').text(lng);

    changeCarPosition(lat, lng);

}

function changeCarPosition() {

    tracked = true;

    // Create geojson point
    const geojson = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [15.545014, 41.459819]
                },
                properties: {
                    title: 'PC5-18 EVO',
                    description: 'Ultima posizione'
                }
            },
        ]
    };

    // Add marker to map
    geojson.features.forEach(function(marker) {

        // Create a HTML element
        var el = document.createElement('div');
        el.className = 'marker';

        // Make a marker and add to the map
        new mapboxgl.Marker(el)
            .setLngLat(marker.geometry.coordinates)
            .setPopup(new mapboxgl.Popup({ offset: 25 }) // Add popups
            .setHTML('<div class="map-popup"><h6>' + marker.properties.title + '</h6><span>' + marker.properties.description + '</span></div>'))
            .addTo(map);
    });

}

function updateSPEED(value) {
    $('#speed-value').text(JSON.parse(value).value);
}

function goToTrack(track) {
    map.flyTo({
        center: [
            track.center.lng,
            track.center.lat,
        ],
        zoom: track.zoom
    });
}

function goToMarker() {
    map.flyTo({
        center: [
            lng,
            lat,
        ],
        zoom: tracked ? 16 : 4.4
    });
}

function changeMQTTStatus(status) {
    $('.mqttStatus').text(status.label);
    $('mqttStatus').removeClass().addClass(status.className);
}

/* UTILS */

round = (value) => Math.round(value * 100) / 100;

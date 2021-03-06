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
    PFUEL: 'pfuel',
    POIL: 'poil',
    PBRAKE_FRONT: 'pbrake_front',
    PBRAKE_REAR: 'pbrake_rear',
    LAMBDA: 'lambda',
    TPS: 'tps',
    MAP: 'map',
};

/* PRIVATE VARIABLES */

const italyPosition = {
    lat: 41.822,
    lng: 12.573,
    zoom: 4.4,
};
let map, lat = 0, lng = 0, gps_tracked = false, map_tracking_ticker = false, markerHTML = undefined;
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
        zoom: 14
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

    ipc.send('ready');

});

$(window).on('resize', onResize);

function initMqtt(loginCredentials, requiredTopics) {

    changeMQTTStatus(mqttConnection.CONNECTING);

    // Try to connect with mqtt
    const client  = mqtt.connect('mqtt://' + loginCredentials.server, {
        clientId: 'telemetry' + Math.floor(Math.random() * 1000),
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
            case topicBasePath + requiredTopics.PFUEL:
                updatePFUEL(message);
                break;
            case topicBasePath + requiredTopics.POIL:
                updatePOIL(message);
                break;
            case topicBasePath + requiredTopics.PBRAKE_FRONT:
                updatePBRAKE_FRONT(message);
                break;
            case topicBasePath + requiredTopics.PBRAKE_REAR:
                updatePBRAKE_REAR(message);
                break;
            case topicBasePath + requiredTopics.LAMBDA:
                updateLAMBDA(message);
                break;
            case topicBasePath + requiredTopics.TPS:
                updateTPS(message);
                break;
            case topicBasePath + requiredTopics.MAP:
                updateMAP(message);
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
        center: {lat: italyPosition.lat, lng: italyPosition.lng},
        zoom: italyPosition.zoom,
        interactive: false
    });

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
    const carTime = new Date(JSON.parse(value).time * 1000);
    const actualTime = new Date();
    $('.time #last-time').text(carTime.toLocaleString());
    $('.time #latency').text((actualTime - carTime) / 1000);
}

function updateRPM(value) {
    _rpmChart.series[0].points[0].update(JSON.parse(value).value);
}

function updateTH2O(value) {
    const newValue = JSON.parse(value).value;

    if(newValue != $('#th2o-chart').attr('data-value')) {
        $('#th2o-chart').attr('data-value', newValue);
        $('.th2o-value > span').text(newValue);
    }
}

function updateTOIL(value) {
    const newValue = JSON.parse(value).value;

    if(newValue != $('#toil-chart').attr('data-value')) {
        $('#toil-chart').attr('data-value', JSON.parse(value).value);
        $('.toil-value > span').text(newValue);
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

    $('#lat-value').text(round(lat, 10).toFixed(10));
    $('#lng-value').text(round(lng, 10).toFixed(10));

    changeCarPosition(lat, lng);

}

function changeCarPosition(lat, lng) {

    // Continue only if GPS signal is received
    if(lat === 0 && lng === 0) {
        gps_tracked = false;
        return;
    } else {
        gps_tracked = true;
    }

    // Create geojson point
    const geojson = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [lng, lat]
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
        if(markerHTML === undefined) {
            const htmlMarker = document.createElement('div');
            htmlMarker.className = 'marker';

            // Make a marker and add to the map
            markerHTML = new mapboxgl.Marker(htmlMarker)
                .setLngLat(marker.geometry.coordinates)
                .setPopup(new mapboxgl.Popup({ offset: 25 }) // Add popups
                    .setHTML('<div class="map-popup"><h6>' + marker.properties.title + '</h6><span>' + marker.properties.description + '</span></div>'))
                .addTo(map);
        } else {

            markerHTML.setLngLat(new mapboxgl.LngLat(lng, lat));

        }
    });

}

function updateSPEED(value) {
    $('#speed-value').text(Math.round(JSON.parse(value).speed));
}

function updatePFUEL(value) {
    $('#pressure-fuel').text(Math.round(JSON.parse(value).value));
}

function updatePOIL(value) {
    $('#pressure-oil').text(Math.round(JSON.parse(value).value));
}

function updatePBRAKE_FRONT(value) {
    $('#pressure-brake-front').text(Math.round(JSON.parse(value).value));
}

function updatePBRAKE_REAR(value) {
    $('#pressure-brake-rear').text(Math.round(JSON.parse(value).value));
}

function updateLAMBDA(value) {
    $('#lambda').text(Math.round(JSON.parse(value).value));
}

function updateTPS(value) {
    $('#tps').text(Math.round(JSON.parse(value).value));
}

function updateMAP(value) {
    $('#map_sensor').text(Math.round(JSON.parse(value).value));
}

function goToTrack(track) {

    clearInterval(map_tracking_ticker);
    map_tracking_ticker = undefined;

    map.flyTo({
        center: [
            track.center.lng,
            track.center.lat,
        ],
        zoom: track.zoom
    });
}

function goToMarker() {

    if(map_tracking_ticker) {
        clearInterval(map_tracking_ticker);
    }

    map_tracking_ticker = setInterval(() => map.flyTo({

        center: [
            gps_tracked ? lng : italyPosition.lng,
            gps_tracked ? lat : italyPosition.lat,
        ],
        zoom: gps_tracked ? 16 : italyPosition.zoom

    }), 1000);
}

function changeMQTTStatus(status) {
    $('.mqttStatus').text(status.label);
    $('mqttStatus').removeClass().addClass(status.className);
}

/* UTILS */

round = (value, n = 2) => Math.round(value * Math.pow(10, n)) / Math.pow(10, n);

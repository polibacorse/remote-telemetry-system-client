var mqtt = require('mqtt');
var LinearGauge = require('canvas-gauges');
var Highcharts = require('highcharts');
require('highcharts/highcharts-more')(Highcharts);

/* EDITABLE VARIABLES */
var topicBasePath = 'data/formatted/';
var requiredTopics = {
    RPM: 'rpm',
    TH2O: 'th20',
    TOIL: 'toil',
    GEAR: 'gear',
    VBATT: 'vbattdir',
    LAT: 'latitude',
    LNG: 'longitude',
};

/* PRIVATE VARIABLES */

var map;
var mqttConnection = {
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
var _rpmChart = undefined;

$(document).ready(function() {

    initMqtt(requiredTopics);

    initializeGUI();

    //initMap();

});

function initMqtt(requiredTopics) {

    changeMQTTStatus(mqttConnection.CONNECTING);

    // Try to connect with mqtt
    /*var client  = mqtt.connect('mqtt://try:try@broker.shiftr.io', {
        clientId: 'telemetry',
        protocol: 'wss',
    });*/
    var client  = mqtt.connect('mqtt://localhost', {
        clientId: 'telemetry',
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
            case topicBasePath + requiredTopics.LAT:
                updateLAT(message);
                break;
            case topicBasePath + requiredTopics.LNG:
                updateLNG(message);
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
    map = new google.maps.Map($('gmap').get(0), {
        // This position is the starting point of view
        center: {lat: 42.459945, lng: 13.123381},
        zoom: 5
    });
}

/**
 * Functions to update dashboard
 */

function initializeGUI() {

    renderRPM();

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
            max: 8000,

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
                to: 4000,
                color: '#55BF3B' // green
            }, {
                from: 4000,
                to: 6000,
                color: '#DDDF0D' // yellow
            }, {
                from: 6000,
                to: 8000,
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

function updateLAT(value) {
    $('#lat-value').text(JSON.parse(value).value);
}

function updateLNG(value) {
    $('#lng-value').text(JSON.parse(value).value);
}

function updateCarLocation(lat, lng) {
    var marker = new google.maps.Marker({
        position: {lat: lat, lng: lng},
        title:"Posizione vettura"
    });

    marker.setMap(map);
}

function changeMQTTStatus(status) {
    $('.mqttStatus').text(status.label);
    $('mqttStatus').removeClass().addClass(status.className);
}

/* UTILS */

round = (value) => Math.round(value * 100) / 100;

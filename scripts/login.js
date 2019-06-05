const ipc = require('electron').ipcRenderer;

$(document).ready(function() {

    $('#login').click(() => {

        const server = $('#server').val();
        const username = $('#username').val();
        const password = $('#password').val();

        ipc.send('login', {server, username, password});

    });

});

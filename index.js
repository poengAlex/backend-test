'use strict';
const PORT = process.env.PORT || 3000;
const { urlencoded } = require("body-parser");
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();
const httpPre = require("http");
const http = httpPre.Server(app);
const io = require('socket.io')(http);

var Requester = require('requester'),
    requester = new Requester({ debug: 1 });


http.listen(PORT, function () {
    console.log("listening on PORT:" + PORT);
});

/**
 * Socket.io section
 */
io.on('connection', function (socket) {
    console.log(`New connection: ${socket.id}`);

    socket.on('disconnect', () => console.log(`Connection left (${socket.id})`));


    socket.on('req', (request, callback) => {
        if (typeof request === 'object' && request !== null) {
            let forceRefresh = false;
            if(request.forceRefresh === true){ //Allow force refresh
                console.log("Forcing refresh")
                forceRefresh = true;
                delete request["forceRefresh"];
            }else if(request.forceRefresh === false){ 
                delete request["forceRefresh"];
            }
            console.log("request:", request);
            let params = objectToUrlParams(request);
            console.log("params:", params);
            getData(params,forceRefresh, (err, returnData) => {
                callback(err, returnData);
            });

        } else {
            callback("Error parsing incomming data", null);
        }

    });
});

app.use(express.static(__dirname + "/public/"));

function objectToUrlParams(object) {
    let params = "";
    for (const [index, [key, value]] of Object.entries(Object.entries(object))) {
        console.log(`${index}: ${key} = ${value}`);
        params += index == 0 ? "?" : "&";
        params += key + "=" + value;
    }
    return params;
}

function getData(params,forceRefresh, callback) {
    if (checkForCache(params) && !forceRefresh) {
        let file = params.replace(/[^a-zA-Z0-9 ]/g, "");
        fs.readFile("cache/" + file, 'utf8', function (err, data) {
            if (err) {
                console.error(err);
                callback(err, null);
            } else {
                // console.log(data);
                console.log("DATA returned",data);
                callback(null, JSON.parse(data));
            }

        });
    }
    else {
        requester.get(
            "https://api.fbi.gov/wanted/v1/list" + params,
            {
                dataType: 'JSON',
                processResponse: function (body) {
                    return body.replace(/^var json = /, '');
                }
            },
            function (body) {
                // console.log(body);
                callback(null,body);
                cacheData(body, params);

            }
        );
    }
}

function checkForCache(url) {
    url = url.replace(/[^a-zA-Z0-9 ]/g, "");
    return fs.existsSync("cache/" + url);
}

function cacheData(data, url, callback) {
    console.log("Storing data")
    url = url.replace(/[^a-zA-Z0-9 ]/g, "");
    fs.writeFile("cache/" + url, JSON.stringify(data), function (err, fileData) {
        if (err) {
            return console.log(err);
        }
        console.log(fileData);
    });
}





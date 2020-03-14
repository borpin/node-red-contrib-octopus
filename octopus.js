
module.exports = function(RED) {
    "use strict";
    //The Server Definition - this opens (and closes) the connection
    function octopusServerNode(n) {
        RED.nodes.createNode(this,n);
        this.server = n.server;
        this.name = n.name;
    }
    RED.nodes.registerType("octopus-server",octopusServerNode,{
        credentials: {
            apikey: {type:"text"}
        }
    });

    function octopusin(n) {
        RED.nodes.createNode(this,n);
        // this.emonServer = n.emonServer;
        // var sc = RED.nodes.getNode(this.emonServer);
        var sc = "https://api.octopus.energy/v1/products/AGILE-18-02-21/electricity-tariffs/E-1R-AGILE-18-02-21-";

        this.baseurl = "https://api.octopus.energy/v1/products/AGILE-18-02-21/electricity-tariffs/E-1R-AGILE-18-02-21-";
        // this.apikey = sc.credentials.apikey;

        this.region = n.region
        var node = this;
        var http;
        // if (this.baseurl.substring(0,5) === "https") { http = require("https"); }
        // else { http = require("http"); }
        http = require("https");

        this.on("input", function(msg) {
            var now = new Date(); 
            var start_time = now.toISOString();
            var endt = new Date(Date.now() + 24*60*60*1000);
            var end_time = endt.toISOString();
            
            // add start and end used to msg - strip milliseconds
            msg.start_time = start_time.replace(/\.[0-9]{3}/, '');
            msg.end_time = end_time.replace(/\.[0-9]{3}/, '');
            msg.region = this.region;

            this.url = this.baseurl + this.region + '/standard-unit-rates/?' + 'period_from=' + start_time + '&' + 'period_to=' + end_time;
            // this.url += '&apikey='+this.apikey;
            // var feedid = this.feedid || msg.feedid;
            // if (feedid !== "") {
            //     this.url += '&id=' + feedid;
            // }
            http.get(this.url, function(res) {
                msg.rc = res.statusCode;
                msg.payload = "";
                res.setEncoding('utf8');
                res.on('data', function(chunk) {
                    msg.payload += chunk;
                });
                res.on('end', function() {
                    if (msg.rc === 200) {
                        try {
                            msg.payload = JSON.parse(msg.payload);
                            msg.min_array = msg.payload.map(a => a.value_inc_vat);
                        }
                        catch(err) {
                            // Failed to parse, pass it on
                        }
                        node.send(msg);
                    }
                });
            }).on('error', function(e) {
                node.error(e,msg);
            });
        });
    }
    RED.nodes.registerType("octopus in",octopusin);
}

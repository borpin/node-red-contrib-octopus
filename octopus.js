
module.exports = function(RED) {
    "use strict";
    //The Server Definition - this opens (and closes) the connection

    var octopus_data = [];

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

    // function GetOctopusData(region, period_from, period_to, msg) {
    function GetOctopusData(msg) {

        node.warn(["1: ", msg]);

        // var sc = "https://api.octopus.energy/v1/products/AGILE-18-02-21/electricity-tariffs/E-1R-AGILE-18-02-21-";

        // // this.baseurl = "https://api.octopus.energy/v1/products/AGILE-18-02-21/electricity-tariffs/E-1R-AGILE-18-02-21-";
        // // this.apikey = sc.credentials.apikey;
        // var https = require("https");
        
        // var APIurl = sc + msg.region + '/standard-unit-rates/?' + 'period_from=' + msg.start_time + '&' + 'period_to=' + msg.end_time;

        // node.warn(["1: ", APIurl]);

        // https.get(APIurl, function(res) {
        //     msg.rc = res.statusCode;
        //     msg.version = 2;
        //     msg.payload = "";
        //     res.setEncoding('utf8');
        //     res.on('data', function(chunk) {
        //         msg.payload += chunk;
        //     });
        //     res.on('end', function() {
        //         if (msg.rc === 200) {
        //             try {
        //                 msg.payload = JSON.parse(msg.payload);
        //                 node.warn(["1: ", msg]);
        //                 msg.price_array = msg.payload.results.map(a => a.value_inc_vat);
        //                 msg.current_price = msg.payload.results[msg.payload.results.length - 1].value_inc_vat;
        //                 msg.next_price = msg.payload.results[msg.payload.results.length - 2].value_inc_vat;
        //                 next_run = next_half_hour;
        //             }
        //             catch(err) {
        //                 // Failed to parse, pass it on
        //             }
        //             // set time for next request on success
        //         }
        //     });
        // }).on('error', function(e) {
        //     node.error(e,msg);
        // });
    }

    function octopusin(n) {
        RED.nodes.createNode(this,n);
        // this.emonServer = n.emonServer;
        // var sc = RED.nodes.getNode(this.emonServer);

        var next_run = new Date(0);
        var next_block = new Date();

        this.region = n.region
        var node = this;

        this.on("input", function(msg) {
            var now = new Date(); 
            var next_half_hour_ts = Math.trunc(Math.floor(((now.getTime()/1000)+(30*60))/1800))*1800*1000;
            var next_half_hour = new Date(next_half_hour_ts);


            // if ( next_run <= now ) {
            var start_time = now.toISOString();
            var endt = new Date(now.getTime() + 24*60*60*1000);
            var end_time = endt.toISOString();
            
            
            // add start and end used to msg - strip milliseconds
            msg.start_time = start_time.replace(/\.[0-9]{3}/, '');
            msg.end_time = end_time.replace(/\.[0-9]{3}/, '');
            msg.region = this.region;
            msg.version = 3;

            GetOctopusData(msg);

            node.send(msg);
    
            // }

        });
    }
    RED.nodes.registerType("octopus in",octopusin);
}


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

        var node = this;

        var num_blocks = [];
        if (n.numblocks !== undefined) {
          num_blocks = n.numblocks.split(",").map(function(item) {
            return parseInt(item.trim());
          });
        }

		
        var baseurl = "";
        var influxDBsource ="";
		var consumptionDBsource = {"source" : "Agile"};
		
		if (n.tariff == "OUTGOING") {
            baseurl = "https://api.octopus.energy/v1/products/AGILE-OUTGOING-19-05-13/electricity-tariffs/E-1R-AGILE-OUTGOING-19-05-13-";
            influxDBsource = {"source" : "Outgoing"};
		} else {
            baseurl = "https://api.octopus.energy/v1/products/AGILE-18-02-21/electricity-tariffs/E-1R-AGILE-18-02-21-";
            influxDBsource = {"source" : "Agile"};
		}
        var https = require("https");
        var next_run = new Date(0);

        this.on("input", function(msg) {
            if (isNaN(msg.payload)) {
                next_run = 0;
            }
            var now = new Date(); 
            var next_half_hour_ts = Math.trunc(Math.floor(((now.getTime()/1000)+(30*60))/1800))*1800*1000;
            var next_half_hour = new Date(next_half_hour_ts);

            if ( next_run <= now ) {
                var start_time = now.toISOString();
                var endt = new Date(now.getTime() + 24*60*60*1000);
                var end_time = endt.toISOString();
                let msg2 = {};
                msg2.topic = "octopus";
                msg2.payload = {};
                
                // add start and end used to msg - strip milliseconds
                msg.start_time = start_time.replace(/\.[0-9]{3}/, '');
                msg.end_time = end_time.replace(/\.[0-9]{3}/, '');
                msg.region = n.region;
    
                var APIurl = baseurl + n.region + '/standard-unit-rates/?' + 'period_from=' + start_time + '&' + 'period_to=' + end_time;
				
                https.get(APIurl, function(res) {
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
                                // current price is last item
                                msg2.payload.current_price = Number(msg.payload.results[msg.payload.results.length - 1].value_inc_vat);
                                msg2.payload.next_price = Number(msg.payload.results[msg.payload.results.length - 2].value_inc_vat);
                                
                                // Extract the inc VAt prices into an Array
                                msg.price_array = msg.payload.results.map(a => a.value_inc_vat);
                                // map returns results in reverse (probably includes a push) - put back in same order as main data.
                                msg.price_array.reverse();
                                
                                // Extract min and max prices from available data
                                msg2.payload.min_price_inc_vat = Math.min(...msg.price_array);
                                msg2.payload.max_price_inc_vat = Math.max(...msg.price_array);

                                let blocks_output = [];
                                // put prices array now -> future
                                var price_array_rev = msg.price_array.reverse();
                                num_blocks.forEach(block => {
                                    if (price_array_rev.length > block + 1) {
                                        let blocks_result = [];
                                        for (let n = 0; n < price_array_rev.length - block + 1; n++) {
                                            let sum = 0;
                                            for (let i = n; i < n + block; i++) {
                                                sum+= price_array_rev[i];
                                            }
                                            blocks_result.push(Math.round(Math.trunc((sum / block)*1000)/10)/100);
                                        }
                                        // blocks are now listed in same order as main data (push each item of an array reverses it)
                                        // msg.blocks = blocks_result;
										let minmax_block_start = "";
										if (n.minmax == "MIN") {
											minmax_block_start = blocks_result.indexOf(Math.min(...blocks_result)) + block - 1;
											blocks_output.push({ "min Block Price": Math.min(...blocks_result), "min Block valid From":msg.payload.results[minmax_block_start].valid_from, "block_size_mins": block * 30 });
										} else if (n.minmax == "MAX") {
											minmax_block_start = blocks_result.indexOf(Math.max(...blocks_result)) + block - 1;
											blocks_output.push({ "Max Block Price": Math.max(...blocks_result), "Max Block valid From":msg.payload.results[minmax_block_start].valid_from, "block_size_mins": block * 30 });
										}
                                        
                                        //blocks_output.push({ "min Block Price": Math.min(...blocks_result), "min Block valid From":msg.payload.results[minmax_block_start].valid_from, "min_block_size_mins": block * 30 });
                                        // msg2.payload.min_block = { "min Block Price": Math.min(...blocks_result), "min Block valid From":msg.payload.results[min_block_start].valid_from, "min_block_size_mins": num_blocks * 30 };
                                    }
                                });
                                msg2.payload.minmax_blocks = blocks_output;

                                var msg3 = {};
                                msg3.payload = [];
								msg.payload.results.forEach(function(item, index) {
									msg3.payload.push([{ value_inc_vat : item.value_inc_vat, "time": new Date(item.valid_from).getTime() *1000 *1000}, influxDBsource]);
                                });
								
                                msg3.measurement = "OctopusPrice";

                                next_run = next_half_hour;
								
								
								
								var outputx = {};
								if (n.apikey != "none") {
									
									var options = {
										host: 'api.octopus.energy',
										port: 443,
										path: n.consumptionurl,
										// authentication headers
										headers: {
											'Authorization': 'Basic ' + new Buffer(n.apikey).toString('base64')
										}   
									};
									
									https.get(options, function(resc) {
										outputx.rc = resc.statusCode;
										console.log(outputx.rc);
										outputx.payload = [];
										resc.setEncoding('utf8');
										resc.on('data', function(chunk) {
											outputx.payload += chunk;
										});										
										resc.on('end', function() {
											if (outputx.rc === 200) {
												try {
													outputx.payload = JSON.parse(outputx.payload);
													console.log("8");
													msg4.payload = [];
													console.log(msg4.payload);
													outputx.payload.results.forEach(function(item, index) {												
														msg4.payload.push([{ consumption : item.consumption, "time": new Date(item.interval_start).getTime() *1000 *1000}, consumptionDBsource]);
													});											
													msg4.measurement = "OctopusConsumption";
													 node.send([msg, msg2, msg3, msg4]);
												} catch(err) {
													node.error(err,outputx);
													console.log("Error 1");
													// Failed to parse, pass it on
												}
											} else {
												console.log("7");
											}

										});	
									}).on('error', function(e) {
										node.error(e,outputx);
										console.log("Error 2");
									});
								} else {
									 node.send([msg, msg2, msg3, msg4]);
								}
								
								
								
								
								
								
								
                            } catch(err) {
                                node.error(err,msg);
                                // Failed to parse, pass it on
                            }
                            // set time for next request on success
                           
                        }
                    });
                }).on('error', function(e) {
                    node.error(e,msg);
                });
            }

        });
    }
    


    function DarkSkyInputNode(n) {
        RED.nodes.createNode(this, n);
        this.lang = n.lang || "en";
        this.units = n.units || "us";
        var node = this;
        this.repeat = 900000;
        this.interval_id = null;
        var previousdata = null;

        this.interval_id = setInterval( function() {
            node.emit("input",{});
        }, this.repeat );

        this.on('input', function(msg) {
            assignmentFunction(node, n.date, n.time, n.lat, n.lon, RED.nodes.getNode(n.darksky), function(err) {
                if (err) {
                    node.error(err,msg);
                } else {
                    weatherPoll(node, msg, function(err) {
                        if (err) {
                            node.error(err,msg);
                        } else {
                            var msgString = JSON.stringify(msg.payload);
                            if (msgString !== previousdata) {
                                previousdata = msgString;
                                node.send(msg);
                            }
                        }
                    });
                }
            });
        });

        this.on("close", function() {
            if (this.interval_id !== null) {
                clearInterval(this.interval_id);
            }
        });

        node.emit("input",{});
    }



    RED.nodes.registerType("octopus in",octopusin);
}

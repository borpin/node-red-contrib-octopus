node-red-contrib-octopus
========================

# Under Development

A <a href="https://nodered.org" target="_new">Node-RED</a> node to extract the <a href="https://octopus.energy" target="_new">Octopus Agile</a> (or Agile Outgoing) future price data via the API.

My [referral code](https://share.octopus.energy/wise-jade-356) if you are switching to Octopus and feel kind.

The Octopus Agile Tariff is a UK Electricity Tariff that is priced throughout the day in 30 minute blocks (periods). The price varies considerably over a 24Hr period. To see a historical view of the pricing visit <a href="https://www.energy-stats.uk/octopus-agile/">energy-stats</a>. The pricing data is released at approximately 16:00Z for the next 23:00Z to 23:00Z period. This node always retrieves all the data available.

The purpose of this node is to simplify retrieving this data so it can be used to inform people or processes of the current price and when the best time might be to consume electrcity.

Installing it into the Home Assistant Node-RED add-on will this data to be easily integrated into Home Assistant.

Install
-------

This package can be [installed](https://docs.npmjs.com/cli/install) directly from GitHub (not on npm currently).

It can also be installed into the Home Assistant Node-RED add-on with the following configuration;

```
npm_packages:
  - 'git+https://github.com/borpin/node-red-contrib-octopus.git'
```

If you want the *dev* branch, add `#dev` to the end of the URL.

Usage
-----

There are 3 data outputs from the node;

1. **raw data** - this is the raw data returned by the API.
1. **processed data** - this output is a set of processed data.
    * **current_price** - the price of electricity in the current 30 min period.
    * **next_price** - the price of electricity in the next 30 min period.
    * **min_price_inc_vat** - the minimum price of electricity in the current data set.
    * **max_price_inc_vat** - the maximum price of electricity in the current data set.
    * **Array of minimum price blocks** - an array of blocks of time that are the cheapest period within the current data set. e.g. at what time does the cheapest 2 Hr block occur.  Any number of lengths can be specified. 2 blocks = 60 mins.
1. **InfluxDB Data** A set of data ready to be passed to an *influxdb in* node and loaded into InfluxDB. This can be loaded repeatedly as it is a timeseries and the times are the same.

By injecting a timestamp into the node on the hour and half hour, the node will update the data set and the current/next prices. The update rate is limited to 30 minutes to protect the Octopus API. To force the node to run, inject any NaN (string).

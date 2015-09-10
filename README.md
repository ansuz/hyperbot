# Hyperbot

## Getting started

1. Get the source
  + `git clone https://github.com/ansuz/hyperbot.git;cd hyperbot`
2. install stuff
  + `npm install`
3. copy over the default config and edit it to suit your tastes
  + `cp sample.config.agml config.agml`
4. start it up!
  + `node hyperbot.js`

## How the conf works

As the extension suggests, this is [AGML](https://github.com/ansuz/agmljs). Each block is delimited by a starting and ending `---`, and can be used to define a new network.

At present, the relevant variables are:

* name
  + a human readable name for the network to which your bot should connect
* network
  + the url of the network to which your bot should connect
* nick
  + the nick your bot will use on this network
* prefix
  + the prefix character that your bot should respond to on this network
* channels
  + the channels that your bot should attempt to join on this network
* db
  + the path to the leveldb database to use for this instance of the bot on this network
* drop
  + what characters should be dropped from the end of a nick
* debug
  + enable debugging in the irc module
* floodProtection
  + keep your bot from flooding the channel
  + set to true to enable
* floodProtectionDelay
  + flood delay, default 1000

## What the bot does

* ~mimic
* ~help

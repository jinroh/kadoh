```
                                                       
    _/    _/                  _/    _/_/    _/    _/   
   _/  _/      _/_/_/    _/_/_/  _/    _/  _/    _/    
  _/_/      _/    _/  _/    _/  _/    _/  _/_/_/_/     
 _/  _/    _/    _/  _/    _/  _/    _/  _/    _/      
_/    _/    _/_/_/    _/_/_/    _/_/    _/    _/      
```

[![Build Status](https://secure.travis-ci.org/jinroh/kadoh.png?branch=experimental)](https://secure.travis-ci.org/jinroh/kadoh?branch=experimental)

# Description

The aim of this project is to write an implementation of the Kad system running in a browser environnement and especially in a mobile browser.

## Why is this challenging ?

### P2P need P2P communication

Kad is a _peer to peer_ system. That means that nodes (or peers) need to communicate directly to each other. The browser is not at all originally ready for P2P communications : it's based on a _server-client_ communication scheme. As client, the browser can retrieve information from the server, but the reverse path is not easy.

One of our challenge is to find a mean to enable a communicaton as direct as possible between mobile nodes.

_Hints_ : AJAX long-polling, WebSocket, Socket.io and XMPP over BOSH..

### Large scale-testing

The aim of our project is not to join an existing DHT, because, since the majority of them works uppon raw UDP or TCP, we can not connect to them with a browser.So, we should create our own protocol and own network. 

However, to test our implementation we need some instance nodes of it - actually, quite a lot of nodes. Indeed, Kademlia is designed to be scalable and all the magic happens when it works with a huge amount of nodes.

One of our challenge is to test our system at large-scale.

_Hints_ : bots, proxy to existing DHTs..

# Install

To run KadOH you need __[node.js]__ (v0.4.12) and __[npm]__ \(node's packet manager\) to be installed.

## Clone the repository

You may want to checkout our experimental branch

```bash
$ git clone https://github.com/jinroh/kadoh.git
$ git checkout experimental
```

## Install dependencies

You will need to install `libexpat-dev` on Linux environments (should not be necessary on Mac OSX with XCode). For instance, on a Ubuntu machine, you'd have to run the folowing `apt-get` :

```bash
$ sudo apt-get install libexpat-dev
```

Then enter the `git` repository and install the package dependencies using `npm`.

```bash
$ cd kadoh
$ npm install
```
    
## Build the source tree

To build the source you can use either `jake build` or `jake build:normal`. This will build the main program in `/dist/KadOH.js`.

## Testing

We use [jasmine-node] and [jasmine-runner] for our testing on `node` and directly in the browser.

You can launch the test using the jake task `jake test:node` or `jake test:browser` which launch a HTTP server on `localhost:8124`.

## Launching you own DHT for testing

To launch you own DHT, you can use our built in scripts. The `dht` executable from the `bin/` directory is made for you. You can start different kind of DHT by writing a little configuration file in `json`. Examples can be found from the `lib/config` directory.

Here is an explanation of such configurations (be aware that comments are normally not allowed in JSON files) :

```json
{
  // transport type (xmpp or udp)
  "botType"  : "xmpp",
  // total size of the DHT
  "size"     : 100,
  // size of each pool
  "poolSize" : 30,
  // how many peers per seconds are launched
  "speed"    : 1,
  // activity per minutes per bots
  "activity" : 50,
  // number of values published by the bots on the DHT
  "values"   : 100,
  // here for instance the jids "kadoh0@jabber.org" .. "kadoh99@jabber.org" with the password "azerty" will be used to connect the bots
  // if you remove the %d, all bots will have the same address but will connect with different resources to the server
  // when of type xmpp, you have to give the jid and passwords to launch multiple bots
  "jids"     : ["kadoh%d@jabber.org", "azerty"],
  // set to true if you want that this DHT launch the bootstraps or not
  "starter"  : true,
  // specify the bootstraps that will be launched (if starter) and used
  "bootstraps" : [
    ["kadohbootstrap0@jabber.org", "kadoh", "azerty"],
    ["kadohbootstrap1@jabber.org", "kadoh", "azerty"],
    ["kadohbootstrap2@jabber.org", "kadoh", "azerty"]
  ]
}

```

Any parameters added through the CLI will overwrite the one from the config files.

```bash
$ ./bin/dht --config udp.default.json --size=1000 --speed=4
```

After running this script, you should see each pool running after the other until all bots are launched.

To connect from the browser to the launched DHT, you can start a little HTTP server from our `apps` directory. For instance, if you have launched a UDP DHT, start the server as follow :

```bash
$ node apps/proxy/udp/app.js
```

You can connect then the DHT from you browser by going to `localhost:8080` and clicking on join.

If you have started a XMPP DHT, you should start the `apps/xmpp/app.js` HTTP server. Be aware that you might need to change the bootstraps from the `apps/xmpp/index.html` file to match your xmpp bootstraps.

## Mainline Proxy

You can test our implementation of the iterativeFindNode algorithm by launching a proxy server to the Mainline DHT.

Run with Node :

```bash
$ node apps/proxy/mainline/app.js
```

Then, in your browser go to `localhost:8080` and click on the `join` button. You can explore the iterativeFindNode algorithm steps with the buttons `prev`and `next`.

# @Done/@TODO

```
Kademlia client
  - utils

      - crypto/distance             [x]
      - Peer object                 [x]
      - PeerArray object            [x]
      - SortedPeerArray object      [x]

  - Routing Table                   [x]

      - K-Bucket object             [x]
      - find closest peer method    [x]
      - refresh                     [x]

  - Value Management                [x]
  
      - persistent stor.(Lawnchair) [x]
      - session recover             [x]
      - expiration                  [x]

  - Node                            [x]

      - iterativeFindNode           [x]
      - iterativeFindValue          [x]
      - iterativeStore              [x]

  - RPC Reactor                     [x]

      - routing in/out RPC          [x]

      - outgoing RPC 
          - 'PING'                  [x]
          - 'FIND_NODE'             [x]
          - 'FIND_VALUE'            [x]
          - 'STORE'                 [x]

      - incoming RPC
          - 'PING'                  [x]
          - 'FIND_NODE'             [x]
          - 'FIND_VALUE'            [x]
          - 'STORE'                 [x]

      - RPC protocol
          - JSON-RPC2               [x]
          - XML-RPC                 [x]

      - P2P transport
          - SimUDP                  [x]
          - XMPP over BOSH          [x]
          - raw XMPP in Node        [x]
          - raw UDP in Node         [x]

```


[node.js]:https://github.com/joyent/node
[npm]:https://github.com/isaacs/npm
[jasmine-runner]:https://github.com/jamescarr/jasmine-tool
[jasmine-node]:https://github.com/mhevery/jasmine-node

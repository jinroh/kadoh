```
                                                       
    _/    _/                  _/    _/_/    _/    _/   
   _/  _/      _/_/_/    _/_/_/  _/    _/  _/    _/    
  _/_/      _/    _/  _/    _/  _/    _/  _/_/_/_/     
 _/  _/    _/    _/  _/    _/  _/    _/  _/    _/      
_/    _/    _/_/_/    _/_/_/    _/_/    _/    _/
```

# Description

The aim of this project is to write an implementation of the Kad system running in a browser environnement and especially in a mobile browser.

## Why is this challenging ?

### P2P need P2P communication

Kad is a _peer to peer_ system. That means that nodes (or peers) need to communicate directly to each other. The browser is not at all originally ready for P2P communications : it's based on a _server-client_ communication scheme. As client, the browser can retrieve information from the server, but the reverse path is not easy.

One of our challenge is to find a mean to enable a communicaton as direct as possible between mobile nodes.

Hints : AJAX long-polling, WebSocket, Socket.io and XMPP over BOSH..

### Large scale-testing

The aim of our project is not to join an existing DHT, because, since the majority of them works uppon raw UDP or TCP, we can not connect to them with a browser.So, we should create our own protocol and own network. 

However, to test our implementation we need some instance nodes of it - actually, quite a lot of nodes. Indeed, Kademlia is designed to be scalable and all the magic happens when it works with a huge amount of nodes.

One of our challenge is to test our system at large-scale.

Hints : bots, proxy to existing DHTs..

# Install

To run KadOH you need __[node.js]__ (v0.4.12) and __[npm]__ \(node's packet manager\) to be installed.

## Clone the repository
```bash
$ git clone https://github.com/jinroh/kadoh.git
```
    
## Install dependencies
```bash
$ cd kadoh
$ npm install .
```
    
## Build the source tree

To build the source you can use either `jake build` or `jake build:normal`. This will build the main program in `/dist/KadOH.js`.


## Testing

We use [jasmine-node] and [jasmine-runner] for our testing on `node` and directly in the browser.

You can launch the test using the jake task `jake test:node` or `jake test:browser` which launch a HTTP server on `localhost:8124`.


## Working example : proxy to Mainline DHT

You can test our implementation of the iterativeFindNode algorithm by launching a proxy server to the Mainline DHT.

In directory `examples/Proxy` run with Node :

```
$ node app.js
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

  - Value Management                [ ]
      - ..........
      - ..........

  - Node                            [ ]

      - iterativeFindNode           [x]
      - iterativeFindValue          [ ]

  - RPC Reactor                     [ ]

      - routing in/out RPC          [x]

      - outgoing RPC 
          - 'PING'                  [x]
          - 'FIND_NODE'             [x]
          - 'FIND_VALUE'            [ ]
          - 'STORE'                 [ ]

      - incoming RPC
          - 'PING'                  [x]
          - 'FIND_NODE'             [x]
          - 'FIND_VALUE'            [ ]
          - 'STORE'                 [ ]

      - RPC protocol
          - JSON-RPC2               [x]
          - XML-RPC                 [ ]

      - P2P transport
          - SimUDP                  [x]
          - XMPP over BOSH          [ ]

```


[node.js]:https://github.com/joyent/node
[npm]:https://github.com/isaacs/npm
[jasmine-runner]:https://github.com/jamescarr/jasmine-tool
[jasmine-node]:https://github.com/mhevery/jasmine-node

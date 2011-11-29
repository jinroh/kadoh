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

Kad is a _peer to peer_ system. That means that nodes (or peers) need to communicate directly to each other. The browser is not at all originally ready for P2P communications : it's based on a _server-client_ communication scheme. As client, the browser can retrieve information from the server, but the reverse path is not easy.

One of our challenge is to design a mean to enable a communicaton as direct as possible between mobile nodes.


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


# Testing

We use [jasmine-node] and [jasmine-runner] for our testing on `node` and directly in the browser.

You can launch the test using the jake task `jake test:node` or `jake test:browser` which launch a HTTP server on `localhost:8124`.


[node.js]:https://github.com/joyent/node
[npm]:https://github.com/isaacs/npm
[jasmine-runner]:https://github.com/jamescarr/jasmine-tool
[jasmine-node]:https://github.com/mhevery/jasmine-node

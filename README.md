# KadOH - Javascript P2P framework

**KadOH** is a framework to build P2P applications for browsers and node.js. By implementing the basis of the [Kademlia DHT](http://en.wikipedia.org/wiki/Kademlia), KadOH lets you build **distributed web applications** for mobile and desktop devices. With its flexible and extensible design, you can easily adapt KadOH to fit your needs. 

KadOH abstract many different transport protocols to provide P2P connections. In the browser we support [XMPP over Bosh](http://xmpp.org/extensions/xep-0206.html) and [Socket.io](http://socket.io/), and you can go for UDP and native XMPP in a node.js application. We plan to support **[WebRTC](http://www.webrtc.org/)** soon !

[See the wiki](/jinroh/kadoh/wiki) for more informations ! Take also a look at [our report](http://jinroh.github.com/) and be aware that this document may be outdated.

---

*Acknowledgments* — We would like to thank [Dr. Tudor Dumitraş](http://www.ece.cmu.edu/~tdumitra/), who gave us the honor to work with him during our project and always made available his support.

**Alexandre Lachèze** and **Pierre Guilleminot**

## See it in action

**[Live demo](http://kadoh.fr.nf/)** running on Amazon EC2.

### Run it yourself

First you can start a little DHT using this command :

```
bin/dht udp.default
```

Then in an other terminal, start the server using the following Jake command and go to `localhost:8080` :

```sh
jake run:udp
```

See the wiki for more informations on how to [launch your own DHT](/jinroh/kadoh/wiki/DHT-simulation) from scratch and on different environments.

## Installation

### Install KadOH

The only required dependency is [node.js](http://nodejs.org/). Take a look at the [official manual](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) to install node on your system.

Then run :

```sh
npm install kadoh
# or: git clone https://github.com/jinroh/kadoh.git
cd kadoh
npm install
```

You may also want to install the Jake module globally :

```
npm install -g jake
```

*For Linux users*, if the installation of KadOH's dependencies fails, you may need to install the `libexpat-dev` package. For Ubuntu/Debian users, run the following command :

```sh
sudo apt-get install libexpat-dev
```

### Build and go

#### Browser

To build the source inside the `dist` folder run one of the following Jake command :

```sh
jake build
```

This will build two versions of KadOH supporting different transports :

  - SimUDP using Socket.io
  - XMPP using Strophe.js for XMPP over Bosh

#### Node.js

If you need to use KadOH in a node.js application, just add `kadoh` in your package dependencies and use :

```javascript
var kadoh = require('kadoh');
```

## Tests

[![Build Status](https://secure.travis-ci.org/jinroh/kadoh.png?branch=master)](https://secure.travis-ci.org/jinroh/kadoh?branch=master)

```
jake test:node
jake test:browser
```

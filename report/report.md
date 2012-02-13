# Design and testing of a mobile DHT

*Abstract* — Peer to Peer protocols are widely used in desktop applications where they have been deployed and improved over the years. Particularly, the Kademlia protocol is used by most eMule and BitTorrent – as part of the Mainline protocol – clients. However, mobile terminals are not supported by these softwares, even though they would allow new applications of DHTs that could go further file sharing. In this report, we will introduce a full Javascript implementation of the Kademlia DHT protocol designed for both desktop and mobile browsers. Firstly, we introduce our technology choices and development architecture, and secondly, we evaluate the protocol on medium scale deployments.

**Alexandre Lachèze** and **Pierre Guilleminot**

# Introduction

The main application Peer to Peer softwares are known for is file sharing without relying on a central server. However, the main idea of Distributed Hash Tables (DHT) is simply to lay on end systems intelligence for routing, transmitting, searching or storing flows of data. This model has many advantages, and can be the basis for numerous applications.

By delegating logical decisions to nodes, it becomes possible to build scalable networks, with no single point of failure where the sharing of content between users does not require any centralized storage unit.

Taking mobile users into account is a real challenge. From a network perspective, the routing precision and reliability of the system are greatly affected by the increasing number of stale peers. From an development point of view, the variety of mobile frameworks makes a cross platform implementation hazardous.

We tried to depend on web technologies to allow the development of web applications based on this promising decentralized architecture. We believe that P2P networks, accessible from any browser and any mobile phone could lead to truly new and innovative concepts.

# Kademlia principles

Kademlia is a Distributed Hash Table (DHT) algorithm described in _[Kademlia: A Peer-to-peer information system based on the XOR Metric][kad_paper]_ and designed by Petar Maymounkov and David Mazières in 2002. Nowadays, Kademlia is used in particular for file sharing by most eMule and BitTorrent clients as part of the Mainline protocol.

The algorithm aims to store _(key, value)_ tuples among a large number of peers and provide a process to retrieve a value given the associated key. It also provide a mean to keep the DHT consistent despite peers arrivals, departures, and failures. It is based on the XOR-metric distance on an ID space (mostly 160 bits long). Keys of values belongs to this ID space as well as the IDs of peers that are uniquely attributed to each one.

### Routing

Each peer has a partial knowledge of the other peers connected to the DHT, that allows it to route the requests of others. However this knowledge is more accurate in the close space.

The knowledge of the network is provided by the routing table, where peers are grouped in K-buckets. Each K-bucket contains maximum K peers which distance with the actual peer is in a specific range. For instance, the first K-bucket, which contains the farther peers, have peers which distance is in ]2<sup>159</sup>, 2<sup>160</sup>]. The second one has range ]2<sup>159</sup>, 2<sup>158</sup>], and so on. Thus, the actual peer has more accurate knowledge of peers that are closer to him.

![KBuckets](images/kbuckets.png)

Each time a peer is successfully contacted or contacts us, it is added in the routing table and sorted in the right K-bucket.


http://www.daimi.au.dk/~bouvin/dP2P/2006/lectures/03/

### Remote Procedure Calls

### Iterative Lookup

# Approaches and choices

This section is intended to justify our main choices of development. These decisions are the result of our investigations and considerations on the sensitive issues of the project.

Our conclusions took time to mature as they were elaborated throughout the development.

## Javascript

We decided to use Javascript because it has many advantages to develop network oriented mobile applications. In fact, thanks to the youth and freshness of most smartphone browsers, mobiles are the best systems to write platform-independent applications that work out-of-the-box. Besides, the application becomes usable in *all* modern desktop browsers and in *any* frameworks embedding a Javascript Virtual Machine.

As a language, Javascript has also significant advantages regarding network logics. It is event-driven and benefits from the simplicity of closures. As a result, there is no need for event loops or any additional event oriented framework. The language is also entirely single-threaded from the programmer point of view, which considerably simplify the development.

Performances of Javascript have been greatly improved over the past years. Indeed, newer and faster VMs have been actively researched and developed (V8, JägerMonkey, Nitro, ...), making the language 10 to 100 times faster than it was ten years ago.

The distribution process of the application was also in favor of Javascript. WebApps can be easily distributed both as native applications or as simple web pages. This discharges us from the costs of installations, upgrades and SDKs. But also, it relieves us from the controls of third parties which are very common in mobile *app-stores*.

## Transport layer

The main difficulty with an in-browser Javascript is the impossibility to open a socket to listen to incoming connections. In fact, nowadays, browsers can only send HTTP requests to a given server. We had to find solutions to keep our DHT decentralized and still relying on a server to proxy our requests.

Note that other DHT implementations have the same kind of issue when [receiving incoming packets behind a NAT][connectivity]. For the particular case of mobile-phone application, this is even true since radio-mobile networks are strongly restricted towards incoming connections. Softwares have to use different kind of techniques that also involve critical points in the DHT to get around the NAT, like *supernodes*.

First, we developed a little proxy to route requests between peers. We thought about semi-decentralized systems where proxies could route messages between each other through UDP or TCP channels. The main drawback is that we wanted the application to depend on an existing, distributed and scalable infrastructure.

This is why we chose the XMPP protocol which meets most of our constraints. XMPP is a widely used open standard to exchange XML based messages between peers. Even though XMPP has a client-server architecture, it is decentralized thanks to its open protocol and server to server communications. Moreover, many XMPP servers are freely available over the Internet, and this protocol is used by large instant messaging servers, like *Google Talk* or *Jabber.org*.

The XMPP protocol uses a stateful TCP channel to connect server with clients. But, thanks to the [BOSH] — *Bidirectional-streams Over Synchronous HTTP* — extension, it becomes possible to connect any browser to an XMPP server through synchronous HTTP requests.

![Decentralized XMPP](images/bosh.png)

We based our XMPP transport on [Strophe.js]. This library is the main reference to perform real-time XMPP applications over BOSH in browsers. It is well documented – a [book][prof_xmpp] is devoted to it – and has a good support from the community.

Nevertheless, thanks to the [modular architecture](#architecture) of the application, we implemented several other transports, such as UDP – only with [Node.js](#node.js) – and WebSocket (thanks to [socket.io][]). This has been convenient to test the efficiency of the DHT on different networks. For instance we have been able to [join the Mainline DHT](#mainline-dht) through a WebSocket to UDP proxy.

[connectivity]:http://people.kth.se/~rauljc/p2p09/jimenez2009connectivity.pdf "Connectivity Properties of Mainline BitTorrent DHT Nodes"
[BOSH]:http://xmpp.org/extensions/xep-0124.html "XEP-0124: Bidirectional-streams Over Synchronous HTTP (BOSH)"
[Strophe.js]: http://strophe.im/strophejs/ "An XMPP library for JavaScript"
[prof_xmpp]: http://professionalxmpp.com/ "Professional XMPP Programming with JavaScript and jQuery, Jack Moffitt, 2010"
[socket.io]: http://socket.io/

# Application's Design

During our development process, we had to try many different technical options and refactor number parts of the architecture. Implementing new ideas and concepts had to be painless, therefore our design focus on extensibility and reliability.

The application is developed as a framework, organized in a collection of replaceable and extensible modules. As a simple example, our transport layers implement the same interface which allowed us to test different alternatives. This design principle required efforts of abstraction and anticipation, yet the final application gains legibility and extensibility.

In this chapter, we give details of our development principles to meet our requirements. 

## Patterns

Description of the most common patterns that improve the quality of our code and helped us in our development.

### Class inheritance

Despite the fact that Javascript is an object oriented language , it's important to note that, unlike other OOP (Object Oriented Programming)  languages, it is not possible to define classes. Javascript is _prototype based_, which makes inheritance not natural, but still possible.

Somehow, to facilitate code reuse by inheritance, some techniques are widely used to imitate classical inheritance syntax in Javascript. Some of them are described in the book [Javascript Patterns][JsPatterns], chapter 6 (_Code Reuse Patterns_). Thus, most popular frameworks implement their own class inheritance system ( e.g. Prototype [Class](http://api.prototypejs.org/language/Class/)) for internal use or as API.

Because we wanted our code to depend as less as possible on external framework, we decided to integrate to it an inheritance system. Among many available implementations, we chosen to use the one proposed by [Dustin Diaz](http://dustindiaz.com/klass) called [klass](https://github.com/ded/klass) because of its simple interface and because it can run on any environment (browser, Node.js). 

This is a snippet of code showing how inheritance is used :

```js
// KBucket class extends PeerArray class
KadOH.KBucket = PeerArray.extend({

  // constructor of KBucket
  initialize: function(rt, min, max) {
    this.supr(); // call the super constructor (PeerArray constructor)
  },

  // override a method addPeer
  addPeer: function(peer) {
    // findPeer is a method of PeerArray
    if(this.findPeer() == -1)
      this.supr(peer); // call the super method
  }
})
```
 
The adapted inheritance system has deeply instigated us to write reusable code (see _Architecture_ section).

[JsPatterns]: http://shop.oreilly.com/product/9780596806767.do (Javascript Patterns, Stoyan Stefanov, O'Reilly)

### Event-driven programming

Since Javascript was initially design to handle DOM manipulations and user interactions, the language has simple and efficient ways to deal with event calls. We took advantage of this event-driven facility to manage our flow control.

*Event-emitter* is a common pattern in Javascript to control events. Every objects extending the `EventEmitter` class can *emit* asynchronous events that can be *listened* and attached to *callback* functions. Basically, this pattern allows us to elegantly control our action flow whenever a resource changes.

To implement our own version of the *event-emitter* pattern, we took inspiration from the [jQuery callbacks][jquery-callbacks] API and the [EventEmitter object from node.js][node-eventemitter]. More, we added some handy functionalities :

  - any event emission can be memorized to mimic a constantly emitting event (our starting point for deferred objects)
  - it is possible to use one time event or listener

Here is an simple example of the usage of `EventEmitter` methods to execute a *callback* function when receiving RPC queries :

```js
// Reactor class extends the EventEmitter
var reactor = new Reactor();

// ...

reactor.on('queried', function(rpc) {
  // handle the query
});

// somewhere else in the code
reactor.emit('queried', rpc);
```

As an extension to this pattern, we developed another architecture to represent *stateful* objects (`StateEventEmitter`). These objects are associated to a unique state at any time. A change of state induces the emission of an associated event. Our three main objects use this pattern. For instance, our Transport object is represented by its connection state, and any change of state provoke a chain of actions in the application.

[jquery-callbacks]:http://api.jquery.com/category/callbacks-object/
[node-eventemitter]:http://nodejs.org/docs/latest/api/events.html#events.EventEmitter

### Deferred objects

Manage several asynchronous and nested operations prompted us to use the deferred pattern to manage them accurately. With this pattern, a chain of actions (asynchronous or not) can be associated to the completion of an asynchronous computation.

The CommonJS definition of the pattern :

> Promises provide a well-defined interface for interacting with an object that represents the result of an action that is performed asynchronously, and may or may not be finished at any given point in time. <small>CommonJS</small>

@TODO for Alex : explicit why we found this pattern interesting and how we used it to manage our flow control with objects (maybe with an example)

We developed and tested our own version of the deferred pattern based on the EventEmitter class. We took inspiration from the [CommonJS] [Promises/A] recommendation and the [when.js] implementation of these recommendations. However, our implementation is not strictly compliant since we have chosen not to support chainability by default, even if this functionality can be used, for performance reasons.

To help us managing parallels asynchronous requests, we implemented some helpers for the batch processing of deferreds. All these functions return a new promise object and take a batch of deferred objects as an argument :

  - `whenAll` resolves only when all given deferreds are resolved
  - `whenSome` resolves as soon as a specified amount of the given deferreds has resolved
  - `whenAtLeast` resolves when all given deferreds have completed, if at least one of them has resolved

[CommonJS]: http://wiki.commonjs.org/wiki/CommonJS
[Promises/A]: http://wiki.commonjs.org/wiki/Promises/A
[when.js]: https://github.com/cujojs/when

### Ubiquitous structures

In Kademlia implementations, it is convenient to handle object representing peers of the network. That's why we wrote a dedicated object (`Peer`) representing a peer with helpful methods for manipulating it.

We also implemented a dedicated object to handle array of peers (`PeerArray`), and an extended version to support XOR sorted arrays using an insertion sort algorithm. These objects implement numerous methods dealing with ensemble operation (union, intersection, equality, membership..). They are very helpful and used all over our implementation.

These structures are in response to the weak typing of Javascript : they allow us to have consistent objects throughout our implementation. The definition, instantiation and the handling of these object is indeed defined once, that helps us to rapidly apply changes.

## Architecture

In this part, we will enlighten all the parts that compose our module oriented architecture.

![Class diagram ](images/class_diagram.png)

At early stage of our development, we took a look at the [entangled] implementation which is written in Python. *Entangled* inspired us the high-level architecture of our implementation based on four main parts : [Reactor](#reactor-and-rpcs), [Routing Table](#routing-table), [Value Management](#value-management) and [Node](#node). We also got inspiration of the fact that *entangled* is deeply based on [twisted] and especially uses *Deferred* objects.

[entangled]: http://entangled.sourceforge.net/
[twisted]: http://twistedmatrix.com/

### Reactor and RPCs

The reactor is the part responsible for dealing with incoming and outgoing RPCs. It provides a thick layer of abstraction over the protocols used to exchange RPCs and their asynchronous nature. The reactor is mainly based on an extensible `RPC` class that leverages the [deferred pattern](#deferred-objects).

#### RPC classes

The goal behind `RPC` class is to give the illusion of handling a single shared and synchronized deferred object across the querying and the queried peer. This object represents a complete RPC, embodied at once the query and the response. Moreover, since it extends [deferred](#deferred-pattern), it inherits from all deferred facilities such as batch processing.

Thus, the `RPC` object is created on the querying peer side where the arguments of the query  and destination are specified. *Callback* functions are attached to the deferred. The object then *traverses* the network to the queried peer where the query gets handled by the appropriate handler that resolves or rejects it with arguments. On the querying peer side, the `RPC` object gets remotely resolved or rejected with the same arguments, and *callbacks* are called.

![Reactor, communication diagram ](images/reactor_simple.png)

`RPC` class is extended to specific classes corresponding to the different RPC methods (`PingRPC`, `FindNodeRPC`, `FindValueRPC`, `StoreRPC`) used in Kademlia. These extensions allows to perform specific handling of query parameters and response arguments.

Here is how a simple *find node* query is built and asynchronous callbacks are attached :

```js
// Build a new find node RPC
// - the first parameter is an instance of Peer : the peer to query
// - the second is the ID targeted by the find node query

rpc = new FindNodeRPC(peer, 'de9f2c7fd25e1b3afad3e85a0bd17d9b100db4b3');
reactor.sendQuery(rpc);

//attach a callback

rpc.then(function(peers) {

  //callback is executed with the response of the queried peer as parameter
  //the responded peers is directly a XORSortedPeerArray, ready to use :
  
  peers.pickoutFirst(globals.ALPHA);
  //continue ...
});
```

On the queried peer side, the RPC gets handled like this :

```js
//attach a callback to the reactor, called when receiving a RPC query

reactor.on('queried', function(rpc) {

  //different handle depending on the RPC method
  if(rpc instanceof FindNodeRPC) {

    //get in the routing table the BETA closest peers to the find node targeted ID
    var peers = routingTable.getClosePeers(rpc.getTarget(), globals.BETA);

    //resolve the RPC with the peers (instance of PeerArray) as argument
    rpc.resolve(peers);
  }
});
```

#### Protocols stack

In order to cope with our modular design we took care of layering the reactor in three independent parts.

![Reactor, communication diagram ](images/reactor.png)


##### Transport 

To transport our RPC messages over the network from peer to peer, we considered [different techniques](#transport-layer). Thus, our implementation supports several transport protocols wrapped in `Transport` class which methods are independent of the protocol.

These are the transport protocols that our implementation supports :

  - XMPP over BOSH running in browser using [Strophe.js] 
  - XMMP running in [Node.js](#node.js) and using the [node-xmpp](https://github.com/astro/node-xmpp) library
  - UDP running in [Node.js](#node.js) and using the native [datagram sockets](http://nodejs.org/docs/v0.4.12/api/all.html#uDP_Datagram_Sockets
) module
  - *SimUDP* over websockets which runs in browser and in [Node.js](#node.js) and uses the [Socket.io] library. Since websockets is not a peer to peer protocol, we managed to mimic simply the UDP protocol over websockets thanks to a routing server. We called it *SimUDP* and we reused it in proxies such as our [Mainline proxy](#mainline-dht) or in a UDP proxy.

##### RPC encoding

RPC messages are encoded and decoded according to standard RPC protocols. Our implementation supports two of them very similar in their structures :

  - [JSON-RPC 2.0](http://jsonrpc.org/spec.html): based on [JSON](http://www.json.org/), a generic data format in Javascript.
  - [XML-RPC](http://xmlrpc.scripting.com/spec.html): based on [XML](http://www.w3.org/XML/) a common data format for browsers since HTML is an extension of XML. Moreover, embedded XML-RPC into XMPP is a standard XMPP extension called [Jabber-RPC](http://xmpp.org/extensions/xep-0009.html).

Since, the parsing operation could be very expensive towards computation resources, care should be taken when choosing a RPC protocol data format :

  - JSON fits well for our use since modern browsers have a native parser, as well as other Javascript execution environments ([Node.js](#node.js)). 
  - Regarding XML, leveraging the native DOM parser and [manipulation API](https://developer.mozilla.org/en/DOM/element) of browsers is good way to optimize the parsing. Since [Strophe.js] exploits this optimization, we implemented Jabber-RPC protocol as a [Strophe.js plugin][rpc_plugin]. In Node.js, we used the [ltx] module that presents a similar API to Strophe.js and takes advantages of the [expat] library (through [node-expat]), an XML parser written in C. [node-xmpp] also depends on ltx.

##### Implementation protocol

To add consistency to our implementation we chose to use [ubiquitous structures](#ubiquitous-structures). RPC objects have also to deal only with these objects. They are also responsible to transform these structures into a *normalized* data format to be encoded using one of the standard RPC protocol. At the decoding step, a validation is performed towards the received data and the exact same structure object is instantiated.

[rpc_plugin]: https://github.com/metajack/strophejs-plugins/tree/master/rpc/
[ltx]: https://github.com/astro/ltx
[node-expat]: https://github.com/astro/node-expat
[node-xmpp]: https://github.com/astro/node-xmpp
[expat]: http://expat.sourceforge.net/

### Routing Table

The routing table is responsible for managing peers. It is composed of all the k-buckets. Most parts of this object are implemented in a standard fashion regarding other Kademlia implementations.

The `KBucket` class extends `PeerArray` and implements additional functions to handle a range. Indeed, every bucket is associated to a segment of the key space, and ensures that every peer it contains belongs to this segment.

One of the most critical algorithm of the routing table is to return the closest peers form a given target key of the space. This routine is performed by retrieving peers from the bucket in charge of the range which contains the target key. If this bucket does not hold enough peers, the search is reiterated in its neighbors.

#### Bucket splitting

An interesting algorithm of the routing table is how it generates new buckets. When first instantiated, the routing table contains only one bucket which range includes the whole key space ]2<sup>0</sup>, 2<sup>n</sup>]. When this bucket is full, it is split into two buckets of range ]2<sup>0</sup>, 2<sup>n-1</sup>] and ]2<sup>n-1</sup>, 2<sup>n</sup>]. Peers are then reorganized between the two buckets.

![Split process](images/split.png)

This process is performed every time a new peer is added to the full and smallest ranged bucket (i.e. the only splittable one). If a new peer is added to a full and non-splittable bucket, its least recently seen peer is removed and this new peer is added.

#### Refresh process

The routing table is also responsible of the *refresh* process which occurs when a bucket has not seen any new peer for a long period of time. Each bucket manages its own timer, reseted every time a peer is added to it. The value of this timer is each time randomly chosen in a window around a configured value. This prevent a burst of network activity when multiple buckets have synchronized timers, caused e.g. by simultaneous instantiations of buckets during a [join](#join) process.

Using timers in Javascript is made easy thanks to the global functions `setTimeout` and `setInterval`. These allow to rely on the underlying VM to handle timers and the execution of closures during the flow of events.

Note that the logic of the this *refresh* process is not implemented inside of the routing table object since it only involves network routines. In fact the routing table only emit a *refresh* event, caught and executed in the [Node](#node) object.

### Value Management

The value management is responsible for managing key/values that the node has to store. It provides methods to *save*, *retrieve* and *remove* them, but it is also responsible for managing the associated timers. Indeed, in our implementation, two timers for each key/value are used:

  - *republish*: to ensure the persistent of a key/value, the [original paper][kad_paper] requires that key/values are periodically republished. To apply to this, a republish timer is set for each saved key/value (and reset if re-saved). When one of this timer timeouts, a *republish* event is emitted and caught by [Node](#node) that is in charge to republish the concerned value. 

  - *expiration*: when a key/value is published, an expiration date is associated to it before spread on the network. This ensure that it will not neither present nor republished on the network after this date. Thus, when saving, an expiration timer should be set according to the expiration date to plan the deletion of the key/value.

Since during an *[iterativeStore](#iterative-store)* process a key/value is stored on several nodes roughly at the same time, the republish timers might be synchronized across the network. This can lead to periodic bursts of activity. To avoid this *[convoy effect][convoy]*, each timeout value is randomly chosen in a window around a configuration value. Thus, the first triggered republish cancels most of the other ones on the network, minimizing the number of republish processes.

[convoy]: http://xlattice.sourceforge.net/components/protocol/kademlia/specs.html#convoys

#### Persistent storage

To improve DHT consistency, it would be convenient to retain the keys/values collection when session stops and to recover it when the session restarts. This would limit the loss of data redundancy due to node departures. 

Since our implementation targets browser environments, writing in a file on the hard drive is not an option. However the DOM (Document Object Model) implementations provide two kinds of persistent [offline storage][off_stor]. Among them *[cookies][]* are the oldest one. But we focused on the recent *[localstorage]* html5 feature, which bring along greater capacity and simplicity.

To leverage *localstorage* we use the [lawnchair] library which optimizes its use and provides a simplified API. Besides, whenever *localstorage* is not supported by a device, it will attempt to switch to a more common storage technique.

In the *localstorage*, the key/value collection is associated to a session identified by the couple node address / node ID. During the initialization, it checks if a previous session has been retained in the *localstorage*. The session recovery process consists in resetting the timers for each key/value and remove those which have expired during the session inactivity.

However, since our implementations aims at running in DOM independent environments such as [node.js](#node.js), we implemented a `BasicStorage` that replaces [lawnchair] behind the same interface. This storage is, for the time being, non persistent since it is little more than a Javascript key/value object. But we could easily work out a persistent one, relying on a key-value database such as [redis][].

[off_stor]: https://developer.mozilla.org/en/DOM/Storage
[cookies]: http://www.ietf.org/rfc/rfc2965
[localstorage]: http://dev.w3.org/html5/webstorage/#the-localstorage-attribute
[lawnchair]: http://westcoastlogic.com/lawnchair/
[redis]: http://redis.io/

### Node

The `Node` object is the place where the three main parts – *Routing Table*, *Value Management* and *Reactor* – are glued together. This part is actually where the Kademlia logic is implemented. Since it uses the abstraction of the other parts, focusing on the Kademlia logic is easy and it is highly *hackable* to test variants.

#### Iterative lookup

An important part of *Node* is the `iterativeLookup` object that embodies the iterative lookup algorithm in a [deferred](#deferred_objects) way.

Since the [original paper][kad_paper] is a bit ambiguous regarding to the implementation of the algorithm, we developed different versions of it ([v1](https://gist.github.com/1561850) and [v2](https://gist.github.com/1555907)), based on the understanding from both of us. Both implementations take advantage of the high level API of the *Reactor* and the utility methods of our structures object `Peer` and `XORSortedPeerArray`, making the code clear despite the complexity of this algorithm.

The `iterativeLookup` object is then used in different iterative research processes :

  - `iterativeFindNode`: aims at finding a peer on the network knowing its ID. It uses the *find node* RPCs.
  - `iterativeFindValue`: aims at finding a value on the network knowing the associated key. It uses the *find value* RPCs.
  - `join`: uses the `iterativeFindNode` on its own node ID to populate the routing table at the beginning of a session
  - `iterativeStore`: aims at publishing a value on the network. It finds the peers responsible for storing a key/value thanks to `iterativeFindValue` and send them *store* RPCs


#### Public API

Since *Node* is the central parts of our implementation, it exposes the public API.

```js
node = new KadOH.Node(id, options)
```

This is how instantiate a Node where `id` is the desired node ID and `options` a set of initialization options such as JabberID and password to connect to XMPP service or the addresses of the bootstraps.

```js
node.connect();
node.once('connected', function() {
  node.join();
});
```

When the `connect` method is called, the [transport](#transport) connects. Once connected the `join` method shall be called to start a join process with the bootstraps as first contacts.

Two methods are available to interact with values on the network :

  - the `put` method allows to publish a value on the network associated to the given key :
  
```js
node.put('0beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33', 'Hello world !');
```

  - the `get` method allows to retrieve a value on the network given the associated key :

```js
node.get('62cdb7020ff920e5aa642c3d4066950dd1f01f4d', function(value) {
  alert(value);
});
```

#### Bootstrap

To join a DHT, a node shall know some peers that are already connected to the DHT. These are called *bootstraps* and are often publicly known dedicated nodes.

In the optic to [simulate](#dht-simulation) our DHT implementation, we needed the same kind of dedicated nodes. We also created a `Bootstrap` object which is a simplification of `Node` since it gets rid of the `Value Management` and the `Routing Table`. This simplification is a way of optimizing the system for this specific use and to be less susceptible to crashes due to bugs.

`Bootstrap` has a simple `PeerArray` instead of a complete `RoutingTable` and responses only to *ping* and to *find node* RPCs by picking random peers in this array.

# Development Process

Many tools and techniques have helped us to improve our productivity and efficiency of coding. They have had a great influence on our ways of thinking the project and coming up with new ideas.

All these tools come from the *Open Source* community. Also, we think it is important to express how did we use them and sometimes help their development.

## Node.js


We quickly realized the necessity of developing both client-side and server-side programs to test our implementation. We also chose to use Javascript in all our technology stack to simplify the development. [Node.js](http://nodejs.org/) is a server-side Javascript execution environment that perfectly fitted our need, and even anticipated the future ones.

> Node.js is a platform built on Chrome's JavaScript runtime for easily building fast, scalable network applications. Node.js uses an event-driven, non-blocking I/O model that makes it lightweight and efficient, perfect for data-intensive real-time applications that run across distributed devices. <small>nodejs.org</small>

Node.js is an open-source project, heavily supported by the community. It is especially rich of the great number of [modules](https://github.com/joyent/node/wiki/modules) that are built on top of each others according to the Unix philosophy : *make each program do one thing well*. We have used and combined plenty of them and our implementation is also built as a reusable node.js module.

As a consequence, we made sure that our implementation is able to run in node.js even if some environment specific parts ([transport](#transport) and [persistent storage](#persistent-storage)) shall be replaced. As work proceeds, we were reinforced in the idea that this feature is a strength for our implementation.

## Git and Github

Because we've worked both on the same code, we have had an extensive use of the version control system *[Git][git]*. More than a simple security for our code history, *Git*'s utilities brought us good coding practices :

  - *branching* for the refactor of critical parts of the code
  - tracking regressions with the *[git-bisect]* tool to automatically detect a commit to blame
  - *stashing* the current working directory for quick bug fixes
  - easy way to deploy parts of the application

The [common repository][repo] is hosted on the *[Github][github]* platform which as been a decisive tool to improve our work quality. The main interest of this website is to bring a social aspect to *Git* and as a result an improved communication in a development team.

The ability to easily proofread the code posted by each other and to [post comments line by line][discussion] enabled us to discuss and agree on every aspect of the implementation. *Milestones* and *issues* were also great tools to schedule our development process in key stages.

[git]: http://git-scm.com
[git-bisect]: http://www.kernel.org/pub/software/scm/git/docs/git-bisect.html
[repo]: https://github.com/jinroh/kadoh
[github]: https://github.com
[discussion]: https://github.com/jinroh/kadoh/commit/4f058a051caa57a0b4f389227e04679116205c72#L0R124

## Testing

- Unit testing
- Behavior Driven Development

## Misc

- code quality tool : JsLint
- embedded documentation
- build tools to assembles (mignify also)
- debugging tools : Chrome inspector, designed UI

![UI screenshot](images/UI.png)

# Evaluation

One of the main difficulty when implementing a distributed application like DHTs is to test the proper functioning of the system. We established two practical ways for analyzing the behavior of our application in *real* cases : connecting to an existing DHT (*Mainline*) and launching our own DHT using the power of cloud computing.

## Testing process

### Mainline DHT

The *[Mainline DHT][mainline]* is an implementation of the Kademlia protocol for the *BitTorrent* network. This DHT aims at replacing tracker servers to decentralize the network. It is one the biggest running DHT with more multiple millions of connected peers. 

Communication between peers is done through UDP and is encoded in the *[bencode]* format specific to *BitTorrent* messages. To connect to this DHT, we designed a small proxy in Javascript, running in node.js. This proxy translates our JSON-RPC messages sent through WebSocket to the corresponding *Mainline* message [bencoded][bencode.js] in a UDP packet.

![debug iterative](images/iterative.png)

Early in our development progress, this achievement made possible to measure the efficiency of our lookup and join processes. With a little graphical tool, we were able to dissect our iterative lookups and deeply analyze each steps of the operation. This is how we designed several algorithms and compare their efficiency regarding their number of queries and the deepness of their results.

[mainline]: http://www.bittorrent.org/beps/bep_0005.html
[bencode]: http://www.bittorrent.org/beps/bep_0003.html
[bencode.js]: https://github.com/a2800276/bencode.js

### DHT Simulation

Connecting to existing DHTs was not sufficient to prove the good functioning of our implementation. Indeed, these networks use their own algorithms and aren't built on top of XMPP. To face this problem, we had to find a way to launch a DHTs *from scratch*. Our requirements were to have access to an important power of calculation and to distribute our node instances on different places to have a realist simulation.

We decided to run controlled instances of our implementation, called *bots*, on node.js VMs. This has many advantages since node VMs are much lighter than browsers – they use around 30MB of memory – and embed only the Javascript engine. Moreover, the node.js framework allows the use of process and implement a *forking* system.

Bots are designed to make random activity on the network to generate noise. They search and store predetermined value following a *[poisson process][poisson]*. They also disconnect and reconnect at random times to mimic stale peers.

To make them connecting and joining the DHT, we use spawning pools which are individual node.js processes. Each pool instantiates iteratively 30 bots following a *poisson process*. When all bots are launched, the pool *forks* itself and a new spawning process is started.

![EC2](images/ec2.png)

To have an efficient power of calculation, we have been able to use [Amazon EC2][ec2] instances. We ran up to 3 *huge* instances to run 4000 bots. Because we didn't want to spam community servers, we dedicated a medium instance attached to an elastic IP to run our own XMPP Server using [ejabberd].

[poisson]: http://en.wikipedia.org/wiki/Poisson_process
[ec2]: http://aws.amazon.com/
[ejabberd]: http://www.ejabberd.im/

## Results

# Future work

- Pending features : session recovery, ...
- Issues
- Applications

[kad_paper]: http://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf "Kademlia: A Peer-to-Peer Information System Based on the XOR Metric, Petar Maymounkov and David Mazières, 2002"

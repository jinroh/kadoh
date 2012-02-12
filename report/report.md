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

### Routing table

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

We decided to use Javascript because it has many advantages to develop network oriented mobile applications :

- facilitates cross platform applications because of the youth and freshness of most smartphone browsers
- applications can be both distributed as native applications or as web pages discharging the costs of installations, upgrades or controls from third parties
- event-driven language with closures, no need for event loops or additional framework, and single threaded from the programmer point of view
- fairly efficient thanks to great improvements towards most Javascript Virtual Machines all available on mobiles (V8, JägerMonkey, Nitro, ...)
- runs both on mobile or desktop browsers, and in theory on any framework based on a Javascript VM like node.js for instance

## The transport layer

The main difficulty with an in-browser Javascript is the impossibility to open a socket to listen to incoming connections. In fact, nowadays, browsers can only send HTTP requests to a given server. We had to find solutions to keep our DHT decentralized and still relying on a server to proxy our requests.

Note that other DHT implementations have the same kind of issue when [receiving incoming packets behind a NAT][connectivity]. For the particular case of mobile-phone application, this is even true since radio-mobile networks are strongly restricted towards incoming connections. Softwares have to use different kind of techniques that also involve critical points in the DHT to get around the NAT, like *supernodes*.

First, we developed a little proxy to route requests between peers. We thought about semi-decentralized systems where proxies could route messages between each other through UDP or TCP channels. The main drawback is that we wanted the application to depend on an existing, distributed and scalable infrastructure.

This is why we chose the XMPP protocol which meets most of our constraints. XMPP is a widely used open standard to exchange XML based messages between peers. Even though XMPP has a client-server architecture, it is decentralized thanks to its open protocol and server to server communications. Moreover, many XMPP servers are freely available over the Internet, and this protocol is used by large instant messaging servers, like *Google Talk* or *Jabber.org*.

The XMPP protocol uses a stateful TCP channel to connect server with clients. But, thanks to the [BOSH] — *Bidirectional-streams Over Synchronous HTTP* — extension, it becomes possible to connect any browser to an XMPP server through synchronous HTTP requests.

![Decentralized XMPP](images/bosh.png)

We based our XMPP transport on [Strophe.js]. This library is the main reference to perform real-time XMPP applications over BOSH in browsers. It is well documented and has a good support from the community.

Nevertheless, thanks to the [modular architecture](#architecture) of the application, we implemented several other transports, such as UDP – only with [Node.js](#node.js) – and WebSocket. This has been convenient to test the efficiency of the DHT on different networks. For instance we have been able to [join the Mainline DHT](#mainline-dht) through a WebSocket to UDP proxy.

[connectivity]:http://people.kth.se/~rauljc/p2p09/jimenez2009connectivity.pdf "Connectivity Properties of Mainline BitTorrent DHT Nodes"
[BOSH]:http://xmpp.org/extensions/xep-0124.html "XEP-0124: Bidirectional-streams Over Synchronous HTTP (BOSH)"
[Strophe.js]: http://strophe.im/strophejs/ "An XMPP library for JavaScript"

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

> Promises provide a well-defined interface for interacting with an object that represents the result of an action that is performed asynchronously, and may or may not be finished at any given point in time.

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

![Class diagram](images/class_diagram.png)

### Reactor and RPC Objects

![Reactor, communication diagram](images/reactor.png)

### Routing Table

The routing table is responsible for managing peers. It is composed of all the k-buckets. Most parts of this object are implemented in a standard fashion regarding other Kademlia implementations.

The `KBucket` class extends `PeerArray` and implements additional functions to handle a range. Indeed, every bucket is associated to a segment of the key space, and ensures that every peer it contains belongs to this segment. Also it will throw an error whenever a peer is added while it is full

One of the most critical algorithm of the routing table is to return the closest peers form a given target key of the space. This routine is performed by retrieving peers from the bucket in charge of the range which contains the target key. If this bucket does not hold enough peers, the search is reiterated in its neighbors.

#### Bucket splitting

An interesting algorithm of the routing table is how it generates new buckets. When first instantiated, the routing table contains only one k-bucket which range included the whole key space ]2<sup>0</sup>, 2<sup>n</sup>]. When this k-bucket is full, the routing split it into two buckets : it generates a new one of range ]2<sup>0</sup>, 2<sup>n-1</sup>] and modify the minimum value of the old k-bucket to 2<sup>n-1</sup>. Peers are then reorganized in the new bucket if necessary.

![Split process](images/split.png)

This process is performed every time the smallest ranged bucket (the only splittable one) becomes full. If a new peer is added to a full and non-splittable bucket, the least recently seen peer is removed and the new peer is added.

#### Refresh process

The routing table is also responsible of the *refresh* process which occurs when a bucket has not seen any new peer for a long period of time. Each bucket manages its own timer, reseted every time a peer is added to it. The value of this timer is each time randomly chosen in a window around a configured value. This prevent a burst of network activity when multiple buckets have synchronized timers, caused e.g. by simultaneous instantiations of k-buckets during a [join](#join) process.

Note that the logic of the this process is not implemented inside of the routing table object since it only involves network routines. In fact the routing table only emit a *refresh* event, caught by the [Node](#node) object.

### Value Management

The value management is responsible for managing key/values that the node has to store. It provides methods to *save*, *retrieve* and *remove* them, but it is also responsible for managing the associated timers. Indeed, in our implementation, two timers for each key/value are used:

  - *republish*: to ensure the persistent of a key/value, the [original paper][kad_paper] requires that key/values are periodically republished. To apply to this, a republish timer is set for each saved key/value (and reset if re-saved). When one of this timer timeouts, a *republish* event is emitted and caught by [Node](#node) that is in charge to republish the concerned value. 

  - *expiration*: when a key/value is published, an expiration date is associated to it before spread on the network. This ensure that it will not neither present nor republished on the network after this date. Thus, when saving, an expiration timer should be set according to the expiration date to plan the deletion of the key/value.

Since during an *[iterativeStore](#iterative_store)* process a key/value is stored on several nodes roughly at the same time, the republish timers might be synchronized across the network. This can lead to periodic bursts of activity. To avoid this *[convoy effect][convoy]*, each timeout value is randomly chosen in a window around a configuration value. Thus, the first triggered republish cancels most of the other ones on the network, minimizing the number of republish processes.

[convoy]: http://xlattice.sourceforge.net/components/protocol/kademlia/specs.html#convoys

#### Persistent storage

To improve DHT consistency, it would be convenient to store the key/values collection when session stops and to recover it when the session restart. This would limit the loss of data redundancy due to node departures. 

Since our implementation targets browser environment, there is no mean to write directly in a file on the hard drive as it would have been simply done on a natively running implementation. However the DOM (Document Object Model) implementations provide two kinds of persistent [offline storage][off_stor]. Among them *[cookies][]* is the oldest one. But the one on which we focused is the *[localstorage][]*, part of the html5 new features, since he has an enhanced capacity.

To leverage *localstorage* we decided to use [lawnchair][] which optimizes its use and provides a simple API over it. Moreover it masks the use of other *tricks* when *localstorage* is not available.

Thus, in the browser, the value management is actually backed by [lawnchair][] that ensures a persistent storage. In the *localstorage* data, the key/values collection is associated to the running session (identified by the couple node address/ node ID). On the initialization, it checks in the *localstorage* data if a corresponding session can be recovered. The sessions recover process consists in reseting the timers for each key/value and remove those that would have expired during the session inactivity.

However, since our implementations aims to run in DOM independent environment such as [node.js](#node.js), we have implemented a `BasicStorage` that replaces [lawnchair][] by  imitating its API. This storage is for the moment non persistent, since this is little more than a Javascript key-value object, but we can easily imagine a persistent one leveraging a key-value database such as [redis][].

[off_stor]: https://developer.mozilla.org/en/DOM/Storage
[cookies]: http://www.ietf.org/rfc/rfc2965
[localstorage]: http://dev.w3.org/html5/webstorage/#the-localstorage-attribute
[lawnchair]: http://westcoastlogic.com/lawnchair/
[redis]: http://redis.io/

### Node

- Public API
- Iterative processes
- Dumb version : Bootstrap

# Development Process

Many tools and techniques have helped us to improve our productivity and efficiency of coding.  Most of these come from the *Open Source* community. 

We think it is important to express how we used these tools and in what way have we tried sometimes to help their development.

## Node.js

> Node.js is a platform built on Chrome's JavaScript runtime for easily building fast, scalable network applications. Node.js uses an event-driven, non-blocking I/O model that makes it lightweight and efficient, perfect for data-intensive real-time applications that run across distributed devices.

## Git and Github

Because we've worked both on the same code, we used Git as a version control and .

[Git][git] 

The common repository is hosted on [Github.com][github] platform where  

[git]: http://git-scm.com
[github]: https://github.com

## Testing

- Unit testing
- Behavior Driven Development

#### Misc

- code quality tool : JsLint
- embedded documentation
- build tools to assembles (mignify also)
- debugging tools : Chrome inspector, designed UI


# Evaluation

- present the process and issues
- show results and discuss them

# Future work

- Issues + Future work
- Applications

[kad_paper]: http://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf "Kademlia: A Peer-to-Peer Information System Based on the XOR Metric, Petar Maymounkov and David Mazières, 2002"

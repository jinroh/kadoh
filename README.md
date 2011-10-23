# KadOH
The aim of this project is to write an implementation of the Kad system running in a browser environnement and especially in a mobile browser.

## Why is this challenging ? ##

Kad is a _peer to peer_ system. That means that nodes (or peers) need to communicate directly to each other. The browser is not at all originally ready for P2P communications : it's based on a _server-client_ communication scheme. As client, the browser can retrieve information from the server, but the reverse path is not easy.

One of our challenge is to design a mean to enable a communicaton as direct as possible between mobile nodes.

## What helps us ? ##

We needed a Kad protocol as near as possible from the javascript language. We found [TeleHash](http://telehash.org/) which is a Kademlia (draft)protocol with the JSON syntax embedded in an UDP packet. We plan to write an implementation of it in Javascript but without dealing with UDP because we work on top of HTTP.

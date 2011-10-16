# Local management 

## Routing table
- Datas : list of k-buckets
- addPeer(peer)
- removePeer(peer)
- findClosestPeers(key)

## K-bucket
- Datas : range-min, range-max, the k (or less) peers
- addPeer(peer)
- removePeer(peer)
- isKeyInRange(key)
- getPeers()

## Peer
- Datas : ip:port, key, // *last-checked*

# RPC functions

## Protocol 
use the methode send from Reactor and deals with Timeouts
- ping("ip_port", callback(error, data));
- findNode("ip_port", key, callback(nodes));
- // findValue
- // store
- handleRPCQuery(query, res);
	- _remotePing();
	- _remoteFindNode();

## Reactor
- sendRPCQuery("ip_port", msg, function(error, responsemsg)) ;
- listenRPCQuery(handleRPCquery(query, res));

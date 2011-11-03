# Local management 

## RoutingTable

Handle the list of KBuckets

- `addPeer(peer)`
- `removePeer(peer)`
- `findClosestPeers(key)`

## KBucket

- Datas : range-min, range-max, the k (or less) peers
- `addPeer(peer)`
- `removePeer(peer)`
- `isKeyInRange(key)`
- `getPeers()`

## Peer
- Datas : ip:port, key, // *last-checked*

# RPC functions

## Protocol 

Abstract class to handle RPC messages (for instance in JSON-RPC or XML-RPC)

Static function :

- `buildRequest(request_name, params)` returns a valid `RPCMessage` object 
- `buildRequest(raw_data)`

Public API of `RPCMessage` :

- `setRPCID(id)`
- `stringify()`
- `isResponse()`
- `isRequest()`
- `isError()`
- `getMethod()`
- `getType()` ('method', 'response' or 'error') 
- `getParams()` (`[param1, param2, ...]`)
- `getRPCID()`
- `getError()` (`{code: -32601, message: 'Parse Error.'}`)

## Reactor

Maintains a list of `Deferreds` objects

Public API to send RPCs :

- `PING(dst)`
- `FIND_NODE(id)`
- `sendRPC(id, deffered, message)`

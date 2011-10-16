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

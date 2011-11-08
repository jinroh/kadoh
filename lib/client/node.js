// Dep: [KadOH]/core/class
// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/routingtable
// Dep: [KadOH]/reactor
// Dep: [KadOH]/util/bind
// Dep: [KadOH]/util/crypto

(function(exports) {
  
  var KadOH = exports;
  var globals = KadOH.globals;
  var Class = KadOH.core.Class;
  var Crypto = KadOH.util.Crypto;
  var Peer = KadOH.Peer;
  var RoutingTable = KadOH.RoutingTable;
  var Reactor = KadOH.Reactor;
  var bind = KadOH.util.bind;

  KadOH.Node = Class({

    initialize: function(ip, port, bootstraps, id) {
      this._ip = ip;
      this._port = parseInt(port, 10);
      
      if (typeof id === 'undefined') {
        this._id = this._generateId();
      } else {
        this._id = id;
      }
      
      // adding the reactor for network purposes
      this._reactor = new Reactor(this);
      
      // adding the default routing table
      this._routing_table = new RoutingTable(this);
    },
    
    // Network functions
    
    join: function(bootstraps) {
      if (typeof bootstraps === 'undefined' || bootstraps.length <= 0) {
        throw new Error('No bootstrap to join the network');
      }
      
      for (var i=0; i < bootstraps.length; i++) {
        this._routing_table.addPeer(new Peer(bootstraps[i]));
      }
      
      return this.iterativeFindNode(this.getId());
    },
    
    /**
     * Iterative lookup used by kademlia
     * See /doc papers for informations the loose parallelism
     * used in this implementations
     * @param  {String} id Identifier of the peer or objects
     * @return {Promise} 
     */
    _iterativeFind: function(id) {
      var compare, number, my_id, reached, reactor, reduce, requests, response, peers, seen;
      response = when.defer();
      reactor = this.reactor();
      
      // maximum number of requests to do
      number = globals._alpha;
      
      // list of already seen peers
      seen = this._routing_table.getClosePeers(this.getId(), number);
      
      // sort the seen array by distance
      my_id = this._id;
      compare = Crypto.comparableXOR;
      seen.sort(function(a, b) {
        a = Crypto.XOR(a.getId(), my_id);
        b = Crypto.XOR(b.getId(), my_id);
        return compare(a, b);
      });
      
      // when the request resolved :
      //  - append the requested peer to the reached list
      //  - update the seen list
      //  - sort the seen list by distance
      //  - append new requests to the closest & unreach peers
      var callback = function(new_peers) {
        reached.push(this.getDST());
        
        // converts triples to Peer objects
        new_peers = new_peers.map(function(triple) {
          return new Peer(triple);
        })
        // get rid of already seen peers
        .filter(function(new_peer) {
          return seen.every(function(old_peer) {
            return !(new_peer.equals(old_peer));
          });
        });

        // add the new peers to the seen array using
        // insertion sort since the array is already sorted
        var i=0, j=0;
        for (i=0; i < new_peers.length; i++) {
          new_peer_xor = Crypto.XOR(new_peers[i].getId(), my_id);
          do {
            seen_peer_xor = Crypto.XOR(seen[j].getId(), my_id);
            j++;
          } while(compare(new_peer_xor, seen_peer_xor) >= 0);
          seen.splice(j, 0, new_peers[i]);
        }

        // stop the process if: 
        //  - no new peers in the result
        //  - we accumulated enough peers
        //  - we found the searched id
        found = new_peers.some(function(peer) {
          return peer.getId() === id;
        });

        if (new_peers.length === 0 ||
            seen.length >= globals._k ||
            found) {
          try {
            reponse.resolve(seen);
          }
          catch(e) {}
          return;
        }
        
        // take the alpha closest and unreached peers
        var unreach_closest_peers = seen.splice(0, number).filter(function(close_peer) {
          return reached.every(function(reached_peer) {
            return !(close_peer.equals(reached_peer));
          });
        });
        
        // send new requests to these peers and append
        // them into the list of requests
        var new_requests = reactor.sendRPCs(unreach_closest_peers, 'FIND_NODE', [id]);
        requests.push(new_requests);
        
        new_requests.forEach(function(request) {
          addCallbacks(request);
        });
        
        // delete the this request object
        requests.splice(requests.indexOf(this), 1);
      };
      
      // if the request is rejected, only append 
      // the requested peer to the reached list
      // and remove it from the seen list
      var errback = function() {
        reached.push(this.getDST());

        var seen_index = seen.indexOf(this); 
        if (seen_index !== -1) {
          seen.splice(seen_index, 1);
        }

        // delete the request object
        requests.splice(requests.indexOf(this), 1);
      };
      
      var addCallbacks = function(rpc) {
        rpc.then(callback, errback);
        
        //bind callbacks to the RPC object
        bind(callback, rpc);
        bind(errback, rpc);
      };
      
      // list of current requests
      requests = reactor.sendRPCs(peers, 'FIND_NODE', [id]);
      requests.forEach(function(request) {
        addCallbacks(request);
      });

      return response.promise;
    },
    
    iterativeFindNode: function(id) {
      return this._iterativeFind(id);
    },
    
    // RPCs
    // These function may return promises

    /**
     * PING
     */
    PING: function(sender_socket) {
      return 'PONG';
    },
    
    /**
     * FIND_NODE
     */
    FIND_NODE: function(id, sender_socket) {
      var sender = new Peer(sender_socket);
      
      // retrieve the _beta closest peer to the id
      // exclude the id of the requestor
      var close_peers = this._routing_table.getClosePeers(id, globals._beta, [sender.getId()]);
      
      // map the close peers to return only their triple
      return close_peers.map(function(peer) {
        return peer.getTriple();
      });
    },
    
    // Getters
    
    reactor: function() {
      return this._reactor;
    },
    
    getTriple: function() {
      return [this._ip, this._port, this._id];
    },
    
    getSocket: function() {
      return this._ip + ':' + this._port;
    },
    
    getId: function() {
      return this._id;
    },
    
    getID: function() {
      return this.getId();
    },
    
    // Private

    _generateId: function() {
      return globals._digest(this.getSocket());
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));

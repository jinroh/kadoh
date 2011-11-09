// Dep: [KadOH]/core/class
// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/reactor
// Dep: [KadOH]/routingtable
// Dep: [KadOH]/util/bind
// Dep: [KadOH]/util/crypto

(function(exports) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  var globals = KadOH.globals;
  var Peer = KadOH.Peer;
  var Reactor = KadOH.Reactor;
  var RoutingTable = KadOH.RoutingTable;
  var bind = KadOH.util.bind;
  var Crypto = KadOH.util.Crypto;

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
      var compare, k, new_closest, number, my_id,
          reached, reactor, requests, response, seen, trap;
      
      response = when.defer();
      reactor = this.reactor();
      
      // maximum number of requests to do
      number = globals._alpha;
      k = globals._k;
      new_closest = false;
      
      // list of ALL peers you heard of (unreached, reached or trap)
      seen = this._routing_table.getClosePeers(this.getId(), number);
      // list of successfully reached peers
      reached = [];
      // list of peers who have timed-out
      trap = [];
      
      // sort the seen array by distance
      my_id = this._id;
      compare = Crypto.comparableXOR;
      seen.sort(function(a, b) {
        a = Crypto.XOR(a.getId(), my_id);
        b = Crypto.XOR(b.getId(), my_id);
        return compare(a, b);
      });
      
      // Callback when a request resolved :
      //  - append the resolved peer to the reached list
      //  - stop the process when k peers have been reached
      //  - update the seen list
      //  - sort the seen list by distance
      //  - append new requests to the closest & unreach peers
      var callback = function(new_peers) {
        var unreach_closest_peers, new_requests;

        reached.push(this.getDST());
        // remove this request object from the requests
        requests.splice(requests.indexOf(this), 1);

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
        // insertion sort since this array is already sorted
        // and note wether or not the closest peer has changed
        var i=0, j=-1;
        for (; i < new_peers.length; i++) {
          new_peer_xor = Crypto.XOR(new_peers[i].getId(), my_id);
          
          do {
            j++;
            seen_peer_xor = Crypto.XOR(seen[j+1].getId(), my_id);
          } while(compare(new_peer_xor, seen_peer_xor) >= 0 && j < seen.length);

          seen.splice(j, 0, new_peers[i]);
          if (j === 0) {
            new_closest = true;
          }
        }

        // if we accumulated k reached peers,
        // and the closest peer has not changed
        // STOP the process and RESOLVE the response
        if (!new_closest && reached.length >= globals._k) {
          try {
            reponse.resolve(reached);
          }
          catch(e) {}
        }
        else {
          // if the closest peer has not changed
          // and there is no more request pending,
          // send requests to k unreached (and non trap) peers
          if (!new_closest && requests.length === 0) {
            number = k;
          }

          // take the alpha (or k) closest and unreached (non-trap) peers
          unreach_closest_peers = seen.slice(0, number).filter(function(close_peer) {
            return reached.concat(trap).every(function(reached_peer) {
              return !(close_peer.equals(reached_peer));
            });
          });

          if (unreach_closest_peers.length === 0) {
            
          }
          
          // send new requests to these peers and append
          // them into the list of requests
          new_requests = reactor.sendRPCs(unreach_closest_peers, 'FIND_NODE', [id]);
          requests.push(new_requests);
          
          new_requests.forEach(function(request) {
            addCallbacks(request);
          });
        }
      };
      
      // if the request is rejected, only append 
      // the requested peer to the trap list
      var errback = function() {
        trap.push(this.getDST());

        // remove this request object from the requests
        requests.splice(requests.indexOf(this), 1);
      };
      
      var addCallbacks = function(rpc) {
        rpc.then(callback, errback);
        
        //bind callbacks to the RPC object
        bind(callback, rpc);
        bind(errback, rpc);
      };
      
      // list of current requests
      requests = reactor.sendRPCs(seen, 'FIND_NODE', [id]);
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

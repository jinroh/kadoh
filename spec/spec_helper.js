(function() {
  beforeEach(function() {
    KadOH = (typeof require === 'function') ? require('../dist/KadOH.node.js') : KadOH;
    
    KadOH.log.removeAllLoggers();
    
    this.addMatchers({
      toBeObject: function() {
        return typeof(this.actual) === 'object';
      },
      toBeString: function() {
        return typeof(this.actual) === 'string';
      },
      toBeNumber: function() {
        return typeof(this.actual) === 'number';
      },
      toBeFunction: function() {
        return typeof(this.actual) === 'function';
      },
      toBeArray: function() {
        if (typeof Array.isArray === 'function') {
          return Array.isArray(this.actual);
        } else {
          return Object.prototype.toString.call(this.actual) === '[object Array]';
        }
      },
      toBeUnique: function() {
        return this.actual.length === undefined || this.actual.length === 1;
      },
      toBeDefined: function() {
        return typeof(this.actual) !== 'undefined';
      },
      toBeAscSorted: function() {
        var compare = function(a, b) {
          return a - b;
        };

        for (var i=0, l=this.actual.length; i < l-1; i++) {
          if (compare(this.actual[i], this.actual[i+1]) > 0)
            return false;
        }
        return true;
      },
      toBeDescSorted: function() {
        var compare = function(a, b) {
          return a - b;
        };

        for (var i=0, l=this.actual.length; i < l-1; i++) {
          if (compare(this.actual[i], this.actual[i+1]) < 0)
            return false;
        }
        return true;
      },
      toBeInstanceof: function(expected) {
        return(this.actual instanceof expected);
      }
    });
  });

  var self = this;
  Factory = {
    distance: function(id, distance) {
      if (distance === 0) {
        return id;
      }
      
      var bytes = KadOH.util.Crypto.hexToBytes(id);

      var index = Math.floor(bytes.length - distance/8);
      var shift = 7 - ((distance-1) % 8);
      
      bytes[index] = bytes[index] ^ (0xFF>>>shift);
      
      return KadOH.util.Crypto.bytesToHex(bytes);
    }
  };

  Dumb = {
    Node: {
      PING: function(){},
      FIND_NODE: function(){}
    },

    UDP: {
      listen: function(){},
      send: function(){}
    }
  };
})();

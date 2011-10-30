(function() {
  beforeEach(function () {
    this.addMatchers({
      toBeObject: function () {
        return typeof(this.actual) === 'object';
      },
      toBeString: function () {
        return typeof(this.actual) === 'string';
      },
      toBeInteger: function () {
        return typeof(this.actual) === 'integer';
      },
      toBeFunction: function () {
        return typeof(this.actual) === 'function';
      },
      toBeUnique: function () {
        return this.actual.length === undefined || this.actual.length === 1;
      },
      toExist: function () {
        return this.actual !== null;
      },
      toBeVisible: function () {
        return this.actual.offsetHeight !== 0 && this.actual.offsetWidth !== 0;
      }
    });
  });

  var self = this;
  Factory = {
    distance: function(id, distance) {
      if (distance === 0) {
        return id;
      }
      
      var KadOH = (typeof require === 'function') ? require('./dist/KadOH.js') : self.KadOH;

      var bytes = KadOH.util.Crypto.hexToBytes(id);
      var index = Math.floor((distance-1)/8);
      var shift = 7 - ((distance-1) % 8);
      
      bytes[index] = bytes[index] ^ (0xFF>>>shift);
      
      return KadOH.util.Crypto.bytesToHex(bytes);
    }
  };
})();

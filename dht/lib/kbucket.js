(function() {
  KBucket = function(min, max) {
    min = (typeof min === 'undefined') ? 0 : min;
    max = (typeof max === 'undefined') ? Math.pow(2, 160) : max;

    this._peers = {};
  };

  KBucket.prototype.idInRange = function(id) {
    
  }
})();
var KBucket = Class.create({
  
  initialize: function(min, max) {
    min = (typeof min === 'undefined') ? 0 : min;
    max = (typeof max === 'undefined') ? 160 : max;

    this._peers = {};
  },

  idInRange: function(id) {
  }
  
});

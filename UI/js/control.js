KadOHui = (typeof KadOHui !== 'undefined') ? KadOHui : {};

KadOHui.Control = function(node) {
  this.node = node;
  this.putBtn     = $("#put_btn");
  this.putValue   = $("#put_value");
  this.putResult  = $("#put_result");
  this.getBtn     = $("#get_btn");
  this.getValue   = $("#get_value");
  this.getResult  = $("#get_result");

  this.init_get()
      .init_put();
};

KadOHui.Control.prototype = {
  init_get: function() {
    var that = this;
    this.getBtn.click(function() {
      that.node.get(that.getValue.val(), function(value) {
        var text;
        if (value === null) {
          text = "value not found...";
        } else {
          text = value;
        }
        that.getResult.text(text);
      });
    });
    return this;
  },

  init_put: function() {
    var that = this;
    this.putBtn.click(function() {
      that.node.put(null, that.putValue.val(), null, function(key) {
        that.putResult.text("value stored with key " + key);
      });
    });
    return this;
  }
};
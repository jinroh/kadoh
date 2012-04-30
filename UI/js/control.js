KadOHui = (typeof KadOHui !== 'undefined') ? KadOHui : {};

KadOHui.Control = function(node) {
  this.node = node;
  this.joinBtn    = $("#join_btn").button();
  this.putBtn     = $("#put_btn").button();
  this.putValue   = $("#put_value");
  this.putKey     = $("#put_key");
  this.putResult  = $("#put_result");
  this.getBtn     = $("#get_btn").button();
  this.getKey     = $("#get_key");
  this.getResult  = $("#get_result");

  this.initJoin()
      .initGet()
      .initPut();
};

KadOHui.Control.prototype = {
  initJoin: function() {
    var that = this;
    var onJoin = function() {
      that.joinBtn.unbind('click', onJoin);
      that.joinBtn.button('loading');
      that.node.join(function() {
        that.joinBtn.button('complete').button('toggle');
      });
    };
    this.joinBtn.click(onJoin);
    return this;
  },

  initGet: function() {
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

  initPut: function() {
    var that = this;
    this.putBtn.click(function() {
      that.node.put(null, that.putValue.val(), null, function(key) {
        that.putResult.text("value stored with key " + key);
      });
    });
    return this;
  }
};
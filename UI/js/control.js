KadOHui = (typeof KadOHui !== 'undefined') ? KadOHui : {};

KadOHui.Control = function(node) {
  this.node = node;
  this.control = $("#control");

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
      if (!that._checkConnection()) {
        return;
      }
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
    var result = this.getResult;
    var loader = result.find('.loader');
    var content = result.find('.content');
    result.hide();
    var onGet = function() {
      if (!that._checkConnection()) {
        return;
      }
      that.getBtn.unbind('click', onGet)
                 .button('toggle');
      var key = that.getKey.val();
      content.hide();
      loader.show();
      result.show();
      that.node.get(key, function(value) {
        var text;
        if (!value) {
          text = '<strong>value not found for key <code>'+KadOHui.util.escapeHTML(key)+'</code></strong>';
        } else {
          text = value;
        }
        content.html('<h4>Result</h4><p>'+text+'</p>');
        loader.hide();
        content.show();
        that.getBtn.click(onGet)
                   .button('toggle');
      });
    };
    this.getBtn.click(onGet);
    return this;
  },

  initPut: function() {
    var that = this;
    var tbody = this.putResult.find('tbody');
    var onPut = function() {
      if (!that._checkConnection()) {
        return;
      }
      that.putBtn.unbind('click', onPut)
                 .button('toggle');
      var value = that.putValue.val();
      that.node.put(null, value, null, function(key) {
        tbody.append(
          "<tr>" +
          "<td><code>"+key+"</code></td>" +
          "<td>"+value.slice(0, 20)+(value.length > 20 ? "..." : "")+"</td>" +
          "</tr>");
        that.putBtn.click(onPut)
                   .button('toggle');
      });
    };
    this.putBtn.click(onPut);
    return this;
  },

  _checkConnection: function() {
    if (this.node.stateIsNot('connected')) {
      var alert = $('<div class="span6 offset3 alert alert-error">' +
        '<button class="close" data-dismiss="alert">×</button>' +
        '<strong>Warning!</strong> You need to be connected to perform this action.'+
      '</div>').alert();
      this.control.prepend(alert);
      return false;
    }
    return true;
  }
};
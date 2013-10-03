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

  this.pingBtn     = $("#ping_btn").button();
  this.pingAddress = $("#ping_address");
  this.pingResult  = $("#ping_result");

  this.initJoin()
      .initGet()
      .initPut()
      .initPing();
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
    var result = this.getResult;
    var loader = result.find('.loader');
    var content = result.find('.content');
    result.hide();
    var onGet = function() {
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

  initPing: function() {
    var that = this;
    var onPing = function() {
      that.pingBtn.unbind('click', onPing)
                  .button('toggle');
      that.pingResult.empty();
      var address = that.pingAddress.val();
      var peer = new (require('/lib/dht/bootstrap-peer'))(address);
      var ping = new (require('/lib/network/rpc/ping'))(peer);

      ping.then(function() {
        that.pingResult.html('<img src="/UI/img/success-icon24.png">'+
                             '<code>'+ping.getQueried().getID()+'</code>');
      }, function() {
        that.pingResult.html('<img src="/UI/img/error-icon24.png">');
      }).always(function() {
        that.pingBtn.click(onPing)
                    .button('toggle');
      });

      that.node._reactor.sendRPC(ping)
    };
    this.pingBtn.click(onPing);
    return this;
  },

};
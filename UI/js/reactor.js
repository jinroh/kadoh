KadOHui = (typeof KadOHui !== 'undefined') ? KadOHui : {};


KadOHui.Reactor = function(reactor, received, sent) {
  this.received = $(received);
  this.sent = $(sent);
  this.reactor  = reactor;
 
  this.reactor.on({
    queried  : this.addToReceived,
    querying : this.addToSent
  }, this);
};

KadOHui.Reactor.prototype = {

  addToReceived: function(rpc) {
    var param;
    var el = $(this._encodeRPC(rpc, false));
    rpc.then(function(){this._resolve(el);}, function(){this._reject(el);}, this); //debugger;
    this.received.prepend(el);
  },

  addToSent: function(rpc) {
    var param;
    var el = $(this._encodeRPC(rpc, true));
    rpc.then(function(){this._resolve(el);}, function(){this._reject(el);}, this); //debugger;
    this.sent.prepend(el);
  },

  _encodeRPC: function(rpc, sent) {
    var param = "";

    switch(rpc.getMethod()) {
      case 'PING':
        break;
      case 'FIND_NODE':
      case 'FIND_VALUE':
        param = '<a href="#" class="sha" data-placement="below" rel="twipsy" data-original-title="'+rpc.getTarget()+'">'+rpc.getTarget().slice(0,10)+'</a>';
        break;
      case 'STORE' :
        var code = [
          '<ul>',
            '<li><b>Key : </b><a href="#" class="sha" data-placement="below" rel="twipsy" data-original-title="'+rpc.getKey()+'">'+rpc.getKey().slice(0,10)+'</a></li>',
            '<li><b>Value : </b><code>'+rpc.getValue()+'</code></li>',
            '<li><b>Expiration : </b>',
                (rpc.getExpiration()<0) ?
                '<i>never</i>':
                '<time rel="twipsy" datetime="'+(new Date(rpc.getExpiration())).toISOString()+'" data-placement="below">'+(new Date(rpc.getExpiration()).toString())+'</time>',
            '</li>',
          '</ul>'].join('\n');
        param = '<a rel="popover" data-content="'+code+'" data-original-title="Params" data-placement="below">param</a>';
        break;
      default:
        break;
    }
    var node = (sent) ? rpc.getQueried() : rpc.getQuerying();
    return this._template(rpc.getID(), node.getAddress(), node.getID(),rpc.getMethod(), param);
  },

  _template: function(id, addr, nodeid, meth, param) {
    var time = new Date();

    var tr =
    ['<tr>',
      '<td>'+id+'</td>',
      '<td>',
        '<b>'+addr+'</b><br>',
        (nodeid !== null) ? '<a href="#" class="sha" data-placement="below" rel="twipsy" data-original-title="'+nodeid+'">'+nodeid.slice(0,10)+'</a>' : '<i>null</i>',
      '</td>',
      '<td><code>'+meth+'</code></td>',
      '<td>'+param+'</td>',
      '<td><span class="state label warning">Progress</span></td>',
      '<td><time rel="twipsy" datetime="'+time.toISOString()+'" data-placement="below">'+time.toLocaleTimeString()+'</time></td>',
    '</tr>'];

    return tr.join('\n');
  },

  _resolve: function(el,html) {
    el.find('.state').removeClass('warning')
                      .addClass('success')
                      .text('resolved');
    if(html)
      el.find('.state').attr('rel', 'popover')
                       .attr('data-original-title', 'Resolved')
                       .attr('data-placement', 'below')
                       .attr('data-content', html);
      
  },

  _reject: function(el, html) {
    el.find('.state').removeClass('warning')
                      .addClass('important')
                      .text('rejected');
    if(html)
      el.find('.state').attr('rel', 'popover')
                       .attr('data-original-title', 'Rejected')
                       .attr('data-placement', 'below')
                       .attr('data-content', html);
  }
};
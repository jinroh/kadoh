KadOHui = (typeof KadOHui !== 'undefined') ? KadOHui : {};


KadOHui.Reactor = function(reactor, received, sent) {
  this.received = $(received);
  this.sent = $(sent);
  this.reactor  = reactor;

  this.MAX = 50;
 
  this.reactor.on({
    queried  : this.addToReceived,
    querying : this.addToSent
  }, this);
};

KadOHui.Reactor.prototype = {

  addToReceived: function(rpc) {
    var param;
    var el = $(this._encodeRPC(rpc, false));
    rpc.then(function() {
      this._resolve(el, this._encodeResolveRes(rpc, arguments));
    }, function(e){this._reject(el, '<b style="color: red;">'+e.toString()+'</b>');}, this);

    if(this.received.children().length > this.MAX)
        this.received.children().last().remove();

    this.received.prepend(el);
  },

  addToSent: function(rpc) {
    var param;
    var el = $(this._encodeRPC(rpc, true));
    rpc.then(function() {
      this._resolve(el, this._encodeResolveRes(rpc, arguments));
      }, function(e){this._reject(el, '<b style="color: red;">'+e.toString()+'</b>');}, this);

    if(this.sent.children().length > this.MAX)
      this.sent.children().last().remove();

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
            '<li><b>Key : </b><a href=\'#\' class=\'sha\' data-placement=\'below\' rel=\'twipsy\' data-original-title=\''+rpc.getKey()+'\'>'+rpc.getKey().slice(0,10)+'</a></li>',
            '<li><b>Value : </b><code>'+rpc.getValue()+'</code></li>',
            '<li><b>Expiration : </b>',
                (rpc.getExpiration()<0) ?
                '<i>never</i>':
                '<time rel=\'twipsy\' datetime=\''+(new Date(rpc.getExpiration())).toISOString()+'\' data-placement=\'below\'>'+(new Date(rpc.getExpiration()).toString())+'</time>',
            '</li>',
          '</ul>'].join('\n');
        param = '<i><a rel="popover" data-content="'+code+'" data-original-title="Params" data-placement="below">params</a></i>';
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
      '<td><code>'+meth+'</code><br>'+param+'</td>',
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
  },

  _encodeResolveRes: function(rpc, args) {
    var html;

    //help
    function table(peers) {
      var html;
      html = '<table class=\'condensed-table zebra-striped\'>';
      peers.forEach(function(peer) {
        html = html + '<tr><td>'+peer.getDistanceTo(rpc.getTarget())+'</td>'+
                             '<td><b>'+peer.getAddress()+'</b></td>'+
                             '<td><a href=\'#\' class=\'sh\' data-placement=\'below\' rel=\'twipsy\' title=\''+peer.getID()+'\'>'+peer.getID().slice(0,10)+'</a></td>'+
                        '</tr>';
      });
      if(peers.length() ===0) html = html + '<i>empty</i>';

      html = html+'</table>';
      return html;
    }


    switch(rpc.getMethod()) {
      case 'PING': break;
      case 'FIND_NODE':
        html = table(args[0]);
        break;
      case 'FIND_VALUE':
        if(args[1]) {
          html = [
          '<ul>',
            '<li><b>Value : </b><code>'+args[0].value+'</code></li>',
            '<li><b>Expiration : </b>',
                (args[0].exp<0) ?
                '<i>never</i>':
                '<time rel=\'twipsy\' datetime=\''+(new Date(args[0].exp)).toISOString()+'\' data-placement=\'below\'>'+(new Date(args[0].exp).toString())+'</time>',
            '</li>',
          '</ul>'].join('\n');
        } else{
          html = table(args[0]);
        }
        break;
      case 'STORE' : break;
      default: break;
    }
    return html;
  }
};
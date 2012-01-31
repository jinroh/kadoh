KadOHui = (typeof KadOHui !== 'undefined') ? KadOHui : {};

KadOHui.Node = function(node, el, modal_pool) {
  this.node = node;
  this.table = $(el).find('.iterfinds');
  this.modal_pool = $(modal_pool);

  this.MAX = 50;

  this.iterID = 0;

  this.node.on({
    'iterativeFind started' : this.handle
  }, this);
};

KadOHui.Node.prototype = {
  handle: function(iterfind, peers) {
    this.iterID ++;

    var el = $(this.template(this.iterID, iterfind._target, iterfind._targetType, peers));

    this.table.append(el);

    iterfind.then(
      function() {
        el.find('.state').removeClass('warning')
                         .addClass('success')
                         .text('resolved');
      },
      function() {
        el.find('.state').removeClass('warning')
                         .addClass('important')
                         .text('rejected');
    });
  },

  template: function(id, target, target_type, start_peers) {
    var time = new Date();

    var tr =
    ['<tr>',
      '<td><a href="#" class="sha" data-placement="below" rel="twipsy" data-original-title="'+target+'">'+target.slice(0,10)+'</a></td>',
      '<td><code>'+target_type+'</code></td>',
      '<td><i>started with <b>'+start_peers.length()+' </b><a rel="popover" data-content="'+KadOHui.helper.peerTable(start_peers, target)+'" data-original-title="Start peers" data-placement="below">peers</a></i></td>',
      '<td><span class="state label warning">Progress</span></td>',
      '<td><time rel="twipsy" datetime="'+time.toISOString()+'" data-placement="below">'+time.toLocaleTimeString()+'</time></td>',
    '</tr>'];

    return tr.join('\n');
  }


};


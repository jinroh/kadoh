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
    var start = (new Date().getTime());

    var el = $(this.template(this.iterID, iterfind._target, iterfind._targetType, peers));

    if(this.table.children().length > this.MAX)
      this.table.children().last().remove();

    this.table.prepend(el);

    iterfind.then(
      function(res, reached) {
        var html = "";

        //sometimes iterfind NODE are abusively resolved, typically when guys respond ourselves to a findnode
        if(iterfind._targetType !== 'NODE') {
          html =[
          '<ul>',
              '<li><b>Value : </b><code>'+KadOHui.util.escapeHTML(res.value)+'</code></li>',
              '<li><b>Expiration : </b>',
                  (!res.exp || res.exp<0) ?
                  '<i>never</i>':
                  '<time rel=\'tooltip\' datetime=\''+(new Date(res.exp)).toISOString()+'\' data-placement=\'bottom\'>'+(new Date(res.exp).toString())+'</time>',
              '</li>',
            '</ul>'].join('\n');
        }

          html += this.iterfindInfo(iterfind, peers, start);

        el.find('.state').removeClass('label-warning')
                         .addClass('label-success')
                         .text('resolved')
                         .attr('rel', 'popover')
                         .attr('data-original-title', 'Resolved')
                         .attr('data-placement', 'bottom')
                         .attr('data-content', html);
      },
      function(peers) {
        var html = this.iterfindInfo(iterfind, peers, start);

        el.find('.state').removeClass('label-warning')
                         .addClass('label-important')
                         .text('rejected')
                         .attr('rel', 'popover')
                         .attr('data-original-title', 'Rejected')
                         .attr('data-placement', 'bottom')
                         .attr('data-content', html);
    },this);
  },

  template: function(id, target, target_type, start_peers) {
    var time = new Date();

    var tr =
    ['<tr>',
      '<td><span class="sha" data-placement="bottom" rel="tooltip" data-original-title="'+target+'">'+target.slice(0,10)+'</span></td>',
      '<td><code>'+target_type+'</code></td>',
      '<td><i>started with <b>'+start_peers.size()+' </b><a rel="popover" data-content="'+KadOHui.helper.peerTable(start_peers, target)+'" data-original-title="Start peers" data-placement="bottom">peers</a></i></td>',
      '<td><span class="state label label-warning">Progress</span></td>',
      '<td><time rel="tooltip" datetime="'+time.toISOString()+'" data-placement="bottom">'+time.toLocaleTimeString()+'</time></td>',
    '</tr>'];

    return tr.join('\n');
  },

  iterfindInfo: function(iterfind, peers, start) {
     var html = '';
     var elaps = (new Date().getTime()) - start;
     var s = Math.floor(elaps/1000); elaps = elaps - 1000*s;

     html += '<h5>Info</h5>'+
              '<table class=\'table table-bordered table-condensed\'>'+
                '<thead>'+
                  '<tr>'+
                    '<th>Elapse</th>'+
                    '<th>Queries</th>'+
                    '<th>HeardOf</th>'+
                  '</tr>'+
                '</thead>'+
                '<tbody>'+
                  '<tr>'+
                    '<td>'+s+'s '+elaps+'ms</td>'+
                    '<td>'+iterfind.Queried.size()+'</td>'+
                    '<td>'+iterfind.HeardOf.size()+' peers</td>'+
                  '</tr>'+
                '</tbody>'+
             '</table>';

     html += '<h5>'+peers.size()+' reached peers</h5>';
     html += KadOHui.helper.peerTable(peers, iterfind._target);

     return html;
  }


};


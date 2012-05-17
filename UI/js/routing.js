KadOHui = (typeof KadOHui !== 'undefined') ? KadOHui : {};


KadOHui.Routing = function(routing, el) {
  this.routing = routing;
  this.console = $(el).find('.console');
  this.well = $(el).find('.well');
 
  this.routing.on({
    added    : this.update,
    splitted : this.update,
    update   : this.update
  }, this);

  this.update();
};

KadOHui.Routing.prototype = {
  update : function() {
    var RT = this.routing.exports({
      include_lastseen : true,
      include_distance : true
    });

    var count = RT.kbuckets.reduce(function(prev, kb) {
      return prev + kb.peers.length;
    }, 0);

    this.well.html(
      '<div style="line-height:1em">'+
        'Routing Table contains a total of <strong>'+count+' peers</strong>'+
        ' in <strong>'+RT.kbuckets.length+' buckets</strong>'+
      '</div>');

    this.console.empty();
    $('.tooltip').remove();

    RT.kbuckets.forEach(function(kbucket, index) {
      var buck = $(this._renderKbucket(kbucket, index));
      this.console.append(buck);
    },this);
  },

  _renderKbucket : function(kbucket, index) {
    var time = new Date(kbucket.refresh);
    var human_time = (time.getMonth()+1)+'/'+time.getDate()+'/'+time.getFullYear()+' '+time.toLocaleTimeString();


    var head = [
   '<div class="kbucket row">',
      '<div class="kb-title span2">',
        '<h4>Bucket #'+(index+1)+' <small>]'+kbucket.range.min+','+ kbucket.range.max+']</small></h4>',
        '<span class="kb-refresh">refresh : ',
          '<time rel="tooltip" datetime="'+time.toISOString()+'" title="'+human_time+'" data-placement="right">'+time.toLocaleTimeString()+'</time>',
        '</span>',
        '</div>',
          '<div class="peers span10">'].join('\n');

    var content = (kbucket.peers.length ===0) ?
              //---if empty
            '<i>Empty</i>' :
              //---otherwise
            '<table class="table table-striped">' +

            kbucket.peers.map(function(peer) {
              var time = new Date(peer[2]);
              var human_time = (time.getMonth()+1)+'/'+time.getDate()+'/'+time.getFullYear()+' '+time.toLocaleTimeString();

              return [
                '<tr class="peer">',
                  '<td class="distance">'+peer[3]+'</td>',
                  '<td class="jid">'+peer[0]+'</td>',
                  '<td class="sha"><span data-placement="bottom" rel="tooltip" title="'+peer[1]+'">'+peer[1].slice(0,10)+'</span></td>',
                  '<td class="last-seen">',
                    '<time rel="tooltip" datetime="'+time.toISOString()+'" title="'+human_time+'" data-placement="bottom">'+time.toLocaleTimeString()+'</time>',
                  '</td>',
                '</tr>'
              ].join('\n');
            }).join('\n') +

            '</table>';
            //----


    var foot = [
          '</div>',
      '</div>'].join('\n');

    return [head, content, foot].join('\n');
  }
};
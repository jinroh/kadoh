KadOHui = (typeof KadOHui !== 'undefined') ? KadOHui : {};


KadOHui.ValueM = function(vm, el) {
  this.vm = vm;
  this.tbody = $(el).find('.values');
  this.well = $(el).find('.well');
 
  this.vm.onAny(this.update, this);

  this.update();
};

KadOHui.ValueM.prototype = {
  update : function() {
    var self = this;
    this.vm._store.keys(function(keys) {
      self.well.html(
        '<div style="line-height:1em">'+
          'Value Management contains a total of <strong>'+keys.length+'</strong> key/values.'+
        '</div>');
    });

    this.tbody.empty();
    $('.tooltip').remove();

    this.vm._store.each(function(obj) {
      var kv = $(self._renderKeyValue(obj));
      self.tbody.append(kv);
    });
  },

  _renderKeyValue : function(obj) {
    var exp = (obj.exp > 0) ? new Date(obj.exp) : -1;
    var rep = new Date(obj.rep);

    return [
    '<tr>',
      '<td><span class="sha" data-placement="bottom" rel="tooltip" data-original-title="'+obj.key+'">'+obj.key.slice(0,10)+'</span> ('+'nc'/*this.vm._getDistanceToKey(obj.key)*/+')</td>',
      '<td><code>'+KadOHui.util.escapeHTML(obj.value.toString())+'</code></td>',
      '<td><time rel="tooltip" datetime="'+rep.toISOString()+'" title="'+rep.toLocaleTimeString()+'" data-placement="right">'+rep.toLocaleTimeString()+'</time></td>',
      '<td>'+((exp !== -1) ? '<time rel="tooltip" datetime="'+exp.toISOString()+'" title="'+exp.toLocaleTimeString()+'" data-placement="right">'+exp.toLocaleTimeString()+'</time>' : '<i>never</i>')+'</td>',
    '</tr>'
      ].join('\n');

  }
};
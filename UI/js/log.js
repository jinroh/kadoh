KadOHui = (typeof KadOHui !== 'undefined') ? KadOHui : {};

KadOHui.Logger = function(logemitter, console_element, control_element) {
  this.console = $(console_element);
  this.control = $(control_element);

  this.MAX = 700;

  logemitter.onAny(function(level, log) {
    this.append(log.ns, level, this._unshiftEvent(log.event, log.args));
  }, this);

  var console = this.console;
  this.control.find(':checkbox[name=debugLevel]').change(function(e) {
    var value = $(e.target).val();
    var method = ($(e.target).is(':checked')) ? 'show' : 'hide';

    console.find('.' + value)[method]();
  });
};

KadOHui.Logger.prototype = {

  append: function(ns, level, args) {
    var el = this.template(ns, level, args, new Date());
    if (!this.isInLevel(level)) el.hide();

    if (this.console.children().length > this.MAX) this.console.children().last().remove();

    this.console.prepend(el);
  },

  template: function(ns, level, args, time) {
    var abbr = {
      Reactor: 'reactor',
      Node: 'node',
      RoutingTable: 'routing',
      ValueStore: 'value',
      Transport: 'transport'
    };

    var message = args.map(function(obj) {
      if (typeof obj == 'string') return obj;
      else {
        var reg = new RegExp("\"", "g");
        var code = '<code>' + this._stringify(obj).replace(reg, "'") + '</code>';
        return '<b rel="popover" data-content="' + code + '" data-original-title="Object inspector" data-placement="bottom">[Object]</b>';
      }
    }, this).join(', ');

    var human_time = (time.getMonth() + 1) + '/' + time.getDate() + '/' + time.getFullYear() + ' ' + time.toLocaleTimeString();

    var html = ['<div class="row ' + level + '">', '<div class="span1">', abbr[ns] || 'general', '</div>', '<div class="span1">&nbsp;</div>', '<div class="span8">', message, '</div>', '<div class="span1">', '<time rel="tooltip" datetime="' + time.toISOString() + '" title="' + human_time + '" data-placement="bottom">' + time.toLocaleTimeString() + '</time>', '</div>', '</div>'].join('\n');
    return $(html);
  },

  isInLevel: function(level) {
    return this.control.find(':checkbox[name=debugLevel][value=' + level + ']').is(':checked');
  },

  _unshiftEvent: function(event, args) {
    if(typeof event !== 'undefined')
      args.unshift('<i>emits</i> <code>'+event+'</code>');
    return args;
  },

  _stringify: function(object) {
    if (typeof object !== 'string' && !(object instanceof String)) {
      try {
        var json = JSON.stringify(object, null, 2);
        return json;
      } catch (e) {}
    }
    return object.toString();
  }
};
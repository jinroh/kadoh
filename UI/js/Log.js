KadOHui = (typeof KadOHui !== 'undefined') ? KadOHui : {};

KadOHui.Logger =  function(console_element, control_element) {
  this.console = $(console_element);
  this.control = $(control_element);

  this._currentgroup = null;
  var console = this.console;
  this.control.find(':checkbox[name=debugLevel]').change(function(e) {
    var value = $(e.target).val();
    var method = ($(e.target).is(':checked')) ? 'show' : 'hide';

    console.find('.'+value)[method]();
  });
};

  KadOHui.Logger.prototype = {
    append: function(type, args) {
      args = Array.prototype.slice.call(args);

      var el = this.template(this._currentgroup, type, args, new Date());
      if(! this.isInLevel(type))
        el.hide();
      this.console.prepend(el);

    },

    template: function(group, type, args, time) {
      var abbr = {
        Reactor         : 'reactor',
        Node            : 'node',
        RoutingTable    : 'routing',
        ValueManagement : 'value',
        Transport       : 'transport'
      };

      var message = args.map(function(obj) {
        if(typeof obj == 'string')
          return obj;
        else {
          var reg=new RegExp("\"", "g");
          var code = '<code>'+this._stringify(obj).replace(reg, "'")+'</code>';
          return '<b rel="popover" data-content="'+code+'" data-original-title="Object inspector" data-placement="below">[Object]</b>';
        }
      }, this).join(', ');

      var human_time = (time.getMonth()+1)+'/'+time.getDate()+'/'+time.getFullYear()+' '+time.toLocaleTimeString();

      var html = ['<div class="row '+type+'">',
                    '<div class="span1">',
                      abbr[group] || 'general',
                    '</div>',
                    '<div class="span1">&nbsp;</div>',
                    '<div class="span12">',
                      message,
                    '</div>',
                    '<div class="span2">',
                      '<time rel="twipsy" datetime="'+time.toISOString()+'" title="'+human_time+'" data-placement="below">'+time.toLocaleTimeString()+'</time>',
                    '</div>',
                '</div>'].join('\n');
      return $(html);
    },

    isInLevel: function(type) {
      return this.control.find(':checkbox[name=debugLevel][value='+type+']').is(':checked');
    },

    debug: function() {
      this.append('debug', arguments);
    },

    info: function() {
      this.append('info', arguments);
    },
    
    warn: function() {
      this.append('warn', arguments);
    },
    
    error: function() {
      this.append('error', arguments);
    },
    
    fatal: function() {
      this.append('fatal', arguments);
    },

    group: function(name) {
      this._currentgroup = name;
    },

    groupEnd: function() {
      this._currentgroup = null;
    },

    _stringify: function(object) {
      if (typeof object !== 'string' && !(object instanceof String)) {
        try {
          var json = JSON.stringify(object, null, 2);
          return json;
        }
        catch(e) {}
      }
      return object.toString();
    }
  };
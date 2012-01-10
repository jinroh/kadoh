KadOHui = (typeof KadOHui !== 'undefined') ? KadOHui : {};

KadOHui.Logger =  function(console_id) {
    this.consoleID = console_id || 'console';
    this.node      = $('#' + this.consoleID);
    this._currentgroup = null;
  };

  KadOHui.Logger.prototype = {
    append: function(type, args) {
      args = Array.prototype.slice.call(args);

      if (this.node.length === 0) {
        this.node = $('#' + this.consoleID);
      }
      this.node.prepend(this.template(this._currentgroup, type, args, new Date()));
      $("time").timeago();
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
          return " "+obj+" ";
        else
          return '<code>'+this._stringify(obj)+'</code>';
      }, this).join('');

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
                      '<time rel="twipsy" datetime="'+time.toISOString()+'" title="'+human_time+'" data-placement="right">'+human_time+'</time>',
                    '</div>',
                '</div>',
                '<hr>'].join('\n');
      return html;
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
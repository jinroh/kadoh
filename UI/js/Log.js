KadOHui = KadOHui || {};

KadOHui.Logger =  function(console_id, options) {
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
       return '<pre>'+this._stringify(obj)+'</pre>';
      }, this).join('');

      var human_time = (time.getMonth()+1)+'/'+time.getDate()+'/'+time.getFullYear()+' '+time.toLocaleTimeString();

      var html = ['<hr>',
                  '<div class="row">',
                    '<div class="span1">',
                      '<span class="label'+type+'">'+abbr[group]+'</span>',
                    '</div>',
                    '<div class="span13">',
                      message,
                    '</div>',
                    '<div class="span2">',
                      '<time datetime="'+time.toISOString()+'" title="'+human_time+'" data-placement="below">'+human_time+'</time>',
                    '</div>',
                '</div>'].join('\n');
      return html;
    },

    debug: function() {
      this.append('default', arguments);
    },

    info: function() {
      this.append('notice', arguments);
    },
    
    warn: function() {
      this.append('warning', arguments);
    },
    
    error: function() {
      this.append('important', arguments);
    },
    
    fatal: function() {
      this.append('important', arguments);
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
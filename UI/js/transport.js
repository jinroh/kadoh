KadOHui.Transport =  function(transport, console) {
  this.console = $(console);

  this.MAX = 1000;

  transport.on('data-in', function(raw) {
    this.append(raw, false);
  }, this);
  transport.on('data-out', function(raw) {
    this.append(raw, true);
  }, this);
};

  KadOHui.Transport.prototype = {

    append: function(raw, out) {
      var el;
      if(out) {
        el = $('<div class="raw output"></div>').text(raw);
      } else {
        el = $('<div class="raw input"></div>').text(raw);
      }

      if(this.console.children().length > this.MAX)
        this.console.children().last().remove();

      this.console.prepend(el);
    }
};
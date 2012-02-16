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
        el = '<div class="raw out">'+raw+'</div>';
      } else {
        el = '<div class="raw in">'+raw+'</div>';
      }

      if(this.console.children().length > this.MAX)
        this.console.children().last().remove();

      this.console.prepend(el);
    }
};
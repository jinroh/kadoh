KadOHui = (typeof KadOHui !== 'undefined') ? KadOHui : {};



  var popover_options = {
      offset: 10,
      //live: true,
      html: true,
      trigger : 'manual'
  };

  $("[rel=popover]")
    .popover(popover_options)
    .live('click', function(e) {
      var popover = $(e.target).popover(popover_options, 'get')[0];
       if($(e.target).is('.popover-hold')) {
          popover.hide();
         $(e.target).removeClass('popover-hold');
       } else {
          popover.show();
         $(e.target).addClass('popover-hold');
       }
    })
    .live('mouseenter',function(e) {
       var popover = $(e.target).popover(popover_options, 'get')[0];
       if(! $(e.target).is('.popover-hold'))
         popover.show();
     })
     .live('mouseleave',function(e) {
      var popover = $(e.target).popover(popover_options, 'get')[0];
       if(! $(e.target).is('.popover-hold'))
       popover.hide();
     });

  $("[rel=twipsy]")
    .twipsy({
      offset: 10,
      live: true
    })
    .click(function(e) {
      e.preventDefault();
    });


};

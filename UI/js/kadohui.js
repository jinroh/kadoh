KadOHui = (typeof KadOHui !== 'undefined') ? KadOHui : {};

KadOHui.helper = {};

KadOHui.helper.timeDif = function(date) {
  var now = new Date.now();
  date = (date instanceof Date) ? date.getTime() : date;
  var dif = date - now;
  var absdif = Math.abs(dif);

  var D = Math.floor(absdif/(1000*60*60*24)); absdif = absdif - D*(1000*60*60*24);
  var H = Math.floor(absdif/(1000*60*60   )); absdif = absdif - H*(1000*60*60);
  var M = Math.floor(absdif/(1000*60      )); absdif = absdif - M*(1000*60);
  var S = Math.floor(absdif/(1000         )); absdif = absdif - S*(1000);

  return [
    (dif>0) ? 'in'   : '',
    (D>0)   ? D+'d ' : '',
    (H>0)   ? H+'h ' : '',
    (M>0)   ? M+'m ' : '',
    (S>0)   ? S+'s ' : '',
    (dif<0) ? 'ago'  : ''
  ].join('');

};


KadOHui.init = function() {
  
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

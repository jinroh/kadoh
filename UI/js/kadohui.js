KadOHui = (typeof KadOHui !== 'undefined') ? KadOHui : {};

KadOHui.helper = {};

KadOHui.helper.timeDif = function(date) {
  var now = Date.now();
  date = (date instanceof Date) ? date.getTime() : date;
  var dif = date - now;
  var absdif = Math.abs(dif);

  var D = Math.floor(absdif/(1000*60*60*24)); absdif = absdif - D*(1000*60*60*24);
  var H = Math.floor(absdif/(1000*60*60   )); absdif = absdif - H*(1000*60*60);
  var M = Math.floor(absdif/(1000*60      )); absdif = absdif - M*(1000*60);
  var S = Math.floor(absdif/(1000         )); absdif = absdif - S*(1000);

  return [
    (dif>0) ? 'in '   : '',
    (D>0)   ? D+'d ' : '',
    (H>0)   ? H+'h ' : '',
    (M>0)   ? M+'m ' : '',
    (S>0)   ? S+'s ' : '',
    (Math.abs(dif) < 999) ? '<1s' :'',
    (dif<0) ? ' ago'  : ''
  ].join('');

};

KadOHui.helper.peerTable = function(peerArray, relative_node_id) {
   var html;
   html = '<table class=\'condensed-table zebra-striped\'>';
   peerArray.forEach(function(peer) {
     var tr = '<tr><td>'+String((relative_node_id) ? peer.getDistanceTo(relative_node_id) : peer.getDistance())+'</td>'+
                  '<td><b>'+peer.getAddress()+'</b></td>'+
                  '<td>'+
                    ((peer.getID() !== null) ?
                    '<a href=\'#\' class=\'sh\' data-placement=\'below\' rel=\'twipsy\' title=\''+peer.getID()+'\'>'+peer.getID().slice(0,10)+'</a>' :
                    '<i>null</i>')+
                  '</td>'+
               '</tr>';
     html = html + tr;
   });
   if(peerArray.length() ===0) html = html + '<i>empty</i>';

   html = html+'</table>';
   return html;
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
          //popover.show();
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

    $('.popover .title').live('click', function(e){
        e.preventDefault();
        
       $('[rel=popover].popover-hold').each(function(){
            $(this).removeClass('popover-hold').data('popover').hide();
        });
    });

  $("[rel=twipsy]")
    .twipsy({
      title : function() {
        var self = $(this);

        if(self.is('time')) {
          return KadOHui.helper.timeDif(new Date(self.attr('datetime')));
        } else {
          return self.attr('data-original-title');
        }
      },
      offset: 10,
      live: true
    })
    .click(function(e) {
      e.preventDefault();
    });


};

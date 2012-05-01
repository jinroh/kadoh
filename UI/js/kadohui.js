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
   html = '<table class=\'table table-condensed table-striped\'>';
   peerArray.forEach(function(peer) {
     var tr = '<tr><td>'+ ((peer.getID() !== null) ?
                    String((relative_node_id) ? peer.getDistanceTo(relative_node_id) : peer.getDistance()) :
                    '<i>undef.</i>')+
                  '</td>'+
                  '<td><b>'+peer.getAddress()+'</b></td>'+
                  '<td>'+ ((peer.getID() !== null) ?
                    '<span class=\'sha\' data-placement=\'bottom\' rel=\'tooltip\' title=\''+peer.getID()+'\'>'+peer.getID().slice(0,10)+'</span>' :
                    '<i>null</i>')+
                  '</td>'+
               '</tr>';
     html = html + tr;
   });
   if(peerArray.size() ===0) html = html + '<i>empty</i>';

   html = html+'</table>';
   return html;
};

KadOHui.util = {};

KadOHui.util.escapeHTML = function(toescape) {
  return toescape.replace(/&(?!\w+;|#\d+;|#x[\da-f]+;)/gi, '&amp;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;')
                 .replace(/"/g, '&quot;')
                 .replace(/'/g, '&#x27;')
                 .replace(/\//g,'&#x2F;');
};

KadOHui.init = function() {
  
  var popover_options = {
      offset: 10,
      //live: true,
      trigger : 'manual'
  };

  $("[rel=popover]")
    .popover(popover_options)
    .live('click', function(e) {
      var self = $(this);
      var popover = self.popover(popover_options, 'get')[0];
       if(self.is('.popover-hold')) {
         self.popover('hide');
         self.removeClass('popover-hold');
       } else {
         self.addClass('popover-hold');
       }
    })
    .live('mouseenter',function(e) {
      var self = $(this);
      var popover = self.popover(popover_options, 'get')[0];
      if(!self.is('.popover-hold'))
        self.popover('show');
     })
     .live('mouseleave',function(e) {
      var self = $(this);
      var popover = self.popover(popover_options, 'get')[0];
       if(! self.is('.popover-hold'))
         self.popover('hide');
     });

    $('.popover .title').live('click', function(e){
        e.preventDefault();
       $('[rel=popover].popover-hold').each(function(){
            $(this).removeClass('popover-hold').data('popover').popover('hide');
        });
    });

  $(".tab-content")
    .tooltip({
      selector : "[rel=tooltip]",
      title : function() {
        var self = $(this);
        if (self.is('time')) {
          return KadOHui.helper.timeDif(new Date(self.attr('datetime')));
        } else {
          return self.attr('data-original-title');
        }
      },
      offset: 10
    })
    .click(function(e) {
      e.preventDefault();
    });

};

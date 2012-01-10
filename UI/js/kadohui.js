$(function() {
  $.timeago.settings = {
      refreshMillis: 3000,
      allowFuture: true,
      strings: {
        prefixAgo: null,
        prefixFromNow: "in",
        suffixAgo: "ago",
        suffixFromNow: null,
        seconds: "%d sec",
        minute: "%d min",
        minutes: "%d min",
        hour: "%d h",
        hours: "%d h",
        day: "%d d",
        days: "%d d",
        month: "%d m",
        months: "%d m",
        year: "%d y",
        years: "%d y",
        numbers: []
      }
    };


  $("*[rel=popover]")
    .popover({
      offset: 10,
      live: true,
      html: true
    })
    .click(function(e) {
      e.preventDefault();
    });

  $("*[rel=twipsy]")
    .twipsy({
      offset: 10,
      live: true
    })
    .click(function(e) {
      e.preventDefault();
    });


  $("time").timeago();
});
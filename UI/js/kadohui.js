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

  $("time").timeago();
});
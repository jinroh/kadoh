Deferred = require('./util/deferred');

var linked_list = function(key) {
  return {
    value : key*key,
    nextKey  : (key <10) ? (key)+1 : false
  };
};

var GetNext = Deferred.extend({
  initialize: function(nexKey) {
    this.supr();
    setTimeout(function(that) {
      that.resolve(linked_list(nexKey));
    },200, this);
  }
});


IterativeDeferred = require('./util/iterative-deferred');

var crawl = new IterativeDeferred([1])
                .map(function(key) {
                  //generate a deferred
                  return new GetNext(key);
                })
                .reduce(function(prev, result, map) {
            
                  //we continue with next key as long there is more
                  if(result.nextKey)
                    map(result.nextKey);
            
                  //add found value to our reduce result
                  prev.push(result.value);
            
                  return prev;
                }, [])
                .end(function(reduceRes) {
                  //at the end, we resolve
                  this.resolve(reduceRes.join('->'));
                });
            
crawl.then(function(res) {
        console.log(res);
      });
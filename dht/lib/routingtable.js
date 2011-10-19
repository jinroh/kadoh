var RoutingTable = (function() {
  var RoutingTable = function(parent_id) {
    this.parent_id = parent_id;
    this.buckets = [new KBucket(0, Math.pow(2,160))];
  };
  
  // Public
  
  var distance = function(key_one, key_two) {
    // return key_one ^ key_two
  };
  
  var addContact = function(contact) {
    if (contact.id == this.parent_id) {
      return;
    }
    
    try {
      var kbucket = this.kbucketIndexFor(contact.id);
      this.buckets[kbucket]
    }
    catch(e) {
      
    }
  };

  // Private
  
  var _kbucketIndexFor = function(id) {
    for(kbucket in this.buckets) {
      if(this.buckets[kbucket].)
    }
  };
  
  RoutingTable.prototype = {
    // Public
      constructor: RoutingTable
    , addContact: addContact
    , distance: distance
    
    // Private
    , _kBucketIndexFor: _kBucketIndexFor
  };
  
  return RoutingTable;
})();
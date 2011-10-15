(function() {
  RoutingTable = function(parent_id) {
    this.parent_id = parent_id;
    this.buckets = [new KBucket(0, Math.pow(2,160))];
  };
  
  RoutingTable.prototype.distance = function(key_one, key_two) {
    // key_one ^ key_two
  };
  
  RoutingTable.prototype.addContact = function(contact) {
    if (contact.id == this.parent_id) {
      return;
    }
    
    try {
      var kbucket = this.kbucketIndexFor(contact.id);
      throw new Error('');
    }
    catch(e) {
      
    }
  };

  RoutingTable.prototype.kbucketIndexFor(id) {
    for(kbucket in this.buckets) {
      if(this.buckets[kbucket].)
    }
  };
})();
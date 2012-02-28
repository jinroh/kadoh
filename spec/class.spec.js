describe('Class', function() {

  beforeEach(function() {
    Class = KadOH.core.Class;
    myClass = Class(function(n) {
      this.n = n;
    });
  });
  
  it('should be a function', function() {
    expect(Class).toBeFunction();
  });
  
  it('should be possible to instanciate it', function() {
    var foo = new myClass(3);
    expect(typeof foo).toBe('object');
  });
  
  it('should be possible to add methods', function() {
    myClass.methods({get : function(){return this.n;}});
    
    var foo = new myClass(3).n;
    expect(foo).toEqual(3);
  });
  
  it('should be possible to add static methods', function() {
    myClass.statics({dead: 'obese'});
    expect(myClass.dead).toEqual('obese');
  });
  
});
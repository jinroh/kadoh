describe('helper', function() {
  describe('factory', function() {
    it('should give me an id that is to right distance', function() {
      var distance = KadOH.util.Crypto.distance;
      
      var id = 'afba34a2a11ab13eeba5d0a7aa22bbb6120e177b';
      
      for (var dist=0; dist<=160; dist++) {
        var f = Factory.distance(id, dist);
        expect(KadOH.util.Crypto.distance(id, f)).toEqual(dist);
      }
    });
  });

  describe('sorted', function() {

    it('should be true for a sorted array', function() {
      expect([1,5,8,10,14]).toBeAscSorted();
      expect([34,24,7,4,0]).toBeDescSorted();
    });

    it('should be false for a non sorted array', function() {
      expect([5,1,0,34]).not.toBeAscSorted();
      expect([6,78,4,12]).not.toBeDescSorted();
    });

  })
});
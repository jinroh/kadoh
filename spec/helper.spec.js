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
});
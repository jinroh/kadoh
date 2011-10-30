describe('Crypto', function() {
  
  beforeEach(function() {
    KadOH  = (typeof require === 'function') ? require('./dist/KadOH.js') : KadOH;
    Crypto = KadOH.util.Crypto;
    
    SHA1 = Crypto.digest.SHA1;
  });
  
  describe('SHA1', function() {
    beforeEach(function() {
      sha1 = SHA1;
    });
    
    it('should be a function', function() {
      expect(sha1).toBeFunction();
    });
    
    it('should return a string', function() {
      expect(typeof sha1('abc')).toBe('string');
    });
    
    it('should return a SHA1 digest of the given parameter in hexadecimal', function() {
      expect(sha1('DIGEST ME!')).toEqual('a2cfd6254f8dcfa189b0c1142056df9d3daca861');
    });
    
  });
  
  describe('XOR', function() {
    
    beforeEach(function() {
      xor = Crypto.XOR;
    });
    
    it('should be a function', function() {
      expect(xor).toBeFunction();
    });
    
    it('should return an array', function() {
      expect(xor('012', 'DEF')).toBeObject();
    });
    
    it('should return 20 bytes (=160/8) long `Array` for SHA1 HEX strings', function() {
      var foo = Crypto.digest.SHA1('foo');
      var bar = Crypto.digest.SHA1('bar');
      var test = xor(foo, bar);
      
      expect(test.length).toEqual(20);
      for (var i=0; i < test.length; i++) {
        expect(typeof test[i]).toBe('number');
        expect(test[i]).toBeLessThan(256);
        expect(test[i]).not.toBeLessThan(0);
      }
    });
  });
  
  describe('Distance', function() {
    
    beforeEach(function() {
      distance = Crypto.distance;
    });
    
    it('should be a function', function() {
      expect(distance).toBeFunction();
    });
      
    it('should me that the distance between the same objects is 0', function() {
      var foo = SHA1('foo');
      
      expect(distance(foo, foo)).toEqual(0);
      expect(distance([35,90,34], [35,90,34])).toEqual(0);
    });

    // 'and ask the distance between two different length objects': {
    it('should return -1 when I give two different sized objects', function() {
      expect(distance([123,45,67], [34,67,45,90])).toEqual(-1);
    });
    
    it('should return positive number', function() {
      var foo = SHA1('foo');
      var bar = SHA1('bar');
      expect(distance(foo, bar)).toBeGreaterThan(0);
    });
    
    it('should return the good distances', function() {
      var test = [7,0,36];
      
      for(var i=1; i < 256; i++) {
        if (i < 2)
          expect(distance([3,i,36],   test)).toEqual(1+8);
        else if (i < 4)
          expect(distance([55,i,36],  test)).toEqual(2+8);
        else if (i < 8)
          expect(distance([34,i,36],  test)).toEqual(3+8);
        else if (i < 16)
          expect(distance([123,i,36], test)).toEqual(4+8);
        else if (i < 32)
          expect(distance([53,i,36],  test)).toEqual(5+8);
        else if (i < 64)
          expect(distance([234,i,36], test)).toEqual(6+8);
        else if (i < 128)
          expect(distance([6,i,36],   test)).toEqual(7+8);
        else if (i < 256)
          expect(distance([36,i,36],  test)).toEqual(8+8);
      }
    });
  });
});
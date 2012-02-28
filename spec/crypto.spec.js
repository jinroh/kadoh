describe('Crypto', function() {

  beforeEach(function() {
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

  describe('randomSHA1', function() {

    beforeEach(function() {
      randomSHA1 = Crypto.digest.randomSHA1;
    });

    it('should be a function', function() {
      expect(randomSHA1).toBeFunction();
    });

    it('should return a sha1 hexadecimal string', function() {
      expect(typeof randomSHA1()).toBe('string');
      expect(randomSHA1().length).toBe(40);
    });

    it('should return a sha1 in the good range', function() {
      var sha  = SHA1('foo');
      var dist = Math.floor(Math.random() * 160) + 1;
      expect(Crypto.distance(sha, randomSHA1(sha, dist))).toEqual(dist);
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
      expect(distance([35,90,34], [35,90,34], true)).toEqual(0);
    });

    // 'and ask the distance between two different length objects': {
    it('should throw when I give two different sized objects', function() {
      expect(function() { distance([123,45,67], [34,67,45,90], true); }).toThrow();
    });
    
    it('should return positive number', function() {
      var foo = SHA1('foo');
      var bar = SHA1('bar');
      expect(distance(foo, bar)).toBeGreaterThan(0);
    });
    
    it('should return the good distances', function() {
      var test = [36,0,56];
      
      for(var i=1; i < 256; i++) {
        if (i < 2)
          expect(distance([36,i,45],  test, true)).toEqual(1+8);
        else if (i < 4)
          expect(distance([36,i,54],  test, true)).toEqual(2+8);
        else if (i < 8)
          expect(distance([36,i,3],   test, true)).toEqual(3+8);
        else if (i < 16)
          expect(distance([36,i,124], test, true)).toEqual(4+8);
        else if (i < 32)
          expect(distance([36,i,78],  test, true)).toEqual(5+8);
        else if (i < 64)
          expect(distance([36,i,4],   test, true)).toEqual(6+8);
        else if (i < 128)
          expect(distance([36,i,45],  test, true)).toEqual(7+8);
        else if (i < 256)
          expect(distance([36,i,36],  test, true)).toEqual(8+8);
      }
    });
  });
});
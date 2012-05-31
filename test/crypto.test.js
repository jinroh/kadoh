var chai = require('chai'),
    expect = chai.expect;

describe('Crypto', function() {

  var crypto = require('../lib/util/crypto'),
      SHA1 = crypto.digest.SHA1,
      randomSHA1 = crypto.digest.randomSHA1,
      distance = crypto.distance;

  describe('SHA1', function() {
    it('should be a function', function() {
      expect(SHA1).to.be.a('function');
    });
    
    it('should return a string', function() {
      expect(SHA1('abc')).to.be.a('string');
    });
    
    it('should return a SHA1 digest of the given parameter in hexadecimal', function() {
      expect(SHA1('DIGEST ME!')).to.equal('a2cfd6254f8dcfa189b0c1142056df9d3daca861');
    });

  });

  describe('randomSHA1', function() {

    it('should be a function', function() {
      expect(randomSHA1).to.be.a('function');
    });

    it('should return a sha1 hexadecimal string', function() {
      expect(randomSHA1()).to.be.a('string');
      expect(randomSHA1().length).to.equal(40);
    });

    it('should return a sha1 in the good range', function() {
      var sha = SHA1('foo');
      var dist = Math.floor(Math.random() * 160) + 1;
      expect(distance(sha, randomSHA1(sha, dist))).to.equal(dist);
    });

  });
  
  describe('Distance', function() {
    
    it('should be a function', function() {
      expect(distance).to.be.a('function');
    });
      
    it('should me that the distance between the same objects is 0', function() {
      var foo = SHA1('foo');
      
      expect(distance(foo, foo)).to.equal(0);
      expect(distance([35,90,34], [35,90,34], true)).to.equal(0);
    });

    // 'and ask the distance between two different length objects': {
    it('should throw when I give two different sized objects', function() {
      expect(function() { distance([123,45,67], [34,67,45,90], true); }).to.throw;
    });
    
    it('should return positive number', function() {
      var foo = SHA1('foo');
      var bar = SHA1('bar');
      expect(distance(foo, bar)).to.be.above(0);
    });
    
    it('should return the good distances', function() {
      var test = [36,0,56];
      
      for(var i=1; i < 256; i++) {
        if (i < 2)
          expect(distance([36,i,45],  test, true)).to.equal(1+8);
        else if (i < 4)
          expect(distance([36,i,54],  test, true)).to.equal(2+8);
        else if (i < 8)
          expect(distance([36,i,3],   test, true)).to.equal(3+8);
        else if (i < 16)
          expect(distance([36,i,124], test, true)).to.equal(4+8);
        else if (i < 32)
          expect(distance([36,i,78],  test, true)).to.equal(5+8);
        else if (i < 64)
          expect(distance([36,i,4],   test, true)).to.equal(6+8);
        else if (i < 128)
          expect(distance([36,i,45],  test, true)).to.equal(7+8);
        else if (i < 256)
          expect(distance([36,i,36],  test, true)).to.equal(8+8);
      }
    });
  });
});
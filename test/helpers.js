var chai = require('chai'),
    crypto = require('../lib/util/crypto');

function helperChai(chai, utils) {

  function assertSorted(compareFn) {
    compareFn = compareFn || function(a, b) { return a - b; };

    var obj = utils.flag(this, 'object');
    for (var i = 0, l = obj.length; i < l - 1; i++) {
      this.assert(compareFn(obj[i], obj[i+1]) < 0, "expected array to be sorted " + utils.inspect(obj));
    }
  }

  chai.Assertion.addMethod('sorted', assertSorted);
}

chai.use(helperChai);

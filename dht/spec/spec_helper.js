(function() {
  beforeEach(function () {
    this.addMatchers({
      toBeObject: function () {
        return typeof(this.actual) === 'object';
      },
      toBeString: function () {
        return typeof(this.actual) === 'string';
      },
      toBeInteger: function () {
        return typeof(this.actual) === 'integer';
      },
      toBeFunction: function () {
        return typeof(this.actual) === 'function';
      },
      toBeUnique: function () {
        return this.actual.length === undefined || this.actual.length === 1;
      },
      toExist: function () {
        return this.actual !== null;
      },
      toBeVisible: function () {
        return this.actual.offsetHeight !== 0 && this.actual.offsetWidth !== 0;
      }
    });
  });
})();
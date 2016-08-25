module.exports = {
  description: '',
  normalizeEntityName: function() {},

  // locals: function(options) {
  //   // Return custom template variables here.
  //   return {
  //     foo: options.entity.options.foo
  //   };
  // }

  // afterInstall: function(options) {
  //   // Perform extra work here.
  // }

  afterInstall: function () {
    return this.addAddonsToProject({
        packages: [
          {name: 'ember-d3', target: '0.2.0'}
        ]
    })
  }
}

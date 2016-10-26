module.exports = {
  description: 'Install requested packages',
  availableOptions: [
    {
      name: 'lts-file',
      type: String,
      default: ''
    }
  ],

  normalizeEntityName: function () {
    // this prevents an error when the entityName is
    // not specified (since that doesn't actually matter
    // to us
  },

  afterInstall: function (options) {
    return this.addAddonsToProject({ packages: [{name: 'ember-prop-types@^3.0.0'}] })
  }
}

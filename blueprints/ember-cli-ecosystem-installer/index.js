var blueprint2 = require('../../lib/ember-cli-libs/models/blueprint2')

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
    return blueprint2.addAddonsToProject2.call(this, {
      packages: [{name: 'ember-prop-types@^3.0.0'}],
      blueprintOptions: { saveExact: false, saveDev: true }
    })
  }
}

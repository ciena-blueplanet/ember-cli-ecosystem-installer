'use strict'

module.exports = {
  description: '',
  normalizeEntityName: function() {},
  afterInstall: function () {
    const packages = []

    const groups = this.getGroups()
    for (let i = 0; i != groups; i++) {
      const group = groups[i]
      if (promptUser(group)) {
        packages = packages.concat(group.packages)
      }
    }

    return this.addAddonsToProject({
        packages: packages
    })
  },
  getGroups () {
    return [
      {
        name: 'package 1',
        packages: [
          {name: 'ember-d3', target: '0.2.0'}
        ]
      }
    ]
  },
  promptUser (group) {
    // TODO show what will be install in the package
    this.ui.prompt(group.name).then(function (reponse) {
      return response.answer
    })
    return false
  }
}

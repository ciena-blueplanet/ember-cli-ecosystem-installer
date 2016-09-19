'use strict'

var THIS_ADDON_NAME = 'ember-cli-ecosystem-installer'
var ADDON_LTS_KEYWORD = 'ember-cli-ecosystem-lts'

module.exports = {
  /**
   * Get a the existing packages in the external application/addon.
   * @param {object} options all the options
   * @returns {object} the existing packages
   */
  getExistingPkgs: function (options) {
    var packages = options.project.pkg.devDependencies
    var ecosystemAddonsName = this.getEcosystemAddonsName(options)

    var existingPkgs = {}
    for (var pkgName in packages) {
      if (ecosystemAddonsName.indexOf(pkgName) === -1) {
        existingPkgs[pkgName] = packages[pkgName]
      }
    }
    return existingPkgs
  },

  /**
   * Returns true if this addon is installed in an external application/addon and false otherwise.
   * @param {object} options all the options
   * @returns {boolean} true if this addon is installed in an external application/addon and false otherwise.
   */
  isThisAddonInstalled: function (options) {
    var ecosystemAddonsName = this.getEcosystemAddonsName(options)
    return ecosystemAddonsName.indexOf(THIS_ADDON_NAME) !== -1
  },

  /**
   * Get the name of the ecosystem addons installed on the target application.
   * @param {object} options all the options
   * @returns {array} a list ot the ecosystem addons name.
   */
  getEcosystemAddonsName: function (options) {
    return this.getEcosystemAddons(options).map(function (addon) {
      return addon.name
    })
  },

  /**
   * Get the ecosystem addons installed on the target application.
   * @param {object} options all the options
   * @returns {array} a list of the ecosystem addons.
   */
  getEcosystemAddons: function (options) {
    var addonPackages = options.project.addonPackages

    var ecosystemAddons = []
    for (var addonName in addonPackages) {
      var addon = addonPackages[addonName]
      if (addon.pkg.keywords.indexOf(ADDON_LTS_KEYWORD) > -1) {
        ecosystemAddons.push(addon)
      }
    }

    return ecosystemAddons
  }
}

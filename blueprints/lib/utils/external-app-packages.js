const THIS_ADDON_NAME = 'ember-frost-lts'

module.exports = {
  /**
   * Get a the existing packages in the application/addon.
   * @param {object} options all the options
   * @returns {object} the existing packages
   */
  getExistingPkgs (options) {
    return options.project.pkg.devDependencies
  },
  /**
   * Returns true if the application/addon is on an LTS and false otherwise.
   * @param {object} existingPkgs the existing packages
   * @returns {boolean} true if the application/addon is on an LTS and false otherwise
   */
  isThisAddonInstalled (options) {
    return this.getExistingPkgs(options)[THIS_ADDON_NAME] !== undefined
  },
}

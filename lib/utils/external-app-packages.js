const THIS_ADDON_NAME = 'ember-frost-lts'

module.exports = {
  /**
   * Get a the existing packages in the external application/addon.
   * @param {object} options all the options
   * @returns {object} the existing packages
   */
  getExistingPkgs (options) {
    return options.project.pkg.devDependencies
  },
  /**
   * Returns true if this addon is installed in an external application/addon and false otherwise.
   * @param {object} options all the options
   * @returns {boolean} true if this addon is installed in an external application/addon and false otherwise.
   */
  isThisAddonInstalled (options) {
    return this.getExistingPkgs(options)[THIS_ADDON_NAME] !== undefined
  }
}

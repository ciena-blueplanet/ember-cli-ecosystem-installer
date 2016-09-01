'use strict'

const defaultLtsFile = require('../../../lts.json')

module.exports = {
  /**
   * Get a the requested packages to install in the application/addon.
   * @param {object} options all the options
   * @returns {object} the requested packages
   */
  getGroupsNPkgs (options) {
    let ltsFilePath = options.ltsFile
    let ltsFile = defaultLtsFile
    if (ltsFilePath.trim() !== '') {
      ltsFile = require(`../../../${ltsFilePath}`)
    }
    return ltsFile
  }
}

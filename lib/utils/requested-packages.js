'use strict'

const defaultLtsFile = require('../../lts.json')

const MANDATORY_KEY = 'mandatory'

module.exports = {
  /**
   * Get the content of the LTS file (groups and packages).
   * @param {object} options all the options
   * @returns {object} the content of the LTS file (groups and packages)
   */
  _getLts (options) {
    let ltsFilePath = options.ltsFile
    let ltsFile = defaultLtsFile
    if (ltsFilePath.trim() !== '') {
      ltsFile = require(`../../${ltsFilePath}`)
    }
    return ltsFile
  },
  /**
   * Get the mandatory groups and packages requested.
   * @param {object} options all the options
   * @returns {object} an object containing all the mandatory groups and packages
   */
  getMandatoryGroupsNPkgs (options) {
    const lts = this._getLts(options)
    if (lts && lts[MANDATORY_KEY]) {
      return lts[MANDATORY_KEY]
    }
    return {}
  },
  /**
   * Get the non mandatory groups and packages requested.
   * @param {object} options all the options
   * @returns {object} an object containing all the non mandatory groups and packages
   */
  getOptionalGroupsNPkgs (options) {
    const lts = this._getLts(options)

    let groupsNPkgs = {}
    if (lts) {
      for (let key in lts) {
        if (key !== MANDATORY_KEY) {
          groupsNPkgs[key] = lts[key]
        }
      }
    }

    return groupsNPkgs
  }
}

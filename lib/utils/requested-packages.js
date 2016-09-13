'use strict'

const _ = require('lodash')

const ADDON_LTS_KEYWORD = 'lts'
const LTS_FILE_NAME = 'lts'
const MANDATORY_KEY = 'mandatory'

module.exports = {
  /**
   * Get the content of the LTS file (groups and packages).
   * @param {object} options all the options
   * @returns {object} the content of the LTS file (groups and packages)
   */
  _getLts (options) {
    let ltsFilesContent = {}

    let ltsFilePath = options.ltsFile
    if (ltsFilePath && ltsFilePath.trim() !== '') {
      ltsFilesContent = require(`../../${ltsFilePath}`)
    } else {
      const addonPackages = options.project.addonPackages

      for (let addonName in addonPackages) {
        const addon = addonPackages[addonName]
        if (addon.pkg.keywords.indexOf(ADDON_LTS_KEYWORD) > -1) {
          const ltsFile = require(`${addon.path}/${LTS_FILE_NAME}.json`)
          _.merge(ltsFilesContent, ltsFile)
        }
      }
    }
    return ltsFilesContent
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

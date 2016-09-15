'use strict'

var _ = require('lodash')

var ADDON_LTS_KEYWORD = 'lts'
var LTS_FILE_NAME = 'lts'
var MANDATORY_KEY = 'mandatory'

module.exports = {
  /**
   * Get the content of the LTS file (groups and packages).
   * @param {object} options all the options
   * @returns {object} the content of the LTS file (groups and packages)
   */
  _getLts: function (options) {
    var ltsFilesContent = {}

    var ltsFilePath = options.ltsFile
    if (ltsFilePath && ltsFilePath.trim() !== '') {
      ltsFilesContent = require('../../' + ltsFilePath)
    } else {
      var addonPackages = options.project.addonPackages

      for (var addonName in addonPackages) {
        var addon = addonPackages[addonName]
        if (addon.pkg.keywords.indexOf(ADDON_LTS_KEYWORD) > -1) {
          var ltsFile = require(addon.path + '/' + LTS_FILE_NAME + '.json')
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
  getMandatoryGroupsNPkgs: function (options) {
    var lts = this._getLts(options)
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
  getOptionalGroupsNPkgs: function (options) {
    var lts = this._getLts(options)

    var groupsNPkgs = {}
    if (lts) {
      for (var key in lts) {
        if (key !== MANDATORY_KEY) {
          groupsNPkgs[key] = lts[key]
        }
      }
    }

    return groupsNPkgs
  }
}

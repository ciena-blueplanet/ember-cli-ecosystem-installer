'use strict'

var _ = require('lodash')

module.exports = {
  /**
   * Merge arrays
   * @param {array} objValue the objects to merge
   * @param {array} srcValue the source objects
   * @returns {array} merged arrays
   */
  mergeArray: function (objValue, srcValue) {
    if (_.isArray(objValue)) {
      return objValue.concat(srcValue)
    }
  }
}

'use strict'

const _ = require('lodash')

module.exports = {
  /**
   * Create a new object that will contain the content of all the objects.
   * @param {array} sources the objects to merge
   * @returns {object} an object containing all the attributes of the objects passed in parameter
   */
  merge () {
    let mergedObj = {}
    _.mergeWith(mergedObj, ...arguments, function (objValue, srcValue) {
      if (_.isArray(objValue)) {
        return objValue.concat(srcValue)
      }
    })
    return mergedObj
  }
}

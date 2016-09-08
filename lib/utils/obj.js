'use strict'

const _ = require('lodash')

module.exports = {
  /**
   * Create a new object that will contain the content of all the objects.
   * @param {array} objs a list of objects
   * @returns {object} an object containing all the attributes of the objects passed in parameter
   */
  merge (objs) {
    if (objs && !_.isEmpty(objs)) {
      let mergedObj = {}

      for (let obj of objs) {
        for (let key in obj) {
          const value = obj[key]
          mergedObj[key] = value
        }
      }

      return mergedObj
    }
  }
}

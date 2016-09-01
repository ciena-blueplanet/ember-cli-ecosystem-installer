'use strict'

const stateHandler = require('../models/state')
const statesEnum = stateHandler.statesEnum

module.exports = {
  /**
   * Get a package to string.
   * @param {string} name the name of the package
   * @param {object} pkg the package information
   * @returns {string} the package to string
   */
  getPackageToStr (name, pkg) {
    return name + '@' + pkg.target
  },
  /**
   * Create a package.
   * @param {string} name the name of the package
   * @param {string} requestedTarget the requested target for the package
   * @param {object} existingPkgs the existing packages
   * @returns {object} a package
   */
  createPkg (name, requestedTarget, existingPkgs) {
    const existingTarget = existingPkgs[name]
    return {
      target: requestedTarget,
      installedTarget: existingTarget,
      state: this.getPkgState(requestedTarget, existingTarget)
    }
  },
  getPkgState (requestedTarget, existingTarget) {
    let state = statesEnum.NEW
    if (existingTarget !== undefined) {
      if (requestedTarget === existingTarget) {
        state = statesEnum.INSTALLED
      } else {
        state = statesEnum.NEED_UPDATE
      }
    }
    return state
  },
  /**
   * Returns true if is a valid package and false otherwise.
   * @param {string} name the name of the package
   * @param {string} target the target of the package
   * @returns {boolean} true if is a valid package and false otherwise
   */
  isValidPkg (name, target) {
    return name && target && typeof name === 'string' && typeof target === 'string'
  },
  /**
   * Get a package object.
   * @param {string} name the name of the package
   * @param {object} pkg the package information
   * @returns {object} the package object
   */
  getPackageToInstall (name, pkg) {
    return {name, target: pkg.target}
  },
}

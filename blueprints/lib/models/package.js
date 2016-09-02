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
  createPkg (name, target, existingPkgs) {
    if (this.isValidPkg(name, target)) {
      const existingTarget = existingPkgs[name]
      return {
        target: target,
        installedTarget: existingTarget,
        state: this.getPkgState(target, existingTarget)
      }
    } else {
      console.log(`Invalid package: ${name}`)
    }
  },
  createPkgs (packages, existingPkgs) {
    let pkgs = {}
    for (let name in packages) {
      const target = packages[name]

      const pkg = this.createPkg(name, target, existingPkgs)
      if (pkg) {
        pkgs[name] = pkg
      }
    }
    return pkgs
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

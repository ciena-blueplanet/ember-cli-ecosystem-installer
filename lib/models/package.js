'use strict'

const stateHandler = require('./state')
const statesEnum = stateHandler.statesEnum

module.exports = {
  /**
   * Get a package to string.
   * @param {string} name the name of the package
   * @param {object} pkg the package information
   * @returns {string} the package to string
   */
  toString (name, pkg) {
    return name + '@' + pkg.target
  },
  /**
   * Create a package.
   * @param {string} name the name of the package
   * @param {string} target the requested target for the package
   * @param {object} existingPkgs the existing packages
   * @returns {object} a package
   */
  _create (name, target, existingPkgs) {
    if (this._isValid(name, target)) {
      const existingTarget = existingPkgs[name]
      return {
        target: target,
        installedTarget: existingTarget,
        state: this._getState(target, existingTarget)
      }
    } else {
      console.log(`Invalid package: ${name}`)
    }
  },
  /**
   * Create packages.
   * @param {object} packages all requested the packages
   * @param {object} existingPkgs all the existing packags
   * @returns {object} all the packages
   */
  createPkgs (packages, existingPkgs) {
    let pkgs = {}
    for (let name in packages) {
      const target = packages[name]

      const pkg = this._create(name, target, existingPkgs)
      if (pkg) {
        pkgs[name] = pkg
      }
    }
    return pkgs
  },
  /**
   * Get the state of a package.
   * @param {string} target the target of the current package
   * @param {string} existingTarget the target of the existing package
   * @returns {string} the state of the package
   */
  _getState (target, existingTarget) {
    let state = statesEnum.NEW
    if (existingTarget !== undefined) {
      if (target === existingTarget) {
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
  _isValid (name, target) {
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
  }
}

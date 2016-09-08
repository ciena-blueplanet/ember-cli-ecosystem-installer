'use strict'

const stateHandler = require('./state')
const statesEnum = stateHandler.statesEnum

const PKG_TARGET_REGEX = /([0-9]*)\.([0-9]*)\.([0-9]*)/

module.exports = {
  /**
   * Get a package to string.
   * @param {string} name the name of the package
   * @param {object} pkg the package information
   * @returns {string} the package to string
   */
  toString (name, pkg) {
    return name + '@' + (pkg.target || pkg.installedTarget)
  },
  /**
   * Create a package.
   * @param {string} name the name of the package
   * @param {string} currentTarget the current target
   * @param {object} requestedTarget the requested target
   * @returns {object} a package
   */
  _create (name, currentTarget, requestedTarget) {
    if (this._isValid(name, currentTarget, requestedTarget)) {
      return {
        target: requestedTarget,
        installedTarget: currentTarget,
        state: this._getState(currentTarget, requestedTarget)
      }
    } else {
      console.log(`Invalid package: ${name}`)
    }
  },
  /**
   * Create packages.
   * @param {object} packages all the packages
   * @returns {object} all the packages
   */
  createPkgs (packages) {
    let pkgs = {}
    for (let name in packages) {
      const target = packages[name]

      const pkg = this._create(name, target)
      if (pkg) {
        pkgs[name] = pkg
      }
    }
    return pkgs
  },
  /**
   * Create packages.
   * @param {object} packages all requested the packages
   * @param {object} existingPkgs all the existing packags
   * @returns {object} all the packages
   */
  createRequestedPkgs (packages, existingPkgs) {
    let pkgs = {}
    for (let name in packages) {
      const requestedTarget = packages[name]
      const currentTarget = existingPkgs[name]

      const pkg = this._create(name, currentTarget, requestedTarget)
      if (pkg) {
        pkgs[name] = pkg
      }
    }
    return pkgs
  },
  /**
   * Get the state of a package.
   * @param {string} currentTarget the current target of the package
   * @param {string} requestedTarget the requested target of the package
   * @returns {string} the state of the package
   */
  _getState (currentTarget, requestedTarget) {
    // TODO do not request an update if the package version is already >= (consider as already installed)
    let state
    if (requestedTarget === undefined) {
      state = statesEnum.INSTALLED
    } else {
      state = statesEnum.NEW

      if (currentTarget !== undefined) {
        if (this.isInstalled(currentTarget, requestedTarget)) {
          state = statesEnum.INSTALLED
        } else {
          state = statesEnum.NEED_UPDATE
        }
      }
    }

    return state
  },
  /**
   * Returns true if the requestedTarget is installed and false otherwise.
   * @param {string} currentTarget the current target of the package
   * @param {string} requestedTarget the requested target of the package
   * @returns {boolean} true if the requestedTarget is installed and false otherwise
   */
  isInstalled (currentTarget, requestedTarget) {
    if (requestedTarget && currentTarget) {
      const dct = this.getDecomposedTarget(currentTarget)
      const drt = this.getDecomposedTarget(requestedTarget)
      return dct.major > drt.major ||
             dct.major === drt.major && dct.minor > drt.minor ||
             dct.major === drt.major && dct.minor === drt.minor && dct.patch >= drt.patch
    }
    return false
  },
  /**
   * Get the decomposed package target (major, minor, patch).
   * @param {string} target package target
   * @returns {object} decomposed target (major, minor, patch)
   */
  getDecomposedTarget (target) {
    var regularExpresion = PKG_TARGET_REGEX
    var match = regularExpresion.exec(target)
    return {major: match[1], minor: match[2], patch: match[3]}
  },
  /**
   * Returns true if is a valid package and false otherwise.
   * @param {string} name the name of the package
   * @param {string} currentTarget the current target of the package
   * @param {string} requestedTarget the requested target of the package
   * @returns {boolean} true if is a valid package and false otherwise
   */
  _isValid (name, currentTarget, requestedTarget) {
    return name && typeof name === 'string' &&
          ((currentTarget && typeof currentTarget === 'string') ||
          (requestedTarget && typeof requestedTarget === 'string'))
  },
  /**
   * Get a package object.
   * @param {string} name the name of the package
   * @param {object} pkg the package information
   * @returns {object} the package object
   */
  getPackageObj (name, pkg) {
    return { name, target: pkg.target || pkg.installedTarget }
  }
}

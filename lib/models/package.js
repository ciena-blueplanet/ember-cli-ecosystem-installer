'use strict'

var stateHandler = require('./state')
var statesEnum = stateHandler.statesEnum
var display = require('../ui/display')

var PKG_TARGET_REGEX = /([0-9]*)\.([0-9]*)\.([0-9]*)/

module.exports = {
  /**
   * Get a package to string.
   * @param {string} name the name of the package
   * @param {object} pkg the package information
   * @returns {string} the package to string
   */
  toString: function (name, pkg) {
    return name + '@' + (pkg.target || pkg.installedTarget)
  },

  /**
   * Create a package.
   * @param {string} name the name of the package
   * @param {string} currentTarget the current target
   * @param {object} requestedTarget the requested target
   * @returns {object} a package
   */
  _create: function (name, currentTarget, requestedTarget) {
    if (this._isValid(name, currentTarget, requestedTarget)) {
      return {
        target: requestedTarget,
        installedTarget: currentTarget,
        state: this._getState(currentTarget, requestedTarget)
      }
    } else {
      display.error('Invalid package', name)
    }
  },

  /**
   * Create packages.
   * @param {object} packages all the packages
   * @returns {object} all the packages
   */
  createPkgs: function (packages) {
    var pkgs = {}
    for (var name in packages) {
      var target = packages[name]

      var pkg = this._create(name, target)
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
  createRequestedPkgs: function (packages, existingPkgs) {
    var pkgs = {}
    for (var name in packages) {
      var requestedTarget = packages[name]
      var currentTarget = existingPkgs[name]

      var pkg = this._create(name, currentTarget, requestedTarget)
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
  _getState: function (currentTarget, requestedTarget) {
    var state
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
  isInstalled: function (currentTarget, requestedTarget) {
    var dct = this.getDecomposedTarget(currentTarget)
    var drt = this.getDecomposedTarget(requestedTarget)
    if (requestedTarget && currentTarget) {
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
  getDecomposedTarget: function (target) {
    var regularExpresion = PKG_TARGET_REGEX
    var match = regularExpresion.exec(target)
    return {
      major: match[1],
      minor: match[2],
      patch: match[3]
    }
  },

  /**
   * Returns true if is a valid package and false otherwise.
   * @param {string} name the name of the package
   * @param {string} currentTarget the current target of the package
   * @param {string} requestedTarget the requested target of the package
   * @returns {boolean} true if is a valid package and false otherwise
   */
  _isValid: function (name, currentTarget, requestedTarget) {
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
  getPackageObj: function (name, pkg) {
    return {
      name: name,
      target: pkg.target || pkg.installedTarget
    }
  },

  /**
   * Get a package object from the package information object.
   * @param {object} pkgInfo the information of the package
   * @returns {object} the package object
   */
  getPackageObjFromPkgInfo: function (pkgInfo) {
    console.log(pkgInfo)
    return {
      name: pkgInfo.name,
      target: pkgInfo.version
    }
  },

  /**
   * Returns true if the package is a downgrade and false otherwise.
   * @param {object} pkg the package
   * @returns {boolean} true if the package is a downgrade and false otherwise.
   */
  isDowngrade: function (pkg) {
    if (pkg) {
      var requestedTarget = pkg.target
      var currentTarget = pkg.installedTarget
      if (requestedTarget && currentTarget) {
        var dct = this.getDecomposedTarget(currentTarget)
        var drt = this.getDecomposedTarget(requestedTarget)
        return dct.major > drt.major ||
          dct.major === drt.major && dct.minor > drt.minor ||
          dct.major === drt.major && dct.minor === drt.minor && dct.patch > drt.patch
      }
    }
    return false
  }
}

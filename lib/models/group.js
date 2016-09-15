'use strict'

var _ = require('lodash')

var packageHandler = require('./package')
var stateHandler = require('./state')
var statesEnum = stateHandler.statesEnum
var display = require('../ui/display')

var STATES_BY_PRIORITY = [statesEnum.NEW, statesEnum.NEED_UPDATE, statesEnum.INSTALLED]

module.exports = {
  /**
   * Get the group to string.
   * @param {string} name the name of the group
   * @param {object} group the group
   * @returns {string} a group to string
   */
  toString: function (name, group) {
    if (name && group) {
      var toString = ''
      var pkgToStr
      if (group.isGroup) {
        var packages = this.getPkgsBy(group, packageHandler.toString)
        if (packages) {
          pkgToStr = (packages && !_.isEmpty(packages)) ? '(' + packages.join(', ') + ')' : ''
          toString = name + ' ' + pkgToStr
        }
      } else {
        var pkg = this._getPkgs(group)[name]
        pkgToStr = packageHandler.toString(name, pkg)
        if (pkgToStr) {
          toString = pkgToStr
        }
      }

      return toString
    }
  },
  /**
   * Get all the packages for a group and apply a specific function to all those packages.
   * @param {oject} group a group
   * @param {function} getPackageFct a function that will be called for every packages in the group
   * @returns {array} a list of all the packages in the group
   */
  getPkgsBy: function (group, getPackageFct) {
    var packages = []
    var groupPkgs = this._getPkgs(group)
    for (var name in groupPkgs) {
      var pkg = getPackageFct(name, groupPkgs[name])
      if (pkg) {
        packages.push(pkg)
      }
    }
    return packages
  },
  /**
   * Get the packages form a group
   * @param {oject} group a group
   * @returns {object} all the packages
   */
  _getPkgs: function (group) {
    if (group && group.packages) {
      return group.packages
    }
  },
  /**
   * Get a list of the name of the packages for each group.
   * @param {object} groups the groups
   * @returns {array} an object containing all the package names
   */
  getPackageNames: function (groups) {
    var packageNames = []
    for (var groupName in groups) {
      var group = groups[groupName]

      var pkgs = this.getPkgsBy(group, packageHandler.getPackageObj)

      packageNames = packageNames.concat(pkgs.map(function (pkg) { return pkg.name }))
    }

    return packageNames
  },
  /**
   * Returns true if is a valid group and false otherwise.
   * @param {object} pkgs the packages of the group
   * @returns {boolean} true if is a valid group and false otherwise
   */
  _isValid: function (pkgs) {
    return pkgs && !_.isEmpty(pkgs)
  },
  /**
   * Create the groups of packages.
   * Note: This method is returning single packages as groups to simplify the handling.
   * @param {object} groupsNPkgs the packages and group of packages
   * @param {boolean} isThisAddonInstalled true is the current addon is installed and false otherwise
   * @param {boolean} isMandatory true is the groups are mandatory and false otherwise
   * @returns {object} the groups of packages
   */
  createGroups: function (groupsNPkgs, isThisAddonInstalled, isMandatory) {
    var groups = {}
    for (var groupNPkgName in groupsNPkgs) {
      var groupsNPkg = groupsNPkgs[groupNPkgName]

      var packages = {}
      var isGroup = this._isGroup(groupsNPkg)
      if (isGroup) {
        packages = this._getPkgs(groupsNPkg)
      } else {
        packages[groupNPkgName] = groupsNPkg
      }

      var pkgs = packageHandler.createPkgs(packages)

      var group = this._create(groupNPkgName, pkgs, isGroup, isThisAddonInstalled, isMandatory)
      if (group) {
        groups[groupNPkgName] = group
      }
    }

    return groups
  },
  /**
   * Create the groups of packages based on the requested and existing packages.
   * Note: This method is returning single packages as groups to simplify the handling.
   * @param {object} requestedGroupsNPkgs the requested packages and group of packages
   * @param {object} existingPkgs the existing packages
   * @param {boolean} isThisAddonInstalled true is the current addon is installed and false otherwise
   * @param {boolean} isMandatory true is the groups are mandatory and false otherwise
   * @returns {object} the groups of packages
   */
  createRequestedGroups: function (requestedGroupsNPkgs, existingPkgs, isThisAddonInstalled, isMandatory) {
    var groups = {}
    for (var groupNPkgName in requestedGroupsNPkgs) {
      var requestGroupNPkg = requestedGroupsNPkgs[groupNPkgName]

      var requestedPkgs = {}
      var isGroup = this._isGroup(requestGroupNPkg)
      if (isGroup) {
        requestedPkgs = this._getPkgs(requestGroupNPkg)
      } else {
        requestedPkgs[groupNPkgName] = requestGroupNPkg
      }

      var pkgs = packageHandler.createRequestedPkgs(requestedPkgs, existingPkgs)

      var group = this._create(groupNPkgName, pkgs, isGroup, isThisAddonInstalled, isMandatory)
      if (group) {
        groups[groupNPkgName] = group
      }
    }

    return groups
  },
  /**
   * Create a group.
   * @param {string} name the name of the group
   * @param {object} packages contains a all the packages for a group
   * @param {boolean} isGroup true if it's a group and false otherwise. We will set this value
   *                          to false for single package. We introduced that variable to
   *                          differenciate between single packages and groups. Once we reach
   *                          this point we will handle single packages and groups the same
   *                          way. The only way to differenciate those is with this attribute.
   * @param {boolean} isThisAddonInstalled true is the current addon is installed and false otherwise
   * @param {boolean} isMandatory true is the group are mandatory and false otherwise
   * @returns {object} a group
   */
  _create: function (name, packages, isGroup, isThisAddonInstalled, isMandatory) {
    if (this._isValid(packages)) {
      var group = {
        name: name,
        state: this._getState(packages),
        packages: packages,
        isGroup: isGroup,
        isThisAddonInstalled: isThisAddonInstalled || false,
        isMandatory: isMandatory || false
      }
      return group
    } else {
      display.error('Invalid group', name)
    }
  },
  /**
   * Get the state of the group.
   * @param {object} packages all the packages of a group
   * @returns {string} the state of the group
   */
  _getState: function (packages) {
    var nbPackages = 0
    var states = {}
    for (var name in packages) {
      // Count the number of packages
      nbPackages++
      // Count the number of packages in each state
      var pkg = packages[name]
      if (!states[pkg.state]) {
        states[pkg.state] = 0
      }
      states[pkg.state]++
    }

    // If all the packages are in a specific state the group will have that
    // state otherwise it will be in the NEED_UPDATE state
    for (var state of STATES_BY_PRIORITY) {
      if (states[state] && states[state] === nbPackages) {
        return state
      }
    }
    return statesEnum.NEED_UPDATE
  },
  /**
   * Returns true if it's a group and false otherwise.
   * @param {oject} group a group
   * @returns {boolean} true if it's a group and false otherwise.
   */
  _isGroup: function (group) {
    return this._getPkgs(group) !== undefined
  }
}

'use strict'

const _ = require('lodash')

const packageHandler = require('./package')
const stateHandler = require('./state')
const statesEnum = stateHandler.statesEnum
const display = require('../ui/display')

const STATES_BY_PRIORITY = [statesEnum.NEW, statesEnum.NEED_UPDATE, statesEnum.INSTALLED]

module.exports = {
  /**
   * Get the group to string.
   * @param {string} name the name of the group
   * @param {object} group the group
   * @returns {string} a group to string
   */
  toString (name, group) {
    if (name && group) {
      let toString = ''
      if (group.isGroup) {
        const packages = this.getPkgsBy(group, packageHandler.toString)
        if (packages) {
          const pkgToStr = (packages && !_.isEmpty(packages)) ? `(${packages.join(', ')})` : ''
          toString = `${name} ${pkgToStr}`
        }
      } else {
        const pkg = this._getPkgs(group)[name]
        const pkgToStr = packageHandler.toString(name, pkg)
        if (pkgToStr) {
          toString = `${pkgToStr}`
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
  getPkgsBy (group, getPackageFct) {
    let packages = []
    let groupPkgs = this._getPkgs(group)
    for (let name in groupPkgs) {
      const pkg = getPackageFct(name, groupPkgs[name])
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
  _getPkgs (group) {
    if (group && group.packages) {
      return group.packages
    }
  },
  /**
   * Get a list of the name of the packages for each group.
   * @param {object} groups the groups
   * @returns {array} an object containing all the package names
   */
  getPackageNames (groups) {
    let packageNames = []
    for (let groupName in groups) {
      const group = groups[groupName]

      const pkgs = this.getPkgsBy(group, packageHandler.getPackageObj)

      packageNames = packageNames.concat(pkgs.map((pkg) => { return pkg.name }))
    }

    return packageNames
  },
  /**
   * Returns true if is a valid group and false otherwise.
   * @param {object} pkgs the packages of the group
   * @returns {boolean} true if is a valid group and false otherwise
   */
  _isValid (pkgs) {
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
  createGroups (groupsNPkgs, isThisAddonInstalled, isMandatory) {
    let groups = {}
    for (let groupNPkgName in groupsNPkgs) {
      const groupsNPkg = groupsNPkgs[groupNPkgName]

      let packages = {}
      let isGroup = this._isGroup(groupsNPkg)
      if (isGroup) {
        packages = this._getPkgs(groupsNPkg)
      } else {
        packages[groupNPkgName] = groupsNPkg
      }

      let pkgs = packageHandler.createPkgs(packages)

      const group = this._create(groupNPkgName, pkgs, isGroup, isThisAddonInstalled, isMandatory)
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
  createRequestedGroups (requestedGroupsNPkgs, existingPkgs, isThisAddonInstalled, isMandatory) {
    let groups = {}
    for (let groupNPkgName in requestedGroupsNPkgs) {
      const requestGroupNPkg = requestedGroupsNPkgs[groupNPkgName]

      let requestedPkgs = {}
      let isGroup = this._isGroup(requestGroupNPkg)
      if (isGroup) {
        requestedPkgs = this._getPkgs(requestGroupNPkg)
      } else {
        requestedPkgs[groupNPkgName] = requestGroupNPkg
      }

      let pkgs = packageHandler.createRequestedPkgs(requestedPkgs, existingPkgs)

      const group = this._create(groupNPkgName, pkgs, isGroup, isThisAddonInstalled, isMandatory)
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
  _create (name, packages, isGroup, isThisAddonInstalled, isMandatory) {
    if (this._isValid(packages)) {
      let group = {
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
  _getState (packages) {
    let nbPackages = 0
    let states = {}
    for (let name in packages) {
      // Count the number of packages
      nbPackages++
      // Count the number of packages in each state
      const pkg = packages[name]
      if (!states[pkg.state]) {
        states[pkg.state] = 0
      }
      states[pkg.state]++
    }

    // If all the packages are in a specific state the group will have that
    // state otherwise it will be in the NEED_UPDATE state
    for (let state of STATES_BY_PRIORITY) {
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
  _isGroup (group) {
    return this._getPkgs(group) !== undefined
  }
}

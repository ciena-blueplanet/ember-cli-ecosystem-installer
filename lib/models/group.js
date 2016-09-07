'use strict'

const _ = require('lodash')

const packageHandler = require('./package')
const stateHandler = require('./state')
const statesEnum = stateHandler.statesEnum
const objUtil = require('../../lib/utils/obj')

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
      if (group.isGroup) {
        const packages = this.getPkgsBy(group, packageHandler.toString)
        if (packages) {
          const pkgToStr = (packages && !_.isEmpty(packages)) ? `(${packages.join(', ')})` : ''
          return `${name} ${pkgToStr}`
        }
      } else {
        const pkg = this._getPkgs(group)[name]
        const pkgToStr = packageHandler.toString(name, pkg)
        if (pkgToStr) {
          return `${pkgToStr}`
        }
      }
    }
  },
  /**
   * Get all the packages for a group and apply a specific function to all those packages.
   * @param {oject} group a group
   * @param {function} getPackage a function that will be called for every packages in the group
   * @returns {array} a list of all the packages in the group
   */
  getPkgsBy (group, getPackage) {
    let packages = []
    let groupPkgs = this._getPkgs(group)
    for (let name in groupPkgs) {
      const pkg = getPackage(name, groupPkgs[name])
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
   * Get the packages for groups.
   * @param {object} groups the groups
   * @returns {object} an object containing all the packages
   */
  getPackages (groups) {
    let packages = {}
    for (let groupName in groups) {
      const group = groups[groupName]

      const pkgs = this.getPkgsBy(group, packageHandler.getPackageObj)
      packages = objUtil.merge([packages, pkgs])
    }
    return packages
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
      console.log(`Invalid group: ${name}`)
    }
  },
  /**
   * Get the state of the group.
   * @param {object} packages all the packages of a group
   * @returns {string} the state of the group
   */
  _getState (packages) {
    let states = {}

    for (let name in packages) {
      const pkg = packages[name]
      states[pkg.state] = {}
    }

    // Get the group state based on the priority of the states
    // Ex. If there is one of the package that is manadatory then
    // the group is considered as mandatory
    for (let state of STATES_BY_PRIORITY) {
      if (states[state]) {
        return state
      }
    }
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

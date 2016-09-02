'use strict'

const _ = require('lodash')

const packageHandler = require('./package')
const stateHandler = require('../models/state')
const statesEnum = stateHandler.statesEnum
const actionHandler = require('../models/action')
const actionsEnum = actionHandler.actionsEnum

const STATES_BY_PRIORITY = [statesEnum.MANDATORY, statesEnum.NEW, statesEnum.NEED_UPDATE, statesEnum.INSTALLED]

module.exports = {
  /**
   * Get the group to string.
   * @param {string} name the name of the group
   * @param {object} group the group
   * @returns {string} a package to string
   */
  getGroupToStr (name, group) {
    if (name && group) {
      if (group.isGroup) {
        const packages = this.getGroupPackages(group, packageHandler.getPackageToStr)
        if (packages) {
          const pkgToStr = (packages && !_.isEmpty(packages)) ? `(${packages.join(', ')})` : ''
          return `${name} ${pkgToStr}`
        }
      } else {
        const pkg = this.getGroupPkgs(group)[name]
        const pkgToStr = packageHandler.getPackageToStr(name, pkg)
        if (pkgToStr) {
          return `${pkgToStr}`
        }
      }
    }
  },
  /**
   * Get all the packages for a group.
   * @param {oject} group a group
   * @param {function} getPackage a function that will be called for every packages in the group
   * @returns {array} a list of all the packages in the group
   */
  getGroupPackages (group, getPackage) {
    let packages = []
    let groupPkgs = this.getGroupPkgs(group)
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
   * @returns {array} a list of packages
   */
  getGroupPkgs (group) {
    if (group && group.packages) {
      return group.packages
    }
  },
  /**
   * Returns true if is a valid group and false otherwise.
   * @param {object} group a group
   * @returns {boolean} true if is a valid group and false otherwise
   */
  isValidGroup (pkgs) {
    return pkgs && !_.isEmpty(pkgs)
  },
  /**
   * Create the groups of packages based on the requested and existing packages.
   * Note: This method is returning single packages as groups to simplify the handling.
   * @param {object} requestedGroupsNPkgs the requested packages and group of packages
   * @param {object} existingPkgs the existing packages
   * @returns {object} the groups of packages
   */
  createGroups (requestedGroupsNPkgs, existingPkgs, isThisAddonInstalled) {
    let groups = {}
    for (let groupNPkgName in requestedGroupsNPkgs) {
      const requestGroupNPkg = requestedGroupsNPkgs[groupNPkgName]

      let requestedPkgs = {}
      let isGroup = this.isGroup(requestGroupNPkg)
      if (isGroup) {
        requestedPkgs = this.getGroupPkgs(requestGroupNPkg)
      } else {
        requestedPkgs[groupNPkgName] = requestGroupNPkg
      }

      let pkgs = packageHandler.createPkgs(requestedPkgs, existingPkgs)

      const group = this.createGroup(groupNPkgName, pkgs, isGroup, isThisAddonInstalled)
      if (group) {
        groups[groupNPkgName] = group
      }
    }

    return groups
  },
  /**
   * Create a group.
   * @param {object} packages contains a all the packages for a group
   * @returns {object} a group
   */
  createGroup (name, packages, isGroup, isThisAddonInstalled) {
    console.log(name, packages)
    if (this.isValidGroup(packages)) {
      let group = {
        state: this.getGroupState(packages),
        isGroup: isGroup,
        isThisAddonInstalled: isThisAddonInstalled,
        packages: packages
      }
      return group
    } else {
      console.log(`Invalid group: ${name}`)
    }
  },
  getGroupState (packages) {
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
   * Create a group from a package.
   * @param {string} name the name of the package that will also be used as the name of the group
   * @param {objec} pkg the package
   * @returns {object} a group
   */
  createGroupFromPackage (name, pkg, isThisAddonInstalled) {
    const packages = {}
    packages[name] = pkg

    let group = this.createGroup(packages, isThisAddonInstalled)
    group.isGroup = false

    return group
  },
  /**
   * Returns true if it's a group and false otherwise.
   * @param {oject} group a group
   * @returns {boolean} true if it's a group and false otherwise.
   */
  isGroup (group) {
    console.log(this.getGroupPkgs(group))
    return this.getGroupPkgs(group) !== undefined
  },
  getActionForGroup (name, group, isInUserInput) {
    let action = actionsEnum.SKIP
    if (isInUserInput) {
      action = actionsEnum.OVERWRITE
    } else {
      // TODO add mandatory packages
      if (group.state === statesEnum.INSTALLED) {
        action = actionsEnum.IDENTICAL
      }
    }
    return action
  },
  isConfirmationRequiredForGroup(action) {
    return action !== actionsEnum.IDENTICAL
  },
  /**
   * Get the packages for a group.
   * @param {string} name the name of the group
   * @param {object} group the group
   * @returns {array} a list of packages
   */
  getPackagesToInstallByGroup (group, action) {
    // TODO double check this logic
    if (action === actionsEnum.OVERWRITE) {
      return this.getGroupPackages(group, packageHandler.getPackageToInstall)
    }
  },
  isInstalledOrMandatory (group) {
     return group.state === statesEnum.INSTALLED || group.state === statesEnum.MANDATORY
  },
  isCandidatForAutomaticUpdate (group) {
    return group.state === statesEnum.NEED_UPDATE && group.isThisAddonInstalled
  }
}

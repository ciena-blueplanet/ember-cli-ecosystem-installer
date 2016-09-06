'use strict'

const _ = require('lodash')

const packageHandler = require('./package')
const stateHandler = require('./state')
const statesEnum = stateHandler.statesEnum
const actionHandler = require('./action')
const actionsEnum = actionHandler.actionsEnum

const STATES_BY_PRIORITY = [statesEnum.NEW, statesEnum.NEED_UPDATE, statesEnum.INSTALLED]

const MANDATORY_TO_STR = 'mandatory'

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
        const packages = this._getPkgsBy(group, packageHandler.toString)
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
  _getPkgsBy (group, getPackage) {
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
   * Returns true if is a valid group and false otherwise.
   * @param {object} group a group
   * @returns {boolean} true if is a valid group and false otherwise
   */
  _isValid (pkgs) {
    return pkgs && !_.isEmpty(pkgs)
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
  createGroups (requestedGroupsNPkgs, existingPkgs, isThisAddonInstalled, isMandatory) {
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

      let pkgs = packageHandler.createPkgs(requestedPkgs, existingPkgs)

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
        isThisAddonInstalled: isThisAddonInstalled,
        isMandatory: isMandatory
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
  },
  /**
   * Get the action that will need to be done for a group.
   * @param {string} name name of the group
   * @param {object} group the group
   * @param {boolean} isInUserInput true if the user selected that group and false otherwise
   * @returns {string} the action for this group
   */
  getActionForGroup (name, group, isInUserInput) {
    let action = actionsEnum.SKIP
    if (group.state === statesEnum.INSTALLED) {
      action = actionsEnum.IDENTICAL
    } else if (isInUserInput || group.isMandatory) {
      action = actionsEnum.OVERWRITE
    }

    return action
  },
  /**
   * Returns true if a confirmation is required for this group and false otherwise.
   * @param {string} action the action to do on the group
   * @returns true if a confirmation is required for this group and false otherwise
   */
  isConfirmationRequiredForGroup(action) {
    return action !== actionsEnum.IDENTICAL
  },
  /**
   * Get the packages to install for a group.
   * @param {object} group the group
   * @param {string} action the action to do on the group
   * @returns {array} a list of packages
   */
  getPackagesToInstallByGroup (group, action) {
    // TODO double check this logic
    if (action === actionsEnum.OVERWRITE) {
      return this._getPkgsBy(group, packageHandler.getPackageToInstall)
    }
  },
  /**
   * Returns true if the group is a candidate for an automatic update and false otherwise.
   * @param {object} group the group
   * @returns {boolean} true if the group is a candidate for an automatic update and false otherwise
   */
  isCandidateForAutomaticUpdate (group) {
    return group.state === statesEnum.NEED_UPDATE && group.isThisAddonInstalled
  },
  /**
   * Returns true if the group is selected by default and false otherwise.
   * @param {object} group the group
   * @returns {boolean} true if the group is selected by default and false otherwise
   */
  isSelectedByDefault (group) {
    return group.state === statesEnum.INSTALLED || group.isMandatory || this.isCandidateForAutomaticUpdate(group)
  },
  /**
   * Returns true if the group is disabled by default and false otherwise.
   * @param {object} group the group
   * @returns {boolean} true if the group is disabled by default and false otherwise
   */
  isDisabledByDefault (group) {
    if (group.state === statesEnum.INSTALLED) {
      return group.state
    } else if (group.isMandatory) {
      return MANDATORY_TO_STR
    } else {
      return false
    }
  }
}

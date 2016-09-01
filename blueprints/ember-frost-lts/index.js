'use strict'

const chalk = require('chalk')
const _ = require('lodash')

const defaultLtsFile = require('../../lts.json')
const actionsEnum = require('../models/actions-enum')
const statesEnum = require('../models/states-enum')

const LTS_PKG_NAME = 'ember-frost-lts'
const USER_INPUT_INSTALL_PKGS = 'userInputInstallPkgs'
const USER_INPUT_INSTALL_PKGS_CONFIRM = 'confirmInstallPkgs'

module.exports = {
  description: 'Install requested packages of an LTS',
  availableOptions: [
    {
      name: 'lts-file',
      type: String,
      default: ''
    }
  ],
  normalizeEntityName: function () {},
  /**
   * Query the user to determine which packages/groups he wants to install.
   * @param {object} options all the options
   * @returns {object} a list of the packages to install
   */
  afterInstall: function (options) {
    let requestedGroupsNPkgs = this.getRequestedGroupsNPkgs(options)
    let existingPkgs = this.getExistingPkgs(options)
    let groups = this.createGroups(requestedGroupsNPkgs, existingPkgs)

    if (groups) {
      // Get the groups that need to be installed and required user input
      // const groupsRequireInstallation = this.getGroupsMatchingCondition(groups, this.isPkgInstallationRequired)
      // let groupRequireUserInput = groupsRequireInstallation
      // if (this.isOnLts(existingPkgs)) {
      //   groupRequireUserInput = this.getGroupsMatchingCondition(groupRequireUserInput, this.isUserInputRequired)
      // }

      const promise = this.installPkgs(groups)
      if (promise) {
        return promise.then((packages) => {
          console.log('install pkgs done', packages)
          if (packages && packages.length > 0) {
            return this.addAddonsToProject({
              packages: packages
            })
          }
        })
      }
    }
  },
  installPkgs (groups) {
    const promise = this.selectPkgs(groups)
    if (promise) {
      return promise.then((userInput) => {
        const actionByGroup = this.getActionByGroup(groups, userInput[USER_INPUT_INSTALL_PKGS])
        this.displaySummary(groups, actionByGroup)
        if (this.isConfirmationRequired(actionByGroup)) {
          return this.confirmPkgsSelection(groups, actionByGroup)
        }
      })
    }
  },
  isConfirmationRequired (actionByGroup) {
    if (actionByGroup) {
      for (let groupName in actionByGroup) {
        const action = actionByGroup[groupName]
        if (action !== actionsEnum.IDENTICAL) {
          return true
        }
      }
    }
    return false
  },
  selectPkgs (groups) {
    return this.getUserInputForGroups(groups, USER_INPUT_INSTALL_PKGS, 'Available packages')
  },
  displaySummary (groups, actionByGroup) {
    console.log(this.getSummary(groups, actionByGroup))
  },
  confirmPkgsSelection (groups, actionByGroup) {
    return this.getConfirmationUserInput(USER_INPUT_INSTALL_PKGS_CONFIRM, 'Would you like to confirm the following choices')
      .then((confirmUserInput) => {
        if (confirmUserInput[USER_INPUT_INSTALL_PKGS_CONFIRM]) {
          return this.getPackagesToInstall(groups, actionByGroup)
        } else {
          return this.installPkgs(groups)
        }
      })
  },
  getActionByGroup (groups, userInputs) {
    let actionByGroup = {}
    if (groups) {
      for (let groupName in groups) {
        const group = groups[groupName]


        let action = actionsEnum.SKIP
        if (userInputs && userInputs.indexOf(groupName) > -1) {
          action = actionsEnum.OVERWRITE
        } else {
          // TODO add mandatory packages
          if (group.state === statesEnum.INSTALLED) {
            action = actionsEnum.IDENTICAL
          }
        }

        actionByGroup[groupName] = action
      }
    }

    return actionByGroup
  },
  getSummary (groups, actionByGroup) {
    let summary = 'Summary\n'
    for (let groupName in groups) {
      const group = groups[groupName]
      const action = actionByGroup[groupName]
      summary += `${this.getGroupSummary(groupName, group, action)}\n`
    }
    return summary
  },
  getGroupSummary (name, group, action) {
    if (name && group && action) {
      return `   ${this.getActionToStr(action)} ${this.getGroupToStr(name, group)}`
    }
  },
  getPackagesToInstall (groups, actionByGroup) {
    let packages = []
    for (let groupName in groups) {
      const group = groups[groupName]
      const action = actionByGroup[groupName]

      if (action === actionsEnum.OVERWRITE) {
        packages = packages.concat(this.getPackagesToInstallByGroup(group))
      }
    }
    return packages
  },
  /**
   * Returns true if the application/addon is on an LTS and false otherwise.
   * @param {object} existingPkgs the existing packages
   * @returns {boolean} true if the application/addon is on an LTS and false otherwise
   */
  isThisAddonInstalled (existingPkgs) {
    return existingPkgs[LTS_PKG_NAME] !== undefined
  },
  /**
   * Get the user action for a group. It's possible that the user is not providing any action.
   * @param {string} groupName the name of the group
   * @param {object} actions all the actions provided by the user
   * @param {object} groupsRequireInstallation groups that require installation
   * @param {object} groupRequireUserInput groups that require user input
   * @returns {ACTIONS_ENUM} an action
   */
  getAction (groupName, actions, groupsRequireInstallation, groupRequireUserInput) {
    let action = actions[groupName]

    // If the user is not providing any action we will handle a few specific cases
    if (!action) {
      const isAlreadyInstalled = groupsRequireInstallation[groupName] === undefined
      const isUserInputNotRequired = groupRequireUserInput[groupName] === undefined

      if (isAlreadyInstalled) {
        action = actionsEnum.IDENTICAL
      } else if (isUserInputNotRequired) {
        // automatically overwrite if the user input is not necessary
        action = actionsEnum.AUTO_OVERWRITE
      }
    }

    return action
  },
  /**
   * Get all the groups matching with the condition function passed in parameter.
   * @param {object} groups the groups
   * @param {function} conditionFct all the packages in this group need to match this condition to be returned.
   * @returns {object} groups matching the condition
   */
  getGroupsMatchingCondition (groups, conditionFct) {
    let groupsWhereUserInputRequired = {}
    for (let name in groups) {
      const group = groups[name]
      let matchCondition = false

      const pkgs = this.getGroupPkgs(group)
      for (let pkgName in pkgs) {
        const pkg = pkgs[pkgName]
        if (conditionFct(pkg)) {
          matchCondition = true
        }
      }

      if (matchCondition) {
        groupsWhereUserInputRequired[name] = group
      }
    }

    return groupsWhereUserInputRequired
  },
  /**
   * Returns true if the installation of the package is required and false otherwise.
   * @param {object} pkg the package
   * @returns {boolean} true if the installation of the package is required and false otherwise.
   */
  isPkgInstallationRequired (pkg) {
    return pkg.installedTarget === undefined || pkg.installedTarget !== pkg.target
  },
  /**
   * Returns true if the user input for the package is required and false otherwise.
   * @param {object} pkg the package
   * @returns {boolean} true if the user input for the package is required and false otherwise
   */
  isUserInputRequired (pkg) {
    return pkg.installedTarget === undefined
  },
  /**
   * Get the group to string.
   * @param {string} name the name of the group
   * @param {object} group the group
   * @returns {string} a package to string
   */
  getGroupToStr (name, group) {
    if (name && group) {
      if (group.isGroup) {
        const packages = this.getGroupPackages(group, this.getPackageToStr)
        if (packages) {
          const pkgToStr = (packages && !_.isEmpty(packages)) ? `(${packages.join(', ')})` : ''
          return `${name} ${pkgToStr}`
        }
      } else {
        const pkg = this.getGroupPkgs(group)[name]
        const pkgToStr = this.getPackageToStr(name, pkg)
        if (pkgToStr) {
          return `${pkgToStr}`
        }
      }
    }
  },
  /**
   * Get the packages for a group.
   * @param {string} name the name of the group
   * @param {object} group the group
   * @returns {array} a list of packages
   */
  getPackagesToInstallByGroup (group) {
    return this.getGroupPackages(group, this.getPackageToInstall)
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
   * Returns true if it's a group and false otherwise.
   * @param {oject} group a group
   * @returns {boolean} true if it's a group and false otherwise.
   */
  isGroup (group) {
    return this.getGroupPkgs(group) !== undefined
  },
  /**
   * Get the packages form a group
   * @param {oject} group a group
   * @returns {array} a list of packages
   */
  getGroupPkgs (group) {
    return group.packages
  },
  /**
   * Get a the existing packages in the application/addon.
   * @param {object} options all the options
   * @returns {object} the existing packages
   */
  getExistingPkgs (options) {
    return options.project.pkg.devDependencies
  },
  /**
   * Get a the requested packages to install in the application/addon.
   * @param {object} options all the options
   * @returns {object} the requested packages
   */
  getRequestedGroupsNPkgs (options) {
    let ltsFilePath = options.ltsFile
    let ltsFile = defaultLtsFile
    if (ltsFilePath.trim() !== '') {
      ltsFile = require(`../../${ltsFilePath}`)
    }
    return ltsFile
  },
  /**
   * Create the groups of packages based on the requested and existing packages.
   * Note: This method is returning single packages as groups to simplify the handling.
   * @param {object} requestedGroupsNPkgs the requested packages and group of packages
   * @param {object} existingPkgs the existing packages
   * @returns {object} the groups of packages
   */
  createGroups (requestedGroupsNPkgs, existingPkgs) {
    const isThisAddonInstalled = this.isThisAddonInstalled(existingPkgs)
    // TODO refactor
    let groups = {}
    for (let groupNPkgName in requestedGroupsNPkgs) {
      let pkgs = {}

      const requestGroupNPkg = requestedGroupsNPkgs[groupNPkgName]
      if (this.isGroup(requestGroupNPkg)) {
        const group = requestGroupNPkg

        if (this.isValidGroup(group)) {
          let state = statesEnum.INSTALLED
          const requestedPkgs = this.getGroupPkgs(group)
          for (let pkgName in requestedPkgs) {
            const target = requestedPkgs[pkgName]

            if (this.isValidPkg(pkgName, target)) {
              pkgs[pkgName] = this.createPkg(pkgName, target, existingPkgs)
            } else {
              console.log(`Invalid package: ${pkgName}`)
            }
          }

          if (state && pkgs && !_.isEmpty(pkgs)) {
            groups[groupNPkgName] = this.createGroup(pkgs, isThisAddonInstalled)
          }
        } else {
          console.log(`Invalid group: ${groupNPkgName}`)
        }
      } else {
        const target = requestedGroupsNPkgs[groupNPkgName]
        const name = groupNPkgName

        if (this.isValidPkg(name, target)) {
          groups[name] = this.createGroupFromPackage(name, this.createPkg(name, target, existingPkgs), isThisAddonInstalled)
        } else {
          console.log(`Invalid package: ${name}`)
        }
      }
    }

    return groups
  },
  /**
   * Create a group.
   * @param {object} packages contains a all the packages for a group
   * @returns {object} a group
   */
  createGroup (packages, isThisAddonInstalled) {
    let group = { state: this.getGroupState(packages), isGroup: true, isThisAddonInstalled: isThisAddonInstalled }
    group['packages'] = packages
    return group
  },
  getGroupState (packages) {
    // TODO refactor
    let pkgsState = { }

    for (let name in packages) {
      const pkg = packages[name]
      pkgsState[pkg.state] = {}
    }

    if (pkgsState[statesEnum.MANDATORY]) {
      return statesEnum.MANDATORY
    } else if (pkgsState[statesEnum.NEW]) {
      return statesEnum.NEW
    } else if (pkgsState[statesEnum.NEED_UPDATE]) {
      return statesEnum.NEED_UPDATE
    } else if (pkgsState[statesEnum.INSTALLED]) {
      return statesEnum.INSTALLED
    }
  },
  /**
   * Create a group from a package.
   * @param {string} name the name of the package that will also be used as the name of the group
   * @param {objec} pkg the package
   * @returns {object} a group
   */
  createGroupFromPackage (name, pkg, isThisAddonInstalled) {
    // TODO try to clean this method + try to use other method (createGroup)
    let group = this.createGroup({}, isThisAddonInstalled)
    group.isGroup = false
    group.state = pkg.state
    group.packages[name] = pkg
    return group
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
   * Returns true if is a valid group and false otherwise.
   * @param {object} group a group
   * @returns {boolean} true if is a valid group and false otherwise
   */
  isValidGroup (group) {
    return group.packages && !_.isEmpty(group.packages)
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
   * Capitalize the first letter of a string.
   * @param {string} text a text
   * @returns {string} text with the first letter capitalized
   */
  capitalizeFirstLetter (text) {
    return text.charAt(0).toUpperCase() + text.slice(1)
  },
  getChoiceForGroup (context, name, group) {
    const isInstalledOrMandatory = group.state === statesEnum.INSTALLED ||
                      group.state === statesEnum.MANDATORY
    const isAutomaticUpdate = group.state === statesEnum.NEED_UPDATE &&
                              group.isThisAddonInstalled
    return {
      value: name,
      name: context.getGroupToStr(name, group),
      checked: isInstalledOrMandatory || isAutomaticUpdate,
      disabled: (isInstalledOrMandatory) ? group.state : false
    }
  },
  getUserInputForGroups (groups, inputName, inputMessage) {
    let choices = this.getChoices(groups, this.getChoiceForGroup)
    if (!_.isEmpty(choices)) {
      return this.getUserInputForChoice('checkbox', inputName, inputMessage, choices)
    }
  },
  getUserInputForChoice (type, inputName, inputMessage, choices) {
    let userInput
    if (choices) {
      userInput = this.getUserInput(type, inputName, inputMessage, choices)
    }

    if (userInput) {
      return this.promptUser([userInput])
    }
  },
  getConfirmationUserInput (inputName, inputMessage) {
    return this.getUserInputForChoice('confirm', inputName, inputMessage, [])
  },
  // -------- User input -------- //
  getChoices (entities, getChoiceForEntityFct) {
    let choices = []

    if (entities && getChoiceForEntityFct) {
      for (let entityId in entities) {
        const entity = entities[entityId]

        choices.push(getChoiceForEntityFct(this, entityId, entity))
      }
    }

    return choices
  },
  getUserInput (type, name, message, choices) {
    if (type && name && message && choices) {
      let userInput = {
        type: type,
        name: name,
        message: message
      }
      if (!_.isEmpty(choices)) {
        userInput['choices'] = choices
      }

      return userInput
    }
  },
  promptUser (userInputs) {
    return this.ui.prompt(userInputs)
  },
  getActionToStr (action) {
    const chalkColor = this.getChalkColorForAction(action)
    return chalkColor(action)
  },
  getChalkColorForAction (action) {
    if (action === actionsEnum.IDENTICAL || action === actionsEnum.SKIP) {
      return chalk.yellow
    } else if (action === actionsEnum.OVERWRITE) {
      return chalk.red
    }
  }
}

// TODO
// Mandatory (auto check + disable + to install)





// Diff
// diffHighlight (line) {
//   if (line.added) {
//     return `- ${chalk.green(line.value)}`;
//   } else if (line.removed) {
//     return `+ ${chalk.red(line.value)}`;
//   // } else if (line.match(/^@@/)) {
//   //   return chalk.cyan(line);
//   } else {
//     return line;
//   }
// },
// getLineDiff(oldText, newText) {
//   const lines = diff.diffLines(oldText, newText)
//   for (var i = 0; i < lines.length; i++) {
//     console.log(this.diffHighlight(lines[i]));
//   }
// },

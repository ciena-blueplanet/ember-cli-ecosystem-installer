'use strict'

const _ = require('lodash')

const actionHandler = require('../../lib/models/action')
const actionsEnum = actionHandler.actionsEnum
const userInputHandler = require('../../lib/ui/user-input')
const groupHandler = require('../../lib/models/group')
const packageHandler = require('../../lib/models/package')
const externalAppPackagesUtil = require('../../lib/utils/external-app-packages')
const requestedPackagesUtil = require('../../lib/utils/requested-packages')
const objUtil = require('../../lib/utils/obj')
const stateHandler = require('../../lib/models/state')
const statesEnum = stateHandler.statesEnum

const QUESTION_INSTALL = {
  name: 'userInputInstallPkgs',
  message: 'Available packages (install)'
}

const QUESTION_UNINSTALL = {
  name: 'userInputUninstallPkgs',
  message: 'Available packages (uninstall)'
}

const QUESTION_CONFIRM = {
  name: 'confirmSelection',
  message: 'Would you like to confirm the following choices'
}

const MANDATORY_TO_STR = 'mandatory'

module.exports = {
  description: 'Install requested packages',
  availableOptions: [
    {
      name: 'lts-file',
      type: String,
      default: ''
    }
  ],
  normalizeEntityName: function () {
    // this prevents an error when the entityName is
    // not specified (since that doesn't actually matter
    // to us
  },
  /**
   * Query the user to determine which packages/groups he wants to install.
   * Note: Some packages/groups are mandatory and the others are optional
   * @param {object} options all the options
   * @returns {object} a list of the packages to install
   */
  afterInstall: function (options) {
    const existingPkgs = externalAppPackagesUtil.getExistingPkgs(options)
    const groupsToInstall = this.getGroupsToInstall(options, existingPkgs)
    const groupsToUninstall = this.getGroupsToUninstall(existingPkgs, groupsToInstall)

    const installPromise = this.getSelectedPkgsToInstall(groupsToInstall)

    if (installPromise) {
      return installPromise.then((packagesToInstall) => {
        const uninstallPromise = this.getSelectedPkgsToUninstall(groupsToUninstall)
        if (uninstallPromise) {
          return uninstallPromise.then((packagesToUninstall) => {
            return this.uninstallAndInstallPkgs(packagesToUninstall, packagesToInstall)
          })
        } else {
          return this.uninstallAndInstallPkgs([], packagesToInstall)
        }
      })
    } else {
      const uninstallPromise = this.getSelectedPkgsToUninstall(groupsToUninstall)
      if (uninstallPromise) {
        return uninstallPromise.then((packagesToUninstall) => {
          return this.uninstallAndInstallPkgs(packagesToUninstall, [])
        })
      }
    }
  },
  /**
   * Uninstall and install the packages passed in parameter.
   * @param {object} packagesToUninstall the packages to uninstall
   * @param {object} packagesToInstall the packages to install
   * @returns {Promise} a promise to uninstall/install packages
   */
  uninstallAndInstallPkgs (packagesToUninstall, packagesToInstall) {
    console.log('Uninstall pkgs done', packagesToUninstall)
    console.log('Install pkgs done', packagesToInstall)

    // Unistall the packages
    let removePackagesPromise
    if (packagesToUninstall && !_.isEmpty(packagesToUninstall)) {
      removePackagesPromise = this.removePackagesFromProject(packagesToUninstall)
    }

    // Install the packages
    if (removePackagesPromise) {
      return removePackagesPromise.then(() => {
        return this.getAddonsToAddToProject(packagesToInstall)
      })
    } else {
      return this.getAddonsToAddToProject(packagesToInstall)
    }
  },

  // == Install ==========================================================
  /**
   * Get all the groups to install (mandatory and optional).
   * Note: We are convertir all the single package to group to simplify their handling.
   * @param {object} options all the options
   * @param {object} existingPkgs the existing packages
   * @returns {object} contains all the groups.
   */
  getGroupsToInstall (options, existingPkgs) {
    const isThisAddonInstalled = externalAppPackagesUtil.isThisAddonInstalled(options)

    // Get the mandatory groups
    const mandatoryRequestedGroupsNPkgs = requestedPackagesUtil.getMandatoryGroupsNPkgs(options)
    const mandatoryGroups = groupHandler.createRequestedGroups(mandatoryRequestedGroupsNPkgs, existingPkgs,
                        isThisAddonInstalled, true)

    // Get the optional groups
    const optionalRequestedGroupsNPkgs = requestedPackagesUtil.getOptionalGroupsNPkgs(options)
    const optionalGroups = groupHandler.createRequestedGroups(optionalRequestedGroupsNPkgs, existingPkgs,
                        isThisAddonInstalled, false)

    // Get all the groups
    return objUtil.merge([mandatoryGroups, optionalGroups])
  },
  /**
   * Get the addons to add to the project.
   * @param {object} packages the packages to install
   * @returns {Promise} promise to add the addons to the project
   */
  getAddonsToAddToProject (packages) {
    if (packages && !_.isEmpty(packages)) {
      return this.addAddonsToProject({ packages: packages })
    }
  },
  /**
   * Get the packages to install.
   * @param {object} groups all the groups to install
   * @returns {Promise} a promise that will return all the packages to install
   */
  getSelectedPkgsToInstall (groups) {
    return this.getSelectedPkgs(
      groups,
      QUESTION_INSTALL,
      this.getChoiceForGroupOnInstall.bind(this),
      this.getActionForGroupOnInstall)
  },
  /**
   * Get the action that will need to be done for a group.
   * @param {string} name name of the group
   * @param {object} group the group
   * @param {boolean} isInUserInput true if the user selected that group and false otherwise
   * @returns {string} the action for this group
   */
  getActionForGroupOnInstall (name, group, isInUserInput) {
    let action = actionsEnum.SKIP

    if (group.state === statesEnum.INSTALLED) {
      action = actionsEnum.IDENTICAL
    } else if (isInUserInput || group.isMandatory) {
      action = actionsEnum.OVERWRITE
    }
    return action
  },
  /**
   * Get the choices for a group.
   * @param {string} name the name of the group
   * @param {object} group a group
   * @param {boolean} wasInUserInput true is the user previously selected that choice
   * @returns {object} the choice for a group
   */
  getChoiceForGroupOnInstall (name, group, wasInUserInput) {
    return {
      value: name,
      name: groupHandler.toString(name, group),
      checked: wasInUserInput || this.isSelectedByDefaultOnInstall(group),
      disabled: this.isDisabledByDefaultOnInstall(group)
    }
  },
  /**
   * Returns true if the group is selected by default and false otherwise.
   * @param {object} group the group
   * @returns {boolean} true if the group is selected by default and false otherwise
   */
  isSelectedByDefaultOnInstall (group) {
    return group.state === statesEnum.INSTALLED || group.isMandatory || this.isCandidateForAutomaticUpdate(group)
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
   * Returns true if the group is disabled by default and false otherwise.
   * @param {object} group the group
   * @returns {boolean} true if the group is disabled by default and false otherwise
   */
  isDisabledByDefaultOnInstall (group) {
    if (group.state === statesEnum.INSTALLED) {
      return group.state
    } else if (group.isMandatory) {
      return MANDATORY_TO_STR
    } else {
      return false
    }
  },

  // == Uninstall =============================================================
  /**
   * Get all the groups to uninstall.
   * Note: We are convertir all the single package to group to simplify their handling.
   * @param {object} existingPkgs the existing packages
   * @param {object} groupsToInstall the groups to install
   * @returns {object} contains all the groups to uninstall
   */
  getGroupsToUninstall (existingPkgs, groupsToInstall) {
    const packagesToUninstall = this.getPkgsToUninstall(existingPkgs, groupsToInstall)
    return groupHandler.createGroups(packagesToUninstall)
  },
  /**
   * Get the packages to uninstall.
   * @param {object} existingPkgs the existing packages
   * @param {object} groupsToInstall the groups to install
   * @returns {object} contains all the packages to uninstall
   */
  getPkgsToUninstall (existingPkgs, groupsToInstall) {
    let packagesToUninstall = {}
    const packagesToInstall = groupHandler.getPackages(groupsToInstall)
    for (let pkgName in existingPkgs) {
      const pkg = existingPkgs[pkgName]
      if (!packagesToInstall[pkgName]) {
        packagesToUninstall[pkgName] = pkg
      }
    }
    return packagesToUninstall
  },
  /**
   * Get the packages to uninstall.
   * @param {object} groups all the groups to uninstall
   * @returns {Promise} a promise that will return all the packages to uninstall
   */
  getSelectedPkgsToUninstall (groups) {
    return this.getSelectedPkgs(
      groups,
      QUESTION_UNINSTALL,
      this.getChoiceForGroupOnUninstall,
      this.getActionForGroupOnUninstall)
  },
  /**
   * Get the action that will need to be done for a group.
   * @param {string} name name of the group
   * @param {object} group the group
   * @param {boolean} isInUserInput true if the user selected that group and false otherwise
   * @returns {string} the action for this group
   */
  getActionForGroupOnUninstall (name, group, isInUserInput) {
    let action = actionsEnum.SKIP

    if (isInUserInput && group.state === statesEnum.INSTALLED) {
      action = actionsEnum.REMOVE
    }
    return action
  },
  /**
   * Get the choices for a group.
   * @param {string} name the name of the group
   * @param {object} group a group
   * @param {boolean} wasInUserInput true is the user previously selected that choice
   * @returns {object} the choice for a group
   */
  getChoiceForGroupOnUninstall (name, group, wasInUserInput) {
    return {
      value: name,
      name: groupHandler.toString(name, group),
      checked: wasInUserInput || false,
      disabled: false
    }
  },

  // == User Input ============================================================
  /**
   * Get choices for the groups based on the function passed in parameter.
   * @param {object} groups all the groups the user can select
   * @param {object} question the question to ask to the user
   * @param {function} getChoicesFct the function call to get the choices
   * @param {object} previousUserInputs the previous user inputs (will be null on the first call of this method)
   * @returns {object} all the choices
   */
  getChoices (groups, question, getChoicesFct, previousUserInputs) {
    const choicesSelectedPreviously = (previousUserInputs !== undefined) ? previousUserInputs[question.name] : []
    return userInputHandler.getChoices(groups, getChoicesFct, choicesSelectedPreviously)
  },
  /**
   * Get the selection of the user.
   * @param {object} groups all the groups the user can select
   * @param {object} question the question to ask to the user
   * @param {function} getChoicesFct the function call to get the choices
   * @param {function} getActionByGroupFct the function call to get the actiond by group
   * @param {object} previousUserInputs the previous user inputs (will be null on the first call of this method)
   * @returns {Promise} a promise that will return all the selected groups
   */
  getSelectedPkgs (groups, question, getChoicesFct, getActionByGroupFct, previousUserInputs) {
    const choices = this.getChoices(groups, question, getChoicesFct, previousUserInputs)
    const promise = this.getUserInputForGroups(groups, question, choices)
    if (promise) {
      return promise.then((userInputs) => {
        // Once we get the input of the user, we display a summary and we ask
        // the user to confirm the action for each group.
        const actionByGroup = actionHandler.getByEntity(groups,
                                        userInputs[question.name],
                                        getActionByGroupFct)
        // Display summary
        console.log(this.getSummary(groups, actionByGroup))
        // Confirm choices
        return this.getConfirmedPkgsSelected(
          groups,
          actionByGroup,
          this.getPackagesToModify.bind(this),
          question,
          getChoicesFct,
          getActionByGroupFct,
          userInputs,
          this.getSelectedPkgs.bind(this))
      })
    }
  },
  /**
   * Get all the packages to install/uninstall based on the groups and the action for each group.
   * @param {object} groups all the groups
   * @param {object} actionByGroup the action that will be done for each group
   * @returns {array} a list of the packages to install
   */
  getPackagesToModify (groups, actionByGroup) {
    let packages = []
    for (let groupName in groups) {
      const group = groups[groupName]
      const action = actionByGroup[groupName]

      const pkgsToInstall = this.getPackagesToModifyByGroup(group, action)
      if (pkgsToInstall) {
        packages = packages.concat(pkgsToInstall)
      }
    }
    return packages
  },
  /**
   * Get the packages to install/uninstall for a group.
   * @param {object} group the group
   * @param {string} action the action to do on the group
   * @returns {array} a list of packages
   */
  getPackagesToModifyByGroup (group, action) {
    if (action === actionsEnum.OVERWRITE || action === actionsEnum.REMOVE) {
      return groupHandler.getPkgsBy(group, packageHandler.getPackageObj)
    }
  },
  /**
   * Prompt the user to confirm the actions selected for each group.
   * @param {object} groups all the groups the user can select
   * @param {object} actionByGroup the action that will be done for each group
   * @param {function} getSelectedFct the function call to get the selected packages
   * @param {object} question the question to ask to the user
   * @param {function} getChoicesFct the function call to get the choices
   * @param {function} getActionByGroupFct the function call to get the actiond by group
   * @param {object} userInputs the user inputs
   * @param {function} goBackToSelectionFct the function call to get go back to the selection
   * @returns {Promise} a promise that will return back the user to the selection or
   *          {object} a list of the packages selected
   */
  getConfirmedPkgsSelected (groups, actionByGroup, getSelectedFct, question, getChoicesFct, getActionByGroupFct,
      userInputs, goBackToSelectionFct) {
    if (this.isConfirmationRequired(actionByGroup)) {
      return this.getConfirmationUserInput(QUESTION_CONFIRM).then((confirmUserInput) => {
        if (confirmUserInput[QUESTION_CONFIRM.name]) {
          return getSelectedFct(groups, actionByGroup)
        } else {
          return goBackToSelectionFct(groups, question, getChoicesFct, getActionByGroupFct, userInputs)
        }
      })
    }
  },
  /**
   * Prompt the user for a confirmation.
   * @param {object} question the question to ask the user
   * @returns {Promise} the promise containing the user input
   */
  getConfirmationUserInput (question) {
    return userInputHandler.getUserInputForChoice(this,
      {type: 'confirm', name: question.name, message: question.message}, [])
  },
  /**
   * Returns true if the confirmation is required for the actions to be done by groups and false otherwise.
   * @param {object} actionByGroup the action that will be done for each group
   * @returns {boolean} true if the confirmation is required for the actions to be done by groups and false otherwise
   */
  isConfirmationRequired (actionByGroup) {
    return actionHandler.isAnyActionCompliant(actionByGroup, this.isConfirmationRequiredForGroup)
  },
  /**
   * Returns true if a confirmation is required for this group and false otherwise.
   * @param {string} action the action to do on the group
   * @returns {boolean} true if a confirmation is required for this group and false otherwise
   */
  isConfirmationRequiredForGroup (action) {
    return action !== actionsEnum.IDENTICAL
  },
  /**
   * Prompt the user with a set of choices for the groups.
   * @param {object} groups an object containing all the groups
   * @param {object} question the question to ask the user
   * @param {array} choices the choices that will be shown to the user
   * @returns {Promise} the promise containing the user input
   */
  getUserInputForGroups (groups, question, choices) {
    if (!_.isEmpty(choices)) {
      return userInputHandler.getUserInputForChoice(this,
        {type: 'checkbox', name: question.name, message: question.message}, choices)
    }
  },

  // == Summary ===============================================================
  /**
   * Get the summary for all the groups.
   * @param {object} groups all the groups
   * @param {object} actionByGroup the action that will be done for each group
   * @returns {string} a summary for all the groups
   */
  getSummary (groups, actionByGroup) {
    let summary = 'Summary\n'
    for (let groupName in groups) {
      summary += `${this.getSummaryByGroup(groupName, groups[groupName], actionByGroup[groupName])}\n`
    }
    return summary
  },
  /**
   * Get the summary for a group.
   * @param {string} name the name of the group
   * @param {object} group a group
   * @param {string} action the action to do on the group
   * @returns {string} a summary for a group
   */
  getSummaryByGroup (name, group, action) {
    if (name && group && action) {
      return `   ${actionHandler.toString(action)} ${groupHandler.toString(name, group)}`
    }
  }
}

// TODO reselect confirm go back
// Tests


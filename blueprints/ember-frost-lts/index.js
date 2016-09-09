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

const QUESTION_RECOMMENDED_GROUPS = {
  name: 'userInputRecommendGroups',
  message: 'Available packages (install)'
}

const QUESTION_OTHER_GROUPS = {
  name: 'userInputOtherGroups',
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
    const recommendedGroups = this.getRecommendedGroups(options, existingPkgs)
    const otherGroups = this.getOtherGroups(existingPkgs, recommendedGroups)

    const recommendGroupsPromise = this.getSelectedRecommendedPkgs(recommendedGroups)

    if (recommendGroupsPromise) {
      return recommendGroupsPromise.then((recommendedPackagesToModify) => {
        const otherGroupsPromise = this.getSelectedOtherPkgs(otherGroups)
        if (otherGroupsPromise) {
          return otherGroupsPromise.then((otherPackagesToModify) => {
            const pkgsToModify = objUtil.merge(otherPackagesToModify, recommendedPackagesToModify)
            return this.uninstallAndInstallPkgs(pkgsToModify)
          })
        } else {
          return this.uninstallAndInstallPkgs(recommendedPackagesToModify)
        }
      })
    } else {
      const otherGroupsPromise = this.getSelectedOtherPkgs(otherGroups)
      if (otherGroupsPromise) {
        return otherGroupsPromise.then((otherPackagesToModify) => {
          return this.uninstallAndInstallPkgs(otherPackagesToModify)
        })
      }
    }
  },
  /**
   * Uninstall and install the packages passed in parameter.
   * @param {object} packages the packages to install/uninstall
   * @returns {Promise} a promise to uninstall/install packages
   */
  uninstallAndInstallPkgs (packages) {
    console.log('Packages to install and uninstall', packages)

    // Unistall the packages
    let removePackagesPromise = this.unistallPkgs(packages)

    // Install the packages
    if (removePackagesPromise) {
      return removePackagesPromise.then(() => {
        return this.installPkgs(packages)
      })
    } else {
      return this.installPkgs(packages)
    }
  },
  /**
   * Uninstall the packages passed in parameter.
   * @param {object} packages the packages to install/uninstall
   * @returns {Promise} a promise to uninstall packages
   */
  unistallPkgs (packages) {
    if (packages && packages[actionsEnum.REMOVE]) {
      const packagesToUninstall = packages[actionsEnum.REMOVE]
      return this.removePackagesFromProject(packagesToUninstall)
    }
  },
  /**
   * Install the packages passed in parameter.
   * @param {object} packages the packages to install/uninstall
   * @returns {Promise} a promise to install packages
   */
  installPkgs (packages) {
    if (packages) {
      const packagesToInstall = packages[actionsEnum.OVERWRITE]
      if (packagesToInstall && !_.isEmpty(packagesToInstall)) {
        return this.addAddonsToProject({ packages: packagesToInstall })
      }
    }
  },

  // == Recommended packages ==================================================
  /**
   * Get all the recommended groups (mandatory and optional).
   * Note: We are convertir all the single package to group to simplify their handling.
   * @param {object} options all the options
   * @param {object} existingPkgs the existing packages
   * @returns {object} contains all the groups.
   */
  getRecommendedGroups (options, existingPkgs) {
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
    return objUtil.merge(mandatoryGroups, optionalGroups)
  },
  /**
   * Get the recommended packages.
   * @param {object} groups all recommended the groups
   * @returns {Promise} a promise that will return all the selected recommended packages
   */
  // TODO: note in pkg.json dependency node 5 + bcs of bind
  getSelectedRecommendedPkgs (groups) {
    return this.getSelectedPkgs(
      groups,
      QUESTION_RECOMMENDED_GROUPS,
      this.getChoiceForGroup.bind(this),
      this.getActionForRecommendedGroup)
  },
  /**
   * Get the action that will need to be done for a group.
   * @param {string} name name of the group
   * @param {object} group the group
   * @param {boolean} isInUserInput true if the user selected that group and false otherwise
   * @returns {string} the action for this group
   */
  getActionForRecommendedGroup (name, group, isInUserInput) {
    let action = actionsEnum.SKIP

    if (isInUserInput || group.isMandatory) {
      action = actionsEnum.OVERWRITE
    } else {
      if (group.state === statesEnum.INSTALLED) {
        action = actionsEnum.REMOVE
      }
    }

    return action
  },

  // == Other packages ========================================================
  /**
   * Get all the other groups.
   * Note: We are convertir all the single package to group to simplify their handling.
   * @param {object} existingPkgs the existing packages
   * @param {object} groupsToExclude all the groups that need to be excluded
   * @returns {object} contains all the other groups
   */
  getOtherGroups (existingPkgs, groupsToExclude) {
    const otherPackages = this.getOtherPkgs(existingPkgs, groupsToExclude)
    return groupHandler.createGroups(otherPackages)
  },
  /**
   * Get the other packages.
   * @param {object} existingPkgs the existing packages
   * @param {object} groupsToExclude the groups to exclude
   * @returns {object} contains all the other packages
   */
  getOtherPkgs (existingPkgs, groupsToExclude) {
    let otherPackages = {}
    const packagesToExclude = groupHandler.getPackageNames(groupsToExclude)

    for (let pkgName in existingPkgs) {
      const pkg = existingPkgs[pkgName]
      if (packagesToExclude.indexOf(pkgName) === -1) {
        otherPackages[pkgName] = pkg
      }
    }
    return otherPackages
  },
  /**
   * Get the other packages.
   * @param {object} groups all the other groups
   * @returns {Promise} a promise that will return all the other selected packages
   */
  getSelectedOtherPkgs (groups) {
    return this.getSelectedPkgs(
      groups,
      QUESTION_OTHER_GROUPS,
      this.getChoiceForGroup.bind(this),
      this.getActionForOtherGroup)
  },
  /**
   * Get the action that will need to be done for a group.
   * @param {string} name name of the group
   * @param {object} group the group
   * @param {boolean} isInUserInput true if the user selected that group and false otherwise
   * @returns {string} the action for this group
   */
  getActionForOtherGroup (name, group, isInUserInput) {
    let action = actionsEnum.SKIP

    if (group.state === statesEnum.INSTALLED) {
      if (isInUserInput) {
        action = actionsEnum.IDENTICAL
      } else {
        action = actionsEnum.REMOVE
      }
    }

    return action
  },

  // == Recommended and other packages ========================================
  /**
   * Get the choices for a group.
   * @param {string} name the name of the group
   * @param {object} group a group
   * @param {boolean} wasInUserInput true is the user previously selected that choice
   * @returns {object} the choice for a group
   */
  getChoiceForGroup (name, group, wasInUserInput) {
    return {
      value: name,
      name: groupHandler.toString(name, group),
      checked: (wasInUserInput === undefined) ? this.isGroupSelectedByDefault(group) : wasInUserInput,
      disabled: this.isGroupDisabledByDefault(group)
    }
  },
  /**
   * Returns true if the group is selected by default and false otherwise.
   * @param {object} group the group
   * @returns {boolean} true if the group is selected by default and false otherwise
   */
  isGroupSelectedByDefault (group) {
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
  isGroupDisabledByDefault (group) {
    if (group.isMandatory) {
      return MANDATORY_TO_STR
    }

    return false
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
    const choicesSelectedPreviously = (previousUserInputs === undefined) ? undefined : previousUserInputs[question.name]
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
          actionByGroup,
          { fct: this.getPackagesToModify.bind(this),
            params: {groups, actionByGroup}},
          { fct: this.getSelectedPkgs.bind(this),
            params: {groups, question, getChoicesFct, getActionByGroupFct, userInputs}})
      })
    }
  },
  /**
   * Get the packages to modify  by action for all the groups.
   * @param {object} groups all the groups
   * @param {object} actionByGroup the action that will be done for each group
   * @returns {object} a list of packages by action
   */
  getPackagesToModify (groups, actionByGroup) {
    let packagesByAction = {}
    for (let groupName in groups) {
      const group = groups[groupName]
      const action = actionByGroup[groupName]

      const pkgsToModifyByAction = this.getPackagesToModifyByActionForGroup(group, action)
      if (!_.isEmpty(pkgsToModifyByAction)) {
        let currentPackagesByAction = packagesByAction[action]

        if (!currentPackagesByAction) {
          currentPackagesByAction = []
        }

        packagesByAction[action] = currentPackagesByAction.concat(pkgsToModifyByAction[action])
      }
    }

    return packagesByAction
  },
  /**
   * Get the packages to modify  by action for this group.
   * @param {object} group the group
   * @param {string} action the action to do on the group
   * @returns {object} a list of packages by action
   */
  getPackagesToModifyByActionForGroup (group, action) {
    let packagesToModifyByAction = {}
    if (action === actionsEnum.OVERWRITE || action === actionsEnum.REMOVE) {
      packagesToModifyByAction[action] = groupHandler.getPkgsBy(group, packageHandler.getPackageObj)
    }

    return packagesToModifyByAction
  },
  /**
   * Prompt the user to confirm the actions selected for each group.
   * @param {object} actionByGroup the action that will be done for each group
   * @param {object} getSelected the function call to get the selected packages and it's parameters
   * @param {object} goBackToSelection the function call to get go back to the selection and it's parameters
   * @returns {Promise} a promise that will return back the user to the selection or
   *          {object} a list of the packages selected
   */
  getConfirmedPkgsSelected (actionByGroup, getSelected, goBackToSelection) {
    if (this.isConfirmationRequired(actionByGroup)) {
      return this.getConfirmationUserInput(QUESTION_CONFIRM).then((confirmUserInput) => {
        if (confirmUserInput[QUESTION_CONFIRM.name]) {
          const params = getSelected.params
          return getSelected.fct(params.groups, params.actionByGroup)
        } else {
          const params = goBackToSelection.params
          return goBackToSelection.fct(params.groups, params.question, params.getChoicesFct,
            params.getActionByGroupFct, params.userInputs)
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


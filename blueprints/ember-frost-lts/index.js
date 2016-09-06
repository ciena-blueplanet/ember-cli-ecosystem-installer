'use strict'

const _ = require('lodash')

const actionHandler = require('../../lib/models/action')
const userInputHandler = require('../../lib/ui/user-input')
const groupHandler = require('../../lib/models/group')
const externalAppPackagesUtil = require('../../lib/utils/external-app-packages')
const requestedPackagesUtil = require('../../lib/utils/requested-packages')
const objUtil = require('../../lib/utils/obj')

const USER_INPUT_INSTALL_PKGS = 'userInputInstallPkgs'
const USER_INPUT_INSTALL_PKGS_CONFIRM = 'confirmInstallPkgs'

const INSTALL_PKGS_MSG = 'Available packages'
const CONFIRMATION_MSG = 'Would you like to confirm the following choices'

module.exports = {
  description: 'Install requested packages',
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
   * Note: Some packages/groups are mandatory and the others are optional
   * @param {object} options all the options
   * @returns {object} a list of the packages to install
   */
  afterInstall: function (options) {
    const groups = this.getGroups(options)

    if (groups) {
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
  /**
   * Get all the groups to install (mandatory and optional).
   * Note: We are convertir all the single package to group to simplify their handling.
   * @param {object} options all the options
   * @returns {object} contains all the groups.
   */
  getGroups (options) {
    const existingPkgs = externalAppPackagesUtil.getExistingPkgs(options)
    const isThisAddonInstalled = externalAppPackagesUtil.isThisAddonInstalled(options)

    // Get the mandatory groups
    const mandatoryRequestedGroupsNPkgs = requestedPackagesUtil.getMandatoryGroupsNPkgs(options)
    const mandatoryGroups = groupHandler.createGroups(mandatoryRequestedGroupsNPkgs, existingPkgs,
                        isThisAddonInstalled, true)

    // Get the optional groups
    const optionalRequestedGroupsNPkgs = requestedPackagesUtil.getOptionalGroupsNPkgs(options)
    const optionalGroups = groupHandler.createGroups(optionalRequestedGroupsNPkgs, existingPkgs,
                        isThisAddonInstalled, false)

    // Get all the groups
    return objUtil.merge([mandatoryGroups, optionalGroups])
  },
  /**
   * Install all the packages requested.
   * @param {object} groups all the groups to install
   * @returns {Promise} a promise that will return all the packages to install
   */
  installPkgs (groups) {
    const promise = this.selectPkgs(groups)
    if (promise) {
      return promise.then((userInputHandlers) => {
        // Once we get the input of the user, we display a summary and we ask
        // the user to confirm the groups to add.
        const actionByGroup = actionHandler.getByEntity(groups,
                                        userInputHandlers[USER_INPUT_INSTALL_PKGS],
                                        groupHandler.getActionForGroup)
        console.log(this.getSummary(groups, actionByGroup))
        if (this.isConfirmationRequiredForPkgInstallation(actionByGroup)) {
          return this.confirmPkgsSelection(groups, actionByGroup)
        }
      })
    }
  },
  /**
   * Prompt the user to select the groups to install.
   * @param {object} groups all the groups to install
   * @returns {Promise} a promise that will return the user inputs
   */
  selectPkgs (groups) {
    return this.getUserInputForGroups(groups, USER_INPUT_INSTALL_PKGS, INSTALL_PKGS_MSG)
  },
  /**
   * Prompt the user to confirm the actions selected for each group.
   * @param {object} groups all the groups to install
   * @param {object} actionByGroup the action that will be done for each group
   * @returns {Promise} a promise that will return back the user to the selection or
   *          {object} a list of the packages to install
   */
  confirmPkgsSelection (groups, actionByGroup) {
    return this.getConfirmationUserInput(USER_INPUT_INSTALL_PKGS_CONFIRM, CONFIRMATION_MSG)
      .then((confirmuserInputHandler) => {
        if (confirmuserInputHandler[USER_INPUT_INSTALL_PKGS_CONFIRM]) {
          return this.getPackagesToInstall(groups, actionByGroup)
        } else {
          return this.installPkgs(groups)
        }
      })
  },
  /**
   * Returns true if the confirmation is required for the actions to be done by groups and false otherwise.
   * @param {object} actionByGroup the action that will be done for each group
   * @returns {boolean} true if the confirmation is required for the actions to be done by groups and false otherwise
   */
  isConfirmationRequiredForPkgInstallation (actionByGroup) {
    return actionHandler.isConfirmationRequired(actionByGroup, groupHandler.isConfirmationRequiredForGroup)
  },
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
  },
  /**
   * Prompt the user with a set of choices for the groups.
   * @param {object} groups an object containing all the groups
   * @param {string} inputName the name of the user input
   * @param {string} inputMessage the message that will be prompt to the user
   * @returns {Promise} the promise containing the user input
   */
  getUserInputForGroups (groups, inputName, inputMessage) {
    let choices = userInputHandler.getChoices(groups, this.getChoiceForGroup)
    if (!_.isEmpty(choices)) {
      return userInputHandler.getUserInputForChoice(this, 'checkbox', inputName, inputMessage, choices)
    }
  },
  /**
   * Get the choices for a group.
   * @param {string} name the name of the group
   * @param {object} group a group
   * @returns {object} the choice for a group
   */
  getChoiceForGroup (name, group) {
    return {
      value: name,
      name: groupHandler.toString(name, group),
      checked: groupHandler.isSelectedByDefault(group),
      disabled: groupHandler.isDisabledByDefault(group)
    }
  },
  /**
   * Prompt the user for a confirmation.
   * @param {string} inputName the name of the user input
   * @param {string} inputMessage the message that will be prompt to the user
   * @returns {Promise} the promise containing the user input
   */
  getConfirmationUserInput (inputName, inputMessage) {
    return userInputHandler.getUserInputForChoice(this, 'confirm', inputName, inputMessage, [])
  },
  /**
   * Get all the packages to install based on the groups and the action for each group.
   * @param {object} groups all the groups
   * @param {object} actionByGroup the action that will be done for each group
   * @returns {array} a list of the packages to install
   */
  getPackagesToInstall (groups, actionByGroup) {
    let packages = []
    for (let groupName in groups) {
      const group = groups[groupName]
      const action = actionByGroup[groupName]

      const pkgsToInstall = groupHandler.getPackagesToInstallByGroup(group, action)
      if (pkgsToInstall) {
        packages = packages.concat(pkgsToInstall)
      }
    }
    return packages
  }
}

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


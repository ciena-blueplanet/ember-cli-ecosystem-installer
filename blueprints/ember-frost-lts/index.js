'use strict'

const _ = require('lodash')

const actionHandler = require('../lib/models/action')
const userInputHandler = require('../lib/utils/user-input')
const groupHandler = require('../lib/models/group')
const externalAppPackagesUtil = require('../lib/utils/external-app-packages')
const requestedPackagesUtil = require('../lib/utils/requested-packages')

const USER_INPUT_INSTALL_PKGS = 'userInputInstallPkgs'
const USER_INPUT_INSTALL_PKGS_CONFIRM = 'confirmInstallPkgs'

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
   * @param {object} options all the options
   * @returns {object} a list of the packages to install
   */
  afterInstall: function (options) {
    let requestedGroupsNPkgs = requestedPackagesUtil.getGroupsNPkgs(options)
    let existingPkgs = externalAppPackagesUtil.getExistingPkgs(options)
    let groups = groupHandler.createGroups(requestedGroupsNPkgs, existingPkgs,
                        externalAppPackagesUtil.isThisAddonInstalled(options))

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
  installPkgs (groups) {
    const promise = this.selectPkgs(groups)
    if (promise) {
      return promise.then((userInputHandlers) => {
        const actionByGroup = actionHandler.getActionByEntity(groups,
                                        userInputHandlers[USER_INPUT_INSTALL_PKGS],
                                        groupHandler.getActionForGroup)
        console.log(this.getSummary(groups, actionByGroup))
        if (this.isConfirmationRequiredForPkgInstallation(actionByGroup)) {
          return this.confirmPkgsSelection(groups, actionByGroup)
        }
      })
    }
  },
  isConfirmationRequiredForPkgInstallation (actionByGroup) {
    return actionHandler.isConfirmationRequiredForActions(actionByGroup, groupHandler.isConfirmationRequiredForGroup)
  },
  selectPkgs (groups) {
    return this.getUserInputForGroups(groups, USER_INPUT_INSTALL_PKGS, 'Available packages')
  },
  confirmPkgsSelection (groups, actionByGroup) {
    return this.getConfirmationUserInput(USER_INPUT_INSTALL_PKGS_CONFIRM, 'Would you like to confirm the following choices')
      .then((confirmuserInputHandler) => {
        if (confirmuserInputHandler[USER_INPUT_INSTALL_PKGS_CONFIRM]) {
          return this.getPackagesToInstall(groups, actionByGroup)
        } else {
          return this.installPkgs(groups)
        }
      })
  },
  getSummary (groups, actionByGroup) {
    let summary = 'Summary\n'
    for (let groupName in groups) {
      summary += `${this.getSummaryByGroup(groupName, groups[groupName], actionByGroup[groupName])}\n`
    }
    return summary
  },
  getSummaryByGroup (name, group, action) {
    if (name && group && action) {
      return `   ${actionHandler.getActionToStr(action)} ${groupHandler.getGroupToStr(name, group)}`
    }
  },
  getUserInputForGroups (groups, inputName, inputMessage) {
    let choices = userInputHandler.getChoices(groups, this.getChoiceForGroup)
    if (!_.isEmpty(choices)) {
      return userInputHandler.getUserInputForChoice(this, 'checkbox', inputName, inputMessage, choices)
    }
  },
  getConfirmationUserInput (inputName, inputMessage) {
    return userInputHandler.getUserInputForChoice(this, 'confirm', inputName, inputMessage, [])
  },

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
  },
  getChoiceForGroup (context, name, group) {
    const isInstalledOrMandatory = groupHandler.isInstalledOrMandatory(group)
    const isCandidateForAutomaticUpdate = groupHandler.isCandidatForAutomaticUpdate(group)

    return {
      value: name,
      name: groupHandler.getGroupToStr(name, group),
      checked: isInstalledOrMandatory || isCandidateForAutomaticUpdate,
      disabled: (isInstalledOrMandatory) ? group.state : false
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

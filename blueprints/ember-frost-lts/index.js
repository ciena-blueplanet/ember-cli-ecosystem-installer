'use strict'

const chalk = require('chalk')
const _ = require('lodash')

const defaultLtsFile = require('../../lts.json')

const ANSWERS = {
  OVERWRITE: 'overwrite',
  SKIP: 'skip',
  IDENTICAL: 'identical'
}

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
    let groups = this.getGroups(options)
    if (groups) {
      // Get the groups that need to be installed and required user input
      const groupsRequireInstallation = this.getGroupsMatchingCondition(groups, this.isPkgInstallationRequired)
      let groupRequireUserInput = groupsRequireInstallation
      if (this.isOnLts()) {
        groupRequireUserInput = this.getGroupsMatchingCondition(groupRequireUserInput, this.isUserInputRequired)
      }

      // Get the messages to prompt the user with
      const messagesPerGroup = this.getMessagesPerGroup(groupRequireUserInput)
      // TODO validate that if we don't need user input we will still go here
      return this.promptUser(messagesPerGroup).then((answers) => {
        let packages = []

        for (let name in groups) {
          let answer = this.getAnswer(name, answers, groupsRequireInstallation, groupRequireUserInput)

          const group = groups[name]
          let chalkColor = chalk.yellow

          if (answer === ANSWERS.OVERWRITE) {
            let pkgs = this.getPackagesToInstall(name, group)
            if (pkgs) {
              packages = packages.concat(pkgs)
            }
            chalkColor = chalk.red
          }

          console.log(`  ${chalkColor(answer)} ${this.getGroupToStr(name, group)}`)
        }

        if (packages && packages.length > 0) {
          return this.addAddonsToProject({
            packages: packages
          })
        }
      })
    }
  },
  /**
   * Returns true if the application/addon is on an LTS and false otherwise.
   * @returns {boolean} true if the application/addon is on an LTS and false otherwise
   */
  isOnLts () {
    return false
  },
  /**
   * Get the user answer for a group. It's possible that the user is not providing any answer.
   * @param {string} groupName the name of the group
   * @param {object} answers all the answers provided by the user
   * @param {object} groupsRequireInstallation groups that require installation
   * @param {object} groupRequireUserInput groups that require user input
   * @returns {ANSWERS} an answer
   */
  getAnswer (groupName, answers, groupsRequireInstallation, groupRequireUserInput) {
    let answer = answers[groupName]

    // If the user is not providing any answer we will handle a few specific cases
    if (!answer) {
      const isAlreadyInstalled = groupsRequireInstallation[groupName] === undefined
      const isUserInputNotRequired = groupRequireUserInput[groupName] === undefined

      if (isAlreadyInstalled) {
        answer = ANSWERS.IDENTICAL
      } else if (isUserInputNotRequired) {
        // automatically overwrite if the user input is not necessary
        answer = ANSWERS.OVERWRITE
      }
    }

    return answer
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
   * Get a the messages we will ask to the user.
   * @param {object} groups the groups
   * @returns {object} the messages
   */
  getMessagesPerGroup (groups) {
    let messages = {}
    for (let name in groups) {
      const message = this.getGroupToStr(name, groups[name])
      if (message) {
        messages[name] = message
      }
    }
    return messages
  },
  /**
   * Prompt the user with a message.
   * @param {object} messagesPerGroup the message to ask per group
   * @returns {Promise} the prompt Promise
   */
  promptUser (messagesPerGroup) {
    let userPrompts = []
    for (let group in messagesPerGroup) {
      let message = messagesPerGroup[group]
      if (message) {
        userPrompts.push({
          type: 'expand',
          name: group,
          message: `${chalk.red(this.capitalizeFirstLetter(ANSWERS.OVERWRITE))} ${message}?`,
          choices: [
            { key: 'y', name: 'Yes, overwrite', value: ANSWERS.OVERWRITE },
            { key: 'n', name: 'No, skip', value: ANSWERS.SKIP }
            // TODO { key: 'd', name: 'Diff', value: ANSWERS.SKIP }
          ]
        })
      }
    }

    return this.ui.prompt(userPrompts)
  },
  /**
   * Capitalize the first letter of a string.
   * @param {string} text a text
   * @returns {string} text with the first letter capitalized
   */
  capitalizeFirstLetter (text) {
    return text.charAt(0).toUpperCase() + text.slice(1)
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
  getPackagesToInstall (name, group) {
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
   * Get all the groups of packages.
   * @param {object} options all the options
   * @returns {object} the group of packages
   */
  getGroups (options) {
    let requestedGroupsNPkgs = this.getRequestedGroupsNPkgs(options)
    let existingPkgs = this.getExistingPkgs(options)
    return this.createGroups(requestedGroupsNPkgs, existingPkgs)
  },
  /**
   * Get a the existing packages in the application/addon.
   * @returns {array} the existing packages
   * @param {object} options all the options
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
    let groups = {}
    for (let groupNPkgName in requestedGroupsNPkgs) {
      let pkgs = {}

      const requestGroupNPkg = requestedGroupsNPkgs[groupNPkgName]
      if (this.isGroup(requestGroupNPkg)) {
        const group = requestGroupNPkg

        if (this.isValidGroup(group)) {
          const requestedPkgs = this.getGroupPkgs(group)
          for (let pkgName in requestedPkgs) {
            const target = requestedPkgs[pkgName]

            if (this.isValidPkg(pkgName, target)) {
              pkgs[pkgName] = this.createPkg(pkgName, target, existingPkgs)
            }
          }

          if (pkgs && !_.isEmpty(pkgs)) {
            groups[groupNPkgName] = this.createGroup(pkgs)
          }
        }
      } else {
        const target = requestedGroupsNPkgs[groupNPkgName]
        const name = groupNPkgName

        if (this.isValidPkg(name, target)) {
          groups[name] = this.createGroupFromPackage(name, this.createPkg(name, target, existingPkgs))
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
  createGroup (packages) {
    let group = { isGroup: true }
    group['packages'] = packages
    return group
  },
  /**
   * Create a group from a package.
   * @param {string} name the name of the package that will also be used as the name of the group
   * @param {objec} pkg the package
   * @returns {object} a group
   */
  createGroupFromPackage (name, pkg) {
    let group = this.createGroup({})
    group.isGroup = false
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
      installedTarget: existingTarget
    }
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
  }
}
// TODO LTS
// Add tests

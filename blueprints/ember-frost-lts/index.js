'use strict'

const chalk = require('chalk')
const _ = require('lodash')

const defaultLtsFile = require('../../lts.json')

const ANSWERS = { OVERWRITE: 'overwrite', SKIP: 'skip', IDENTICAL: 'identical'}

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
    let groupsNPkgs = this.getGroupsNPkgs(options)
    if (groupsNPkgs) {
      // const installedGroupsNPkgs = this.getInstalled()
      // let groupsNPkgsUserInputRequired = this.removeAlreadyInstalled(groupsNPkgs, installedGroupsNPkgs)
      // if (this.isOnLts()) {
      //   groupsNPkgsUserInputRequired = this.getGroupsNPkgsUserInputRequired(groupsNPkgsUserInputRequired)
      // }
      let groupsNPkgsUserInputRequired = this.getGroupsNPkgsUserInputRequired(groupsNPkgs, this.isPkgInstallationRequired)
      const questionsPerGroupNPkg = this.getQuestionsPerGroupNPkg(groupsNPkgsUserInputRequired)
      // TODO validate that if we don't need user input we will still go here
      return this.promptUser(questionsPerGroupNPkg).then((answers) => {
        let packages = []

        for (let name in groupsNPkgs) {
          let answer = answers[name]
          const groupNPkg = groupsNPkgs[name]

          if (!answer) {
            answer = ANSWERS.IDENTICAL
            // already installed? identical
            // automatically overwrite
          }

          let groupNPkgToString = this.getPackagesToStr(name, groupNPkg)

          // If the user confirm that he wants to install the package/group, the answer will be true.
          if (answer === ANSWERS.OVERWRITE) {
            // Get the package or the packages of a group.
            let pkgs = this.getPackagesToInstall(name, groupNPkg)
            if (pkgs) {
              packages = packages.concat(pkgs)
            }
            console.log(`  ${chalk.green(answer)} ${groupNPkgToString}`)
          } else {
            console.log(`  ${chalk.yellow(answer)} ${groupNPkgToString}`)
          }
        }

        if (packages && packages.length > 0) {
          return this.addAddonsToProject({
            packages: packages
          })
        }
      })
    }
  },
  isOnLts () {
    return false
  },
  doActionOnPackagesIfConditionFullfill (groupsNPkgs, condition, operation) {
    let groupsNPkgsUserInputRequired = {}
    for (let name in groupsNPkgs) {
      const groupNPkg = groupsNPkgs[name]
      let hasDifference = false
      if (this.isGroup(groupNPkg)) {
        const pkgs = this.getGroupPkgs(groupNPkg)
        for (let pkgName in pkgs) {
          const pkg = pkgs[pkgName]
          if (isPkgInstallationRequiredFct(pkg)) {
            hasDifference = true
          }
        }
      } else {
        if (isPkgInstallationRequiredFct(groupNPkg)) {
            hasDifference = true
        }
      }

      if (hasDifference) {
        groupsNPkgsUserInputRequired[name] = groupNPkg
      }
    }

    return groupsNPkgsUserInputRequired
  },

  // TODO Same group content or same package
  // TODO clean code
  getGroupsNPkgsUserInputRequired (groupsNPkgs, isPkgInstallationRequiredFct) {
    let groupsNPkgsUserInputRequired = {}
    for (let name in groupsNPkgs) {
      const groupNPkg = groupsNPkgs[name]
      let hasDifference = false
      if (this.isGroup(groupNPkg)) {
        const pkgs = this.getGroupPkgs(groupNPkg)
        for (let pkgName in pkgs) {
          const pkg = pkgs[pkgName]
          if (isPkgInstallationRequiredFct(pkg)) {
            hasDifference = true
          }
        }
      } else {
        if (isPkgInstallationRequiredFct(groupNPkg)) {
            hasDifference = true
        }
      }

      if (hasDifference) {
        groupsNPkgsUserInputRequired[name] = groupNPkg
      }
    }

    return groupsNPkgsUserInputRequired
  },
  isPkgInstallationRequired (pkg) {
    return !pkg.installedTarget || pkg.installedTarget !== pkg.target
  },
  isPkgInstallationRequiredOnLts (pkg) {
    return !pkg.installedTarget
  },
  /**
   * Get a the questions we will ask to the user.
   * @param {object} groupsNPkgs the packages/groups
   * @returns {object} the questions
   */
  getQuestionsPerGroupNPkg (groupsNPkgs) {
    let questions = {}
    for (let name in groupsNPkgs) {
      const question = this.getQuestion(name, groupsNPkgs[name])
      if (question) {
        questions[name] = question
      }
    }
    return questions
  },
  promptUser (questionsPerGroupNPkg) {
    let userPrompts = []
    for (let groupNPkg in questionsPerGroupNPkg) {
      let message = questionsPerGroupNPkg[groupNPkg]
      if (message) {
        userPrompts.push({
          type: 'expand',
          name: groupNPkg,
          message: `${chalk.red(this.capitalizeFirstLetter(ANSWERS.OVERWRITE))} ${message}?`,
          choices: [
            { key: 'y', name: 'Yes, overwrite', value: ANSWERS.OVERWRITE },
            { key: 'n', name: 'No, skip', value: ANSWERS.SKIP },
            // TODO { key: 'd', name: 'Diff', value: ANSWERS.SKIP }
          ]
        })
      }
    }

    return this.ui.prompt(userPrompts)
  },
  capitalizeFirstLetter (text) {
    return text.charAt(0).toUpperCase() + text.slice(1)
  },
  /**
   * Get a the question we will ask to the user.
   * @param {string} name the name of the package/group
   * @param {object} groupNPkg the package/group
   * @returns {object} a question
   */
  getQuestion (name, groupNPkg) {
    if (name && groupNPkg) {
      return this.getPackagesToStr(name, groupNPkg)
    }
  },
  /**
   * TODO
   * @param {string} name the name of the package/group
   * @param {object} groupNPkg the package/group
   * @returns {string} a message
   */
  getPackagesToStr (name, groupNPkg) {
    if (this.isGroup(groupNPkg)) {
      const packages = this.getGroupPackages(groupNPkg, this.getPackageToStr)
      if (packages) {
        const pkgToStr = (packages &&  !_.isEmpty(packages)) ? `(${packages.join(', ')})` : ''
        return `${name} ${pkgToStr}`
      }
    } else {
      let pkg = this.getPackageToStr(name, groupNPkg)
      if (pkg) {
        return `${pkg}`
      }
    }
  },
  /**
   * Get the package or the packages for a group.
   * @param {string} name the name of the package/group
   * @param {object} groupNPkg the package/group
   * @returns {array} a package or a list of packages
   */
  getPackagesToInstall (name, groupNPkg) {
    if (this.isGroup(groupNPkg)) {
      return this.getGroupPackages(groupNPkg, this.getPackageToInstall)
    } else {
      return this.getPackageToInstall(name, groupNPkg)
    }
  },
  /**
   * Get a package object.
   * @param {string} name the name of the package
   * @param {object} pkg the package information
   * @returns {object} the package object
   */
  getPackageToInstall (name, pkg) {
    if (name && pkg && pkg.target && pkg.target !== pkg.installedTarget) {
      return {name, target: pkg.target}
    }
  },
  /**
   * Get a package to string.
   * @param {string} name the name of the package
   * @param {object} pkg the package information
   * @returns {string} the package to string
   */
  getPackageToStr (name, pkg) {
    return name + '@' + pkg.target
      // TODO if (pkg.installedTarget !== pkg.target) {
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
   * Get a the packages and group of packages.
   * @param {object} options all the options
   * @returns {object} the packages and group of packages
   */
  getGroupsNPkgs (options) {
    let requestedGroupsNPkgs = this.getRequestedGroupsNPkgs(options)
    let existingPkgs = this.getExistingPkgs(options)
    return this.createGroupsNPkgs(requestedGroupsNPkgs, existingPkgs)
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
   * Create the packages and group of packages based on the requested and existing packages.
   * @param {object} requestedGroupsNPkgs the requested pckages and group of packages
   * @param {object} existingPkgs the existing pckages
   * @returns {object} the packages and group of packages
   */
  createGroupsNPkgs (requestedGroupsNPkgs, existingPkgs) {
    let groupsNPkgs = {}
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
            groupsNPkgs[groupNPkgName] = this.createGroup(pkgs)
          }
        }
      } else {
        const target = requestedGroupsNPkgs[groupNPkgName]
        const name = groupNPkgName

        if (this.isValidPkg(name, target)) {
          groupsNPkgs[name] = this.createPkg(name, target, existingPkgs)
        }
      }
    }

    return groupsNPkgs
  },
  /**
   * Create a group.
   * @param {object} packages contains a all the packages for a group
   * @returns {object} a group
   */
  createGroup (packages) {
    let group = {}
    group['packages'] = packages
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
  isValidGroup (group) {
    return group.packages && !_.isEmpty(group.packages)
  },
  isValidPkg (name, target) {
    return name && target && typeof name === 'string' && typeof target === 'string'
  }
}

// add tests
// - New packages
//     - Accept or reject any changes
//     - Show the diff. to tell what's new
// - Already have the packages
//     - Not on LTS
//         - Handle like new packages
//     - Already on an LTS
//         - Automatically update to the latest the packages
//           you already have
//         - Show the user the packages you updated

// rename question to message or pckg or something like that

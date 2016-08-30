'use strict'

const defaultLtsFile = require('../../lts.json')

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
      return this.ui.prompt(this.getQuestions(groupsNPkgs)).then((answers) => {
        let packages = []

        for (let name in answers) {
          const answer = answers[name]

          // If the user confirm that he wants to install the package/group, the answer will be true.
          if (answer) {
            const groupNPkg = groupsNPkgs[name]
            // Get the package or the packages of a group.
            let pkgs = this.getPackagesToInstall(name, groupNPkg)
            if (pkgs) {
              packages = packages.concat(pkgs)
            }
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
  /**
   * Get a the questions we will ask to the user.
   * @param {object} groupsNPkgs the packages/groups
   * @returns {object} the questions
   */
  getQuestions (groupsNPkgs) {
    let questions = []
    for (let name in groupsNPkgs) {
      const question = this.getQuestion(name, groupsNPkgs[name])
      if (question) {
        questions.push(question)
      }
    }
    return questions
  },
  /**
   * Get a the question we will ask to the user.
   * @param {string} name the name of the package/group
   * @param {object} groupNPkg the package/group
   * @returns {object} a question
   */
  getQuestion (name, groupNPkg) {
    if (name && groupNPkg) {
      const message = this.getMessage(name, groupNPkg)
      if (message) {
        return {
          message: message,
          type: 'confirm',
          name: name
        }
      }
    }
  },
  /**
   * Get a message that will be shown to the user.
   * @param {string} name the name of the package/group
   * @param {object} groupNPkg the package/group
   * @returns {string} a message
   */
  getMessage (name, groupNPkg) {
    if (this.isGroup(groupNPkg)) {
      const packages = this.getGroupPackages(groupNPkg, this.getPackageToStr)
      if (packages && packages.length > 0) {
        return `${name} (${packages.join(', ')}) ?`
      } else {
        console.log(`Nothing to install in ${name}`)
      }
    } else {
      let pkg = this.getPackageToStr(name, groupNPkg)
      if (pkg) {
        return `${pkg} ?`
      } else {
        console.log(`Invalid package: ${name}`)
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
    if (name && pkg && pkg.target &&
        typeof name === 'string' && typeof pkg.target === 'string') {
      const pkgToStr = name + '@' + pkg.target
      if (pkg.installedTarget !== pkg.target) {
        return pkgToStr
      } else {
        console.log(`Package already installed: ${pkgToStr}`)
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
        const requestedPkgs = this.getGroupPkgs(requestGroupNPkg)
        for (let pkgName in requestedPkgs) {
          pkgs[pkgName] = this.createPkg(pkgName, requestedPkgs[pkgName], existingPkgs)
        }

        groupsNPkgs[groupNPkgName] = this.createGroup(pkgs)
      } else {
        groupsNPkgs[groupNPkgName] = this.createPkg(groupNPkgName, requestedGroupsNPkgs[groupNPkgName], existingPkgs)
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

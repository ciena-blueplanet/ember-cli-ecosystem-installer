'use strict'
let lts = require('../../lts.json')

module.exports = {
  description: 'Install requested packages of an LTS',
  normalizeEntityName: function() {},
  /**
   * Query the user to determine which packages/groups he wants to install.
   * @returns a list of the packages to install
   */
  afterInstall: function () {
    const self = this

    console.log('Would you like to install the following packages:')

    let groupsNPkgs = this.getGroupsNPkgs()
    if (groupsNPkgs) {
      return this.ui.prompt(this.getQuestions()).then(function (answers) {
        let packages = []

        for (let name in answers) {
          const answer = answers[name]
          // If the user confirm that he wants to install the package/group, the answer will be true.
          if (answer) {
            const groupNPkg = groupsNPkgs[name]
            // Get the package or the packages of a group.
            packages = packages.concat(self.getPackages(name, groupNPkg))
          }
        }

        if (packages && packages.length > 0) {
          return self.addAddonsToProject({
            packages: packages
          })
        }
      })
    }
  },
  /**
   * Get a the packages and group of packages.
   * @returns the packages and group of packages
   */
  getGroupsNPkgs () {
    return lts
  },
  /**
   * Get a the questions we will ask to the user.
   * @returns the questions
   */
  getQuestions () {
    let questions = []
    const groupsNPkgs = this.getGroupsNPkgs()
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
   * @returns a question
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
   * @returns a message
   */
  getMessage (name, groupNPkg) {
    if (this.isGroup(groupNPkg)) {
      const packages = this.getGroupPackages(groupNPkg, this.getPackageToStr)
      if (packages && packages.length > 0) {
        return `${name} (${packages.join(', ')}) ?`
      } else {
        console.log(`Invalid group: ${name}`)
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
   * @returns a package or a list of packages
   */
  getPackages (name, groupNPkg) {
    if (this.isGroup(groupNPkg)) {
      return this.getGroupPackages(groupNPkg, this.getPackage)
    } else {
      return this.getPackage(name, groupNPkg)
    }
  },
  /**
   * Get a package object.
   * @param {string} name the name of the package
   * @param {string} target the version of the package
   * @returns the package object
   */
  getPackage (name, target) {
    return {name, target}
  },
  /**
   * Get a package to string.
   * @param {string} name the name of the package
   * @param {string} target the version of the package
   * @returns the package to string
   */
  getPackageToStr (name, target) {
    if (name && target && typeof name === 'string' && typeof target === 'string') {
      return name + '@' + target
    }
  },
  /**
   * Get all the packages for a group.
   * @param {oject} group a group
   * @param {function} getPackage a function that will be called for every packages in the group
   * @returns a list of all the packages in the group
   */
  getGroupPackages (group, getPackage) {
    let packages = []
    for (let name in group.packages) {
      packages.push(getPackage(name, group.packages[name]))
    }
    return packages
  },
  /**
   * Returns true if it's a group and false otherwise.
   * @returns return true if it's a group and false otherwise.
   */
  isGroup (group) {
    return group.packages !== undefined
  }
}

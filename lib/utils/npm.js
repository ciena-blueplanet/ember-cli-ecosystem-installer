'use strict'

const spawn = require('child-process-promise').spawn
const Promise = require('promise')

module.exports = {
  /**
   * Run an npm command.
   * @param {string} command the name of the npm command (view, install, unistall, etc.)
   * @param {array} args a list of arguments
   * @param {object} options the options of the command
   * @returns {Promise} a promise that will return the command result once it's run
   */
  run (command, args, options) {
    return spawn('npm', [command].concat(args), options || {})
  },
  /**
   * Get the information about an npm package.
   * @param {string} pkg the package name@target
   * @returns {Promise} a promise that will return the information of an npm package in JSON format
   */
  view (pkg) {
    return this.run('view', ['--json'].concat(pkg), {capture: ['stdout']})
      .then((result) => {
        return new Promise((resolve, reject) => {
          resolve(JSON.parse(result.stdout.toString()))
        })
      })
  }
}

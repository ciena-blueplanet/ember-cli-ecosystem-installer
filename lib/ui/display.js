'use strict'

const chalk = require('chalk')
const Spinner = require('cli-spinner').Spinner

module.exports = {
  /**
   * Display an error message.
   * @param {string} title title of the message
   * @param {string} message the message
   */
  error (title, message) {
    console.log(`  ${chalk.red(title)} ${message}`)
  },
  /**
   * Display a title.
   * @param {string} title the title
   */
  title (title) {
    console.log(chalk.green(title))
  },
  /**
   * Display the message
   * @param {string} message the message to display
   */
  message (message) {
    console.log(`  ${message}`)
  },
  /**
   * Display a carriage return.
   */
  carriageReturn () {
    console.log('')
  },
  /**
   * Get a spinner
   * @param {string} message the message that will be display next to the spinner
   * @returns {Spinner} a spinner
   */
  getSpinner (message) {
    let spinner = new Spinner(message)
    spinner.setSpinnerString(18)
    return spinner
  }
}

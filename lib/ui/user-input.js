'use strict'

const _ = require('lodash')

module.exports = {
  /**
   * Get the choices where each entity is a choice.
   * @param {object} entities an object containing all the entities
   * @param {function} getChoiceForEntityFct function used to get the choice for an entity
   * @returns {array} all the choices
   */
  getChoices (entities, getChoiceForEntityFct) {
    let choices = []

    if (entities && getChoiceForEntityFct) {
      for (let entityId in entities) {
        const entity = entities[entityId]

        choices.push(getChoiceForEntityFct(entityId, entity))
      }
    }

    return choices
  },
  /**
   * Get the user input.
   * @param {string} type the type of the user input
   * @param {string} name the name of the user input
   * @param {string} message the message of the user input
   * @param {array} choices a list of the choices
   * @returns {object} the user input
   */
  _getUserInput (type, name, message, choices) {
    if (type && name && message && choices) {
      let userInput = {
        type: type,
        name: name,
        message: message
      }
      if (!_.isEmpty(choices)) {
        userInput['choices'] = choices
      }

      return userInput
    }
  },
  /**
   * Get a user prompt.
   * @param {object} context the current context
   * @param {array} userInputs a list of the user inputs
   * @returns {Promise} the promise which will return the user inputs once it's resolved
   */
  _promptUser (context, userInputs) {
    if (context && context.ui) {
      return context.ui.prompt(userInputs)
    }
  },
  /**
   * Get the user input for the choices
   * @param {object} context the current context (caller this)
   * @param {string} type the type of the input
   * @param {string} inputName the name of the input
   * @param {string} inputMessage the message of the input
   * @param {object} choices the choices of the input
   * @returns {Promise} the promise which will return the user inputs once it's resolved
   */
  getUserInputForChoice (context, type, inputName, inputMessage, choices) {
    let userInput
    if (choices) {
      userInput = this._getUserInput(type, inputName, inputMessage, choices)
    }

    if (userInput) {
      return this._promptUser(context, [userInput])
    }
  },
}

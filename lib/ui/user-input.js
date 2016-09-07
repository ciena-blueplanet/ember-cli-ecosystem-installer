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
   * Get a question.
   * @param {object} question the question
   * @param {array} choices a list of the choices
   * @returns {object} the user input
   */
  _getQuestion (question, choices) {
    if (question && question.type && question.name && question.message && choices) {
      let questionWithChoices = {
        type: question.type,
        name: question.name,
        message: question.message
      }
      if (!_.isEmpty(choices)) {
        questionWithChoices['choices'] = choices
      }

      return questionWithChoices
    }
  },
  /**
   * Get a prompt to ask questions to the user.
   * @param {object} context the current context
   * @param {array} questions a list of the questions to ask to the user
   * @returns {Promise} the promise which will return the user inputs once it's resolved
   */
  _promptUser (context, questions) {
    if (context && context.ui) {
      return context.ui.prompt(questions)
    }
  },
  /**
   * Get the user input for the choices
   * @param {object} context the current context
   * @param {object} question the question
   * @param {object} choices the choices for the question
   * @returns {Promise} the promise which will return the user inputs once it's resolved
   */
  getUserInputForChoice (context, question, choices) {
    let questionWithChoices
    if (choices) {
      questionWithChoices = this._getQuestion(question, choices)
    }

    if (questionWithChoices) {
      return this._promptUser(context, [questionWithChoices])
    }
  }
}

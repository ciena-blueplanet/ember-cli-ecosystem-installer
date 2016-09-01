'use strict'

const _ = require('lodash')

module.exports = {
  getChoices (entities, getChoiceForEntityFct) {
    let choices = []

    if (entities && getChoiceForEntityFct) {
      for (let entityId in entities) {
        const entity = entities[entityId]

        choices.push(getChoiceForEntityFct(this, entityId, entity))
      }
    }

    return choices
  },
  getUserInput (type, name, message, choices) {
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
  promptUser (context, userInputs) {
    return context.ui.prompt(userInputs)
  },
  getUserInputForChoice (context, type, inputName, inputMessage, choices) {
    let userInput
    if (choices) {
      userInput = this.getUserInput(type, inputName, inputMessage, choices)
    }

    if (userInput) {
      return this.promptUser(context, [userInput])
    }
  },
}

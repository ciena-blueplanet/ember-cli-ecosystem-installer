'use strict'

const chalk = require('chalk')

module.exports = {
  actionsEnum: {
    OVERWRITE: 'overwrite',
    SKIP: 'skip',
    IDENTICAL: 'identical',
    DIFF: 'diff'
  },
  getActionToStr (action) {
    const chalkColor = this._getChalkColorForAction(action)
    return chalkColor(action)
  },
  _getChalkColorForAction (action) {
    if (action === this.actionsEnum.IDENTICAL || action === this.actionsEnum.SKIP) {
      return chalk.yellow
    } else if (action === this.actionsEnum.OVERWRITE) {
      return chalk.red
    }
  },
  getActionByEntity (entities, userInputs, getActionForEntity) {
    let actionByEntity = {}
    if (entities) {
      for (let id in entities) {
        const entity = entities[id]

        const isInUserInput = userInputs && userInputs.indexOf(id) > -1
        actionByEntity[id] = getActionForEntity(id, entity, isInUserInput)
      }
    }

    return actionByEntity
  },
  isConfirmationRequiredForActions(actionByEntity, isConfirmationRequiredForAction){
    if (actionByEntity) {
      for (let id in actionByEntity) {
        const action = actionByEntity[id]
        if (isConfirmationRequiredForAction(action)) {
          return true
        }
      }
    }
    return false
  },
}

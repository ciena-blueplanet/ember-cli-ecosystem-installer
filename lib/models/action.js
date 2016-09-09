'use strict'

const chalk = require('chalk')

module.exports = {
  /**
   * The possible values for an action
   */
  actionsEnum: {
    OVERWRITE: 'overwrite',
    SKIP: 'skip',
    IDENTICAL: 'identical',
    DIFF: 'diff',
    REMOVE: 'remove'
  },
  /**
   * Get an action in string.
   * @param {string} action an action
   * @returns {string} action in string
   */
  toString (action) {
    const chalkColor = this._getChalkColor(action)
    return chalkColor(action)
  },
  /**
   * Get the chalk color for an action.
   * @param {string} action an action
   * @returns {function} the chalk color function for an action
   */
  _getChalkColor (action) {
    if (action === this.actionsEnum.IDENTICAL || action === this.actionsEnum.SKIP) {
      return chalk.yellow
    } else if (action === this.actionsEnum.OVERWRITE || action === this.actionsEnum.REMOVE) {
      return chalk.red
    }
  },
  /**
   * Get the action by for each entity.
   * @param {object} entities contains all the entities
   * @param {array} userInputs contains the id of the entity if the user selected that entity
   * @param {function} getActionForEntityFct function that return the action that map with this entity
   * @returns {object} the action for each entity
   */
  getByEntity (entities, userInputs, getActionForEntityFct) {
    let actionByEntity = {}
    if (entities) {
      for (let id in entities) {
        const entity = entities[id]

        const isInUserInput = userInputs && userInputs.indexOf(id) > -1
        actionByEntity[id] = getActionForEntityFct(id, entity, isInUserInput)
      }
    }

    return actionByEntity
  },
  /**
   * Return true if any action is compliant with the condition and false otherwise.
   * @param {object} actionByEntity the action for each entity
   * @param {function} isActionCompliantFct function to determine if the action is compliant
   * @returns {boolean} true if any action is compliant with the condition and false otherwise
   */
  isAnyActionCompliant (actionByEntity, isActionCompliantFct) {
    if (actionByEntity) {
      for (let id in actionByEntity) {
        const action = actionByEntity[id]
        if (isActionCompliantFct(action)) {
          return true
        }
      }
    }
    return false
  }
}

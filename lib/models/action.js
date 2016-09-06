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
    DIFF: 'diff'
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
    } else if (action === this.actionsEnum.OVERWRITE) {
      return chalk.red
    }
  },
  /**
   * Get the action by for each entity.
   * @param {object} entities contains all the entities
   * @param {array} userInputs contains the id of the entity if the user selected that entity
   * @param {function} getActionForEntity function that return the action that map with this entity
   * @returns {object} the action for each entity
   */
  getByEntity (entities, userInputs, getActionForEntity) {
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
  /**
   * Return true if all the entity do not require a confirmation and false otherwise.
   * @param {object} actionByEntity the action for each entity
   * @param {function} isConfirmationRequiredForAction function to determine if the action require a confirmation
   * @returns {boolean} true if all the entity do not require a confirmation and false otherwise
   */
  isConfirmationRequired (actionByEntity, isConfirmationRequiredForAction) {
    if (actionByEntity) {
      for (let id in actionByEntity) {
        const action = actionByEntity[id]
        if (isConfirmationRequiredForAction(action)) {
          return true
        }
      }
    }
    return false
  }
}

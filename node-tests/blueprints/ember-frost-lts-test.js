'use strict'

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers')
const setupTestHooks = blueprintHelpers.setupTestHooks
const emberNew = blueprintHelpers.emberNew
const emberGenerate = blueprintHelpers.emberGenerate
const modifyPackages = blueprintHelpers.modifyPackages

const chai = require('ember-cli-blueprint-test-helpers/chai')
const expect = chai.expect

const mocha = require('mocha')
const it = mocha.it
const describe = mocha.describe
const beforeEach = mocha.beforeEach
const afterEach = mocha.afterEach

const td = require('testdouble')

const requireFromCLI = require('ember-cli-blueprint-test-helpers/lib/helpers/require-from-cli')
const Blueprint = requireFromCLI('lib/models/blueprint')
const MockUI = requireFromCLI('tests/helpers/mock-ui')

const actionsEnum = require('../../blueprints/models/actions-enum')

/**
 * Expected behavior
 * - New packages
 *    - Accept or reject any changes
 *    - Show the diff. to tell what's new
 * - Already have the packages
 *    - Not on LTS
 *        - Handle like new packages
 *    - Already on an LTS
 *        - Automatically update to the latest the packages you already have
 *        - Show the user the packages you updated
 */
describe('Acceptance: ember generate ember-frost-lts', function () {
  setupTestHooks(this)

  let prompt, packages
  beforeEach(function () {
    // Mock the UI prompt to avoid prompting during tests
    prompt = td.function()
    td.replace(MockUI.prototype, 'prompt', prompt)

    // Mock the behavior on install to get the packages installed
    const installTaskRun = td.function()
    td.when(installTaskRun(td.matchers.anything())).thenDo((task) => { packages = task.packages })

    // Mock the behavior on addon-install
    const taskFor = td.function()
    td.when(taskFor('addon-install')).thenReturn({ run: installTaskRun })

    td.replace(Blueprint.prototype, 'taskFor', taskFor)

    packages = null
  })

  afterEach(function () {
    td.reset()
  })

  it('No package to install (empty file)', function () {
    const args = ['ember-frost-lts', '--lts-file=node-tests/mock/empty-lts.json']
    td.when(prompt(td.matchers.anything())).thenResolve({ })

    return emberNew()
      .then(() => emberGenerate(args))
      .then(() => expect(packages)
        .to.be.eql(null))
  })

  it('Single package', function () {
    const args = ['ember-frost-lts', '--lts-file=node-tests/mock/single-package-lts.json']
    td.when(prompt(td.matchers.anything())).thenResolve({
      userInputInstallPkgs: [ 'ember-prop-types'],
      confirmInstallPkgs: 'y'
    })

    return emberNew()
      .then(() => emberGenerate(args))
      .then(() => expect(packages)
        .to.have.lengthOf(1)
        .to.contain('ember-prop-types@~0.2.0'))
  })

  it('Single group', function () {
    const args = ['ember-frost-lts', '--lts-file=node-tests/mock/single-group-lts.json']
    td.when(prompt(td.matchers.anything())).thenResolve({
      userInputInstallPkgs: [ 'package3'],
      confirmInstallPkgs: 'y'
    })

    return emberNew()
      .then(() => emberGenerate(args))
      .then(() => expect(packages)
        .to.have.lengthOf(1)
        .to.contain('my-package@0.2.0'))
  })

  describe('User request', function () {
    it('User request only 1 group', function () {
      const args = ['ember-frost-lts', '--lts-file=node-tests/mock/package-group-lts.json']
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputInstallPkgs: [ 'package3'],
        confirmInstallPkgs: 'y'
      })

      return emberNew()
        .then(() => emberGenerate(args))
        .then(() => expect(packages)
          .to.have.lengthOf(1)
          .to.contain('my-package@0.2.0'))
    })

    it('User request only 1 package', function () {
      const args = ['ember-frost-lts', '--lts-file=node-tests/mock/package-group-lts.json']
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputInstallPkgs: [ 'ember-prop-types'],
        confirmInstallPkgs: 'y'
      })

      return emberNew()
        .then(() => emberGenerate(args))
        .then(() => expect(packages)
          .to.have.lengthOf(1)
          .to.contain('ember-prop-types@~0.2.0'))
    })

    it('User request everything', function () {
      const args = ['ember-frost-lts', '--lts-file=node-tests/mock/package-group-lts.json']
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputInstallPkgs: [ 'package3', 'package4', 'ember-prop-types'],
        confirmInstallPkgs: 'y'
      })

      return emberNew()
        .then(() => emberGenerate(args))
        .then(() => expect(packages)
          .to.have.lengthOf(4)
          .to.contain('my-package@0.2.0')
          .to.contain('ember-prop-types@~0.2.0')
          .to.contain('ember-frost-core@0.25.3')
          .to.contain('ember-d3@0.2.0'))
    })
  })

  describe('Non LTS and LTS', function () {
    let args
    beforeEach(function () {
      args = ['ember-frost-lts', '--lts-file=node-tests/mock/package-group-lts.json']
    })

    describe('Group', function () {
      it('Group containing only new packages', function () {
        td.when(prompt(td.matchers.anything())).thenResolve({
          userInputInstallPkgs: [ 'package3', 'package4'],
          confirmInstallPkgs: 'y'
        })

        return emberNew()
          .then(() => emberGenerate(args))
          .then(() => expect(packages)
            .to.have.lengthOf(3)
            .to.contain('my-package@0.2.0')
            .to.contain('ember-d3@0.2.0')
            .to.contain('ember-frost-core@0.25.3'))
      })

      it('Group containing packages already installed', function () {
        td.when(prompt(td.matchers.anything())).thenResolve({
          confirmInstallPkgs: 'y'
        })

        return emberNew()
          .then(() => modifyPackages([
            {name: 'my-package', version: '0.2.0', dev: true},        // installed
            {name: 'ember-frost-core', version: '0.25.3', dev: true}, // installed
            {name: 'ember-d3', version: '0.2.0', dev: true}           // installed
          ]))
          .then(() => emberGenerate(args))
          .then(() => expect(packages)
            .to.have.eql(null))
      })

      it('Group containing package to update and new package', function () {
        td.when(prompt(td.matchers.anything())).thenResolve({
          userInputInstallPkgs: [ 'package4'],
          confirmInstallPkgs: 'y'
        })

        return emberNew()
          .then(() => modifyPackages([
            {name: 'my-package', version: '0.2.0', dev: true},        // installed
            {name: 'ember-frost-core', version: '0.25.2', dev: true}  // to update
          ]))
          .then(() => emberGenerate(args))
          .then(() => expect(packages)
            .to.have.lengthOf(2)
            .to.contain('ember-d3@0.2.0')
            .to.contain('ember-frost-core@0.25.3'))
      })

      it('Group containing package already installed and new package', function () {
        td.when(prompt(td.matchers.anything())).thenResolve({
          userInputInstallPkgs: [ 'package4'],
          confirmInstallPkgs: 'y'
        })

        return emberNew()
          .then(() => modifyPackages([
            {name: 'my-package', version: '0.2.0', dev: true},        // installed
            {name: 'ember-d3', version: '0.2.0', dev: true}           // installed
          ]))
          .then(() => emberGenerate(args))
          .then(() => expect(packages)
            .to.have.lengthOf(2)
            .to.contain('ember-d3@0.2.0')
            .to.contain('ember-frost-core@0.25.3'))
      })
    })

    describe('Single packages', function () {
      it('Packages already installed', function () {
        td.when(prompt(td.matchers.anything())).thenResolve({
          confirmInstallPkgs: 'y'
        })

        return emberNew()
          .then(() => modifyPackages([
            {name: 'ember-prop-types', version: '~0.2.0', dev: true} // installed
          ]))
          .then(() => emberGenerate(args))
          .then(() => expect(packages)
            .to.be.eql(null))
      })
    })

    it('Groups and single packages all installed', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({ })

      return emberNew()
        .then(() => modifyPackages([
          {name: 'my-package', version: '0.2.0', dev: true},        // installed
          {name: 'ember-frost-core', version: '0.25.3', dev: true}, // installed
          {name: 'ember-d3', version: '0.2.0', dev: true},          // installed
          {name: 'ember-prop-types', version: '~0.2.0', dev: true}  // installed
        ]))
        .then(() => emberGenerate(args))
        .then(() => expect(packages)
          .to.have.eql(null))
    })

    describe('Non LTS', function () {
      describe('Group', function () {
        it('Group containing only packages to update', function () {
          td.when(prompt(td.matchers.anything())).thenResolve({
            userInputInstallPkgs: [ 'package3', 'package4'],
            confirmInstallPkgs: 'y'
          })

          return emberNew()
            .then(() => modifyPackages([
              {name: 'my-package', version: '0.1.0', dev: true},        // to update
              {name: 'ember-frost-core', version: '0.25.2', dev: true}, // to update
              {name: 'ember-d3', version: '0.1.0', dev: true}           // to update
            ]))
            .then(() => emberGenerate(args))
            .then(() => expect(packages)
              .to.have.lengthOf(3)
              .to.contain('my-package@0.2.0')
              .to.contain('ember-d3@0.2.0')
              .to.contain('ember-frost-core@0.25.3'))
        })

        it('Group containing package already installed and package to update', function () {
          td.when(prompt(td.matchers.anything())).thenResolve({
            userInputInstallPkgs: [ 'package4'],
            confirmInstallPkgs: 'y'
          })

          return emberNew()
            .then(() => modifyPackages([
              {name: 'my-package', version: '0.2.0', dev: true},        // installed
              {name: 'ember-frost-core', version: '0.25.2', dev: true}, // to update
              {name: 'ember-d3', version: '0.2.0', dev: true}           // installed
            ]))
            .then(() => emberGenerate(args))
            .then(() => expect(packages)
              .to.have.lengthOf(2)
              .to.contain('ember-d3@0.2.0')
              .to.contain('ember-frost-core@0.25.3'))
        })
      })

      describe('Single package', function () {
        beforeEach(function () {
          td.when(prompt(td.matchers.anything())).thenResolve({
            userInputInstallPkgs: [ 'ember-prop-types'],
            confirmInstallPkgs: 'y'
          })
        })

        it('New packages', function () {
          return emberNew()
            .then(() => emberGenerate(args))
            .then(() => expect(packages)
              .to.have.lengthOf(1)
              .to.contain('ember-prop-types@~0.2.0'))
        })

        it('Packages to update', function () {
          return emberNew()
            .then(() => modifyPackages([
              {name: 'ember-prop-types', version: '0.1.0', dev: true} // to update
            ]))
            .then(() => emberGenerate(args))
            .then(() => expect(packages)
              .to.have.lengthOf(1)
              .to.contain('ember-prop-types@~0.2.0'))
        })
      })
    })

    describe('LTS', function () {
      describe('Group', function () {
        it('Group containing only packages to update', function () {
          td.when(prompt(td.matchers.anything())).thenResolve({
            // We need to mock this but those will be selected by default since we are on an LTS and
            // that we already have those packages in our package.json
            userInputInstallPkgs: [ 'package3', 'package4'],
            confirmInstallPkgs: 'y'
          })

          return emberNew()
            .then(() => modifyPackages([
              {name: 'my-package', version: '0.1.0', dev: true},        // to update
              {name: 'ember-frost-core', version: '0.25.2', dev: true}, // to update
              {name: 'ember-d3', version: '0.1.0', dev: true}           // to update
            ]))
            .then(() => emberGenerate(args))
            .then(() => expect(packages)
              .to.have.lengthOf(3)
              .to.contain('my-package@0.2.0')
              .to.contain('ember-d3@0.2.0')
              .to.contain('ember-frost-core@0.25.3'))
        })

        it('Group containing package already installed and package to update', function () {
          td.when(prompt(td.matchers.anything())).thenResolve({
            // We need to mock this but those will be selected by default since we are on an LTS and
            // that we already have those packages in our package.json
            userInputInstallPkgs: [ 'package4'],
            confirmInstallPkgs: 'y'
          })

          return emberNew()
            .then(() => modifyPackages([
              {name: 'my-package', version: '0.2.0', dev: true},        // installed
              {name: 'ember-frost-core', version: '0.25.2', dev: true}, // to update
              {name: 'ember-d3', version: '0.2.0', dev: true}           // installed
            ]))
            .then(() => emberGenerate(args))
            .then(() => expect(packages)
              .to.have.lengthOf(2)
              .to.contain('ember-d3@0.2.0')
              .to.contain('ember-frost-core@0.25.3'))
        })
      })

      describe('Single package', function () {
        it('New packages', function () {
          td.when(prompt(td.matchers.anything())).thenResolve({
            userInputInstallPkgs: [ 'ember-prop-types'],
            confirmInstallPkgs: 'y'
          })

          return emberNew()
            .then(() => emberGenerate(args))
            .then(() => expect(packages)
              .to.have.lengthOf(1)
              .to.contain('ember-prop-types@~0.2.0'))
        })

        it('Packages to update', function () {
          td.when(prompt(td.matchers.anything())).thenResolve({
            // We need to mock this but those will be selected by default since we are on an LTS and
            // that we already have those packages in our package.json
            userInputInstallPkgs: [ 'ember-prop-types'],
            confirmInstallPkgs: 'y'
          })

          return emberNew()
            .then(() => modifyPackages([
              {name: 'ember-prop-types', version: '0.1.0', dev: true} // to update
            ]))
            .then(() => emberGenerate(args))
            .then(() => expect(packages)
              .to.have.lengthOf(1)
              .to.contain('ember-prop-types@~0.2.0'))
        })
      })
    })
  })
})

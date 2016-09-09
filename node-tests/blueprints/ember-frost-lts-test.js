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

const otherPkgsToSelectByDefaylt = [
  'broccoli-asset-rev',
  'ember-ajax',
  'ember-cli',
  'ember-cli-app-version',
  'ember-cli-babel',
  'ember-cli-dependency-checker',
  'ember-cli-htmlbars',
  'ember-cli-htmlbars-inline-precompile',
  'ember-cli-inject-live-reload',
  'ember-cli-jshint',
  'ember-cli-qunit',
  'ember-cli-release',
  'ember-cli-sri',
  'ember-cli-test-loader',
  'ember-cli-uglify',
  'ember-data',
  'ember-export-application-global',
  'ember-load-initializers',
  'ember-resolver',
  'ember-welcome-page',
  'loader.js',
  'ember-frost-lts'
]

describe('Acceptance: ember generate ember-frost-lts', function () {
  setupTestHooks(this)

  let prompt, packagesToInstall, packagesToUninstall
  beforeEach(function () {
    // Mock the UI prompt to avoid prompting during tests
    prompt = td.function()
    td.replace(MockUI.prototype, 'prompt', prompt)

    // Mock the behavior on install to get the packages installed
    const installTaskRun = td.function()
    td.when(installTaskRun(td.matchers.anything())).thenDo((task) => { packagesToInstall = task.packages })

    // Mock the behavior on uninstall to get the packages uninstall
    const uninstallTaskRun = td.function()
    td.when(uninstallTaskRun(td.matchers.anything())).thenDo((task) => { packagesToUninstall = task.packages })

    // Mock the behavior on addon-install
    const taskFor = td.function()
    td.when(taskFor('addon-install')).thenReturn({ run: installTaskRun })
    td.when(taskFor('npm-uninstall')).thenReturn({ run: uninstallTaskRun })

    td.replace(Blueprint.prototype, 'taskFor', taskFor)

    packagesToInstall = null
    packagesToUninstall = null
  })

  afterEach(function () {
    td.reset()
  })

  it('No package to install (empty file)', function () {
    const args = ['ember-frost-lts', '--lts-file=node-tests/mock/empty-lts.json']
    td.when(prompt(td.matchers.anything())).thenResolve({
      userInputOtherGroups: otherPkgsToSelectByDefaylt,
      confirmSelection: 'y'
    })

    return emberNew()
      .then(() => emberGenerate(args))
      .then(() => expect(packagesToInstall)
        .to.be.eql(null))
  })

  it('Single package', function () {
    const args = ['ember-frost-lts', '--lts-file=node-tests/mock/single-package-lts.json']
    td.when(prompt(td.matchers.anything())).thenResolve({
      userInputRecommendGroups: ['ember-prop-types'],
      userInputOtherGroups: otherPkgsToSelectByDefaylt,
      confirmSelection: 'y'
    })

    return emberNew()
      .then(() => emberGenerate(args))
      .then(() => expect(packagesToInstall)
        .to.have.lengthOf(1)
        .to.contain('ember-prop-types@~0.2.0'))
  })

  it('Single group', function () {
    const args = ['ember-frost-lts', '--lts-file=node-tests/mock/single-group-lts.json']
    td.when(prompt(td.matchers.anything())).thenResolve({
      userInputRecommendGroups: ['package3'],
      userInputOtherGroups: otherPkgsToSelectByDefaylt,
      confirmSelection: 'y'
    })

    return emberNew()
      .then(() => emberGenerate(args))
      .then(() => expect(packagesToInstall)
        .to.have.lengthOf(1)
        .to.contain('my-package@0.2.0'))
  })

  describe('User request', function () {
    let args
    beforeEach(function () {
      args = ['ember-frost-lts', '--lts-file=node-tests/mock/package-group-lts.json']
    })

    it('User request only 1 group', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputRecommendGroups: ['package3'],
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.have.lengthOf(1)
          .to.contain('my-package@0.2.0'))
    })

    it('User request only 1 package', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputRecommendGroups: ['ember-prop-types'],
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.have.lengthOf(1)
          .to.contain('ember-prop-types@~0.2.0'))
    })

    it('User request everything', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputRecommendGroups: ['package3', 'package4', 'ember-prop-types'],
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.have.lengthOf(4)
          .to.contain('my-package@0.2.0')
          .to.contain('ember-prop-types@~0.2.0')
          .to.contain('ember-frost-core@0.25.3')
          .to.contain('ember-d3@0.2.0'))
    })

    it('User request install recommended package', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputRecommendGroups: ['ember-prop-types'],
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.have.lengthOf(1)
          .to.contain('ember-prop-types@~0.2.0'))
    })

    it('User request uninstall recommended package', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => modifyPackages([
          {name: 'ember-prop-types', version: '~0.2.0', dev: true} // installed
        ]))
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.be.eql(null))
        .then(() => expect(packagesToUninstall)
          .to.have.lengthOf(1)
          .to.contain('ember-prop-types'))
    })

    it('User request install + uninstall recommended package', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputRecommendGroups: ['ember-prop-types'],
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => modifyPackages([
          {name: 'ember-d3', version: '0.2.0', dev: true},          // installed
          {name: 'ember-frost-core', version: '0.25.3', dev: true}  // installed
        ]))
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.have.lengthOf(1)
          .to.contain('ember-prop-types@~0.2.0'))
        .then(() => expect(packagesToUninstall)
          .to.have.lengthOf(2)
          .to.contain('ember-d3')
          .to.contain('ember-frost-core'))
    })

    it('User request uninstall other package', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => modifyPackages([
          {name: 'my-package1', version: '0.2.0', dev: true}   // installed
        ]))
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.be.eql(null))
        .then(() => expect(packagesToUninstall)
          .to.have.lengthOf(1)
          .to.contain('my-package1'))
    })

    it('User request install + uninstall recommended package and unistall other package', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputRecommendGroups: ['ember-prop-types'],
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => modifyPackages([
          {name: 'ember-d3', version: '0.2.0', dev: true},            // installed
          {name: 'ember-frost-core', version: '0.25.3', dev: true},   // installed
          {name: 'my-package1', version: '0.2.0', dev: true}          // installed
        ]))
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.have.lengthOf(1)
          .to.contain('ember-prop-types@~0.2.0'))
        .then(() => expect(packagesToUninstall)
          .to.have.lengthOf(3)
          .to.contain('ember-d3')
          .to.contain('ember-frost-core')
          .to.contain('my-package1'))
    })
  })

  describe('Recommended packages - Action based on selection', function () {
    let args
    beforeEach(function () {
      args = ['ember-frost-lts', '--lts-file=node-tests/mock/package-group-lts.json']
    })

    describe('Selected', function () {
      it('Group containing only new packages', function () {
        td.when(prompt(td.matchers.anything())).thenResolve({
          userInputRecommendGroups: ['package3', 'package4'],
          userInputOtherGroups: otherPkgsToSelectByDefaylt,
          confirmSelection: 'y'
        })

        return emberNew()
          .then(() => emberGenerate(args))
          .then(() => expect(packagesToInstall)
            .to.have.lengthOf(3)
            .to.contain('my-package@0.2.0')
            .to.contain('ember-d3@0.2.0')
            .to.contain('ember-frost-core@0.25.3'))
      })

      it('Group containing only packages to update', function () {
        td.when(prompt(td.matchers.anything())).thenResolve({
          userInputRecommendGroups: ['package3', 'package4'],
          userInputOtherGroups: otherPkgsToSelectByDefaylt,
          confirmSelection: 'y'
        })

        return emberNew()
          .then(() => modifyPackages([
            {name: 'my-package', version: '0.1.0', dev: true},        // to update
            {name: 'ember-frost-core', version: '0.25.2', dev: true}, // to update
            {name: 'ember-d3', version: '0.1.0', dev: true}           // to update
          ]))
          .then(() => emberGenerate(args))
          .then(() => expect(packagesToInstall)
            .to.have.lengthOf(3)
            .to.contain('my-package@0.2.0')
            .to.contain('ember-d3@0.2.0')
            .to.contain('ember-frost-core@0.25.3'))
      })

      it('Group containing packages already installed', function () {
        td.when(prompt(td.matchers.anything())).thenResolve({
          userInputRecommendGroups: ['package3', 'package4'],
          userInputOtherGroups: otherPkgsToSelectByDefaylt,
          confirmSelection: 'y'
        })

        return emberNew()
          .then(() => modifyPackages([
            {name: 'my-package', version: '0.2.0', dev: true},        // installed
            {name: 'ember-frost-core', version: '0.25.3', dev: true}, // installed
            {name: 'ember-d3', version: '0.2.0', dev: true}           // installed
          ]))
          .then(() => emberGenerate(args))
          .then(() => expect(packagesToInstall)
            .to.have.lengthOf(3)
            .to.contain('my-package@0.2.0')
            .to.contain('ember-d3@0.2.0')
            .to.contain('ember-frost-core@0.25.3'))
      })
    })

    describe('Not selected', function () {
      it('Group containing only new packages', function () {
        td.when(prompt(td.matchers.anything())).thenResolve({
          userInputOtherGroups: otherPkgsToSelectByDefaylt,
          confirmSelection: 'y'
        })

        return emberNew()
          .then(() => emberGenerate(args))
          .then(() => expect(packagesToInstall)
            .to.be.eql(null))
      })

      it('Group containing only packages to update', function () {
        td.when(prompt(td.matchers.anything())).thenResolve({
          userInputOtherGroups: otherPkgsToSelectByDefaylt,
          confirmSelection: 'y'
        })

        return emberNew()
          .then(() => modifyPackages([
            {name: 'my-package', version: '0.1.0', dev: true},        // to update
            {name: 'ember-frost-core', version: '0.25.2', dev: true}, // to update
            {name: 'ember-d3', version: '0.1.0', dev: true}           // to update
          ]))
          .then(() => emberGenerate(args))
          .then(() => expect(packagesToInstall)
            .to.be.eql(null))
      })

      it('Group containing packages already installed', function () {
        td.when(prompt(td.matchers.anything())).thenResolve({
          userInputOtherGroups: otherPkgsToSelectByDefaylt,
          confirmSelection: 'y'
        })

        return emberNew()
          .then(() => modifyPackages([
            {name: 'my-package', version: '0.2.0', dev: true},        // installed
            {name: 'ember-frost-core', version: '0.25.3', dev: true}, // installed
            {name: 'ember-d3', version: '0.2.0', dev: true}           // installed
          ]))
          .then(() => emberGenerate(args))
          .then(() => expect(packagesToInstall)
            .to.be.eql(null))
          .then(() => expect(packagesToUninstall)
            .to.have.lengthOf(3)
            .to.contain('my-package')
            .to.contain('ember-d3')
            .to.contain('ember-frost-core'))
      })
    })
  })

  describe('Other packages - Action based on selection', function () {
    let args
    beforeEach(function () {
      args = ['ember-frost-lts', '--lts-file=node-tests/mock/package-group-lts.json']
    })

    describe('Selected', function () {
      it('Group containing packages already installed', function () {
        console.log('before', otherPkgsToSelectByDefaylt)
        const otherPkgsSelected = otherPkgsToSelectByDefaylt.concat(['my-package2'])
        console.log('after', otherPkgsSelected)
        td.when(prompt(td.matchers.anything())).thenResolve({
          userInputOtherGroups: otherPkgsSelected,
          confirmSelection: 'y'
        })

        return emberNew()
          .then(() => modifyPackages([
            {name: 'my-package2', version: '0.2.0', dev: true}        // installed
          ]))
          .then(() => emberGenerate(args))
          .then(() => expect(packagesToUninstall)
            .to.be.eql(null))
      })
    })

    describe('Not selected', function () {
      it('Group containing packages already installed', function () {
        td.when(prompt(td.matchers.anything())).thenResolve({
          userInputOtherGroups: otherPkgsToSelectByDefaylt,
          confirmSelection: 'y'
        })

        return emberNew()
          .then(() => modifyPackages([
            {name: 'my-package', version: '0.2.0', dev: true}        // installed
          ]))
          .then(() => emberGenerate(args))
          .then(() => expect(packagesToUninstall)
            .to.have.lengthOf(1)
            .to.contain('my-package'))
      })
    })
  })

  describe('Group with mixed package states', function () {
    let args
    beforeEach(function () {
      args = ['ember-frost-lts', '--lts-file=node-tests/mock/package-group-lts.json']
    })

    it('Group containing package to update and new package', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputRecommendGroups: ['package3', 'package4'],
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => modifyPackages([
          {name: 'my-package', version: '0.2.0', dev: true},        // installed
          {name: 'ember-frost-core', version: '0.25.2', dev: true}  // to update
        ]))
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.have.lengthOf(3)
          .to.contain('my-package@0.2.0')
          .to.contain('ember-d3@0.2.0')
          .to.contain('ember-frost-core@0.25.3'))
    })

    it('Group containing package already installed and new package', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputRecommendGroups: ['package3', 'package4'],
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => modifyPackages([
          {name: 'my-package', version: '0.2.0', dev: true},        // installed
          {name: 'ember-d3', version: '0.2.0', dev: true}           // installed
        ]))
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.have.lengthOf(3)
          .to.contain('my-package@0.2.0')
          .to.contain('ember-d3@0.2.0')
          .to.contain('ember-frost-core@0.25.3'))
    })

    it('Group containing package already installed and package to update', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputRecommendGroups: ['package3', 'package4'],
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => modifyPackages([
          {name: 'my-package', version: '0.2.0', dev: true},        // installed
          {name: 'ember-frost-core', version: '0.25.2', dev: true}, // to update
          {name: 'ember-d3', version: '0.2.0', dev: true}           // installed
        ]))
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.have.lengthOf(3)
          .to.contain('my-package@0.2.0')
          .to.contain('ember-d3@0.2.0')
          .to.contain('ember-frost-core@0.25.3'))
    })
  })

  describe('Mandatory', function () {
    let args
    beforeEach(function () {
      args = ['ember-frost-lts', '--lts-file=node-tests/mock/package-group-lts-mandatory.json']
    })

    it('Already installed package', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputRecommendGroups: ['my-package-m'],
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => modifyPackages([
          {name: 'my-package-m', version: '0.2.0', dev: true}       // installed
        ]))
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.have.lengthOf(1)
          .to.contain('my-package-m@0.2.0'))
    })

    it('Package require update', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        // We need to mock this but those will be selected by default since this package is mandatory
        userInputRecommendGroups: ['my-package-m'],
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => modifyPackages([
          {name: 'my-package-m', version: '0.1.0', dev: true}       // to update
        ]))
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.have.lengthOf(1)
          .to.contain('my-package-m@0.2.0'))
    })

    it('New package', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        // We need to mock this but those will be selected by default since this package is mandatory
        userInputRecommendGroups: ['my-package-m'],
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.have.lengthOf(1)
          .to.contain('my-package-m@0.2.0'))
    })
  })

  describe('Mandatory + Optional', function () {
    let args
    beforeEach(function () {
      args = ['ember-frost-lts', '--lts-file=node-tests/mock/package-group-lts-mandatory-optional.json']
    })

    it('Already installed package', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        userInputRecommendGroups: ['my-package-m', 'my-package'],
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => modifyPackages([
          {name: 'my-package-m', version: '0.2.0', dev: true},      // installed
          {name: 'my-package', version: '0.2.0', dev: true}         // installed
        ]))
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.have.lengthOf(2)
          .to.contain('my-package-m@0.2.0')
          .to.contain('my-package@0.2.0'))
    })

    it('Package require update', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        // We need to mock this but those will be selected by default since this package is mandatory (my-package-m)
        userInputRecommendGroups: ['my-package-m', 'my-package'],
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => modifyPackages([
          {name: 'my-package-m', version: '0.1.0', dev: true},      // to update
          {name: 'my-package', version: '0.1.0', dev: true}         // to update
        ]))
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.have.lengthOf(2)
          .to.contain('my-package-m@0.2.0')
          .to.contain('my-package@0.2.0'))
    })

    it('New package', function () {
      td.when(prompt(td.matchers.anything())).thenResolve({
        // We need to mock this but those will be selected by default since this package is mandatory (my-package-m)
        userInputRecommendGroups: ['my-package-m', 'my-package'],
        userInputOtherGroups: otherPkgsToSelectByDefaylt,
        confirmSelection: 'y'
      })

      return emberNew()
        .then(() => emberGenerate(args))
        .then(() => expect(packagesToInstall)
          .to.have.lengthOf(2)
          .to.contain('my-package-m@0.2.0')
          .to.contain('my-package@0.2.0'))
    })
  })
})

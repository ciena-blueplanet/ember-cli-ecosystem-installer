'use strict'

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers')
const setupTestHooks = blueprintHelpers.setupTestHooks
const emberNew = blueprintHelpers.emberNew
const emberGenerate = blueprintHelpers.emberGenerate

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
  })

  afterEach(function () {
    td.reset()
    packages = null
  })

  it('No package to install (empty file)', function () {
    const args = ['ember-frost-lts', '--lts-file=node-tests/mock/empty-lts.json']
    td.when(prompt(td.matchers.anything())).thenResolve({ })

    return emberNew()
      .then(() => emberGenerate(args))
      .then(() => expect(packages)
        .to.be.empty)
  })

  it('Single package', function () {
    const args = ['ember-frost-lts', '--lts-file=node-tests/mock/single-package-lts.json']
    td.when(prompt(td.matchers.anything())).thenResolve({ 'ember-prop-types': true })

    return emberNew()
      .then(() => emberGenerate(args))
      .then(() => expect(packages)
        .to.contain('ember-prop-types@~0.2.0'))
  })

  it('Single group', function () {
    const args = ['ember-frost-lts', '--lts-file=node-tests/mock/single-group-lts.json']
    td.when(prompt(td.matchers.anything())).thenResolve({ 'package3': true })

    return emberNew()
      .then(() => emberGenerate(args))
      .then(() => expect(packages)
        .to.contain('my-package@0.2.0'))
  })

  it('User request only 1 group', function () {
    const args = ['ember-frost-lts', '--lts-file=node-tests/mock/package-group-lts.json']
    td.when(prompt(td.matchers.anything())).thenResolve({
      'package3': true,
      'package4': false,
      'ember-prop-types': false
    })

    return emberNew()
      .then(() => emberGenerate(args))
      .then(() => expect(packages)
        .to.contain('my-package@0.2.0'))
  })

  it('User request only 1 package', function () {
    const args = ['ember-frost-lts', '--lts-file=node-tests/mock/package-group-lts.json']
    td.when(prompt(td.matchers.anything())).thenResolve({
      'package3': false,
      'package4': false,
      'ember-prop-types': true
    })

    return emberNew()
      .then(() => emberGenerate(args))
      .then(() => expect(packages)
        .to.contain('ember-prop-types@~0.2.0'))
  })

  it('User request everything', function () {
    const args = ['ember-frost-lts', '--lts-file=node-tests/mock/package-group-lts.json']
    td.when(prompt(td.matchers.anything())).thenResolve({
      'package3': true,
      'package4': true,
      'ember-prop-types': true
    })

    return emberNew()
      .then(() => emberGenerate(args))
      .then(() => expect(packages)
        .to.contain('my-package@0.2.0')
        .to.contain('ember-prop-types@~0.2.0')
        .to.contain('ember-frost-core@0.25.3')
        .to.contain('ember-d3@0.2.0'))
  })
})

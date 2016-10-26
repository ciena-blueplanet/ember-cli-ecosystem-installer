'use strict'

module.exports = {
  addAddonsToProject2: function (context, options) {
    var taskOptions = {
      packages: [],
      extraArgs: options.extraArgs || [],
      blueprintOptions: options.blueprintOptions || {}
    }

    var packages = options.packages
    if (packages && packages.length) {
      taskOptions.packages = packages.map(function (pkg) {
        if (typeof pkg === 'string') {
          return pkg
        }

        if (!pkg.name) {
          console.log('You must provide a package `name` to addAddonsToProject')
        }

        if (pkg.target) {
          pkg.name += '@' + pkg.target
        }

        return pkg.name
      })
    } else {
      console.log('You must provide package to addAddonsToProject')
    }

    return this.taskFor2(context, 'my-addon-install').run(taskOptions)
  },
  addPackagesToProject2: function(packages) {
    var task = this.taskFor2(context, 'my-npm-install');
    var installText = (packages.length > 1) ? 'install packages' : 'install package';
    var packageNames = [];
    var packageArray = [];

    for (var i = 0; i < packages.length; i++) {
      packageNames.push(packages[i].name);

      var packageNameAndVersion = packages[i].name;

      if (packages[i].target) {
        packageNameAndVersion += '@' + packages[i].target;
      }

      packageArray.push(packageNameAndVersion);
    }

    // this._writeStatusToUI(chalk.green, installText, packageNames.join(', '));

    return task.run({
      'save': true,
      verbose: false,
      packages: packageArray
    });
  },
  taskFor2: function (context, dasherizedName) {
    var Task = require('../tasks/' + dasherizedName)

    return new Task({
      context: context,
      ui: context.ui,
      project: context.project,
      analytics: context.analytics
    })
  }
}

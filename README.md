[ci-img]: https://img.shields.io/travis/ciena-blueplanet/ember-cli-ecosystem-installer.svg "Travis CI Build Status"
[ci-url]: https://travis-ci.org/ciena-blueplanet/ember-cli-ecosystem-installer

[cov-img]: https://img.shields.io/coveralls/ciena-blueplanet/ember-cli-ecosystem-installer.svg "Coveralls Code Coverage"
[cov-url]: https://coveralls.io/github/ciena-blueplanet/ember-cli-ecosystem-installer

[npm-img]: https://img.shields.io/npm/v/ember-cli-ecosystem-installer.svg "NPM Version"
[npm-url]: https://www.npmjs.com/package/ember-cli-ecosystem-installer

[![Travis][ci-img]][ci-url] [![Coveralls][cov-img]][cov-url] [![NPM][npm-img]][npm-url]

# ember-cli-ecosystem-installer

 * [Installation](#Installation)
 * [Usage](#Usage)
 * [Development](#Development)

## Description
Tool to install/uninstall the ecosystem packages.

### Concept
The idea is to define an LTS file that will contain all the packages that are part of the ecosystem you are trying to build.
The installer will prompt the user to choose the ecosystem packages to install/uninstall and choose the application 
specific packages (all the packages that are not included in the ecosystem) to keep/uninstall.

**What problems is this application solving?**
* You will like to standardize the packages that are used by your applications?
* You are building a set of packages that your applications should use?
* You will like to easily switch from a version of an ecosystem to another version?
* You will like to create simple grouping of packages and offer those grouping as features to install in a click?
* You will like to enforce the usage of some particular packages?

**If you answered yes to any of the questions then maybe this application is for you.**

### Definitions
* **LTS**: Long-term support.
* **LTS file**: File that is defining the content of an ecosystem.
* **Ecosystem**: Set of npm packages that composed a standard environment.
* **LTS ecosystem features**: A set of packages and group that are recommended to install in the target application/addon.
* **Application specific packages**: A set of packages that are installed on the target application and that are not 
                                     in the LTS ecosystem recommended features.

## Usage
You need to follow a few steps to use this tool:
1. Create an ecosystem that is dependent on this installer
2. Install the ecosystem

**Note**: *This tool doesn't contain any LTS ecosystem file. You will have to create one.* 

### Create an ecosystem

You can follow the steps to create an addon that will contain your LTS ecosystem file and use the installer to install
the ecosystem.

1. Create an Ember addon to contain your LTS ecosystem file
```
We recommend to add this addon to a repository to be able to version your LTS ecosystem file.
```
2. Add an LTS file (`lts.json`) at the root of your new addon and add the ecosystem content **(see file format below)**
3. Add the following keyword in your package.json: `ember-cli-ecosystem-lts`
```json
  "keywords": [
    ...
    "ember-cli-ecosystem-lts",
    ...
  ],
```
4. Create a blueprint for your addon
```bash
ember g blueprint <addon-name>
```
5. Go to `/blueprints/<addon-name>/index.js` and add the following
```javascript
  ...
  normalizeEntityName: function () {
    // this prevents an error when the entityName is
    // not specified (since that doesn't actually matter
    // to us
  },
  afterInstall: function () {
    return this.addAddonsToProject({ packages: [{name: 'ember-cli-ecosystem-installer'}] })
  }
  ...
```
### Install the ecosystem

Once these steps are done you will simply have install your addon in the target application:
```bash
cd <your-application>
ember install <addon-name>
```

This command will do the following:
1. Start the installation of your addon on the application and copy the `lts.json` file.
2. Run your blueprint and install the `ember-cli-ecosystem-installer` tool.
3. The tool will read the `package.json` file of your target application and get the name of all the packages that contains the
   keyword `ember-cli-ecosystem-lts`
4. The tool will get the `lts.json` file for each package that contains that keyword and merge all the LTS files. The 
   merged result is the LTS ecosystem content.
5. The tool will finally prompt the user to install the ecosystem content.
   ```
   On the install of ember-cli-ecosystem-installer the user will be requested to:
   1. Select LTS ecosystem features(packages/groups of packages) to install/uninstall
   2. Confirm the selection
   3. Select the application specific packages to keep/uninstall
   4. Confirm the selection

   Once the user selections are confirmed:
   5. Uninstall packages
   6. Install packages
   ```

### LTS file format

It's important to respect the `lts.json` file format for this installer to work properly.

#### Package
You can specify a package that is part of the ecosystem like this
```json
{
  "package-name": "target"
}
```

#### Group
You can specify a group of packages that is part of the ecosystem like this
```json
{
  "group-name" {
    "packages": {
      "package-name-1": "target1",
      "package-name-2": "target2",
    }
  }
}
```

#### Mandatory/Optional
Every packages and group are optional by default. You can specify mandatory packages/groups like this
```json
{
  "mandatory": {
    "package-name": "target",
    "group-name" {
      "packages": {
        "package-name-1": "target1",
        "package-name-2": "target2",
      }
    }
  }
}
```

#### Example
In the following example the `package1` and `group1` are mandatory and `package4` and `group2` are optional. 
A group is install or uninstall in totality. You cannot install individual pieces of a group. 
```json
{
  "mandatory": {
    "package1": "1.0.0",
    "group1" {
      "packages": {
        "package2": "~1.0.0",
        "package3": "^1.0.0",
      }
    }
  },
  "package4": "2.1.2",
  "group2" {
    "packages": {
      "package5": "1.2.20"
    }
  }
}
```

## Q/A
#### Is it possible to have a hierarchy of ecosystem?
Yes, you can create an addon that will have an `lts.json` file let's call this addon `James`. Then you can create an addon
that will have an `lts.json` file let's call this other addon `Bond`. We can use the same procedure define above to create
the ecosystem. The only difference is the blueprint's content.

James's blueprint
```javascript
  ...
  afterInstall: function () {
    return this.addAddonsToProject({ packages: [{name: 'ember-cli-ecosystem-installer'}] })
  }
  ...
```

Bond's blueprint
```javascript
  ...
  afterInstall: function () {
    return this.addAddonsToProject({ packages: [{name: 'James'}] })
  }
  ...
```

You are getting something like this:
```
Bond ---depend---> James ---depend---> ember-cli-ecosystem-installer
``` 

Then you can install Bond
```bash
ember install Bond
```

Bond will be installed and the `lts.json` file from Bond will be copied. Then James will be installed and the 
`lts.json` file from James will be copied. Then the installer will be installed and it will merge the file 
from Bond and James and start the installation of the ecosystem which will contain the content of James's LTS file and
Bond's LTS file.

## Development
### Setup
```
git clone git@github.com:ciena-blueplanet/ember-cli-ecosystem-installer.git
cd ember-cli-ecosystem-installer
npm install && bower install
```

### Testing
Run `npm run test` from the root of the project to run linting checks as well as execute the test suite
and output code coverage.

### Implementation details
There is a few basic concepts to understand before adding features/fixing issues on this tool.
1. We will create groups based on the content of the files. All the single packages 
   (optional and mandatory) like `"my-package": "1.0.0"` will be converted in groups containing a single package. We 
   are doing this to simplify and standardize the handling of groups and single package.
2. We are getting the state of the groups based on the state of the packages that composed that group. Here is a table
   with the expected states:
   
   | Packages state | Group state |
   |----------------|-------------|
   | New | New |
   | Need update | Need update |
   | Installed | Installed |
   | New + need update | Need update|
   | New + installed | Need update |
   | Need update + installed | Need update |

3. The operations/actions we are doing on a package/group depends on the step and on the selection.
   
   In the first step, **LTS features install/uninstall**
   | State | Action (selected) | Action (not selected) |
   |-------|----------------------|------------------------------|
   | New | Overwrite | Skip |
   | Need update | Overwrite | Skip |
   | Installed | Overwrite | Remove (uninstall)

   In the second step, **application specific packages keep/uninstall** (packages not in the LTS)
   | State | Action (selected) | Action (not selected) |
   |-------|----------------------|------------------------------|
   | Installed | Identical (keep) | Remove (uninstall)



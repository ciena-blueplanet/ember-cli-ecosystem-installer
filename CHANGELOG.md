# 3.0.0
* **Fix** issue with dependencies added to the target app/addon `package.json` file. 



# 2.0.22
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.21
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.20
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.19
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.18
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.17
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.16
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.15
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.14
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.13
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.12
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.11
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.10
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.9
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.8
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.7
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.6
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.5
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.4
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.3
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.2
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 2.0.1
* try forcing save-dev: true and save-exact: false


# 2.0.0
* Enable non exact target


# 1.0.0
* Revert changes done in the last PRs
* Implement a custom addAddonsToProject hook based on `ember-cli` source


# 0.13.3
No CHANGELOG section found in Pull Request description.
Use a `# CHANGELOG` section in your Pull Request description to auto-populate the `CHANGELOG.md`

# 0.13.2
* Make sure that addon install is done before package install



# 0.13.1
* Try to fix issues with dependencies installation to keep target (not an exact version)



# 0.13.0
* Install the dependencies with `addPackagesToProject` and `addAddonsToProject` to avoid problem with the exact version set for `addAddonsToProject`



# 0.12.0
* Install the dependencies as defined in the lts file (including ^ or ~ in package.json)



# 0.11.0
* **Remove** all the package from lts since they were only there for testing purposes.
* **Fix** when there is no attribute call `keyword` in `package.json`
* **Fix** when there is no `ember` addon to install
* **Fix** when we are doing an `npm view` on a `~` or `^` we were getting multiple packages back. We are now removing the `~` and `^` to get only one package.


# 0.10.1
* Fix readme file

# 0.10.0
* Document addon
* Fix #2 
* Fix #30 


# 0.9.2
* Move dependencies to avoid user of the package to install those



# 0.9.1
* Update repo description



# 0.9.0
* Clean repo



# 0.8.1
* Enable coveralls coverage



# 0.8.0
* Change build, coverage and npm tag reference


# 0.7.2
* Fix build, coverage and npm tags
* Add coverage

# 0.7.1
* Change repo in package.json



# 0.7.0
* Rename the repository from ember-frost-lts to ember-cli-ecosystem-installer



# 0.6.0
* Change the keyword we are using to get the addon that has lts.json files.



# 0.5.0
* Change paradigm from install (first screen) + uninstall (second screen) to  features from the LTS (first screen) and other packages already installed (second screen)
* Support installing and uninstalling on the first screen
* Support uninstalling on the second screen
* Force reinstalling all the packages in the LTS even if they are already install (make sure to rerun the blueprints)
* Rework tests and add more tests
* Support installing addons and non addons
* Read LTS file for each lts addon in the current app and merge those
* Visual improvements
* Rework to make the code compliant with earlier versions of node and ES5
* Change the group state handling 

From:

Packages state | Group state
------------ | -------------
new | new
update | update
installed | installed
new + update | new
new + installed | new 
update + installed | update

To:

Packages state | Group state
------------ | -------------
new | new
update | update
installed | installed
new + update | update
new + installed | update 
update + installed | update

# 0.4.0
* Major refactoring (split logic in multiple files, renames, make more generic, etc.)
* Support mandatory/optional groups and packages
* Skip packages already installed
* Install new packages
* Automatically check packages that are installed with a different version if you are on an LTS
* Add more tests to increase coverage and support more scenarios
* Support uninstall of packages
* Reselect choices selected by the user
* Improve check to determine if a package is installed or not


# 0.3.0
* Add check if already installed
* Add the auto overwrite
* Add the diff simple handling (doing nothing for now)
* Add the handling of new packages
* Major refactoring


# 0.2.0
* Add acceptance tests

<img width="199" alt="screen shot 2016-08-29 at 12 53 45 pm" src="https://cloud.githubusercontent.com/assets/18552536/18059599/b54f22d2-6de7-11e6-94db-4226b3077598.png">




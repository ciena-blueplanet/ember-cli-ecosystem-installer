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




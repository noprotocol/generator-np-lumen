/* global require, module, __dirname, setTimeout, process */
'use strict';
var passthru = require('passthru');
var util = require('util');
var path = require('path');
var yeoman = require('yeoman-generator');
var fs = require('fs-extra');
var shell = require('shelljs');
var junk = require('junk');
var chalk = require('chalk');
var cc = require('change-case');

// options for which laravel version to download
var lumenVersions = ['v5.1.4', 'v5.1.0', 'v5.0.4', 'v5.0.1', 'v5.0.0',  'master'];

// Base app settings
var settings = {
  appName: '',
  appVersion: '1.0.0',
  lumenVersion: lumenVersions[0],
  doDbSetup: true,
  dbUsername: 'root',
  dbPassword: 'root',
  dbName: '',
  doGitSetup: true,
  gitRemote: '',
  createAppKey: true
};

var errors = [];

var self = this;



var NpLumenGenerator = module.exports = function NpLumenGenerator(args, options, config) {
  yeoman.generators.Base.apply(this, arguments);

  // skip interactive version and do everything automatic, assuming all the values to be correct
  this.option('quick', {'desc': 'skip interaction and install app, setup database, git and install Composer/NPM/Bower dependencies', 'defaults': false});

  // skip the db settings
  this.option('skipdbsetup', {'desc': 'Skip the database setup', 'defaults': false});

  // skip the dependencies installation  
  this.option('skipdependencies', {'desc': 'Skip installation of all the dependencies', 'defaults': false});  

  this.option('force', {'desc': 'Force installation if directory not empty', 'defaults': false});  

  fs.readJSON(path.join(__dirname, '../package.json'), function (err, data) {
    if (err) {
    	return console.error(err);
    }

    self.pkg = data;
  });
};

util.inherits(NpLumenGenerator, yeoman.generators.Base);

NpLumenGenerator.prototype.animateLogo = function () {

  var cb = this.async();
  this.log.write();
  var count = 35;
  var no = '\r   NO'.bold;
  var protocol = 'PROTOCOL'.magenta.bold;
  var self = this;
  var animate = function () {
    self.log.write(no + (new Array(count).join(' ')) + protocol + ':// '.bold);
    count--;
    if (count === 0) {
      setTimeout(function () {
        self.log.write(no + protocol + ';// ');
        setTimeout(function () {
          self.log.write(no + protocol + ':// '.bold);
          setTimeout(function () {
            self.log.write('\n\n');
            cb();
          }, 200);
        }, 500);
      }, 250);
    } else {
      setTimeout(animate, 5 + (30 - (count * 2)));
    }
  };
  animate();
};

/**
 * Pre install check & setup
 */
NpLumenGenerator.prototype.preCheck = function () {
  var cb = this.async();
  var self = this;

  // check if the dir is empty (using 'junk') to skip OS files such as .DS_Store etc
  fs.readdir('.', function (err, files) {
    if(files.filter(junk.not).length > 0 && self.options.force === false) {

      // dir not empty and force install flag not used
      self.prompt([{
        type    : 'confirm',
        name    : 'forceInstall',
        message : 'The current directory ' +chalk.underline(process.cwd())+ ' is not empty. Continue?',
        default : false
      }], function(answers) {
        if(answers.forceInstall) {
          // force installation
          cb();    
        }
        // break install
        return;
      });
    } else {
      // dir empty or force install flag used, install
      cb();
    }
  });
};

/**
 * App configuration
 */
NpLumenGenerator.prototype.configureApp = function () {
  var cb = this.async();

  this.log.write().info('App configuration');

  this.appname = cc.paramCase(this.appname);
  this.dbName = cc.snakeCase(this.appname);

  if(this.options.skipdbsetup) {
    settings.doDbSetup = false;
  }

  if(this.options.quick) {
    settings.doDbSetup = true;
    settings.appName = cc.paramCase(this.appname);
    settings.dbName = this.dbName + '_ddb';
    cb();
  }
  else {
    this.prompt([
      // General ap config question(s)
      {  
        type    : 'input',
        name    : 'appName',
        message : 'Project name',
        default : this.appname
      },
      {  
        type    : 'input',
        name    : 'appVersion',
        message : 'Project version',
        default : settings.appVersion
      },

      //Lumen package question(s)
      {
        type    : 'list',
        name    : 'lumenVersion',
        message : 'Which version of Lumen would you like to install? \n (' + settings.lumenVersion + ' is the last one tested/considered stable for this generator).',
        choices: lumenVersions,
        default : settings.lumenVersion
      },

      // DB setup (if needed) questions  
      {
        type    : 'confirm',
        name    : 'doDbSetup',
        message : 'Would you like to setup a database?',
        default : true
      },
      {
        when    : function(props) {
          return props.doDbSetup;
        },
        type    : 'confirm',
        name    : 'isRootUser',
        message : 'Are you using ' + ' root/root '.red + ' for database access?',
        default : true
      },
      {
        when    : function(props) {
          return !props.isRootUser && props.doDbSetup;
        },
        type    : 'input',
        name    : 'dbUsername',
        message : 'Database username',
        default : 'root' 
      },
      {
        when    : function(props) {
          return !props.isRootUser && props.doDbSetup;
        },
        type    : 'password',
        name    : 'dbPassword',
        message : 'Database password',
        default : 'root' 
      },
      {
        when    : function(props) {
          return props.doDbSetup;
        },
        type    : 'input',
        name    : 'dbName',
        message : 'Database name',
        default : function (props) {
          return cc.snakeCase(props.appName + '_ddb');
        }
      },

      // GIT setup (if needed) questions  
      {
        type    : 'confirm',
        name    : 'doGitSetup',
        message : 'Would you like to setup a git repository?',
        default : true
      },
      {
        when    : function(props) {
          return props.doGitSetup;
        },
        type    : 'input',
        name    : 'gitRemote',
        message : 'Git remote (leave empty for none)',
        default : ''
      }

    ], function(answers) {

        settings.appName =  cc.paramCase(answers.appName) || settings.appName;
        settings.appVersion =  answers.appVersion || settings.appVersion;
        settings.lumenVersion =  answers.lumenVersion || settings.lumenVersion;
        settings.doDbSetup =  answers.doDbSetup;

        if(settings.doDbSetup) {
          settings.dbUsername =  answers.dbUsername || settings.dbUsername;
          settings.dbPassword =  answers.dbPassword || settings.dbPassword;
          settings.dbName =  cc.snakeCase(answers.dbName) || settings.dbName;
        }
                
        settings.doGitSetup =  answers.doGitSetup;
        if(settings.doGitSetup) {
          settings.gitRemote =  answers.gitRemote || settings.gitRemote;    
        }
        
        cb();  
    }); 
    
  }
};

/**
 * Download and extract Lumen
 */
NpLumenGenerator.prototype.fetchLumenApp = function () {
  var cb = this.async();
  
  this.log.write().ok('Downloading Lumen ' + settings.lumenVersion);

  //strip is needed to extract to current dir instead of dir with name of tarball
  this.tarball('https://github.com/laravel/lumen/archive/' + settings.lumenVersion + '.tar.gz', '.', {extract: true, strip: 1}, cb);
};

/**
 * Clean the default Lumen files which are unneeded/will be overwritten by our files
 */
NpLumenGenerator.prototype.cleanLumen = function () {
  this.log.write().ok('Removing default Lumen files');

  // use ignore and buld file
  fs.removeSync('.gitignore', logError);

   fs.removeSync('readme.md', logError);

  // clean laravel views/controllers/routes etc
  fs.removeSync('app/Http/routes.php', logError);
};

/**
 * Copy all the package files for frontend development/build config
 */
NpLumenGenerator.prototype.setupFrontendBuildConfig = function () {
  this.log.write().ok('Setting up frontend build config');

  fs.copy(__dirname + '/templates/_development/_.editorconfig', '.editorconfig', logError);
  fs.copy(__dirname + '/templates/_development/_.jshintrc', '.jshintrc', logError);
  fs.copy(__dirname + '/templates/_development/_gulpfile.js', 'gulpfile.js', logError);
  fs.copy(__dirname + '/templates/_development/_.gitignore', '.gitignore', logError);
};

/**
 * Create the folders for the public build/asset files
 */
NpLumenGenerator.prototype.setupFrontendFiles = function () {
  this.log.write().ok('Setting up frontend files and directories');

  fs.copy(__dirname + '/templates/_lumen/public/_.htaccess', './public/.htaccess', logError);
  fs.copy(__dirname + '/templates/_lumen/public/_favicon.ico', './public/favicon.ico', logError);
  fs.copy(__dirname + '/templates/_lumen/public/_index.php', './public/index.php', logError);
  fs.copy(__dirname + '/templates/_lumen/public/img/_noprotocol-logo.png', './public/img/noprotocol-logo.png', logError);

  // create webroot asset & dist folders (css, js, etc)
  var dirs = ['build', 'build/css', 'build/js', 'img'];
  dirs.forEach(function(dir) {
    fs.mkdir('public/' + dir, logError);
  });
};

/**
 * Copy and create all frontend asset files
 */
NpLumenGenerator.prototype.setupAssets = function () {
  this.log.write().ok('Setting up assets files and directories');

  // copy base sass files
  fs.copy(__dirname + '/templates/_lumen/resources/sass/_app.scss', 'resources/sass/_app.scss', logError);
  fs.copy(__dirname + '/templates/_lumen/resources/sass/_fonts.scss', 'resources/sass/_fonts.scss', logError);
  fs.copy(__dirname + '/templates/_lumen/resources/sass/_main.scss', 'resources/sass/main.scss', logError);
  fs.copy(__dirname + '/templates/_lumen/resources/sass/_mixins.scss', 'resources/sass/_mixins.scss', logError);
  fs.copy(__dirname + '/templates/_lumen/resources/sass/_reset.scss', 'resources/sass/_reset.scss', logError);
  fs.copy(__dirname + '/templates/_lumen/resources/sass/_utils.scss', 'resources/sass/_utils.scss', logError);


  // copy base/placeholder app.js file
  fs.copy(__dirname + '/templates/_lumen/resources/js/_app.js', 'resources/js/app.js', logError);
};

/**
 * Setup the Lumen backend assets (views, etc)
 */
NpLumenGenerator.prototype.setupBackendAssets = function () {
  this.log.write().ok('Setting up views and layout resources');

  // create Lumen folders for the various view elements (layouts: basic layouts, partials: small reusable elements)
  var dirs = ['layouts', 'partials'];
  dirs.forEach(function(dir) {
    fs.mkdir('resources/views/' + dir, logError);
  });

  // copy default layout
  fs.copy(__dirname + '/templates/_lumen/resources/views/layouts/_default.blade.php', 'resources/views/layouts/default.blade.php', logError);
};

/**
 * Setup backend defaults (routes, default controller, splash page)
 */
NpLumenGenerator.prototype.setupBackend = function () {
  this.log.write().ok('Setting up backend (routes, controllers, NoProtocol splash page, etc)');

  fs.copy(__dirname + '/templates/_lumen/app/Http/_routes.php', 'app/Http/routes.php', logError);
  fs.copy(__dirname + '/templates/_lumen/app/Http/Controllers/_PagesController.php', 'app/Http/Controllers/PagesController.php', logError); 
  fs.copy(__dirname + '/templates/_lumen/app/Http/Controllers/_RobotsController.php', 'app/Http/Controllers/RobotsController.php', logError); 
  fs.copy(__dirname + '/templates/_lumen/resources/views/_noprotocol.blade.php', 'resources/views/noprotocol.blade.php', logError);
};

/**
 * Setup file rights
 */
NpLumenGenerator.prototype.setupFileRights = function () {
  this.log.write().ok('Changing file rights');

  fs.chmod('storage', '777');
  ['app', 'logs', 'framework', 'framework/cache', 'framework/sessions', 'framework/views'].forEach(function(dir) {
    fs.chmod('storage/' + dir, '777', logError);
  });
};

/**
 * Setup documentation (haha...)
 */
NpLumenGenerator.prototype.setupDocumentation = function () {
	this.log.write().ok('Setting up documentation');

	var cb = this.async();

  this.fs.copyTpl(
		this.templatePath('_lumen/docs/_README.md'),
    this.destinationPath('docs/README.md'), 
    { 
      PROJECT_NAME: settings.appName,
      PROJECT_VERSION: settings.appVersion
    }
  );

  this.fs.commit([], cb);
};

/**
 * Patch the Bower settings 
 */
NpLumenGenerator.prototype.patchBowerSettings = function () {
	this.log.write().ok('Patching bower.json');

	var cb = this.async();

	this.fs.copyTpl(
		this.templatePath('_development/_bower.json'),
    this.destinationPath('bower.json'), 
    { 
      PROJECT_NAME: settings.appName,
      PROJECT_VERSION: settings.appVersion
    }
  );

	this.fs.commit([], cb);
};

/**
 * Patch the NPM settings 
 */
NpLumenGenerator.prototype.patchNpmSettings = function () {
	this.log.write().ok('Patching package.json');

	var cb = this.async();

  this.fs.copyTpl(
		this.templatePath('_development/_package.json'),
    this.destinationPath('package.json'), 
    { 
      PROJECT_NAME: settings.appName,
      PROJECT_VERSION: settings.appVersion,
    }
  );

  this.fs.commit([], cb);
};

/**
 * Patch Lumen's composer settings
 */
NpLumenGenerator.prototype.patchComposerSettings = function () {
  this.log.write().ok('Patching composer.json');

  var cb = this.async();
  
  fs.readJSON('./composer.json', function (err, data) {
    if(err) {
      logError(err);
    } 

    // delete items
    ['minimum-stability'].forEach(function (key) {
      delete data[key];
    });

    //update items
    data.require['laravel/lumen-framework'] = settings.lumenVersion.substring(1);
    data.name = 'noprotocol/'+settings.appName;
    data.description =  '';
    data.keywords = ['noprotocol', settings.appName, 'lumen'];
    data.license =  'Proprietary';
    data.authors = [{'name': 'NoProtocol', 'email': 'info@noprotocol.nl', 'homepage': 'http://noprotocol.nl'}],
    fs.removeSync('./composer.json', logError);
    fs.writeJSON('./composer.json', data, logError);

    cb();

  });
};

/**
 * Setup Lumen
 */
NpLumenGenerator.prototype.setupLumen = function () {
  this.log.write().ok('Setting up Lumen .env and bootstrap/app.php settings');
  var cb = this.async();
  
  // copy env file
  fs.copySync('./.env.example', './.env', logError);

  // edit env file (environment, db, debug settings) 
  fs.readFile('./.env', 'utf8', function (err,data) {
    if (err) {
      errors.push('Cannot open .env file for editing.');
      return;
    }
  
    data = data.replace(/APP_ENV=local/g, 'APP_ENV=development');
    data = data.replace(/CACHE_DRIVER=memcached/g, 'CACHE_DRIVER=array');
    data = data.replace(/SESSION_DRIVER=memcached/g, 'SESSION_DRIVER=array');

    if(settings.doDbSetup) {
      data = data.replace(/DB_DATABASE=homestead/g, 'DB_DATABASE='+settings.dbName);
      data = data.replace(/DB_USERNAME=homestead/g, 'DB_USERNAME='+settings.dbUsername);
      data = data.replace(/DB_PASSWORD=secret/g, 'DB_PASSWORD='+settings.dbPassword);
    } else {
      data = data.replace(/DB_CONNECTION/g, '# DB_CONNECTION');
      data = data.replace(/DB_HOST/g, '# DB_HOST');
      data = data.replace(/DB_PORT/g, '# DB_PORT');
      data = data.replace(/DB_DATABASE/g, '# DB_DATABASE');
      data = data.replace(/DB_USERNAME/g, '# DB_USERNAME');
      data = data.replace(/DB_PASSWORD/g, '# DB_PASSWORD');
    }
    
    fs.writeFile('./.env', data, 'utf8', function (err,data) {
      if (err) {
        errors.push('Cannot save .env file with new values.');
      }
    });
  });

    // edit env file (environment, db, debug settings) 
  fs.readFile('./bootstrap/app.php', 'utf8', function (err,data) {
    if (err) {
      errors.push('Cannot open ./bootstrap/app.php file for editing.');
    }

    // edit bootstrap/app.php to use dotend and facades
    data = data.replace(/\/\/\sDotenv/g, 'Dotenv');
    data = data.replace(/\/\/\s\$app->withFacades/g, '$app->withFacades');
    
    // ..and eloquent if using a DB
    if(settings.doDbSetup) {
      data = data.replace(/\/\/\s\$app->withEloquent/g, '$app->withEloquent');
    }

    fs.writeFile('./bootstrap/app.php', data, 'utf8', function (err,data) {
      if (err) {
        errors.push('Cannot save ./bootstrap/app.php file with new values.');
      }
    });
  });
  
  cb();
};

/**
 * Setup the development DB
 */
NpLumenGenerator.prototype.setupDB = function () {
  var cb = this.async();

  if(settings.doDbSetup && this.options.skipdbsetup === false) {
    this.log.write().ok('Setting up database '+settings.dbName);
  
    //var sql = 'mysql -u'+settings.dbUsername+' -p'+settings.dbPassword+' -e "create database '+settings.dbName+'"';
    var sql = 'MYSQL_PWD=' + settings.dbPassword + ' mysql -u'+settings.dbUsername+' -e "create database '+settings.dbName+'" --silent';

    // need to run this command using shelljs as using a password on the command line always causes a textfeed which passthru sees as an error
    var res = shell.exec(sql, {silent:true});
   
    if (res.code !== 0) {
       errors.push(res.output);
    }  
  } else {
    this.log.write().ok('Skipping database setup');
  } 
  cb(); 
};

/**
 * Add additional packages to the Composer settings
 */
NpLumenGenerator.prototype.addComposerPackages = function () {
  this.log.write().ok('Adding additional packages to composer.json');

  var cb = this.async();
  
  fs.readJSON('./composer.json', function (err, data) {
    if(err) {
      logError(err);
    } 

    // Install BarryVdh for CORS, and Vinklahashid for short unique ids
    data.require['barryvdh/laravel-cors'] = '0.7.x';
    data.require['hashids/hashids'] = '1.0.x';
  
    fs.removeSync('./composer.json', logError);
    fs.writeJSON('./composer.json', data, logError);

    cb();

  });
};

/**
 * Install the composer dependencies
 */
NpLumenGenerator.prototype.installComposerDependencies = function () {
  var cb = this.async();

  if(this.options.skipdependencies === false) {
    this.log.write().ok('Installing PHP/Composer dependancies');
    // check if composer is installed globally
    var res = shell.exec('composer', {silent:true});
    if (res.code !== 0) {
       errors.push('Composer command not found. Please install the composer dependencies manually after the installer is done.');

      // laravel cant run without the composers deps, so don't autoset the app key at the end.
      settings.createAppKey = false;
      cb();
    } else {
      passthru('composer install', function (err) {
        if (err) {
           errors.push('Composer dependencies install error: ' + err);
        }
        cb();
      });
    }
  } else {
    this.log.write().ok('Skipping PHP/Composer dependencies');
    cb();
  }
};

/**
 * Install the NPM depencies
 */
NpLumenGenerator.prototype.installNPMDependencies = function () {
  var cb = this.async();
  
  if(this.options.skipdependencies === false) {
    this.log.write().ok('Installing NPM dependencies');

    // check if npm command is installed
    var res = shell.exec('npm -v', {silent:true});
    if (res.code !== 0) {
      errors.push('NPM command not found. Please install the Node dependencies manually after the installer is done.');
      cb();
    } else {

      var install = shell.exec('npm install', {silent:true});
      if (install.code !== 0) {
        errors.push('NPM dependencies install error: ' + install.output);
      } 
      cb();
    }
  } else {
    this.log.write().ok('Skipping NPM dependencies');
    cb();
  }
};

/**
 * Install bower dependencies
 */
NpLumenGenerator.prototype.installBowerDependencies = function () {
  var cb = this.async();
  
  // check if bower command is installed
  var res = shell.exec('bower -v', {silent:true});

  if(this.options.skipdependencies === false) {
    this.log.write().ok('Installing Bower dependencies');
    if (res.code !== 0) {
      errors.push('bower command not found. Please install the Bower dependencies manually after the installer is done.');
      cb();
    } else {
      var install = shell.exec('bower install', {silent:true});

      if (install.code !== 0) {
        errors.push('Bower dependencies install error: ' + install.output);
      } 
      cb();
    }
  } else {
    this.log.write().ok('Skipping Bower dependencies');
    cb();
  }
};

/**
 * Create application key
 */
NpLumenGenerator.prototype.generateAppKey = function () {
  this.log.write().ok('Generating app key');
  // php artisan create key
  //var res = shell.exec('php artisan key:generate', {silent:true});
  var res = shell.exec('php -r "print md5(uniqid());"', {silent:true});
  if (res.code !== 0) {
      errors.push('Error generating app key.');
  } else {

  // edit env file 
  fs.readFile('./.env', 'utf8', function (err,data) {
    if (err) {
      errors.push('Cannot open .env file to set app key.');
    }

    data = data.replace(/SomeRandomKey!!!/g, res.output);
    
    fs.writeFile('./.env', data, 'utf8', function (err,data) {
      if (err) {
        errors.push('Error updating .env file with new app key.');
      }
    });
  });

    settings.createAppKey = false;
  }
};

/**
 * Git repository setup
 */
NpLumenGenerator.prototype.setupGit = function () {
  var cb = this.async();

  if(settings.doGitSetup) {
    this.log.write().ok('Setting up empty git repo');

    var git = shell.exec('git init', {silent:true});
   
    if (git.code !== 0) {
       //errors.push(git.output);
       logError(git.output);
    } else {
      shell.exec('git add .', {silent:true});
      shell.exec('git commit -m \'Initial Commit\'', {silent:true});

      if(settings.gitRemote !== '') {
        var remote = shell.exec('git remote add origin ' + settings.gitRemote);

        if (remote.code !== 0) {
          errors.push(remote.output);
        } else {
          this.log.write().ok('git remote added');
        }
      }
    } 
  }

  cb();
};

/**
 * Show completion screen with overview of post install commands, errors etc
 */
NpLumenGenerator.prototype.completed = function () {
  var self = this;

  var installerErrors = (errors.length === 0)  ? chalk.green(0) : chalk.red(errors.length);

  this.log.write().ok('Installion completed with %s errors.', installerErrors); 
  
  if(errors.length !== 0) {
    errors.forEach(function(error) {
      self.log.write().conflict(error);
    });
  } 

  if(settings.createAppKey) {
    this.log.write().info('You still need to create an app key after manually installing the Composer dependencies');
  }

  this.log.write().info('Installation complete. Enjoy!');
};

/**
 * Stack all error messages for later loggin
 * @param  String or Object An error string or node.fs error object passed through the callback
 * @return the error stack
 */
var logError = function(e) {
  if(e) {
    errors.push(e.toString());
  }

  return errors;
}

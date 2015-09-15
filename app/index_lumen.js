'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var fs = require('fs-extra');
var path = require('path');
var cc = require('change-case');

// Base app settings
var settings = {
  appName: '',
  appVersion: '1.0.0',
  LumenVersion: 'v5.1.4',
  doDbSetup: true,
  dbUsername: 'root',
  dbPassword: 'root',
  dbName: '',
  doGitSetup: true,
  gitRemote: '',
  createAppKey: true
};

//this.log.write(chalk.green('php ' + this.settings.entrypointName + '\n'));


// options for which laravel version to download
var LumenVersions = [settings.laravelVersion, 'v5.1.4', 'master'];

module.exports = yeoman.generators.Base.extend({
  // note: arguments and options should be defined in the constructor.
  constructor: function () {
    yeoman.generators.Base.apply(this, arguments);
  },

  /**
   * Running context priorities
   * http://yeoman.io/authoring/running-context.html
   */
  initializing: function () {    
 
  },

  prompting: function () {    
    var done = this.async();

    var prompts = [
    {
      type    : 'input',
      name    : 'app_name',
      message : 'Project name',
      default : cc.paramCase(this.appname)
    }];


    this.prompt(prompts, function (props) {
      this.props = props;

      done();
    }.bind(this));
  },

  lumen: function () {
    var cb = this.async();
    var tarball = 'https://github.com/laravel/lumen/archive/archive/' + settings.lumenVersion + '.tar.gz';

    this.log.write('Downloading and extracting ' . tarball);

    //strip is needed to extract to current dir instead of dir with name of tarball
    this.tarball(tarball, '.', {extract: true, strip: 1}, cb);
  },


//
  configuring: function () {    
    // this.fs.copyTpl(
    //   this.templatePath('_composer.json'),
    //   this.destinationPath('composer.json'), 
    //   { 
    //     VENDOR_NAME: this.props.username,
    //     PROJECT_NAME: this.settings.entrypointName,
    //     PHP_NAMESPACE: this.settings.phpNamespace,
    //     APPLICATION_VERSION: this.settings.appVersion,
    //   }
    // );

    // this.fs.copyTpl(
    //   this.templatePath('_README.md'),
    //   this.destinationPath('README.md'), 
    //   { 
    //     APPLICATION_NAME: this.settings.appName
    //   }
    // );
  },

  writing: function () {    
    this.fs.copyTpl(
      this.templatePath('_app'),
      this.destinationPath(this.settings.entrypointName), 
      { 
        PHP_NAMESPACE: this.settings.phpNamespace,
        APPLICATION_NAME: this.settings.appName,
        APPLICATION_VERSION: this.settings.appVersion,
        PHP_CLASSNAME: this.settings.phpClassName
      }
    );

  },

  install: function () {
    if(typeof this.options.skipInstall === 'undefined') {
      this.spawnCommand('composer', ['install'])
        .on('exit', function (err) {
          if(err === 0) {
            this.log.write('Scaffolding complete.');
            this.log.write(chalk.green('php ' + this.settings.entrypointName + '\n'));
            this.log.write(chalk.white('Don\'t forget to update the README.md and the rest of the composer.json settings (author, description etc).' + '\n'));
          }
        }.bind(this));    
      }
  },

});

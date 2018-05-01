#!/usr/bin/env node

var program = require('commander');
var fs = require('fs');
var path = require('path');
var jsyaml = require('js-yaml');
var ZSchema = require('z-schema');
var validator = new ZSchema({
  ignoreUnresolvableReferences: true
});
var config = require('../src/configurations'),
  logger = config.logger;
var shell = require('shelljs');

var zipFolder = require('zip-folder');
var zipdir = require('zip-dir');

var touch = require("touch");
var beautify = require('js-beautify').js;

var schemaV3 = fs.readFileSync(path.join(__dirname, './schemas/openapi-3.0.json'), 'utf8');
schemaV3 = JSON.parse(schemaV3);

/**
 * Returns a simple, frinedly, intuitive name deppending on the requested method.
 * @param {object} method - Method name taken directly from the req object.
 */
function nameMethod(method) {
  method = method.toString();
  var name;
  if (method == 'get') {
    name = "list";
  } else if (method == 'post') {
    name = "create";
  } else if (method == 'put') {
    name = "update";
  } else if (method == 'delete') {
    name = "delete";
  }
  return name;
}

/**
 * Returns the resource name, contained in the requested url/path (as appears on the oasDoc file), without any slashes.
 * @param {object} requestedSpecPath - Requested path as appears on the oasDoc file.
 * @param {object} single - Indicates if operation is related to single resource. If so last 's' will be removed.
 */
function resourceName(requestedSpecPath, single) {
  var resource = requestedSpecPath.toString().split("/")[1];
  if (single) {
    return resource.charAt(0).toUpperCase() + resource.slice(1, resource.length - 2);
  } else {
    return resource.charAt(0).toUpperCase() + resource.slice(1);
  }
}

program
  .arguments('<file>')
  .action(function(file) {
    try {
      var spec = fs.readFileSync(path.join(__dirname, file), 'utf8');
      var oasDoc = jsyaml.safeLoad(spec);
      logger.info('Input oas-doc %s: %s', file, oasDoc);
      validator.validate(oasDoc, schemaV3, function(err, valid) {
        if (err) {
          logger.error('oasDoc is not valid: ' + JSON.stringify(err));
          process.exit();
        } else {
          shell.exec('mkdir nodejs-server-generated');
          shell.cd('nodejs-server-generated');
          shell.cp('../auxiliary/README.md', './README.md');

          shell.exec('mkdir .oas-generator && echo 1.0.0 > .oas-generator/VERSION');

          shell.exec('mkdir api');
          shell.cp('../' + file, './api/oas-doc.yaml');

          shell.exec('mkdir utils');
          shell.cp('../auxiliary/writer.js', './utils/writer.js');

          /*
                    'use strict';

                    var url = require('url');

                    var Default = require('./DefaultService');

                    module.exports.deleteVotes = function deleteVotes (req, res, next) {
                      Default.deleteVotes(req.swagger.params, res, next);
                    };

                    module.exports.getResults = function getResults (req, res, next) {
                      Default.getResults(req.swagger.params, res, next);
                    };

                    module.exports.registerVote = function registerVote (req, res, next) {
                      Default.registerVote(req.swagger.params, res, next);
                    };
          */

          shell.exec('mkdir controllers');
          var paths = oasDoc.paths;
          var open = true;
          var opId;
          var controllerName;
          var controller_files = [];
          for (path in paths) {
            for (var method in paths[path]) {
              if (paths[path][method].operationId != undefined) {
                opId = paths[path][method].operationId;
              } else {
                var single = false;
                if (paths[path][method].parameters != undefined) {
                  single = true;
                }
                opId = nameMethod(method) + resourceName(path, single);
                logger.debug("Oas-doc does not have opearationId property for " + method + " - " + path + " -> operationId name autogenerated: " + operationId);
              }
              if (paths[path][method]['x-router-controller'] != undefined) {
                controllerName = paths[path][method]['x-router-controller'];
              } else {
                controllerName = path.split("/")[1] + "Controller";
                logger.debug("Oas-doc does not have x-router-controller property for " + method + " - " + path + " -> controller name autogenerated: " + controllerName);
              }
              if (!controller_files.includes(controllerName)) {
                controller_files.push(controllerName);
                controller_files.push(controllerName + "Service");
              }
              logger.debug("Write: " + opId);
              if (open == true) {
                var header = "'use strict' \n\nvar " + controllerName + " = require('./" + controllerName + "Service');\n\n";
                fs.appendFileSync(__dirname + '/nodejs-server-generated/controllers/' + controllerName + ".js", header);
                fs.appendFileSync(__dirname + '/nodejs-server-generated/controllers/' + controllerName + "Service.js", "'use strict'\n\n");
                open = false;
              }
              var function_string = "module.exports." + opId + " = function " + opId + " (req, res, next) {\n" + controllerName + "." + opId + "(req.swagger.params, res, next);\n};\n\n";
              var function_string_service = "module.exports." + opId + " = function " + opId + " (req, res, next) {\nres.send({message: 'This is the raw controller for " + opId + "' });\n};\n\n";
              fs.appendFileSync(__dirname + '/nodejs-server-generated/controllers/' + controllerName + ".js", function_string);
              fs.appendFileSync(__dirname + '/nodejs-server-generated/controllers/' + controllerName + "Service.js", function_string_service);
            }
          }

          for (var i = 0; i < controller_files.length; i++) {
            logger.debug("Beautify file " + controller_files[i]);
            var data = fs.readFileSync(__dirname + '/nodejs-server-generated/controllers/' + controller_files[i] + ".js", 'utf8');
            fs.writeFileSync(__dirname + '/nodejs-server-generated/controllers/' + controller_files[i] + ".js", beautify(data, {
              indent_size: 2,
              space_in_empty_paren: true
            }));
          }

          touch.sync('.oas-generator-ignore');
          shell.cp('../auxiliary/index.js', './index.js');

          var package_raw = {
            "name": oasDoc.info.title,
            "version": "1.0.0",
            "description": "No description provided (generated by OAS Codegen)",
            "main": "index.js",
            "scripts": {
              "prestart": "npm install",
              "start": "node index.js"
            },
            "keywords": [
              "OAI"
            ],
            "license": "Unlicense",
            "private": true,
            "dependencies": {
              "express": "^4.16.3",
              "js-yaml": "^3.3.0"
            }
          };

          fs.appendFileSync(__dirname + '/nodejs-server-generated/' + 'package.json', JSON.stringify(package_raw));

          shell.exec('npm install');

          shell.cd('..');

          zipdir('./nodejs-server-generated', {
            saveTo: 'nodejs-server-generated.zip'
          }, function(err, buffer) {
            if (err) {
              logger.error('Compressor error: ', err);
            } else {
              logger.debug('---< NodeJS project ZIP generated! >---');
              shell.rm('-r', 'nodejs-server-generated');
            }
          });
        }
      });
    } catch (err) {
      logger.error(err);
    }
  })
  .parse(process.argv);

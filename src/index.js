/*
OAS-tools module 0.0.0, built on: 2017-03-30
Copyright (C) 2017 Ignacio Peluaga Lozada (ISA Group)
https://github.com/ignpelloz
https://github.com/isa-group/project-oas-tools
*/

import * as _ from "lodash-compat";
import * as express from "express";
import * as utils from "./lib/utils";
import EmptyMiddleware from "./middleware/empty_middleware";
import OASAuth from "./middleware/oas-auth";
import OASRouter from "./middleware/oas-router";
import OASSecurity from "./middleware/oas-security";
import OASValidator from "./middleware/oas-validator";
import ZSchema from "z-schema";
import bodyParser from "body-parser";
import { config } from "./configurations";
import deref from "json-schema-deref-sync";
import fs from "fs";
import { join } from "path";
import jsyaml from "js-yaml";
import request from "request";

const validator = new ZSchema({
  ignoreUnresolvableReferences: true,
  ignoreUnknownFormats: config.ignoreUnknownFormats,
  breakOnFirstError: false,
});
const schemaV3 = jsyaml.safeLoad(
  fs.readFileSync(join(__dirname, "./schemas/openapi-3.0.yaml"), "utf8")
);

function fatalError(err) {
  config.logger.error(err);
  throw err;
}

/**
 * Checks that specDoc and callback exist and validates specDoc.
 *@param {object} specDoc - Speceficitation file.
 *@param {object} callback - Callback function passed to the initialization function.
 */
export function init_checks(specDoc, callback) {
  if (_.isUndefined(specDoc)) {
    throw new Error("specDoc is required");
  } else if (!_.isPlainObject(specDoc)) {
    throw new TypeError("specDoc must be an object");
  }

  if (_.isUndefined(callback)) {
    throw new Error("callback is required");
  } else if (!_.isFunction(callback)) {
    throw new TypeError("callback must be a function");
  }

  var err = validator.validate(specDoc, schemaV3);
  if (err == false) {
    fatalError(
      "Specification file is not valid: " +
        JSON.stringify(validator.getLastErrors())
    );
  } else {
    config.logger.info("Valid specification file");
  }
}

/**
 * Function to set configurations. Initializes local variables that then will be used in the callback inside initializeMiddleware function.
 *@param {object} options - Parameter containing controllers location, enable logs, and strict checks. It can be a STRING or an OBJECT.
 */
export function configure(options) {
  config.setConfigurations(options);
}

/**
 * Checks if operationId (or generic) and function for it exists on controller for a given pair path-method.
 *@param {object} load - Loaded controller.
 *@param {object} pathName - Path of the spec file to be used to find controller.
 *@param {object} methodName - One of CRUD methods.
 *@param {object} methodSection - Section of the speficication file belonging to methodName.
 */
function checkOperationId(load, pathName, methodName, methodSection) {
  var opId = undefined;
  var rawOpId = undefined;

  if (_.has(methodSection, "operationId")) {
    rawOpId = methodSection.operationId;
    opId = utils.generateName(rawOpId, undefined); //there is opId: just normalize
  }

  if (opId == undefined) {
    opId = utils.generateName(pathName, "function") + methodName.toUpperCase(); //there is no opId: normalize and add "func" at the beggining
    config.logger.debug(
      "      There is no operationId for " +
        methodName.toUpperCase() +
        " - " +
        pathName +
        " -> generated: " +
        opId
    );
  }

  if (load[opId] == undefined) {
    fatalError(
      "      There is no function in the controller for " +
        methodName.toUpperCase() +
        " - " +
        pathName +
        " (operationId: " +
        opId +
        ")"
    );
  } else {
    config.logger.debug(
      "      Controller for " +
        methodName.toUpperCase() +
        " - " +
        pathName +
        ": OK"
    );
  }
}

/**
 * Checks if exists controller for a given pair path-method.
 *@param {object} pathName - Path of the spec file to be used to find controller.
 *@param {object} methodName - One of CRUD methods.
 *@param {object} methodSection - Section of the speficication file belonging to methodName.
 *@param {object} controllersLocation - Location of controller files.
 */
function checkControllers(
  pathName,
  methodName,
  methodSection,
  controllersLocation
) {
  config.logger.debug("  " + methodName.toUpperCase() + " - " + pathName);
  var controller;
  var load;
  var router_property;

  if (methodSection["x-router-controller"] != undefined) {
    router_property = "x-router-controller";
  } else if (methodSection["x-swagger-router-controller"] != undefined) {
    router_property = "x-swagger-router-controller";
  } else {
    router_property = undefined;
  }

  if (methodSection[router_property] != undefined) {
    controller = methodSection[router_property];
    config.logger.debug(
      "    OAS-doc has " + router_property + " property " + controller
    );
    try {
      load = require(join(
        controllersLocation,
        utils.generateName(controller, undefined)
      ));
      checkOperationId(load, pathName, methodName, methodSection);
    } catch (err) {
      fatalError(err);
    }
  } else {
    controller = utils.generateName(pathName, "controller");
    config.logger.debug(
      "    Spec-file does not have router property -> try generic controller name: " +
        controller
    );
    try {
      load = require(join(controllersLocation, controller));
      checkOperationId(load, pathName, methodName, methodSection);
    } catch (err) {
      config.logger.debug(
        "    Controller with generic controller name wasn't found either -> try Default one"
      );
      try {
        controller = "Default"; //try to load default one
        load = require(join(controllersLocation, controller));
        checkOperationId(load, pathName, methodName, methodSection);
      } catch (err) {
        fatalError(
          "    There is no controller for " +
            methodName.toUpperCase() +
            " - " +
            pathName
        );
      }
    }
  }
}

/**
 * Converts a oas-doc type path into an epxress one.
 * @param {string} oasPath - Path as shown in the oas-doc.
 */
var getExpressVersion = function (oasPath) {
  return oasPath.replace(/{/g, ":").replace(/}/g, "");
};

/**
 * In case the spec doc has servers.url properties this function appends the base path to the path before registration
 * @param {string} specDoc - Specification file.
 * @param {string} expressPath - Express type path.
 */
function appendBasePath(specDoc, expressPath) {
  var res;
  if (specDoc.servers != undefined) {
    var specServer = specDoc.servers[0].url;
    var url = specServer.split("/");

    var basePath = "/";

    if (specServer.charAt(0) === "/") {
      basePath =
        specServer.charAt(specServer.length - 1) !== "/"
          ? specServer
          : specServer.slice(0, -1);
    } else {
      for (var i = 0; i < url.length; i++) {
        if (i >= 3) {
          basePath += url[i] + "/";
        }
      }
      basePath = basePath.slice(0, -1);
      if (basePath == "/") {
        basePath = "";
      }
    }
    config.basePath = basePath;
    res = basePath + expressPath;
  } else {
    res = expressPath;
  }

  return res;
}

function extendGrants(specDoc, grantsFile) {
  var newGrants = {};
  Object.keys(grantsFile).forEach((role) => {
    newGrants[role] = {};
    Object.keys(grantsFile[role]).forEach((resource) => {
      if (resource !== "$extend") {
        var grants = grantsFile[role][resource];
        var splitRes = resource.split("/");
        Object.keys(specDoc.paths).forEach((specPath) => {
          var found = true;
          var pos = -1;
          var splitPath = specPath.split("/");
          splitRes.forEach((resPart) => {
            var foundPos = splitPath.indexOf(resPart);
            if (!found || foundPos <= pos) {
              found = false;
            }
          });
          if (found && !newGrants[role][specPath]) {
            newGrants[role][specPath] = grants;
          }
        });
      } else {
        newGrants[role].$extend = grantsFile[role].$extend;
      }
    });
  });
  return newGrants;
}

function isJWTScheme(secDef) {
  return (
    secDef.type === "http" &&
    secDef.scheme === "bearer" &&
    secDef.bearerFormat === "JWT"
  );
}

function initializeSecurityAndAuth(specDoc) {
  if (specDoc.components && specDoc.components.securitySchemes) {
    if (!config.securityFile) {
      config.securityFile = {};
    }
    if (!config.grantsFile) {
      config.grantsFile = {};
    }
    Object.keys(specDoc.components.securitySchemes).forEach((secName) => {
      var secDef = specDoc.components.securitySchemes[secName];
      if (isJWTScheme(secDef)) {
        if (secDef["x-bearer-config"] && !config.securityFile[secName]) {
          config.securityFile[secName] = secDef["x-bearer-config"];
        }
        if (secDef["x-acl-config"] && !config.grantsFile[secName]) {
          config.grantsFile[secName] = secDef["x-acl-config"];
        }
      }
    });
    Object.keys(config.securityFile).forEach((secName) => {
      if (
        typeof config.securityFile[secName] === "string" &&
        isJWTScheme(specDoc.components.securitySchemes[secName])
      ) {
        if (config.securityFile[secName].substr(0, 4) === "http") {
          request(config.securityFile[secName], (_err, _res, body) => {
            config.securityFile[secName] = JSON.parse(body);
          });
        } else if (config.securityFile[secName].charAt(0) === "/") {
          config.securityFile[secName] = require(config.securityFile[secName]);
        } else {
          config.securityFile[secName] = require(join(
            process.cwd(),
            config.securityFile[secName]
          ));
        }
      }
    });
    Object.keys(config.grantsFile).forEach((secName) => {
      if (
        typeof config.grantsFile[secName] === "string" &&
        isJWTScheme(specDoc.components.securitySchemes[secName])
      ) {
        if (config.grantsFile[secName].substr(0, 4) === "http") {
          request(config.grantsFile[secName], (_err, _res, body) => {
            config.grantsFile[secName] = extendGrants(
              specDoc,
              JSON.parse(body)
            );
          });
        } else if (config.grantsFile[secName].charAt(0) === "/") {
          config.grantsFile[secName] = extendGrants(
            specDoc,
            require(config.grantsFile[secName])
          );
        } else {
          config.grantsFile[secName] = extendGrants(
            specDoc,
            require(join(process.cwd(), config.grantsFile[secName]))
          );
        }
      } else {
        config.grantsFile[secName] = extendGrants(
          specDoc,
          config.grantsFile[secName]
        );
      }
    });
  }
}

/**
 * Function to initialize swagger-tools middlewares.
 *@param {object} specDoc - Specification file (dereferenced).
 *@param {function} app - Express application object.
 */
function registerPaths(specDoc, app) {
  var OASRouterMid = function () {
    return OASRouter.call(undefined, config.controllers);
  };
  var OASValidatorMid = function () {
    return OASValidator.call(undefined, specDoc);
  };
  initializeSecurityAndAuth(specDoc);
  var OASSecurityMid = function () {
    return OASSecurity.call(undefined, specDoc);
  };
  var OASAuthMid = function () {
    return OASAuth.call(undefined, specDoc);
  };

  var dictionary = {};

  if (specDoc.servers) {
    var localServer = specDoc.servers.find(
      (server) =>
        server.url.substr(0, 16) === "http://localhost" ||
        server.url.charAt(0) === "/"
    );
    if (!localServer) {
      config.logger.info(
        "No localhost or relative server found in spec file, added for testing in Swagger UI"
      );
      var foundServer = specDoc.servers[0];
      var basePath = "/" + foundServer.url.split("/").slice(3).join("/");
      specDoc.servers.push({
        url: basePath,
      });
    }
  } else {
    config.logger.info(
      "No servers found in spec file, added relative server for testing in Swagger UI"
    );
    specDoc.servers = [
      {
        url: "/",
      },
    ];
  }

  var paths = specDoc.paths;
  //  console.log('specDoc.paths ', specDoc.paths)
  var allowedMethods = [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
    "trace",
  ];
  for (var path in paths) {
    for (var method in paths[path]) {
      if (allowedMethods.includes(method)) {
        // pgillis 2019 June 10
        var myPathObj = paths[path];
        //console.log('myPathObj ', myPathObj)
        //config.logger.debug('PWG ****: '+myPathObj+ " hasProperty "+  myPathObj.hasOwnProperty('x-swagger-router-controller'));
        if (
          myPathObj.hasOwnProperty("x-swagger-router-controller") &&
          myPathObj[method].hasOwnProperty("x-swagger-router-controller") ===
            false
        ) {
          myPathObj[method]["x-swagger-router-controller"] =
            myPathObj["x-swagger-router-controller"];
        }
        var expressPath = getExpressVersion(path); // TODO: take in account basePath/servers property of the spec doc.
        dictionary[expressPath.toString()] = path;
        config.logger.debug(
          "Register: " + method.toUpperCase() + " - " + expressPath
        );
        if (config.router == true && config.checkControllers == true) {
          checkControllers(
            path,
            method,
            paths[path][method],
            config.controllers
          );
        }
        expressPath = appendBasePath(specDoc, expressPath);
        if (config.oasSecurity == true) {
          app[method](expressPath, OASSecurityMid());
        }
        if (config.oasAuth == true) {
          app[method](expressPath, OASAuthMid());
        }
        if (config.validator == true) {
          app[method](expressPath, OASValidatorMid());
        }
        if (config.router == true) {
          app[method](expressPath, OASRouterMid());
        }
      }
    }
  }
  if (config.docs && config.docs.apiDocs) {
    if (!config.docs.apiDocsPrefix) {
      config.docs.apiDocsPrefix = "";
    }

    const apiSpecDoc = Object.freeze(_.cloneDeep(specDoc));

    app.use(config.docs.apiDocsPrefix + config.docs.apiDocs, (_req, res) => {
      res.send(apiSpecDoc);
    });
    if (config.docs.swaggerUi) {
      var uiHtml = fs.readFileSync(
        join(__dirname, "../swagger-ui/index.html"),
        "utf8"
      );
      uiHtml = uiHtml.replace(
        /url: "[^"]*"/,
        'url: "' + config.docs.apiDocsPrefix + config.docs.apiDocs + '"'
      );
      fs.writeFileSync(
        join(__dirname, "../swagger-ui/index.html"),
        uiHtml,
        "utf8"
      );
      if (!config.docs.swaggerUiPrefix) {
        config.docs.swaggerUiPrefix = "";
      }
      app.use(
        config.docs.swaggerUiPrefix + config.docs.swaggerUi,
        express.static(join(__dirname, "../swagger-ui"))
      );
    }
  }
  config.pathsDict = dictionary;
}

/**
 * Function to initialize OAS-tools middlewares.
 *@param {object} oasDoc - Specification file.
 *@param {object} app - Express server used for the application. Needed to register the paths.
 *@param {function} callback - Function in which the app is started.
 */
export function initialize(oasDoc, app, callback) {
  init_checks(oasDoc, callback);

  var fullSchema = deref(oasDoc, { mergeAdditionalProperties: true });
  config.logger.info("Specification file dereferenced");

  registerPaths(fullSchema, app);

  callback();
}

/**
 * Function to initialize swagger-tools middlewares.
 *@param {object} specDoc - Specification file.
 *@param {function} app - //TODO IN CASE EXPRESS CAN BE USED INSTEAD OF CONNECT, USER MUST PASS THIS TO initializeMiddleware TO REGISTER ROUTES.
 *@param {function} callback - Function that initializes middlewares one by one.
 */
export function initializeMiddleware(specDoc, app, callback) {
  app.use(
    bodyParser.json({
      strict: false,
    })
  );

  init_checks(specDoc, callback);

  var fullSchema = deref(specDoc);
  config.logger.info("Specification file dereferenced");

  var middleware = {
    swaggerValidator: EmptyMiddleware,
    swaggerRouter: EmptyMiddleware,
    swaggerMetadata: EmptyMiddleware,
    swaggerUi: EmptyMiddleware,
    swaggerSecurity: EmptyMiddleware,
  };
  registerPaths(fullSchema, app);
  callback(middleware);
}

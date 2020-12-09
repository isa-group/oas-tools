/*!
OAS-tools module 0.0.0, built on: 2017-03-30
Copyright (C) 2017 Ignacio Peluaga Lozada (ISA Group)
https://github.com/ignpelloz
https://github.com/isa-group/project-oas-tools

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.*/

'use strict';

var exports;  // eslint-disable-line
var ZSchema = require("z-schema");
var fetch = require('node-fetch');
var fs = require('fs');

var yaml = require('js-yaml');
// unused: review
// var fs = require('fs');
// var path = require('path');
// var http = require('http');
// var urlModule = require('url');

var config = require('../configurations'),
  logger = config.logger,
  utils = require('../lib/utils');

var validator = new ZSchema({
  ignoreUnresolvableReferences: config.validatorRetrieveRemoteSchemaReferences? false : true,
  ignoreUnknownFormats: config.ignoreUnknownFormats,
  breakOnFirstError: false
});
var _ = require('lodash-compat');


/**
 * Returns the Express version of the OAS name for location.
 * @param {string} inProperty - Location of a parameter, value of 'in' property of the oasDoc file for that parameter.
 */
function locationFormat(inProperty) { //TODO: Possible 'in' values: path, query, header, cookie.
  var dict = {
    path: "params",
    query: "query",
    header: "headers",
    cookie: "cookie"
  };
  return dict[inProperty];
  //return (inProperty == "path" ? "params" : inProperty); //TODO: if only 'path' changes then this is the solution!
}

 /**
  * Filters path parameters so that method parameters can override them
  * @param {*} methodParameters - Method-specific parameters
  * @param {*} pathParameters - Common parameters for every path method
  */
function filterParams(methodParameters, pathParameters) {
  var res = methodParameters;
  var paramNames = methodParameters.map((param) => {
    return param.name;
  });
  pathParameters.forEach((pathParam) => {
    if (!paramNames.includes(pathParam.name)) {
      res.push(pathParam);
    }
  });
  return res;
}

/**
 * transfer fieldname(s) and filename(s) of an multipart/form-data request to a data object
 * that is subsequently passed to a validator checking for required properties of a openAPI path operation
 *
 * @param {array} files
 * @param {object} dataToValidate
 * @returns {object}
 */
function addFilesToJSONPropertyValidation(files, dataToValidate) {
  const data = dataToValidate;
  files.forEach((file) => {
    if (file.fieldname && file.originalname) {
      data[file.fieldname] = file.originalname;
    }
  })
  return data;
}

/**
 * Checks if the data provided in the request is valid acording to what is specified in the oas specification file.
 * @param {object} paths - Paths section of the oasDoc file.
 * @param {string} requestedSpecPath - Requested url by the client. If the request had parameters in the query those won't be part of this variable.
 * @param {string} method - Method requested by the client.
 * @param {string} req - The whole req object from the client request.
 */
async function checkRequestData(oasDoc, requestedSpecPath, method, res, req, next) { // eslint-disable-line
  var paths = oasDoc.paths;
  var keepGoing = true;
  //var msg = "";
  var msg = [];

  if (paths[requestedSpecPath][method].hasOwnProperty('requestBody')) {
    var requestBody = paths[requestedSpecPath][method].requestBody;
    const emptyBody = req.body == undefined || JSON.stringify(req.body) == '{}';
    if (requestBody.required && emptyBody) {
      var newErr = {
        message: "Missing object in the request body. "
      };
      msg.push(newErr);
      keepGoing = false;
    } else if (requestBody.required || !emptyBody) {
      // can be any of "application/json", "multipart/form-data", "image/png", ...
      const contentType = Object.keys(requestBody.content)[0];
      var validSchema = _.cloneDeep(requestBody.content[contentType].schema)
      utils.fixNullable(validSchema)

      var data = req.body; //JSON.parse(req.body); //Without this everything is string so type validation wouldn't happen TODO: why is it commented?
      // a multipart/form-data request has a "files" property in the request whose
      // properties need to be passed to evaluating the required parameters in the openAPI spec
      if (contentType.toLowerCase() === "multipart/form-data" && req.files && req.files.length > 0) {
        data = addFilesToJSONPropertyValidation(req.files, data);
      }

      var err = validator.validate(data, validSchema);
      if (config.validatorRetrieveRemoteSchemaReferences) {
        var missingReferences = validator.getMissingRemoteReferences();
        if (missingReferences.length > 0) {
          logger.info("OASValidator Found " + missingReferences.length + " missing/remote reference(s) in the OpenAPI Spec")
          for (let url of missingReferences) {
            try {
              let body
              if (url.startsWith("./") || url.startsWith("../") || url.startsWith("file://")) {
                logger.info("OASValidator Getting local/relative reference '" + url +"'")
                body = fs.readFileSync(url, {encoding:'utf8', flag:'r'})
              } else {
                logger.info("OASValidator Getting remote reference '" + url +"'")
                const response = await fetch(url)
                body = await response.text()
              }

              if (body[0] == "o") { // openapi yaml
                await validator.setRemoteReference(url, yaml.safeLoad(body));
              } else if (body[0] == "{") {
                await validator.setRemoteReference(url, JSON.parse(body));
              } else {
                logger.info("OASValidator Error: Content from " + url + " did not start with YAML ('o[penapi]') nor JSON ('{...'). First character was '" + body[0] + "'")
              }
            } catch(e) {
                logger.info("OASValidator Error: " + e)
            }
          }
        }
        err = validator.validate(data, validSchema); //Validate one more time after resolving references.
      }

      if (err == false) {
        newErr = {
          message: "Wrong data in the body of the request. ",
          error: validator.getLastErrors(),
          content: data
        };
        msg.push(newErr);
        keepGoing = false;
      } else {
        logger.info("Valid parameter on request");
      }
    }
  }

  if (paths[requestedSpecPath][method].hasOwnProperty('parameters') || paths[requestedSpecPath].hasOwnProperty('parameters')) {

    var methodParams = paths[requestedSpecPath][method].parameters || [];
    var pathParams = paths[requestedSpecPath].parameters || [];
    var params = filterParams(methodParams, pathParams);


    for (var i = 0; i < params.length; i++) {

      //TODO: 'required' property is not required, some parameters may not have it (those in query for example)

      if (params[i].required != undefined && params[i].required.toString() == 'true') { //TODO: in case it is not required...there is no validation?
        var name = params[i].name;
        var location = params[i].in;
        var schema = params[i].schema;
        var value;

        location = locationFormat(location);
        if (location === "headers") {
            name = name.toLowerCase(); // Allows OpenAPI Spec header params to be handled as case-insensitive.
        }

        if (req[location][name] == undefined) { //if the request is missing a required parameter acording to the oasDoc: warning
          newErr = {
            message: "Missing parameter " + name + " in " + location + ". "
          };
          msg.push(newErr);
          keepGoing = false;
        } else { // In case the parameter is indeed present, check type. In the case of array, check also type of its items!
          value = convertValue(req[location][name], schema); // eslint-disable-line

          var err = validator.validate(value, schema);
          if (config.validatorRetrieveRemoteSchemaReferences) {
            var missingReferences = validator.getMissingRemoteReferences();
            if (missingReferences.length > 0) {
              logger.info("OASValidator Found " + missingReferences.length + " missing/remote reference(s) in the OpenAPI Spec")
              for (let url of missingReferences) {
                logger.info("OASValidator Getting remote reference '" + url +"'")
                try {
                  let body
                  if (url.startsWith("./") || url.startsWith("../") || url.startsWith("file://")) {
                    logger.info("OASValidator Getting local/relative reference '" + url +"'")
                    body = fs.readFileSync(url, {encoding:'utf8', flag:'r'})
                  } else {
                    logger.info("OASValidator Getting remote reference '" + url +"'")
                    const response = await fetch(url)
                    body = await response.text()
                  }

                  if (body[0] == "o") { // openapi yaml
                    await validator.setRemoteReference(url, yaml.safeLoad(body));
                  } else if (body[0] == "{") {
                    await validator.setRemoteReference(url, JSON.parse(body));
                  } else {
                    logger.info("OASValidator Error: Content from " + url + " did not start with YAML ('o[penapi]') nor JSON ('{...'). First character was '" + body[0] + "'")
                  }
                } catch(e) {
                    logger.info("OASValidator Error: " + e)
                }
              }
            }
            err = validator.validate(value, schema); //Validate one more time after resolving references.
          }

          if (err == false) {  // eslint-disable-line
            keepGoing = false;
            if (err.code == "UNKNOWN_FORMAT") { // eslint-disable-line
              var registeredFormats = ZSchema.getRegisteredFormats();
              logger.error("UNKNOWN_FORMAT error - Registered Formats: ");
              logger.error(registeredFormats);
            }
            newErr = {
              message: "Wrong parameter " + name + " in " + location + ". ",
              error: validator.getLastErrors()
            };
            msg.push(newErr);
          } else {
            logger.info("Valid parameter on request");
          }
        }
      }
    }
  }
  if (keepGoing == false && config.strict == true) {
    if (config.customErrorHandling) {
      var error = new Error('Request validation error')
      Object.assign(error, {
        failedValidation: true,
        validationResult: msg
      })
      next(error)
    } else {
      logger.error(JSON.stringify(msg));
      res.status(400).send(msg);
    }
  } else {
    if (msg.length != 0) {
      logger.warn(JSON.stringify(msg));
    }
    res.locals.oasDoc = oasDoc;
    next();
  }
}

/**
 * .
 * @param {string}  - .
 */
function getParameterType(schema) {
  var type = schema.type;
  if (!type && schema.schema) {
    type = getParameterType(schema.schema);
  }
  if (!type) {
    type = 'object';
  }
  return type;
}

/**
 * .
 * @param {string}  - .

function getParameterValue(req, parameter){ //TODO handle: body, form, formData, header, path, query... what about body?
  var parameterName = parameter.name;
  return req.params[parameterName];
}
*/
function getParameterValue(req, parameter) {
  var defaultVal = parameter.default;
  var paramLocation = parameter.in;
  var val;

  // Get the value to validate based on the operation parameter type
  switch (paramLocation) {
    case 'body':
      val = req.body;

      break;
    case 'form':
    case 'formData':
    case 'header':
      val = req.headers[parameter.name.toLowerCase()];

      break;
    case 'path':
      val = req.params[parameter.name]; // TODO: how many parameters can be in the path?

      break;
    case 'query':
      val = _.get(req.query, parameter.name);

      break;
  }
  // Use the default value when necessary
  if (_.isUndefined(val) && !_.isUndefined(defaultVal)) {
    val = defaultVal;
  }

  return val;
}

/**
 * .
 * @param {string}  - .
 */
function convertValue(value, schema, type) { // eslint-disable-line
  var original = value;

  // Default to {}
  if (_.isUndefined(schema)) {
    schema = {}; // eslint-disable-line
  }

  // Try to find the type or default to 'object'
  if (_.isUndefined(type)) {
    type = getParameterType(schema); // eslint-disable-line
  }

  // If there is no value, do not convert it
  if (_.isUndefined(value)) {
    return value;
  }

  // If there is an empty value and allowEmptyValue is true, return it
  if (schema.allowEmptyValue && value === '') {
    return value;
  }

  switch (type) {
    case 'array':
      if (_.isString(value)) {
          try {
            value = JSON.parse(value); // eslint-disable-line
          if (!_.isArray(value)) {
            value = original; // eslint-disable-line
          }
          } catch (err) {
            value = original; // eslint-disable-line
          }
      }

      // Handle situation where the expected type is array but only one value was provided
      if (!_.isArray(value)) {
        value = [value]; // eslint-disable-line
      }

      value = _.map(value, function(item, index) { // eslint-disable-line
        var iSchema = _.isArray(schema.items) ? schema.items[index] : schema.items;

        return convertValue(item, iSchema, iSchema ? iSchema.type : undefined);
      });

      break;

    case 'boolean':
      if (!_.isBoolean(value)) {
        if (['false', 'true'].indexOf(value) === -1) {
          value = original; // eslint-disable-line
        } else {
          value = value === 'true'; // eslint-disable-line
        }
      }

      break;

    case 'integer':
      if (!_.isNumber(value)) {
        if (_.isString(value) && _.trim(value).length === 0) {
          value = NaN; // eslint-disable-line
        }

        value = Number(value); // eslint-disable-line

        if (isNaN(value)) {
          value = original; // eslint-disable-line
        }
      }

      break;

    case 'number':
      if (!_.isNumber(value)) {
        if (_.isString(value) && _.trim(value).length === 0) {
          value = NaN; // eslint-disable-line
        }

        value = Number(value); // eslint-disable-line

        if (isNaN(value)) {
          value = original; // eslint-disable-line
        }
      }

      break;

    case 'object':
      if (_.isString(value)) {
        try {
          value = JSON.parse(value); // eslint-disable-line
        } catch (err) {
          value = original; // eslint-disable-line
        }
      }

      break;

    case 'string':
      if (['date', 'date-time'].indexOf(schema.format) > -1 && !_.isDate(value)) {
        value = new Date(value); // eslint-disable-line

        if (!_.isDate(value) || value.toString() === 'Invalid Date') {
          value = original; // eslint-disable-line
        }
      }

      break;

  }

  return value;
}

/**
 * Subtracts the basePath of the requested path.
 * @param {string} reqRoutePath - Value of req.route.path.
 */
function removeBasePath(reqRoutePath){
    return reqRoutePath.split('').filter((a, i) => {
        return a !== config.basePath[i];
    })
    .join('');
}


module.exports = (oasDoc) => {

  return function OASValidator(req, res, next) {

    var method = req.method.toLowerCase();

    logger.info("Requested method-url pair: " + method + " - " + req.url);

    var requestedSpecPath = config.pathsDict[removeBasePath(req.route.path)];
    var operation = oasDoc.paths[requestedSpecPath][method]

    req.swagger = {
      params: {},
      operation: operation
    }

    var methodParameters = operation.parameters || [];
    var pathParameters = oasDoc.paths[requestedSpecPath].parameters || [];
    var parameters = filterParams(methodParameters, pathParameters);
    if (parameters != undefined) {
      parameters.forEach((parameter) => { // TODO: para POST y PUT el objeto se define en 'requestBody' y no en 'parameters'
        var pType = getParameterType(parameter);
        var oVal = getParameterValue(req, parameter);
        var value = convertValue(oVal, parameter.schema == undefined ? parameter : parameter.schema, pType);

        req.swagger.params[parameter.name] = {
                                        // pgillis 2019 June 11

          //path: "/some/path", //this shows the path to follow on the spec file to get to the parameter but oas-tools doesn't use it!
          path: requestedSpecPath,
          schema: parameter,
          originalValue: oVal,
          value: value
        };
      });
    }

    var requestBody = operation.requestBody;
    if (requestBody != undefined) {
      // when and endpoint provides a file upload option and other properties,
      // the content type changes to multipart/form-data
      // other requestBody types such as "image/png" are allowed as well
      // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#considerations-for-file-uploads
      const contentType = Object.keys(requestBody.content)[0];
      req.swagger.params[requestBody['x-name']] = {

                                        // pgillis 2019 June 11

        //path: "/some/path", //this shows the path to follow on the spec file to get to the parameter but oas-tools doesn't use it!
        path: requestedSpecPath,
        schema: requestBody.content[contentType].schema,
        originalValue: req.body,
        value: req.body
      }

      // inject possible file uploads
      if(contentType.toLowerCase() === 'multipart/form-data' && req.files && req.files.length > 0) {
        req.swagger.params[requestBody['x-name']].files = req.files;
      }
    }

    res.locals.requestedSpecPath = requestedSpecPath;
    logger.debug("OASValidator  -res.locals.requestedSpecPath: " + res.locals.requestedSpecPath);
    checkRequestData(oasDoc, requestedSpecPath, method, res, req, next);
  }
}

exports = module.exports;



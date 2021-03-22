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

import * as _ from "lodash-compat";
import * as utils from "../lib/utils";
import ZSchema from "z-schema";
import { config } from "../configurations";
const validator = new ZSchema({
  ignoreUnresolvableReferences: true,
  ignoreUnknownFormats: config.ignoreUnknownFormats,
  breakOnFirstError: false,
});

/**
 * Returns the Express version of the OAS name for location.
 * @param {string} inProperty - Location of a parameter, value of 'in' property of the oasDoc file for that parameter.
 */
function locationFormat(inProperty) {
  //TODO: Possible 'in' values: path, query, header, cookie.
  var dict = {
    path: "params",
    query: "query",
    header: "headers",
    cookie: "cookie",
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
  });
  return data;
}

function checkBody(req, requestBody) {
  const emptyBody = req.body == undefined || JSON.stringify(req.body) == "{}";
  if (requestBody.required && emptyBody) {
    return {
      message: "Missing object in the request body. ",
    };
  } else if (requestBody.required || !emptyBody) {
    // can be any of "application/json", "multipart/form-data", "image/png", ...
    const contentType = Object.keys(requestBody.content)[0];
    var validSchema = _.cloneDeep(requestBody.content[contentType].schema);
    utils.fixNullable(validSchema);

    var data = req.body; //JSON.parse(req.body); //Without this everything is string so type validation wouldn't happen TODO: why is it commented?
    // a multipart/form-data request has a "files" property in the request whose
    // properties need to be passed to evaluating the required parameters in the openAPI spec
    if (
      contentType.toLowerCase() === "multipart/form-data" &&
      req.files &&
      req.files.length > 0
    ) {
      data = addFilesToJSONPropertyValidation(req.files, data);
    }
    var err = validator.validate(data, validSchema);
    if (err == false) {
      return {
        message: "Wrong data in the body of the request. ",
        error: validator.getLastErrors(),
        content: data,
      };
    }
    config.logger.info("Valid parameter on request");
  }
  return undefined;
}

function getRequestProperty(req, location, name) {
  const requestLocation = req[location];
  if (location === "headers") {
    return requestLocation[
      Object.keys(requestLocation).find(
        (key) => key.toLowerCase() === name.toLowerCase()
      )
    ];
  }
  return requestLocation[name];
}

function checkParameter(req, params) {
  const errorMessages = [];
  for (var i = 0; i < params.length; i++) {
    //TODO: 'required' property is not required, some parameters may not have it (those in query for example)

    const { name, schema } = params[i];
    const location = locationFormat(params[i].in);
    const currentParameter = params[i];

    const nullable =
      currentParameter.nullable === undefined
        ? false
        : Boolean(currentParameter.nullable);
    const required =
      currentParameter.required === undefined
        ? false
        : Boolean(currentParameter.required);

    const requestParameter = getRequestProperty(req, location, name);

    if (requestParameter === undefined) {
      if (required) {
        errorMessages.push({
          message: "Missing parameter " + name + " in " + location + ". ",
        });
      }
    } else if (requestParameter === null) {
      if (nullable === false) {
        errorMessages.push({
          message:
            "The parameter " + name + " in " + location + " cannot be null. ",
        });
      }
    } else {
      // In case the parameter is indeed present, check type. In the case of array, check also type of its items!
      const value = convertValue(
        requestParameter,
        schema,
        getParameterType(currentParameter),
        currentParameter
      );
      const err = validator.validate(value, schema);
      if (err == false) {
        if (err.code == "UNKNOWN_FORMAT") {
          var registeredFormats = ZSchema.getRegisteredFormats();
          config.logger.error("UNKNOWN_FORMAT error - Registered Formats: ");
          config.logger.error(registeredFormats);
        }
        errorMessages.push({
          message: "Wrong parameter " + name + " in " + location + ". ",
          error: validator.getLastErrors(),
        });
      } else {
        config.logger.info("Valid parameter on request");
      }
    }
  }
  return errorMessages;
}

/**
 * Checks if the data provided in the request is valid acording to what is specified in the oas specification file.
 * @param {object} paths - Paths section of the oasDoc file.
 * @param {string} requestedSpecPath - Requested url by the client. If the request had parameters in the query those won't be part of this variable.
 * @param {string} method - Method requested by the client.
 * @param {string} req - The whole req object from the client request.
 */
function checkRequestData(oasDoc, requestedSpecPath, method, res, req, next) {
  var paths = oasDoc.paths;
  var keepGoing = true;
  //var msg = "";
  var msg = [];

  if (paths[requestedSpecPath][method].hasOwnProperty("requestBody")) {
    const message = checkBody(
      req,
      paths[requestedSpecPath][method].requestBody
    );
    if (message !== undefined) {
      msg.push(message);
      keepGoing = false;
    }
  }

  if (
    paths[requestedSpecPath][method].hasOwnProperty("parameters") ||
    paths[requestedSpecPath].hasOwnProperty("parameters")
  ) {
    const methodParams = paths[requestedSpecPath][method].parameters || [];
    const pathParams = paths[requestedSpecPath].parameters || [];
    const params = filterParams(methodParams, pathParams);
    const errorMessages = checkParameter(req, params);
    if (errorMessages.length !== 0) {
      msg = msg.concat(errorMessages);
      keepGoing = false;
    }
  }

  if (keepGoing == false && config.strict == true) {
    if (config.customErrorHandling) {
      var error = new Error("Request validation error");
      Object.assign(error, {
        failedValidation: true,
        validationResult: msg,
      });
      next(error);
    } else {
      config.logger.error(JSON.stringify(msg));
      res.status(400).send(msg);
    }
  } else {
    if (msg.length != 0) {
      config.logger.warn(JSON.stringify(msg));
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
    type = "object";
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
  var defaultVal = parameter.schema ? parameter.schema.default : undefined;
  var paramLocation = parameter.in;
  var val;

  // Get the value to validate based on the operation parameter type
  switch (paramLocation) {
    case "body":
      val = req.body;

      break;
    case "form":
    case "formData":
    case "header":
      val = req.headers[parameter.name.toLowerCase()];

      break;
    case "path":
      val = req.params[parameter.name]; // TODO: how many parameters can be in the path?

      break;
    case "query":
      val = _.get(req.query, parameter.name);

      break;
  }
  // Use the default value when necessary
  if (_.isUndefined(val) && !_.isUndefined(defaultVal)) {
    val = defaultVal;
  }

  return val;
}

function convertArrayValue(value, schema) {
  let arrayValue;
  if (typeof value === "string") {
    try {
      arrayValue = JSON.parse(value);
      // Handle situation where the expected type is array but only one value was provided
      if (Array.isArray(arrayValue) === false) {
        return [value];
      }
    } catch (err) {
      return value;
    }
  }

  return arrayValue.map(value, (item, index) => {
    const itemSchema = Array.isArray(schema.items)
      ? schema.items[index]
      : schema.items;

    return convertValue(
      item,
      itemSchema,
      itemSchema ? itemSchema.type : undefined
    );
  });
}

function convertBooleanValue(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return value;
}

function convertNumberValue(value) {
  if (typeof value !== "string") {
    return value;
  }
  const numberValue = Number(value);
  if (isNaN(numberValue)) {
    return value;
  }
  return numberValue;
}

function convertObjectValue(value) {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (err) {
    return value;
  }
}

function convertStringValue(value, schema) {
  if (typeof value !== "string") {
    return value;
  }

  if (["date", "date-time"].includes(schema.format)) {
    const date = new Date(value);
    if (date.toString() === "Invalid Date") {
      return value;
    }
    return date;
  }
  return value;
}

/**
 * .
 * @param {string}  - .
 */
function convertValue(value, optionalSchema, optionalType) {
  // If there is no value, do not convert it
  if (value === undefined) {
    return value;
  }
  const schema = optionalSchema === undefined ? {} : optionalSchema;

  // If there is an empty value and allowEmptyValue is true, return it
  if (schema.allowEmptyValue && value === "") {
    return value;
  }
  const type =
    optionalType === undefined ? getParameterType(schema) : optionalType;

  switch (type) {
    case "array":
      return convertArrayValue(value, schema);

    case "boolean":
      return convertBooleanValue(value);

    case "integer":
    case "number":
      return convertNumberValue(value);

    case "object":
      return convertObjectValue(value);

    case "string":
    default:
      return convertStringValue(value, schema);
  }
}

/**
 * Subtracts the basePath of the requested path.
 * @param {string} reqRoutePath - Value of req.route.path.
 */
function removeBasePath(reqRoutePath) {
  return reqRoutePath
    .split("")
    .filter((a, i) => {
      return a !== config.basePath[i];
    })
    .join("");
}

export default (oasDoc) => {
  return function OASValidator(req, res, next) {
    var method = req.method.toLowerCase();

    config.logger.info(
      "Requested method-url pair: " + method + " - " + req.url
    );

    var requestedSpecPath = config.pathsDict[removeBasePath(req.route.path)];
    var operation = oasDoc.paths[requestedSpecPath][method];

    req.swagger = {
      params: {},
      operation: operation,
    };

    var methodParameters = operation.parameters || [];
    var pathParameters = oasDoc.paths[requestedSpecPath].parameters || [];
    var parameters = filterParams(methodParameters, pathParameters);
    if (parameters != undefined) {
      parameters.forEach((parameter) => {
        // TODO: para POST y PUT el objeto se define en 'requestBody' y no en 'parameters'
        var pType = getParameterType(parameter);
        var oVal = getParameterValue(req, parameter);
        var value = convertValue(
          oVal,
          parameter.schema == undefined ? parameter : parameter.schema,
          pType
        );

        req.swagger.params[parameter.name] = {
          // pgillis 2019 June 11

          //path: "/some/path", //this shows the path to follow on the spec file to get to the parameter but oas-tools doesn't use it!
          path: requestedSpecPath,
          schema: parameter,
          originalValue: oVal,
          value: value,
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
      req.swagger.params[requestBody["x-name"]] = {
        // pgillis 2019 June 11

        //path: "/some/path", //this shows the path to follow on the spec file to get to the parameter but oas-tools doesn't use it!
        path: requestedSpecPath,
        schema: requestBody.content[contentType].schema,
        originalValue: req.body,
        value: req.body,
      };

      // inject possible file uploads
      if (
        contentType.toLowerCase() === "multipart/form-data" &&
        req.files &&
        req.files.length > 0
      ) {
        req.swagger.params[requestBody["x-name"]].files = req.files;
      }
    }

    res.locals.requestedSpecPath = requestedSpecPath;
    config.logger.debug(
      "OASValidator  -res.locals.requestedSpecPath: " +
        res.locals.requestedSpecPath
    );
    checkRequestData(oasDoc, requestedSpecPath, method, res, req, next);
  };
};

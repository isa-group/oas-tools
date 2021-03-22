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
import * as utils from "../lib/utils";
import MIMEtype from "whatwg-mimetype";
import ZSchema from "z-schema";
import { config } from "../configurations";
import path from "path";
import pkg from "lodash-compat";

const { cloneDeep } = pkg;
const validator = new ZSchema({
  ignoreUnresolvableReferences: true,
  ignoreUnknownFormats: config.ignoreUnknownFormats,
  breakOnFirstError: false,
});

function getExpectedResponse(responses, code) {
  // Exact match wins over range definitions (1XX, 2XX, 3XX, 4XX, 5XX)
  var resp = responses[code];
  if (resp !== undefined) {
    return resp;
  }
  resp = responses[Math.floor(code / 100) + "XX"];
  if (resp !== undefined) {
    return resp;
  }
  return responses.default;
}

/**
 * When an object carries keys whose values are "undefined" they fail the z-schema validation even though
 * when those objects are serialized to JSON those keys are never serialized which would effectively make
 * it pass the schema validation.
 * This method strips away (recursively) those undefined keys
 * NOTE: This method modifies the input!
 * @param data
 * @param maxDepth limits the recursion to avoid stack overflow when object references itself
 */
function stripUndefinedKeys(data, maxDepth = 1024) {
  if (
    typeof data !== "object" ||
    data === null ||
    maxDepth <= 0 ||
    data instanceof Buffer
  ) {
    return data;
  }
  Object.getOwnPropertyNames(data).forEach((property) => {
    if (typeof data[property] === "object") {
      stripUndefinedKeys(data[property], maxDepth - 1);
    } else if (data[property] === undefined) {
      delete data[property];
    }
  });
  return data;
}

/**
 * Checks if the data sent as a response for the previous request matches the indicated in the specification file in the responses section for that request.
 * This function is used in the interception of the response sent by the controller to the client that made the request.
 * @param {object} req - req object of the request.
 * @param {object} res - res object of the request.
 * @param {object} oldSend - res object previous to interception.
 * @param {object} oasDoc - Specification file.
 * @param {object} method - Method requested by the client.
 * @param {object} requestedSpecPath - Requested path, as shown in the specification file: /resource/{parameter}
 * @param {object} content - Data sent from controller to client.
 */
function checkResponse(
  req,
  res,
  oldSend,
  oasDoc,
  method,
  requestedSpecPath,
  content
) {
  var code = res.statusCode;
  var explicitType;
  var msg = [];
  var data = stripUndefinedKeys(content[0]);
  config.logger.debug("Processing at checkResponse:");
  config.logger.debug("  -code: " + code);
  config.logger.debug("  -oasDoc: " + JSON.stringify(oasDoc));
  config.logger.debug("  -method: " + method);
  config.logger.debug("  -requestedSpecPath: " + requestedSpecPath);
  config.logger.debug("  -data: " + JSON.stringify(data));
  var responseCodeSection = getExpectedResponse(
    oasDoc.paths[requestedSpecPath][method].responses,
    code
  ); //Section of the oasDoc file starting at a response code
  if (res.get("content-type") === undefined) {
    res.header("Content-Type", "application/json;charset=utf-8");
  } else {
    explicitType = new MIMEtype(res.get("content-type"));
  }
  if (responseCodeSection === undefined) {
    //if the code is undefined, data wont be checked as a status code is needed to retrieve 'schema' from the oasDoc file
    var newErr = {
      message: "Wrong response code: " + code,
    };
    msg.push(newErr);
    if (config.strict === true) {
      config.logger.error(JSON.stringify(msg));
      content[0] = JSON.stringify(msg);
      oldSend.apply(res, content);
    } else {
      config.logger.warn(JSON.stringify(msg));
      oldSend.apply(res, content);
    }
  } else if (responseCodeSection.hasOwnProperty("content")) {
    var resultType;
    var acceptTypes = [];
    if (req.headers.accept) {
      acceptTypes = req.headers.accept.split(",").map((type) => {
        return type.trim();
      });
    }
    acceptTypes.forEach((acceptType) => {
      var mimeAccept = new MIMEtype(acceptType);
      Object.keys(responseCodeSection.content).forEach((contentType) => {
        if (!resultType) {
          var firstMatch, secondMatch;
          var mimeContent = new MIMEtype(contentType);

          if (explicitType) {
            firstMatch =
              explicitType.type === mimeContent.type &&
              (mimeAccept.type === mimeContent.type || mimeAccept.type === "*");
            secondMatch =
              explicitType.subtype === mimeContent.subtype &&
              (mimeAccept.subtype === mimeContent.subtype ||
                mimeAccept.subtype === "*");
          } else {
            firstMatch =
              mimeAccept.type === mimeContent.type || mimeAccept.type === "*";
            secondMatch =
              mimeAccept.subtype === mimeContent.subtype ||
              mimeAccept.subtype === "*";
          }

          if (firstMatch && secondMatch) {
            resultType = mimeContent;
          }
        }
      });
    });
    if (!resultType && acceptTypes.length === 0) {
      resultType = new MIMEtype("application/json");
    } else if (!resultType && acceptTypes.length !== 0) {
      newErr = {
        message: "No acceptable content type found.",
      };
      msg.push(newErr);
      content[0] = JSON.stringify(msg);
      config.logger.error(content[0]);
      res.status(406);
    } else {
      res.header("Content-Type", resultType.essence + ";charset=utf-8");
    }
    if (resultType && resultType.essence === "application/json") {
      //if there is no content property for the given response then there is nothing to validate.
      var validSchema = cloneDeep(
        responseCodeSection.content["application/json"].schema
      );
      utils.fixNullable(validSchema);

      content[0] = JSON.stringify(content[0]);
      config.logger.debug(
        "Schema to use for validation: " + JSON.stringify(validSchema)
      );
      var err = validator.validate(data, validSchema);
      if (err === false) {
        newErr = {
          message: "Wrong data in the response. ",
          error: validator.getLastErrors(),
          content: data,
        };
        msg.push(newErr);
        if (config.strict === true) {
          content[0] = JSON.stringify(msg);
          config.logger.error(content[0]);
          res.status(400);
          oldSend.apply(res, content);
        } else {
          config.logger.warn(
            JSON.stringify(msg) + JSON.stringify(validator.getLastErrors())
          );
          if (
            content[0].substr(0, 46) ===
            '{"message":"This is the mockup controller for '
          ) {
            config.logger.warn(
              "The used controller might not have been implemented"
            );
          }
          oldSend.apply(res, content);
        }
      } else {
        oldSend.apply(res, content);
      }
    } else {
      oldSend.apply(res, content);
    }
  } else {
    oldSend.apply(res, content);
  }
}

/**
 * Checks whether there is a standard controller (resouce+Controlle) in the location where the controllers are located or not.
 * @param {object} locationOfControllers - Location provided by the user where the controllers can be found.
 * @param {object} controllerName - Name of the controller: resource+'Controller'.
 */
function existsController(locationOfControllers, controllerName) {
  try {
    require(path.join(locationOfControllers, controllerName));
    return true;
  } catch (err) {
    config.logger.info(
      "The controller " +
        controllerName +
        " doesn't exist at " +
        locationOfControllers
    );
    return false;
  }
}

/**
 * Returns an operationId. The retrieved one from the specification file or an automatically generated one if it was not specified.
 * @param {object} oasDoc - Specification file.
 * @param {object} requestedSpecPath - Requested path as shown in the specification file.
 * @param {object} method - Requested method.
 */
function getOpId(oasDoc, requestedSpecPath, method) {
  if (oasDoc.paths[requestedSpecPath][method].hasOwnProperty("operationId")) {
    return utils.generateName(
      oasDoc.paths[requestedSpecPath][method].operationId.toString(),
      undefined
    ); // Use opID specified in the oas doc
  }
  return (
    utils.generateName(requestedSpecPath, "function") + method.toUpperCase()
  );
}

export default (controllers) => {
  return function OASRouter(req, res, next) {
    var oasDoc = res.locals.oasDoc;
    var requestedSpecPath = res.locals.requestedSpecPath; //requested path version on the oasDoc file of the requested url
    var method = req.method.toLowerCase();
    var controllerName;

    // pgillis 2019 Jun 10
    // Handle case where the path has an x-swagger-router-controller.
    //logger.debug(requestedSpecPath+ " hasProperty "+  oasDoc.paths[requestedSpecPath].hasOwnProperty('x-swagger-router-controller'));

    if (
      oasDoc.paths[requestedSpecPath].hasOwnProperty(
        "x-swagger-router-controller"
      ) &&
      oasDoc.paths[requestedSpecPath][method].hasOwnProperty(
        "x-swagger-router-controller"
      ) === false
    ) {
      oasDoc.paths[requestedSpecPath][method] =
        oasDoc.paths[requestedSpecPath]["x-swagger-router-controller"];
    }
    if (
      oasDoc.paths[requestedSpecPath].hasOwnProperty("x-router-controller") &&
      oasDoc.paths[requestedSpecPath][method].hasOwnProperty(
        "x-router-controller"
      ) === false
    ) {
      oasDoc.paths[requestedSpecPath][method] =
        oasDoc.paths[requestedSpecPath]["x-router-controller"];
    }
    // end pgillis

    if (
      oasDoc.paths[requestedSpecPath][method].hasOwnProperty(
        "x-swagger-router-controller"
      )
    ) {
      //oasDoc file has router_property: use the controller specified there
      controllerName =
        oasDoc.paths[requestedSpecPath][method]["x-swagger-router-controller"];
    } else if (
      oasDoc.paths[requestedSpecPath][method].hasOwnProperty(
        "x-router-controller"
      )
    ) {
      //oasDoc file has router_property: use the controller specified there
      controllerName =
        oasDoc.paths[requestedSpecPath][method]["x-router-controller"];
    } else if (
      existsController(
        controllers,
        utils.generateName(requestedSpecPath, "controller")
      )
    ) {
      //oasDoc file doesn't have router_property: use the standard controller name (autogenerated) if found
      controllerName = utils.generateName(requestedSpecPath, "controller");
    } else {
      //oasDoc file doesn't have router_property and standard controller (autogenerated name) doesn't exist: use the default controller
      controllerName = "Default";
    }

    var opID = getOpId(oasDoc, requestedSpecPath, method);

    var controller = require(path.join(controllers, controllerName));

    var oldSend = res.send;
    res.send = function send() {
      //intercept the response from the controller to check and validate it
      //Avoids res.send being executed twice: https://stackoverflow.com/questions/41489528/why-is-res-send-being-called-twice
      checkResponse(
        req,
        res,
        oldSend,
        oasDoc,
        method,
        requestedSpecPath,
        // eslint-disable-next-line prefer-rest-params
        arguments
      );
    };
    controller[opID].apply(undefined, [req, res, next]); // execute function by name
  };
};

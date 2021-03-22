import AccessControl from "accesscontrol";
import AccessControlMiddleware from "accesscontrol-middleware";
import { config } from "../configurations";
import jwt from "jsonwebtoken";

function removeBasePath(reqRoutePath) {
  return reqRoutePath
    .split("")
    .filter((a, i) => {
      return a !== config.basePath[i];
    })
    .join("");
}

function locationFormat(inProperty) {
  var dict = {
    path: "params",
    query: "query",
    header: "header",
    cookie: "cookie",
  };
  return dict[inProperty];
}

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

export default (oasDoc) => {
  return function OASAuth(req, res, next) {
    const usedPath = config.pathsDict[removeBasePath(req.route.path)];
    const method = req.method.toLowerCase();
    config.logger.debug("Checking authorization...");
    var securityReqs =
      oasDoc.paths[usedPath][method].security || oasDoc.security;

    if (securityReqs && securityReqs.length > 0) {
      var secName;
      var secDef;
      securityReqs.forEach((secReq) => {
        secName = Object.keys(secReq).find((name) => {
          secDef = oasDoc.components.securitySchemes[name];
          return (
            secDef.type === "http" &&
            secDef.scheme === "bearer" &&
            secDef.bearerFormat === "JWT"
          );
        });
      });
      if (secName && config.grantsFile[secName]) {
        const ac = new AccessControl(config.grantsFile[secName]);
        const accessControlMiddleware = new AccessControlMiddleware(ac);
        var action;
        switch (method) {
          case "get":
            action = "read";
            break;
          case "head":
            action = "read";
            break;
          case "post":
            action = "create";
            break;
          case "put":
            action = "update";
            break;
          case "patch":
            action = "update";
            break;
          case "delete":
            action = "delete";
        }
        var paramLocation, usedParameter, userProperty;
        var resource = usedPath;
        var methodParameters = oasDoc.paths[usedPath][method].parameters || [];
        var pathParameters = oasDoc.paths[usedPath].parameters || [];
        var parameters = filterParams(methodParameters, pathParameters);
        const bearerRegex = /^Bearer\s/;
        var token = req.headers.authorization.replace(bearerRegex, "");
        var decoded = jwt.decode(token);
        if (parameters !== undefined) {
          parameters.forEach((parameter) => {
            if (parameter["x-acl-binding"]) {
              usedParameter = parameter.name;
              userProperty = parameter["x-acl-binding"];
              paramLocation = locationFormat(parameter.in);
            } else if (
              !usedParameter &&
              parameter.in === "path" &&
              decoded[parameter.name]
            ) {
              usedParameter = parameter.name;
              userProperty = parameter.name;
              paramLocation = "params";
            }
          });
        }
        var checkObject = {
          resource: resource,
          action: action,
          checkOwnerShip: false,
        };
        if (usedParameter) {
          checkObject.checkOwnerShip = true;
          checkObject.operands = [
            {
              source: "user",
              key: userProperty,
            },
            {
              source: paramLocation,
              key: usedParameter,
            },
          ];
        }
        if (!req.user) {
          req.user = {};
        }
        req.user.role = decoded.role || "anonymous";
        req.user[userProperty] = decoded[userProperty] || "";
        var middleware = accessControlMiddleware.check(checkObject);
        middleware(req, res, next);
      } else {
        config.logger.debug("No security definition including JWT was found");
        return next();
      }
    } else {
      config.logger.debug("No security requirements found for this request");
      return next();
    }
  };
};

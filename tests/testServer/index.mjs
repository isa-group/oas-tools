import * as fs from "fs";
import * as http from "http";
import bodyParser from "body-parser";
import { createRequire } from "module";
import express from "express";
import { join } from "path";
import jsyaml from "js-yaml";
import { logger } from "./logger/index.mjs";
import multer from "multer";
import oasTools from "../../common/index.js";

export var app = express();
// multer is the official express middleware
// handling multipart/formdata requests
const upload = multer();
app.use(
  bodyParser.json({
    strict: false,
  })
);
app.use(upload.any()); // allow unlimited number of files with a request

var serverPort = 8080;
const currentDirName = __dirname;
const require = createRequire(import.meta.url);

var spec = fs.readFileSync(join(currentDirName, "api/oai-spec.yaml"), "utf8"); //this one works
var oasDoc = jsyaml.safeLoad(spec);

var securityThird = require(join(currentDirName, "security.json"));
var grantsThird = require(join(currentDirName, "grants.json"));

function verifyToken(req, secDef, token, next) {
  if (token) {
    next();
  } else {
    next(req.res.sendStatus(403));
  }
}

var options_object = {
  controllers: join(currentDirName, "./controllers"),
  //loglevel: 'debug',
  //loglevel: 'none',
  customLogger: logger,
  strict: true,
  router: true,
  validator: true,
  oasSecurity: true,
  securityFile: {
    SecondBearer: "./tests/testServer/security.json",
    ThirdBearer: securityThird,
    FourthBearer: verifyToken,
  },
  oasAuth: true,
  grantsFile: {
    SecondBearer: "./tests/testServer/grants.json",
    ThirdBearer: grantsThird,
  },
  ignoreUnknownFormats: true,
};

export function init(done) {
  oasTools.configure(options_object);

  oasTools.initialize(oasDoc, app, () => {
    // oas-tools version
    http.createServer(app).listen(serverPort, () => {
      // console.log("App running at http://localhost:" + serverPort);
      done();
    });
  });

  app.get("/info", (req, res) => {
    res.send({
      infoEN: "This is a very simple API that uses the oas-tools Module!",
      infoDE:
        "Dies ist eine sehr einfache API, die unser oas-tools Modul benutzt!",
    });
  });
}
app.init = init;
app.getServer = function getServer() {
  return app;
};
app.close = function close() {
  process.exit(0);
};

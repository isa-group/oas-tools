# oas-tools

[![Build Status](https://travis-ci.org/isa-group/oas-tools.svg?branch=master)](https://travis-ci.org/isa-group/oas-tools)
[![dependencies Status](https://david-dm.org/isa-group/oas-tools/status.svg)](https://david-dm.org/isa-group/oas-tools)
[![codecov](https://codecov.io/gh/isa-group/oas-tools/branch/master/graph/badge.svg)](https://codecov.io/gh/isa-group/oas-tools)
[![Known Vulnerabilities](https://snyk.io/test/github/isa-group/oas-tools/badge.svg?targetFile=package.json)](https://snyk.io/test/github/isa-group/oas-tools?targetFile=package.json)

[![NPM](https://nodei.co/npm/oas-tools.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/oas-tools/)

This module supports the management of RESTfull APIs defined with OpenAPI 3.0 Specs over express servers.

If you are creating an API from scratch we recommend you to take a look at [oas-generator](https://github.com/isa-group/oas-generator)

We have a 3 min. tutorial:

<a href="https://youtu.be/1R0K2smpBt0" alt="oas-tools (v2.0.3) introduction - Click to Watch!"><img src="https://i.imgur.com/DFJx5LK.jpg" align="center" width="300" alt="oas-tools introduction (v2.0.3)- Click to Watch!"></a>

## 1. Install oas-tools
```bash
npm install oas-tools --save
```

## 2. Use oas-tools

Require the installed module in your app's index file, just like:

```javascript
var oasTools = require('oas-tools');
```

The module oas-tools requires the specification file of the NodeJS application, therefore load it as follow using fs and jsyaml:

```javascript
var jsyaml = require('js-yaml');
var fs = require('fs');

var spec = fs.readFileSync(path.join('path/to/spec/file'), 'utf8');
var oasDoc = jsyaml.safeLoad(spec);
```

[Note: you might want to use the module ‘path’ for loading the specification file, that way your app will work on any OS]


__It is also possible to set configuration variables, these are them:__

| Name	| Type	| Explanation / Values |
| ------------- | ------------- | ------------- |
|`loglevel` | `String` | Possible values from less to more level of verbosity are: error, warning, custom, info and debug. Ignored if `customLogger` is used. Default is info. |
|`logfile` | `String` | Logs file path. Ignored if `customLogger` is used. |
|`customLogger` | `Object` | Replaces the included logger with the one specified here, so that you can reuse your own logger. `logLevel` and `logFile` will be ignored if this variable is used. Null by default. |
|`customErrorHandling` | `Boolean` | Indicates if there should be a direct response (`false`) or `next()` should be called for custom error handling |
|`controllers` | `String` | Controllers location path. |
|`checkControllers` | `Boolean` | Checks if controllers exist for all specified methods. True by default. |
|`strict`	| `Boolean` | Indicates whether validation must stop the request process if errors were found when validating according to specification file. false by default. |
|`router`	| `Boolean` | Indicates whether router middleware should be used. True by default. |
|`validator` | `Boolean` | Indicates whether validator middleware should be used. True by default. |
|`validatorRetrieveRemoteSchemaReferences` | `Boolean` | Indicates whether the validator middleware retrieves remote $refs. False by default. |
|`docs` | `Object` | Settings used for Swagger UI, detailed in the following four rows. If you do not want to use the default values, you must specify values for all four settings, even if you only want to change one of them. |
|`docs.apiDocs` | `String` | Indicates the path where the OAS specification will be available. `/api-docs` by default. |
|`docs.apiDocsPrefix` | `String` | Indicates a prefix to be prepended to `docs.apiDocs`. Empty by default. |
|`docs.swaggerUi` | `String` | Indicates the path where Swagger UI will be available. Ignored if `docs.apiDocs` is not set. `/docs` by default. |
|`docs.swaggerUiPrefix` | `String` | Indicates a prefix to be prepended to `docs.swaggerUi`. Empty by default. |
|`oasSecurity` | `Boolean` | Indicates whether security components defined in the spec file will be handled based on `securityFile` settings. `securityFile` will be ignored if this is set to false. Refer to [oasSecurity](#2-oassecurity) for more information. False by default. |
|`securityFile` | `Object`| Defines the settings that will be used to handle security. Ignored if `oasSecurity` is set to false. Null by default. |
|`oasAuth` | `Boolean` | Indicates whether authorization will be automatically handled based on `grantsFile` settings. `grantsFile` will be ignored if this is set to false. Refer to [oasAuth](#3-oasauth) for more information. False by default. |
|`grantsFile` | `Object` | Defines the settings that will be use to handle automatic authorization. Ignored if `oasAuth` is set to false. Null by default. |
|`ignoreUnknownFormats` | `Boolean`	| Indicates whether z-schema validator must ignore unknown formats when validating requests and responses. True by default. |

For setting these variables you can use the function configure and pass to it either a JavaScript object or a yaml/json file containing such object.

```javascript
var options_object = {
  controllers: '/path/to/controllers',
  checkControllers: true,
  loglevel: 'info',
  logfile: '/path/to/logs/file',
  // customLogger: myLogger,
  strict: false,
  router: true,
  validator: true,
  docs: {
    apiDocs: '/api-docs',
    apiDocsPrefix: '',
    swaggerUi: '/docs',
    swaggerUiPrefix: ''
  }
  oasSecurity: true,
  securityFile: {
    // your security settings
  },
  oasAuth: true,
  grantsFile: {
    // your authorization settings
  },
  ignoreUnknownFormats: true
};

oasTools.configure(options_object);
```

[Note: it is not mandatory to set all configuration variables when using this functions, oas-tools will set the other ones by default]


Finally for initializing the middlewares right before your app is up and running, the function ‘initialize’ must be used. It receives the specification file, the express server object and a callback function where you must start your server:

```javascript
oasTools.initialize(oasDoc, app, function() {
  http.createServer(app).listen(8080, function() {
    console.log("App up and running!");
  });
});
```

### 1. Migrate from swagger-tools to oas-tools

Oas-tools works with Express while swagger-tools works with Connect, therefore in order to use your swagger-codegen generated NodeJS server with oas-tools you have to leave connect behind and use express and an openapi version 3 file. This can be easily achievable by following just 4 simple steps:


__1.Change from connect to express:__

Oas-tools needs express module to work, connect doesn’t have the needed features.
Therefore you must install express:

```bash
npm install express --save
```

Then change the require on your app’s index file, get rid of connect!

```javascript
var express = require('express');
var app = express();
```


__2.Require oas-tools instead of swagger-tools:__

Change from swagger-tools to oas-tools by just installing it and modifying the require:

```bash
npm install oas-tools --save
```

```javascript
var swaggerTools = require('oas-tools');
```


 __3.	Convert your specification file from version 2 to version 3:__

As you may know oas-tools works only with the version 3 of the specification, therefore you should update you specification file.
Use [this tool](https://mermade.org.uk/openapi-converter) to do so. Once you get the translation simply copy-past it to you former specification file.

[Note: Minor adjustment on the translated specification may be required. Validate it using [swagger validator](https://editor.swagger.io//?_ga=2.51587887.728712022.1527179832-1439038723.1495297764#/)

 __4.	Provide express server object to initialize method:__

Finally give the server object to oas-tools. It needs it to manage routes the right way. Just place it as a second parameter for the initializeMiddleware function.

```javascript
swaggerTools.initializeMiddleware(swaggerDoc, app, function(middleware) {
  // Configuration of usage of swagger middlewares with app.use()
  ...

  // Start the server
  ...
});
```

__5.	Add name property to request bodies:__

OpenAPI Specification version 3 defines request's body in a different way, it is not a parameter as it is in Swagger version 2. Now requests bodies are defined in a section 'requestBody' which doesn't have name property, therefore it needs this property to work with your swagger-codegen generated controllers. Simply add to each requestBody secction the property 'x-name:' and the name of the resource. Check out this example:

```yaml
post:
  summary: Create a pet
  operationId: createPets
  tags:
    - pets
  requestBody:
    description: Pet to add to the store
    x-name: pet
    required: true
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Pet'
```

__6.	(optional) use `multer` for binary uploads:__

The default middleware for handling file uploads in `express` via `multipart/form-data` is [`multer`](https://github.com/expressjs/multer). Use it in addition to the json body parser when initializing the server:
```js
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();

const app = express();
app.use(bodyParser.json({
  strict: false
}));
app.use(upload.any());
```

Also make sure that the application consuming the openAPI server sends the file input form name according to the openAPI spec:
```yaml
/endPoint:
    post:
      requestBody:
        required: true
        x-name: endPointPost
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - file
                - id
                - name
              properties:
                file: # <- this is the form field name that needs to be present in the POST payload
                  type: string
                  format: binary
                  description: a binary file uploaded via openAPI spec
                id:
                  type: string # it's a form field, so will always be a string
                name:
                  type: string
```


Once you have done all this, leave the rest the way it is and just run your appliaction with ‘node index.js’ or any other command you have specified at your package.json for running the application.

__Known limitations and differences with swagger-tools:__

Thanks to community contributions, we are aware of some limitations and differences that oas-tools currently has:

* The `res.json` function from Express is not working properly ([#71](https://github.com/isa-group/oas-tools/issues/71)).
* Multiple APIs per Node.js instance do not work ([#115](https://github.com/isa-group/oas-tools/issues/115)).
* Response validation is done inside the router middleware ([#119](https://github.com/isa-group/oas-tools/issues/119)).
* Middlewares returned by the `initializeMiddleware` function are now no-ops, and our middlewares are initialized beforehand.

If you find any other difference, please create a new issue so that we are aware and can update this list. We will try to minimize the number of differences so that the migration from swagger-tools to oas-tools is as smooth as possible.

## 2. oasSecurity

The configuration variables `oasSecurity` and `securityFile` allow the use of handlers to manage authentication. This works similarly to the swagger-security middleware found in [swagger-tools](https://github.com/apigee-127/swagger-tools). In fact, most of our code is reused from that same middleware. We have only adapted it to work with OAS 3.0 and made some changes to allow automatic validation of JWTs (more on that later).

To start using oasSecurity, you should include some [security schemes](https://swagger.io/docs/specification/authentication/) in your specification file. For example, to define a scheme named Bearer that will use JWTs:

```yaml
components:
  securitySchemes:
    Bearer:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

Then you need to bind the different schemes to your endpoints. You can bind a scheme to the whole API, or to specific paths and methods. Refer to the previous link for more information.

Now you need to define the handlers that will take care of the validation of the requests made to your API. To do this, simply create a function that takes the express req object, the security scheme, the value that will be validated, and a callback as inputs. Inside this function, perform all the checks and validations that you need, and finally call the callback function. Following the previous example, if we want to validate a JWT signed with the key 'secretKey' and check that the issuer is 'ISA Auth', we would define the following function:

```javascript
var jwt = require('jsonwebtoken');

function verifyToken(req, secDef, token, next) {
  const bearerRegex = /^Bearer\s/;

  if (token && bearerRegex.test(token)) {
    var newToken = token.replace(bearerRegex, '');
    jwt.verify(newToken, 'secretKey',
      {
        issuer: 'ISA Auth'
      },
      (error, decoded) => {
        if (error === null && decoded) {
          return next();
        }
        return next(req.res.sendStatus(403));
      }
    );
  } else {
    return next(req.res.sendStatus(403));
  }
}
```

Finally, you must link the defined functions to their corresponding security schemes. In order to do that, you need to pass an object to the `securityFile` configuration variable containing these relationships. For example, to specify that our `verifyToken` function should be used to handle our previously defined Bearer scheme:

```javascript
oasTools.configure({
  // other configuration variables
  oasSecurity: true,
  securityFile: {
    Bearer: verifyToken
  }
});
```

After following these steps, your validating function will be executed each time a request to any of the endpoints you applied the corresponding security scheme to is made. Please note that any schemes without a linked function will be ignored, except for the ones based on JWTs where configuration is included in the specification file (explained later).

Moreover, since JWT ([JSON Web Token](https://jwt.io/)) validations are almost always the same, oas-tools can do them automatically, that is, you just need to specify some simple parameters instead of a whole function. However, only the issuer, the expiration date and the key are validated, so if you want to check something else, you will need to create a function.

To automatically validate a JWT, first ensure that your security scheme defines that its type is 'http', its scheme is 'bearer' and its bearerFormat is 'JWT'. Then, simply specify the issuer, the supported algorithms (optional, defaults to only HS256) and the key in the `securityFile` configuration variable. In our previous example, this would be:

```javascript
oasTools.configure({
  // other configuration variables
  oasSecurity: true,
  securityFile: {
    Bearer: {
      issuer: 'ISA Auth',
      algorithms: ['HS256'],
      key: 'secretKey'
  }
});
```

You can also pass a file path (absolute or relative) or a URL containing the JSON representation of an object containing these parameters. For example, we have this grants.json file:
```json
{
  "issuer": "ISA Auth",
  "algorithms": ["HS256"],
  "key": "secretKey"
}
```

Our corresponding configuration would be as follows:

```javascript
oasTools.configure({
  // other configuration variables
  oasSecurity: true,
  securityFile: {
    Bearer: 'path/to/grants.json'
  }
});
```

You can also include these parameters directly in your specification file. Simply add an additional attribute in your security scheme definition called 'x-bearer-config' containing the parameters to be used during validation. For example:

```yaml
components:
  securitySchemes:
    Bearer:
      type: http
      scheme: bearer
      bearerFormat: JWT
      x-bearer-config:
        issuer: ISA Auth
        algorithms:
          - HS256
        key: secretKey
```

Similarly to the `securityFile` variable, you could specify a path or a URL with a JSON representation of an object with these parameters instead. Remember that even if 'x-bearer-config' is defined in a security scheme, it will be ignored if the `oasSecurity` variable is set to false. Moreover, if a security scheme has been configured in the `securityFile` variable, that configuration will take preference over the one included in 'x-bearer-config'.

## 3. oasAuth

When using JWTs in your API, oas-tools also allows you to automatically manage authorization to a certain degree. This is achieved through simple configuration files, and using the modules [accesscontrol](https://github.com/onury/accesscontrol) and [accesscontrol-middleware](https://github.com/pawangspandey/accesscontrol-middleware).

First, create a security scheme which uses JWTs in your specification file, ensuring that the type is 'http', the scheme is 'bearer' and the bearerFormat is 'JWT':

```yaml
components:
  securitySchemes:
    Bearer:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

Then, you need to create an object containing the access restrictions. This object is based on the one used in the module 'accesscontrol', so refer to its GitHub page if you need more information. We will create an example and further explain what it defines below:

```javascript
var grants = {
  user: {
    "$extend": ["anonymous"],
    "pets/cats": {
      "update:own": ["*"]
    },
    "users": {
      "read:any": ["*"]
    }
  },
  anonymous: {
    "pets/cats": {
      "read:any": ["*"]
    }
  }
};
```

In this object, we have defined two roles: 'user' and 'anonymous'. 'anonymous' can read any cat in the system. 'user' extends 'anonymous', so it inherits the same access restrictions from its parent. Moreover, a 'user' can update its own cats, and it can also read any user in the system. Now, we will take a closer look at the syntax to see what everything means:

- The '$extend' attribute is a list, that means that a role can extend multiple roles.
- 'pets/cats' means that the defined restriction will be applied to every endpoint that includes 'pets' and 'cats' in its path, in that same order. For example, 'api/pets/{petstoreId}/cats/{catId}' or simply 'pets/cats' will count.
- 'update' means that the restriction applies to PUT requests. Similarly, you can use 'read' for GET requests, 'create' for POST, and 'delete' for DELETE.
- 'own' specifies that the role can only access one cat, based on a parameter that we will explain later. 'any' means that the role can access any cat in the whole API.
- '\["\*"\]' means that the role can access every resource attribute. oas-tools does not use this, but since you can reuse this restrictions in your controllers along with the 'accesscontrol' module, it may be interesting to take it into account. For example, '\["id", "breed"\]' would mean that the role can only access these two attributes from a cat.

To use this grants object in your API, simply provide it while configuring oas-tools, linking it to a JWT scheme definition:

```javascript
oasTools.configure({
  // other configuration variables
  oasAuth: true,
  grantsFile: {
    Bearer: grants
  }
});
```

You can also pass a file path (absolute or relative) or a URL containing a JSON representation of your access restrictions. Additionally, you can specify the restrictions directly in the security scheme definition in your specification file, including the 'x-acl-config' attribute:

```yaml
components:
  securitySchemes:
    Bearer:
      type: http
      scheme: bearer
      bearerFormat: JWT
      x-acl-config:
        anonymous:
          pets:
            "read:any":
              - "*"
```

You can use a file path or a URL here too. Please note that even if you define 'x-acl-config' here, it will be ignored if the `oasAuth` configuration variable is set to false. Additionally, if a scheme was already linked to a grants object in the `grantsFile` variable, that configuration will take precedence over the one in 'x-acl-config'.

The role of a client will be taken from the provided JWT. This JWT should contain an attribute called 'role'. If this attribute is not defined, oas-tools will assume the default role of 'anonymous'. Moreover, the parameters used to check ownership should also be present in the JWT, and must be named in a specific way. For example, if a request is made to 'api/pets/{petstoreId}/cats/{catId}' and you want to check 'catId' for ownership, there must be a 'catId' attribute in the JWT. If it is not provided and no 'any' restriction was defined, the client will not have access to this resource. However, if you want to match the path 'catId' parameter to another attribute from the JWT, you can do that in the specification file adding a 'x-acl-binding' attribute to the corresponding parameter:

```yaml
paths:
  api/pets/{petstoreId}/cats/{catId}:
    put:
      parameters:
        - name: catId
          in: path
          x-acl-binding: customAttribute
    # ...
```

This example will look for a 'customAttribute' attribute in the JWT.

## 4. Errors

Since oas-tools reports validation errors with a common structure, we provide a JSON Schema so that you can validate this errors accordingly in your API implementation. You can use [speccy](https://www.npmjs.com/package/speccy) to convert this JSON Schema into an OpenAPI file.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "items": {
    "type": "object",
    "required": [
      "message"
    ],
    "properties": {
      "message": {
        "type": "string",
        "examples": [
          "Wrong data in the response."
        ]
      },
      "error": {
        "type": "array",
        "items": {
          "type": "object",
          "required": [
            "code",
            "params",
            "message",
            "path"
          ],
          "properties": {
            "code": {
              "type": "string",
              "examples": [
                "INVALID_TYPE"
              ]
            },
            "params": {
              "type": "array",
              "items": {
                "type": "string",
                "examples": [
                  "array",
                  "object"
                ]
              }
            },
            "message": {
              "type": "string",
              "examples": [
                "Expected type array but found type object"
              ]
            },
            "path": {
              "type": "string",
              "examples": [
                "#/"
              ]
            }
          }
        }
      },
      "content": {
        "type": "object",
        "required": [
          "message"
        ],
        "properties": {
          "message": {
            "type": "string",
            "examples": [
              "This is the mockup controller for findPets"
            ]
          }
        }
      }
    }
  }
}
```

By default, the errors are returned by a direct HTTP 400 response. If you need custom error handling, you may set the `customErrorHandling` config property to `true`,
which causes validation errors to be passed to `next()`. The following properties are set:

| Name	| Type	| Explanation / Values |
| ------------- | ------------- | ------------- |
|`failedValidation` | `Boolean` | Property can be used to check if the error comes from the oas validation. |
|`validationResult` | `Object` | Validation results conforming to the beforementioned schema. |

## Contributing

We are open to issues and pull requests. If you want to contribute to this project, please check our [recommended guidelines](CONTRIBUTING.md).

## License

Copyright 2018, [ISA Group](http://www.isa.us.es), [University of Sevilla](http://www.us.es)

For technical inquiry please contact to [engineering team](./extra/team.md).

[![ISA Group](http://www.isa.us.es/2.0/assets/img/theme/logo2.png)](http://www.isa.us.es)

Licensed under the **Apache License, Version 2.0** (the "[License](./LICENSE)"); you may not use this file except in compliance with the License. You may obtain a copy of the License at apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

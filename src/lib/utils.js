//TODO:
/*
En la reunión del 25 de mayo decidimos: (ver video para concretar más)
-Todo lo que no sea alfabetico o dígito se borra para nombres de: ARCHIVO, FUNCION (si no hay opId busca una función con func al principio), VARIABLE
-Despues, a lo que vaya a ser variable no se le quita nada del principio y se le añade var, y a lo que vaya a ser funcion se le agrega func.


Casuística: checkear esto
-No operationId y no x-router-controller
-Si operationId y no x-router-controller
-No operationId y si x-router-controller
-Sí operationId y si x-router-controller
-Si operationId pero erroneo
-Project name no válido en package.json

Considerar que:
-Nombre de controlador va a ser tambíen nombre de variable
-OperationId será usado únicamente como nombre de función
*/

'use strict';

var validator = require('validator');

var fixNullable = function(schema) {
  Object.getOwnPropertyNames(schema).forEach((property) => {
    if (property === 'type' && schema.nullable === true && schema.type !== "null" && !Array.isArray(schema.type) && schema.type.indexOf("null") === -1) {
      schema.type = [schema.type, "null"];
    } else if (typeof schema[property] === 'object' && schema[property] !== null) {
      fixNullable(schema[property]);
    }
  });
}

/**
 * Generates a valid name, according to value of nameFor.
 * @param {string} input - String to generate a name from.
 * @param {string} nameFor - possible values are controller, function, variable.
 */
var generateName = function(input, nameFor) {
  var chars = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789./-_';
  var name = validator.whitelist(input, chars)
  switch (nameFor) {
    case "controller":
      name += "Controller";
      break;
    case "function":
      name = "func" + name;
      break;
    case "variable":
      name = "var" + name;
      break;
    case undefined: //'nameFor' is undefined: just normalize
      break;
  }
  return name;
}

module.exports = {
  generateName: generateName,
  fixNullable: fixNullable
};

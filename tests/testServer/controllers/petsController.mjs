const normalPets = [
  {
    id: 1,
    name: "Wolf",
    tag: "Barks at the moon",
  },
  {
    id: 2,
    name: "Cat",
    tag: "Boring animal",
  },
  {
    id: 3,
    name: "Rabbit",
    tag: "Eats carrots",
  },
  {
    id: 4,
    name: "Bat",
    tag: "Ozzy's breakfast",
  },
  {
    id: 10,
    name: "Pig",
    tag: undefined,
  },
  {
    id: 200,
    name: "AnimalZ",
    tag: "It is not wrong anymore",
  },
];
const corruptedPets = [
  {
    id: "1",
    name: "Wolf",
    tag: "Barks at the moon",
  },
  {
    id: 2,
    name: "Cat",
    tag: "Boring animal",
  },
  {
    id: 3,
    name: "Rabbit",
    tag: "Eats carrots",
  },
  {
    id: 10,
    name: "Pig",
    tag: "Looking for mud",
  },
  {
    name: "Bat",
    tag: "At night",
  },
  {
    id: 200,
    name: "AnimalZ",
    tag: "This is supposed to be a wrong object",
    extraProperty: "Extra property, wrong!",
  },
];
export const petsHandler = {
  pets: normalPets,
  corruptPets: () => {
    petsHandler.pets = corruptedPets;
  },
  setCorrectPets: () => {
    petsHandler.pets = normalPets;
  },
};

/**
 *  Path for testing path parameters
 */
export const paramTestsPath = (req, res) => {
  res.send({
    message:
      "Path for path parameters tests was requested, this it its controller response",
  });
};

/**
 *  Path for testing query parameters
 */
export const paramTestsQuery = (req, res) => {
  res.send({
    message:
      "Path for query parameters tests was requested, this it its controller response",
  });
};

/**
 *  Path for testing ownership
 */
export const ownershipTest = (req, res) => {
  res.send({
    message:
      "Path for ownership tests was requested, this is its controller response",
  });
};

/**
 *  Path for testing operation property
 */
export const operationTests = (req, res) => {
  res.send({
    operation: req.swagger.operation,
  });
};

/**
 *  Path for testing ownership with acl binding
 */
export const ownershipBindingTest = (req, res) => {
  res.send({
    message:
      "Path for ownership with acl binding tests was requested, this is its controller response",
  });
};

/**
 *  Path for testing properties type on responses
 */
export const responseBodyTest = (req, res) => {
  var arrayRes = [];
  var okay = {
    integerProperty: 2,
    booleanProperty: true,
    stringProperty: "okay",
    doubleProperty: 2.8,
  };
  var wrong = {
    integerProperty: "wrong",
    booleanProperty: 23,
    stringProperty: 6.8,
    doubleProperty: false,
  };
  arrayRes.push(okay);
  arrayRes.push(wrong);
  res.send(arrayRes);
};

/**
 *  Creates a pet
 */
export const createPets = (args, res) => {
  petsHandler.pets.push(args.body);
  res.status(201).send(petsHandler.pets);
};

/**
 *  Creates a pet with associated binary file upload
 */
export const createPetsViaMultipartFormdata = (args, res) => {
  const pet = {
    id: Number(args.body.id), // form fields arrive always as strings
    name: args.body.name,
    tag: "not important",
  };
  petsHandler.pets.push(pet);
  res.status(201).send(petsHandler.pets);
};

/**
 *  Retrieves the whole pets collection
 */
export const listPets = (args, res) => {
  res.status(200).send(petsHandler.pets.slice(0, args.query.limit));
};

export const listCorruptPets = (args, res) => {
  res.status(200).send(corruptedPets.slice(0, args.query.limit));
};

/**
 *  Retrieves a single pet
 */
export const showPetById = (args, res) => {
  var res_pet;
  for (var i = 0; i < petsHandler.pets.length; i++) {
    if (petsHandler.pets[i].id == args.params.petId) {
      res_pet = petsHandler.pets[i];
      break;
    }
  }
  if (res_pet == undefined) {
    res.status(404).send({
      message: "There is no pet with id " + args.params.petId,
    });
  } else {
    res.status(200).send(res_pet);
  }
};

/**
 * Retrieves headers for pet
 */
export const getPetHeaders = (args, res) => {
  res.status(200).send();
};

/**
 *  Deletes a single pet from the collection
 */
export const deletePet = (args, res) => {
  var index = -1;
  for (var i = 0; i < petsHandler.pets.length; i++) {
    if (petsHandler.pets[i].id == args.params.petId) {
      index = i;
    }
  }
  if (index == -1) {
    res.status(404).send({
      message:
        "There is no pet with id " + args.params.petId + " to be deleted",
    });
  } else {
    petsHandler.pets.splice(index, 1);
    res.status(204).send(); //{message: "Pet successfully deleted!"}
  }
};

/**
 *  Deletes all the pets in the collection
 */
export const deletePets = (args, res) => {
  petsHandler.pets.splice(0, petsHandler.pets.length);
  res.status(204).send(); //{message: "All pets successfully deleted!"}
};

/**
 *  Updates a pet
 */
export const updatePet = (args, res) => {
  var present = false;
  for (var i = 0; i < petsHandler.pets.length; i++) {
    if (petsHandler.pets[i].id == args.params.petId) {
      present = true;
      petsHandler.pets[i] = args.body;
      res.status(200).send({
        message: "Updated pet",
      });
    }
  }
  if (present == false) {
    res.status(404).send({
      message: "There is no pet with id " + args.params.petId,
    });
  }
};

/**
 * Updates a tag of a pet
 */
export const updateTag = (args, res) => {
  var present = false;
  for (var i = 0; i < petsHandler.pets.length; i++) {
    if (petsHandler.pets[i].id == args.params.petId) {
      present = true;
      petsHandler.pets[i].tag = args.body.tag;
      res.status(200).send({
        message: "Updated pet",
      });
    }
  }
  if (!present) {
    res.status(404).send({
      message: "There is no pet with id " + args.params.petId,
    });
  }
};

/**
 * Sends a security config file
 */
export const securityFile = (req, res) => {
  res.send({
    issuer: "ISA Auth",
    key: "test",
  });
};

/**
 * Sends an auth config file
 */
export const grantsFile = (req, res) => {
  res.send({
    anonymous: {
      paramTestsQuery: {
        "create:any": ["*"],
        "read:any": ["*"],
        "update:any": ["*"],
        "delete:any": ["*"],
      },
      paramTestsPath: {
        "create:any": ["*"],
        "read:any": ["*"],
        "update:any": ["*"],
        "delete:any": ["*"],
      },
      ownershipTest: {
        "read:own": ["*"],
      },
      ownershipBindingTest: {
        "read:own": ["*"],
      },
      commonParamTest: {
        "read:any": ["*"],
      },
      overrideCommonParamTest: {
        "read:any": ["*"],
      },
      responseBodyTest: {
        "create:any": ["*"],
        "read:any": ["*"],
        "update:any": ["*"],
        "delete:any": ["*"],
      },
      petsCorrupt: {
        "read:any": ["*"],
      },
      pets: {
        "create:any": ["*"],
        "read:any": ["*"],
        "update:any": ["*"],
        "delete:any": ["*"],
      },
      multipartFormdata: {
        "create:any": ["*"],
        "read:any": ["*"],
        "update:any": ["*"],
        "delete:any": ["*"],
      },
      requestBodyTest: {
        "create:any": ["*"],
      },
    },
    user: {
      pets: {
        "read:any": ["*"],
      },
    },
    userWithoutPermissions: {},
    extendeduser: {
      $extend: ["user"],
    },
  });
};

/**
 * Sends a sample object
 */
export const tokenVerificationTest = (req, res) => {
  res.send({
    samplestring: "testing",
  });
};

/**
 * Sends a sample response for common parameter tests
 */
export const commonParamTest = (req, res) => {
  res.send({
    id: parseInt(req.query.testParam, 10),
  });
};

/**
 * Echos the first elemet from the param
 */
export const arrayWithStringsTest = (req, res) => {
  res.send({
    value: req.swagger.params.listTestParam.value[0],
  });
};

/**
 * Sends a sample response for content type tests
 */
export const contentTypeTest = (req, res) => {
  res.send({
    id: 123,
  });
};

/**
 * Sends a sample response with a 400 code
 */
export const wrongResponseCode = (req, res) => {
  res.status(400).send({
    message: "This is a test",
  });
};

/**
 * Sends a sample response with a null field
 */
export const nullableResponse = (req, res) => {
  res.send({
    id: 123,
    text: null,
  });
};

/**
 * Sends a sample response for c
 */
export const defaultResponseCode = (req, res) => {
  res.send({
    id: 123,
  });
};

export const anyResponse = (req, res) => {
  res.status(201).send({
    message: "operation successfull",
  });
};

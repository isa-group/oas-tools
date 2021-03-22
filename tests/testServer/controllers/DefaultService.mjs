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
    id: 10,
    name: "Pig",
    tag: undefined,
  },
  {
    id: 28,
    name: "Bat",
    tag: "At night",
  },
  {
    id: 200,
    name: "AnimalZ",
    tag: "This is an object",
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
    tag: undefined,
  },
  {
    name: "Bat",
    tag: "At night",
  },
  {
    id: 200,
    name: "AnimalZ",
    tag: "This is supposed to be a wrong object",
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

// args = req.swagger.params

/**
 *  Creates a pet
 */
export const createPets = (args, res) => {
  petsHandler.pets.push(args.pet.value);
  res.status(201).send(petsHandler.pets);
};

/**
 *  Retrieves the whole pets collection
 */
export const listPets = (args, res) => {
  res.status(200).send(petsHandler.pets.slice(0, args.limit.value));
};

/**
 *  Retrieves a single pet
 */
export const showPetById = (args, res) => {
  const { pets } = petsHandler;
  var res_pet;
  for (var i = 0; i < pets.length; i++) {
    if (pets[i].id == args.petId.value) {
      res_pet = pets[i];
      break;
    }
  }
  if (res_pet == undefined) {
    res.status(404).send({
      message: "There is no pet with id " + args.petId.value,
    });
  } else {
    res.status(200).send(res_pet);
  }
};

/**
 *  Deletes a single pet from the collection
 */
export const deletePet = (args, res) => {
  var index = -1;
  const { pets } = petsHandler;
  for (var i = 0; i < pets.length; i++) {
    if (pets[i].id == args.petId.value) {
      index = i;
    }
  }
  if (index == -1) {
    res.status(404).send({
      message: "There is no pet with id " + args.petId.value + " to be deleted",
    });
  } else {
    pets.splice(index, 1);
    res.status(204).send(); //{message: "Pet successfully deleted!"}
  }
};

/**
 *  Deletes all the pets in the collection
 */
export const deletePets = (args, res) => {
  petsHandler.pets = [];
  res.status(204).send(); //{message: "All pets successfully deleted!"}
};

/**
 *  Updates a pet
 */
export const updatePet = (args, res) => {
  var present = false;
  const { pets } = petsHandler;
  for (var i = 0; i < pets.length; i++) {
    if (pets[i].id == args.petId.value) {
      present = true;
      pets[i] = args.pet.value;
      res.status(200).send({
        message: "Updated pet",
      });
    }
  }
  if (present == false) {
    res.status(404).send({
      message: "There is no pet with id " + args.petId.value,
    });
  }
};

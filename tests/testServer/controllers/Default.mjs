import * as Default from "./DefaultService";

export const showPetById = function showPetById(req, res, next) {
  Default.showPetById(req.swagger.params, res, next);
};

export const listPets = function listPets(req, res, next) {
  Default.listPets(req.swagger.params, res, next);
};

export const createPets = function createPets(req, res, next) {
  Default.createPets(req.swagger.params, res, next);
};

export const updatePet = function updatePet(req, res, next) {
  Default.updatePet(req.swagger.params, res, next);
};

export const deletePet = function deletePet(req, res, next) {
  Default.deletePet(req.swagger.params, res, next);
};

export const deletePets = function deletePets(req, res, next) {
  Default.deletePets(req.swagger.params, res, next);
};

export const testRequestBody = function testRequestBody(req, res) {
  res.status(201).send();
};

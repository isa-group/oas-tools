import * as auxRequire from "./testServer/controllers/petsController.mjs";
import * as fs from "fs";
import * as indexFile from "../common/index.js";
import * as serverProto from "./testServer/index.mjs";
import * as utilsFile from "../common/lib/utils.js";
import { dirname, join } from "path";
import chai from "chai";
import chaiHttp from "chai-http";
import { fileURLToPath } from "url";
import jsyaml from "js-yaml";
import jwt from "jsonwebtoken";

const currentDirName = dirname(fileURLToPath(import.meta.url));
let server = serverProto.app;

var token = jwt.sign(
  {
    iss: "ISA Auth",
    idParam: "prueba",
  },
  "test"
);
var userToken = jwt.sign(
  {
    iss: "ISA Auth",
    idParam: "prueba",
    role: "user",
  },
  "test"
);
var tokenError = jwt.sign(
  {
    iss: "ISA Auth",
    idParam: "pruebaerror",
  },
  "test"
);
var tokenNoParam = jwt.sign(
  {
    iss: "ISA Auth",
  },
  "test"
);
var userWithoutPermissions = jwt.sign(
  {
    iss: "ISA Auth",
    role: "userWithoutPermissions",
  },
  "test"
);
const should = chai.should();
chai.use(chaiHttp);
var expect = chai.expect;
auxRequire.petsHandler.corruptPets();

function getTests() {
  describe("/A GET pets", () => {
    it("it should get a 401 code informing that no JWT token was provided", (done) => {
      chai
        .request(server)
        .get("/api/v1/pets")
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(401);
          res.text.should.contain("Unauthorized");
          done();
        });
    });

    it("it should get a 403 code informing that the provided JWT token is not valid", (done) => {
      chai
        .request(server)
        .get("/api/v1/pets")
        .set("Authorization", "Bearer invalidtoken")
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(403);
          res.text.should.contain("Forbidden");
          done();
        });
    });

    it("it should get and error informing the required parameter limit was not specified in the query", (done) => {
      chai
        .request(server)
        .get("/api/v1/pets")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "Missing parameter limit in query"
          );
          done();
        });
    });

    /* testing of operation property */
    it("it should return the operation part of the spec via req.swagger.operation", (done) => {
      chai
        .request(server)
        .get("/api/v1/operationTests")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.operation.operationId.should.equal("operationTests");
          done();
        });
    });

    /* testing of parameters in query */
    it("it should get an error informing of missing required parameters in query", (done) => {
      chai
        .request(server)
        .get("/api/v1/paramTestsQuery")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "Missing parameter integerParam in query"
          );
          JSON.stringify(res.body).should.contain(
            "Missing parameter booleanParam in query"
          );
          JSON.stringify(res.body).should.contain(
            "Missing parameter stringParam in query"
          );
          JSON.stringify(res.body).should.contain(
            "Missing parameter doubleParam in query"
          );
          done();
        });
    });
    it("it should get an error informing the required parameter integerParam was not of the right type", (done) => {
      chai
        .request(server)
        .get(
          "/api/v1/paramTestsQuery?integerParam=wrong&booleanParam=true&stringParam=okay&doubleParam=1.9"
        )
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "Wrong parameter integerParam in query"
          );
          done();
        });
    });
    it("it should get an error informing the required parameter booleanParam was not of the right type", (done) => {
      chai
        .request(server)
        .get(
          "/api/v1/paramTestsQuery?integerParam=9&booleanParam=wrong90&stringParam=okay&doubleParam=1.9"
        )
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "Wrong parameter booleanParam in query"
          );
          done();
        });
    });
    it("it should get an error informing the required parameter doubleParam was not of the right type", (done) => {
      chai
        .request(server)
        .get(
          "/api/v1/paramTestsQuery?integerParam=9&booleanParam=false&stringParam=okay&doubleParam=wrong"
        )
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "Wrong parameter doubleParam in query"
          );
          done();
        });
    });
    // end of query parameters test

    /* testing of parameters in path */
    it("it should get an error informing the required parameter integerParam was not of the right type", (done) => {
      chai
        .request(server)
        .get("/api/v1/paramTestsPath/wrong/true/okay/1.9")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "Wrong parameter integerParam in params"
          );
          done();
        });
    });
    it("it should get an error informing the required parameter booleanParam was not of the right type", (done) => {
      chai
        .request(server)
        .get("/api/v1/paramTestsPath/21/wrong/okay/1.9")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "Wrong parameter booleanParam in params"
          );
          done();
        });
    });
    it("it should get an error informing the required parameter doubleParam was not of the right type", (done) => {
      chai
        .request(server)
        .get("/api/v1/paramTestsPath/21/false/okay/wrong")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "Wrong parameter doubleParam in params"
          );
          done();
        });
    });
    // end of path parameters test

    /* test of properties type of request body */
    it("it should get an error informing of wrong data in the response: types do not match", (done) => {
      chai
        .request(server)
        .get("/api/v1/responseBodyTest")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain("Wrong data in the response");
          JSON.stringify(res.body).should.contain(
            "Expected type boolean but found type integer"
          );
          JSON.stringify(res.body).should.contain(
            "Expected type integer but found type string"
          );
          JSON.stringify(res.body).should.contain(
            "Expected type number but found type boolean"
          );
          JSON.stringify(res.body).should.contain(
            "Expected type string but found type number"
          );
          done();
        });
    });
    // test of properties type of request body end

    /* test of ownership */
    it("it should get a sample response", (done) => {
      chai
        .request(server)
        .get("/api/v1/ownershipTest/prueba")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.should.be.a("object");
          done();
        });
    });

    /* testing of parameters in query */
    it("it should return a string (and not a number) when the param is a array of strings", (done) => {
      chai
        .request(server)
        .get("/api/v1/arrayWithStringsTest?listTestParam=6363")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.value.should.be.a("string");
          done();
        });
    });

    it("it should get a 403 error because the user role does not have access", (done) => {
      chai
        .request(server)
        .get("/api/v1/ownershipTest/prueba")
        .set("Authorization", "Bearer " + userToken)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(403);
          res.body.should.be.a("object");
          done();
        });
    });

    it("it should get a sample response using acl binding", (done) => {
      chai
        .request(server)
        .get("/api/v1/ownershipBindingTest/prueba")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.should.be.a("object");
          done();
        });
    });

    it("it should get a 403 error informing that the user does not have access", (done) => {
      chai
        .request(server)
        .get("/api/v1/ownershipTest/prueba")
        .set("Authorization", "Bearer " + tokenError)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(403);
          res.body.should.be.eql({});
          done();
        });
    });

    it("it should get a 403 error because the user does not have a binding property", (done) => {
      chai
        .request(server)
        .get("/api/v1/ownershipTest/prueba")
        .set("Authorization", "Bearer " + tokenNoParam)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(403);
          res.body.should.be.eql({});
          done();
        });
    });
    // end of ownership test

    it("it should get a sample response using a verification function", (done) => {
      chai
        .request(server)
        .get("/api/v1/tokenVerificationTest")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.should.be.a("object");
          done();
        });
    });

    it("it should get a 403 error informing that no token was provided", (done) => {
      chai
        .request(server)
        .get("/api/v1/tokenVerificationTest")
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(403);
          res.body.should.be.eql({});
          done();
        });
    });

    it("it should get a sample response using a common parameter", (done) => {
      chai
        .request(server)
        .get("/api/v1/commonParamTest?testParam=123")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.should.be.a("object");
          res.body.should.have.property("id");
          res.body.should.have.property("id").eql(123);
          done();
        });
    });

    it("it should get a 400 error informing that the parameter type is incorrect", (done) => {
      chai
        .request(server)
        .get("/api/v1/commonParamTest?testParam=test")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "Wrong parameter testParam in query"
          );
          done();
        });
    });

    it("it should get a sample response using an overridden common parameter", (done) => {
      chai
        .request(server)
        .get("/api/v1/overrideCommonParamTest?testParam=123")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.should.be.a("object");
          res.body.should.have.property("id");
          res.body.should.have.property("id").eql(123);
          done();
        });
    });

    it("it should get a 400 error informing that the overridden parameter type is incorrect", (done) => {
      chai
        .request(server)
        .get("/api/v1/overrideCommonParamTest?testParam=pruebas")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "Wrong parameter testParam in query"
          );
          done();
        });
    });

    it("it should get a sample response in application/json without Accept header", (done) => {
      chai
        .request(server)
        .get("/api/v1/contentTypeTest")
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.header["content-type"].should.be.eql(
            "application/json; charset=utf-8"
          );
          res.body.should.be.a("object");
          res.body.should.have.property("id");
          res.body.should.have.property("id").eql(123);
          done();
        });
    });

    it("it should get a sample response in application/json with Accept */* header", (done) => {
      chai
        .request(server)
        .get("/api/v1/contentTypeTest")
        .set("Accept", "*/*")
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.header["content-type"].should.be.eql(
            "application/json; charset=utf-8"
          );
          res.body.should.be.a("object");
          res.body.should.have.property("id");
          res.body.should.have.property("id").eql(123);
          done();
        });
    });

    it("it should get a sample response in application/json with Accept application/json header", (done) => {
      chai
        .request(server)
        .get("/api/v1/contentTypeTest")
        .set("Accept", "application/json")
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.header["content-type"].should.be.eql(
            "application/json; charset=utf-8"
          );
          res.body.should.be.a("object");
          res.body.should.have.property("id");
          res.body.should.have.property("id").eql(123);
          done();
        });
    });

    it("it should get a sample response in text/csv with Accept text/csv header", (done) => {
      chai
        .request(server)
        .get("/api/v1/contentTypeTest")
        .set("Accept", "text/csv")
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.header["content-type"].should.be.eql("text/csv; charset=utf-8");
          done();
        });
    });

    it("it should get a sample response in text/csv with Accept text/* header", (done) => {
      chai
        .request(server)
        .get("/api/v1/contentTypeTest")
        .set("Accept", "text/*")
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.header["content-type"].should.be.eql("text/csv; charset=utf-8");
          done();
        });
    });

    it("it should get a sample response in text/csv with Accept */csv header", (done) => {
      chai
        .request(server)
        .get("/api/v1/contentTypeTest")
        .set("Accept", "*/csv")
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.header["content-type"].should.be.eql("text/csv; charset=utf-8");
          done();
        });
    });

    it("it should get a 406 error informing that there is no acceptable content type", (done) => {
      chai
        .request(server)
        .get("/api/v1/contentTypeTest")
        .set("Accept", "application/xml")
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(406);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "No acceptable content type found."
          );
          done();
        });
    });

    it("it should get a 400 error informing that the response code is wrong", (done) => {
      chai
        .request(server)
        .get("/api/v1/wrongResponseCode")
        .set("Accept", "application/xml")
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain("Wrong response code: 400");
          done();
        });
    });

    it("it should get a sampler response using a default response code", (done) => {
      chai
        .request(server)
        .get("/api/v1/defaultResponseCode")
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.should.be.a("object");
          done();
        });
    });

    it("it should get a sample response with a nullable field", (done) => {
      chai
        .request(server)
        .post("/api/v1/nullableResponseTest")
        .send({ id: 123 })
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.should.be.a("object");
          should.equal(res.body.text, null);
          done();
        });
    });

    it("it shouldn´t GET all the pets but show a message with errors (missing/wrong parameters)", (done) => {
      chai
        .request(server)
        .get("/api/v1/petsCorrupt?limit=10")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain("Wrong data in the response");
          auxRequire.petsHandler.setCorrectPets();
          done();
        });
    });

    it("it should GET all the pets", (done) => {
      chai
        .request(server)
        .get("/api/v1/pets?limit=" + auxRequire.petsHandler.pets.length)
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.should.be.a("Array");
          res.body.length.should.be.eql(auxRequire.petsHandler.pets.length);
          done();
        });
    });

    it("it should GET the first 3 pets", (done) => {
      chai
        .request(server)
        .get("/api/v1/pets?limit=3")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.should.be.a("Array");
          res.body.length.should.be.eql(3);
          done();
        });
    });

    it("it should GET a pet by the given id", (done) => {
      var pet = {
        id: 10,
        name: "Pig",
      };
      chai
        .request(server)
        .get("/api/v1/pets/" + pet.id)
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.should.be.a("object");
          res.body.should.have.property("id");
          res.body.should.have.property("name");
          res.body.should.not.have.property("tag");
          res.body.should.have.property("id").eql(pet.id);
          res.body.should.have.property("name").eql(pet.name);
          done();
        });
    });

    it("it should authenticate with appropriate token using HEAD", (done) => {
      var pet = {
        id: 10,
        name: "Pig",
      };
      chai
        .request(server)
        .head("/api/v1/pets/" + pet.id)
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          done();
        });
    });

    it("it should fail authorization with wrong token using HEAD", (done) => {
      var pet = {
        id: 10,
        name: "Pig",
      };
      chai
        .request(server)
        .head("/api/v1/pets/" + pet.id)
        .set("Authorization", "Bearer " + userWithoutPermissions)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(403);
          done();
        });
    });

    it("it should not GET a pet by an id of type string instead of integer", (done) => {
      chai
        .request(server)
        .get("/api/v1/pets/badId")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "Wrong parameter petId in params"
          );
          done();
        });
    });

    it("it should not GET a pet by an id that does not exist in the DB", (done) => {
      var someId = 666;
      chai
        .request(server)
        .get("/api/v1/pets/" + someId)
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(404);
          res.body.should.be.a("object");
          res.body.should.have.property("message");
          res.body.message.should.be.eql("There is no pet with id " + someId);
          // postTests();
          done();
        });
    });
  });
}

// function getTests() {} //this one calls postTests()

function postTests() {
  //this one calls putTests()
  describe("/POST pets", () => {
    var prePostSize = auxRequire.petsHandler.pets.length;
    it("it should throw a 401 code informing that no JWT was provided", (done) => {
      var pet = {
        id: 11,
        name: "Frog",
        tag: "Green animal",
      };
      chai
        .request(server)
        .post("/api/v1/pets")
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(401);
          res.text.should.contain("Unauthorized");
          done();
        });
    });
    it("it should throw a 403 code informing that the provided JWT is not valid", (done) => {
      var pet = {
        id: 11,
        name: "Frog",
        tag: "Green animal",
      };
      chai
        .request(server)
        .post("/api/v1/pets")
        .set("Authorization", "Bearer invalidtoken")
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(403);
          res.text.should.contain("Forbidden");
          done();
        });
    });
    it("it should POST a pet ", (done) => {
      var pet = {
        id: 11,
        name: "Frog",
        tag: "Green animal",
      };
      chai
        .request(server)
        .post("/api/v1/pets")
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(201);
          res.body.should.be.a("Array");
          res.body.length.should.be.eql(prePostSize + 1);
          done();
        });
    });
    it("it should POST a pet without tag ", (done) => {
      var pet = {
        id: 40,
        name: "IdontHaveTag",
      };
      chai
        .request(server)
        .post("/api/v1/pets")
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(201);
          res.body.should.be.a("Array");
          res.body.length.should.be.eql(prePostSize + 2);
          done();
        });
    });
    it("it should not accept a POST request without a pet in the body", (done) => {
      chai
        .request(server)
        .post("/api/v1/pets")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "Missing object in the request body. "
          );
          done();
        });
    });
    it("it should fail optional request body validation with invalid request body", (done) => {
      var invalidBody = {
        invalidParameter: "invalidParameter",
      };
      chai
        .request(server)
        .post("/api/v1/requestBodyTest")
        .set("Authorization", "Bearer " + token)
        .send(invalidBody)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "Wrong data in the body of the request."
          );
          done();
        });
    });
    it("it should pass optional request body validation with valid request body", (done) => {
      var pet = {
        id: 1,
        name: "Test",
      };
      chai
        .request(server)
        .post("/api/v1/requestBodyTest")
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(201);
          done();
        });
    });
    it("it should pass optional request body validation without request body", (done) => {
      chai
        .request(server)
        .post("/api/v1/requestBodyTest")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(201);
          done();
        });
    });
    it("it should not POST a pet whose id is of type string instead of integer", (done) => {
      var pet = {
        id: "20",
        name: "Frog",
        tag: "Green animal",
      };
      chai
        .request(server)
        .post("/api/v1/pets")
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain("INVALID_TYPE");
          done();
        });
    });
    it("it should not POST a pet which is a string instead of a JSON object", (done) => {
      var pet = "I_AM_A_PET";
      chai
        .request(server)
        .post("/api/v1/pets")
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "Missing object in the request body. "
          );
          done();
        });
    });
    it("it should not POST a pet whose name is of type integer instead of string", (done) => {
      var pet = {
        id: 29,
        name: 12345,
        tag: "Green animal",
      };
      chai
        .request(server)
        .post("/api/v1/pets")
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain("INVALID_TYPE");
          done();
        });
    });
    it("it should not POST a pet which does not have id", (done) => {
      var pet = {
        name: "Horse",
        tag: "Another animal",
      };
      chai
        .request(server)
        .post("/api/v1/pets")
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "OBJECT_MISSING_REQUIRED_PROPERTY"
          );
          done();
        });
    });
    it("it should not POST a pet which does not have name", (done) => {
      var pet = {
        id: 23,
        tag: "Another animal",
      };
      chai
        .request(server)
        .post("/api/v1/pets")
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "OBJECT_MISSING_REQUIRED_PROPERTY"
          );
          done();
        });
    });
    it("it should not POST a pet whose tag is of type integer instead of string", (done) => {
      var pet = {
        id: 29,
        name: "SomeName",
        tag: 12345,
      };
      chai
        .request(server)
        .post("/api/v1/pets")
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain("INVALID_TYPE");
          // putTests();
          done();
        });
    });
  });
}

function putTests() {
  //this one calls deletePets()
  describe("/PUT/:id pet", () => {
    it("it should throw a 401 code informing that no JWT was provided", (done) => {
      var pet = {
        id: 10,
        name: "Pig",
        tag: "Pet updated by the mocha+chai test",
      };
      chai
        .request(server)
        .put("/api/v1/pets/" + pet.id)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(401);
          res.text.should.contain("Unauthorized");
          done();
        });
    });
    it("it should throw a 403 code informing that the provided JWT is not valid", (done) => {
      var pet = {
        id: 10,
        name: "Pig",
        tag: "Pet updated by the mocha+chai test",
      };
      chai
        .request(server)
        .put("/api/v1/pets/" + pet.id)
        .set("Authorization", "Bearer invalidtoken")
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(403);
          res.text.should.contain("Forbidden");
          done();
        });
    });
    it("it should UPDATE a pet given the id", (done) => {
      var pet = {
        id: 10,
        name: "Pig",
        tag: "Pet updated by the mocha+chai test",
      };
      chai
        .request(server)
        .put("/api/v1/pets/" + pet.id)
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.should.be.a("object");
          res.body.should.have.property("message");
          res.body.message.should.be.eql("Updated pet");
          done();
        });
    });
    it("it should update the tag of the pet using PATCH", (done) => {
      var pet = {
        id: 10,
        name: "Pig",
        tag: "Pet updated by the mocha+chai test",
      };
      chai
        .request(server)
        .patch("/api/v1/pets/" + pet.id + "/tag")
        .set("Authorization", "Bearer " + token)
        .send({ tag: pet.tag })
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.should.be.a("object");
          res.body.should.have.property("message");
          res.body.message.should.be.eql("Updated pet");
          done();
        });
    });
    it("it should fail authorization with wrong token using PATCH", (done) => {
      var pet = {
        tag: "Updated tag",
      };
      chai
        .request(server)
        .patch("/api/v1/pets/" + pet.id + "/tag")
        .set("Authorization", "Bearer " + userWithoutPermissions)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(403);
          done();
        });
    });
    it("it should UPDATE a pet by removing its tag", (done) => {
      var pet = {
        id: 10,
        name: "Pig",
      };
      chai
        .request(server)
        .put("/api/v1/pets/" + pet.id)
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.should.be.a("object");
          res.body.should.have.property("message");
          res.body.message.should.be.eql("Updated pet");
          done();
        });
    });
    it("it should not UPDATE a pet without id", (done) => {
      var pet = {
        name: "Pig",
        tag: "Pet updated by the mocha+chai test",
      };
      chai
        .request(server)
        .put("/api/v1/pets/" + 2)
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "OBJECT_MISSING_REQUIRED_PROPERTY"
          );
          done();
        });
    });
    it("it should not UPDATE a pet without name", (done) => {
      var pet = {
        id: 23,
        tag: "Pet updated by the mocha+chai test",
      };
      chai
        .request(server)
        .put("/api/v1/pets/" + 2)
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "OBJECT_MISSING_REQUIRED_PROPERTY"
          );
          done();
        });
    });
    it("it should not UPDATE a pet whose name is of type integer instead of string", (done) => {
      var pet = {
        id: 2,
        name: 111,
        tag: "Pet updated by the mocha+chai test",
      };
      chai
        .request(server)
        .put("/api/v1/pets/" + pet.id)
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain("INVALID_TYPE");
          done();
        });
    });
    it("it should not UPDATE a pet whose tag is of type integer instead of string", (done) => {
      var pet = {
        id: 2,
        name: "SomeNameHere",
        tag: 111,
      };
      chai
        .request(server)
        .put("/api/v1/pets/" + pet.id)
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain("INVALID_TYPE");
          done();
        });
    });
    it("it should not UPDATE a pet whose id is of type string instead of integer", (done) => {
      var pet = {
        id: "2",
        name: "animal1",
        tag: "Pet updated by the mocha+chai test",
      };
      chai
        .request(server)
        .put("/api/v1/pets/" + pet.id)
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain("INVALID_TYPE");
          done();
        });
    });
    it("it should not update a pet whose id does not exist in the DB", (done) => {
      var someId = 666;
      var pet = {
        id: 90,
        name: "Useless",
        tag: "This is here just to avoid another error",
      };
      chai
        .request(server)
        .put("/api/v1/pets/" + someId)
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(404);
          res.body.should.be.a("object");
          res.body.should.have.property("message");
          res.body.message.should.be.eql("There is no pet with id " + someId);
          done();
        });
    });
    it("it should not UPDATE a pet with a string instead of a JSON object", (done) => {
      var pet = "I_AM_A_PET";
      chai
        .request(server)
        .put("/api/v1/pets/" + 2)
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain(
            "Missing object in the request body. "
          );
          done();
        });
    });
    it("it should show an error message indicating wrong type for the specified petId in the path", (done) => {
      var pet = {
        id: 68,
        name: "Hello",
        tag: "Pet updated by the mocha+chai test",
      };
      chai
        .request(server)
        .put("/api/v1/pets/badId")
        .set("Authorization", "Bearer " + token)
        .send(pet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("array");
          JSON.stringify(res.body).should.contain("INVALID_TYPE");
          done();
        });
    });
  });
}

function deleteTests() {
  describe("/DELETE pets", () => {
    it("it should throw a 401 code informing that no JWT was provided", (done) => {
      var pet = {
        id: 10,
        name: "Pig",
        tag: "Looking for mud",
      };
      chai
        .request(server)
        .delete("/api/v1/pets/" + pet.id)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(401);
          res.text.should.contain("Unauthorized");
          done();
        });
    });
    it("it should throw a 403 code informing that the provided JWT is not valid", (done) => {
      var pet = {
        id: 10,
        name: "Pig",
        tag: "Looking for mud",
      };
      chai
        .request(server)
        .delete("/api/v1/pets/" + pet.id)
        .set("Authorization", "Bearer invalidtoken")
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(403);
          res.text.should.contain("Forbidden");
          done();
        });
    });
    it("it should DELETE a pet given the id", (done) => {
      var pet = {
        id: 10,
        name: "Pig",
        tag: "Looking for mud",
      };
      chai
        .request(server)
        .delete("/api/v1/pets/" + pet.id)
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(204);
          done();
        });
    });
    it("it should try to GET the previously deleted pet and get 404", (done) => {
      chai
        .request(server)
        .get("/api/v1/pets/10")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(404);
          res.body.should.be.a("object");
          res.body.should.have.property("message");
          res.body.message.should.be.eql("There is no pet with id 10");
          done();
        });
    });
    it("Should show an error message when trying to delete an object that does not exist in the DB", (done) => {
      var someId = 666;
      chai
        .request(server)
        .delete("/api/v1/pets/" + someId)
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(404);
          res.body.should.be.a("object");
          res.body.should.have.property("message");
          res.body.message.should.be.eql(
            "There is no pet with id " + someId + " to be deleted"
          );
          done();
        });
    });
    it("Should show an error indicating wrong type of parameter id", (done) => {
      chai
        .request(server)
        .delete("/api/v1/pets/wrongType")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          JSON.stringify(res.body).should.contain("INVALID_TYPE");
          done();
        });
    });
    it("Before deleting all pets...it should GET all the pets: all of them matching oas-doc constraints", (done) => {
      chai
        .request(server)
        .get("/api/v1/pets?limit=" + auxRequire.petsHandler.pets.length)
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          res.body.should.be.a("Array");
          res.body.length.should.be.eql(auxRequire.petsHandler.pets.length);
          done();
        });
    });
    it("it should DELETE all pets and then send GET request to check length==0", (done) => {
      chai
        .request(server)
        .delete("/api/v1/pets")
        .set("Authorization", "Bearer " + token)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(204);
          chai
            .request(server)
            .get("/api/v1/pets?limit=10")
            .set("Authorization", "Bearer " + token)
            .end((err, res) => {
              if (err) {
                done(err);
              }
              res.should.have.status(200);
              res.body.should.be.a("Array");
              res.body.length.should.be.eql(0);
            });
          done();
        });
    });
  });
}

function miscTests() {
  var testFunc = function () {
    return 0;
  };
  var spec = fs.readFileSync(
    join(currentDirName, "./testServer/api/oai-spec.yaml"),
    "utf8"
  );
  var oasDoc = jsyaml.safeLoad(spec);

  describe("Initialization", () => {
    it("No spec file", () => {
      expect(() => indexFile.init_checks(undefined, testFunc())).to.throw(
        Error,
        "specDoc is required"
      );
    });
    it("Spec file not an object", () => {
      expect(() => indexFile.init_checks("Test", testFunc())).to.throw(
        Error,
        "specDoc must be an object"
      );
    });
    it("No callback", () => {
      expect(() => indexFile.init_checks(oasDoc, undefined)).to.throw(
        Error,
        "callback is required"
      );
    });
    it("Callback not a function", () => {
      expect(() => indexFile.init_checks(oasDoc, "Test")).to.throw(
        Error,
        "callback must be a function"
      );
    });
  });

  describe("Auxiliary functions", () => {
    it("Generate controller name", () => {
      utilsFile
        .generateName("pets", "controller")
        .should.equal("petsController");
    });
    it("Generate function name", () => {
      utilsFile.generateName("pets", "function").should.equal("funcpets");
    });
    it("Generate variable name", () => {
      utilsFile.generateName("pets", "variable").should.equal("varpets");
    });
  });

  describe("Docs and API spec", () => {
    it("Docs should be available", (done) => {
      chai
        .request(server)
        .get("/docs")
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          done();
        });
    });

    it("API spec should be available", (done) => {
      chai
        .request(server)
        .get("/api-docs")
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(200);
          done();
        });
    });
  });
}

function multipartFormTests() {
  describe("/POST multipart-formdata pet", () => {
    // throughout this block: keep "function" in it-callback for "this"-scope

    it("should throw 401 for adding a pet via multipart/form-data b/c no JWT was provided", () => {
      const pet = {
        id: 4711,
        name: "MultipartFormdataRabbit",
      };
      const file = join(currentDirName, "pet.zip");

      return chai
        .request(server)
        .post("/api/v1/multipartFormdata")
        .field("id", pet.id)
        .field("name", pet.name)
        .attach("file", fs.readFileSync(file), "pet.zip")
        .then((res) => {
          expect(res).to.have.status(401);
          expect(res.text).to.contain("Unauthorized");
        })
        .catch((err) => {
          throw err;
        });
    });

    it("should throw 403 for adding a pet via multipart/form-data b/c provided JWT is not valid", () => {
      const pet = {
        id: 4711,
        name: "MultipartFormdataRabbit",
      };
      const file = join(currentDirName, "pet.zip");

      return chai
        .request(server)
        .post("/api/v1/multipartFormdata")
        .set("Authorization", "Bearer invalidtoken")
        .field("id", pet.id)
        .field("name", pet.name)
        .attach("file", fs.readFileSync(file), "pet.zip")
        .then((res) => {
          expect(res).to.have.status(403);
          expect(res.text).to.contain("Forbidden");
        })
        .catch((err) => {
          throw err;
        });
    });

    it("should successfully add a pet via POST as multipart/form-data", () => {
      const pet = {
        id: 4711,
        name: "MultipartFormdataRabbit",
      };
      const file = join(currentDirName, "pet.zip");

      return chai
        .request(server)
        .post("/api/v1/multipartFormdata")
        .set("Authorization", "Bearer " + token)
        .field("id", pet.id)
        .field("name", pet.name)
        .attach("file", fs.readFileSync(file), "pet.zip")
        .then((res) => {
          expect(res).to.have.status(201);
        })
        .catch((err) => {
          throw err;
        });
    });

    it("should not accept a pet POST as multipart/form-data w/o a pet in the body", () => {
      return chai
        .request(server)
        .post("/api/v1/multipartFormdata")
        .set("Authorization", "Bearer " + token)
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.be.a("array");
          expect(res.text).to.have.string(
            "Missing object in the request body."
          );
        })
        .catch((err) => {
          throw err;
        });
    });
  });
}

function noAdditionalPropertiesTest() {
  describe("/POST noAdditionalPropertiesTest", () => {
    const successResponse = "operation successfull";
    const validPet = {
      id: 4711,
      name: "MultipartFormdataRabbit",
    };

    it("should successfully execute POST request", (done) => {
      chai
        .request(server)
        .post("/api/v1/noAdditionalPropertiesTest")
        .send(validPet)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(201);
          expect(res.body).to.have.property("message");
          expect(res.body.message).to.equal(successResponse);
          done();
        });
    });

    it("should fail, because an additional property is part of the request", (done) => {
      const errorMessage = "Wrong data in the body of the request. ";
      chai
        .request(server)
        .post("/api/v1/noAdditionalPropertiesTest")
        .send(Object.assign({ anyOtherProperty: "any value" }, validPet))
        .end((err, res) => {
          if (err) {
            done(err);
          }
          res.should.have.status(400);
          res.body.should.be.a("Array");
          res.body[0].message.should.be.equal(errorMessage);
          done();
        });
    });
  });
}

describe("Pets", () => {
  before((done) => {
    // await for server creation
    serverProto.init(() => {
      server = serverProto.app;
      setTimeout(done, 1000);
    });
  });

  after((done) => {
    // close()
    serverProto.app.close(() => {
      server = serverProto.app.close();
      done();
    });
  });
  getTests(); //this one calls postTests()
  postTests(); //this one calls putTests()
  putTests(); //this one calls deletePets()
  deleteTests();
  multipartFormTests();
  miscTests();
  noAdditionalPropertiesTest();
});

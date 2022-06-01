const express = require("express");
const personRoutes = express.Router();
const dbo = require("../db_conn");

require("dotenv").config({ path: "./config.env" });

// TODO investigate addName thing if person was not found
// TODO respond with better messages on creation and such

// Create person
personRoutes.route("/person").post((req, res) => {
  let db_connect = dbo.getDb(process.env.DB);
  let person = {
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    devices: [],
  };
  if (!(person.firstname && person.lastname)) {
    res.status(400).send("Missing required fields");
  } else {
    db_connect.collection("people").insertOne(person, function (err, result) {
      if (!err) {
        res.sendStatus(201);
      } else {
        if (err.name === "MongoServerError" && err.code === 11000) {
          res.status(403).send("Duplicate SN");
        } else {
          console.error(err);
          res.sendStatus(500);
        }
      }
    });
  }
});

// Get all people
personRoutes.route("/person").get((req, res) => {
  let db_connect = dbo.getDb(process.env.DB);
  db_connect
    .collection("people")
    .find({})
    .project({ _id: 0 })
    .toArray((err, people) => {
      if (!err) {
        db_connect
          .collection("devices")
          .find({})
          .toArray((err, devices) => {
            people.forEach((person) => {
              addDeviceNames(person, devices);
            });
            res.json(people).status(200).send();
          });
      } else {
        console.error(err);
        res.sendStatus(500);
      }
    });
});

// Get person
personRoutes.route("/person/:firstname/:lastname").get((req, res) => {
  let db_connect = dbo.getDb(process.env.DB);
  let query = {
    firstname: req.params.firstname,
    lastname: req.params.lastname,
  };
  let options = {
    projection: {
      _id: 0,
    },
  };
  db_connect.collection("people").findOne(query, options, (err, person) => {
    if (!err) {
      db_connect
        .collection("devices")
        .find()
        .toArray((err, devices) => {
          addDeviceNames(person, devices);
          res.json(person).status(200).send();
        });
    } else {
      console.error(err);
      res.sendStatus(500);
    }
  });
});

// Delete person
personRoutes.route("/person/:firstname/:lastname").delete((req, res) => {
  let db_connect = dbo.getDb(process.env.DB);
  let person_query = {
    firstname: req.params.firstname,
    lastname: req.params.lastname,
  };
  db_connect.collection("people").findOne(person_query, (err, person) => {
    for (const personsDevice of person.devices) {
      let device_query = {
        device_sn: personsDevice.device_sn,
      };
      db_connect.collection("devices").updateOne(
        device_query,
        {
          $set: {
            loaned: false,
          },
        },
        (err, result) => {
          // this is janky, hard to detect if one ot the two transactions fails
          if (err) console.error(err);
        }
      );
    }
  });
  db_connect.collection("people").deleteOne(person_query, (err, result) => {
    if (!err) {
      res.sendStatus(200);
    } else {
      console.error(err);
      res.sendStatus(500);
    }
  });
});

// Update person
personRoutes.route("/person/:firstname/:lastname").patch((req, res) => {
  let db_connect = dbo.getDb(process.env.DB);
  let query = {
    firstname: req.params.firstname,
    lastname: req.params.lastname,
  };
  let oldPerson = db_connect.collection("people").findOne(query);
  let newPerson = {
    firstname:
      req.body.firstname == undefined
        ? oldPerson.firstname
        : req.body.firstname,
    lastname:
      req.body.lastname == undefined ? oldPerson.lastname : req.body.lastname,
  };
  db_connect
    .collection("people")
    .updateOne(query, { $set: newPerson }, (err, result) => {
      if (!err) {
        res.sendStatus(200);
      } else {
        if (err.name === "MongoServerError" && err.code === 11000) {
          res.status(403).send("Duplicate SN");
        } else {
          console.error(err);
          res.sendStatus(500);
        }
      }
    });
});

// Add device to person
personRoutes
  .route("/person/:firstname/:lastname/add_device/:device_sn")
  .post((req, res) => {
    let db_connect = dbo.getDb(process.env.DB);
    let person_query = {
      firstname: req.params.firstname,
      lastname: req.params.lastname,
    };
    let device_query = { device_sn: req.params.device_sn };
    db_connect.collection("people").findOne(person_query, (err, person) => {
      if (!person) {
        res.status(403).send("Not a valid person");
      } else {
        db_connect
          .collection("devices")
          .findOne(device_query, (err, device) => {
            if (!device) {
              res.status(403).send("Not a valid device");
            } else if (device.loaned) {
              res.status(403).send("Device is already loaned");
            } else {
              db_connect.collection("people").updateOne(
                person_query,
                {
                  $push: {
                    devices: {
                      device_sn: device.device_sn,
                      // We might want to set this date in the request
                      recieved_date: new Date(),
                    },
                  },
                },
                (err, result) => {
                  if (!err) {
                    res.sendStatus(200);
                    device.loaned = true;
                    db_connect
                      .collection("devices")
                      .replaceOne(device_query, device);
                  } else {
                    console.error(err);
                    res.sendStatus(500);
                  }
                }
              );
            }
          });
      }
    });
  });

// Remove device from person
personRoutes
  .route("/person/:firstname/:lastname/remove_device/:device_sn")
  .post((req, res) => {
    let db_connect = dbo.getDb(process.env.DB);
    let person_query = {
      firstname: req.params.firstname,
      lastname: req.params.lastname,
    };
    let device_query = { device_sn: req.params.device_sn };
    db_connect.collection("people").findOne(person_query, (err, person) => {
      if (!person) {
        res.status(403).send("Not a valid person");
      } else if (
        person.devices.some((d) => d.device_sn === req.params.device_sn)
      ) {
        for (const personsDevice of person.devices) {
          if (personsDevice.device_sn === req.params.device_sn) {
            db_connect.collection("people").updateOne(
              person_query,
              {
                $pull: {
                  devices: {
                    device_sn: personsDevice.device_sn,
                  },
                },
              },
              (err, result) => {
                if (!err) {
                  res.sendStatus(200);
                  db_connect
                    .collection("devices")
                    .findOne(device_query, (err, device) => {
                      device.loaned = false;
                      db_connect
                        .collection("devices")
                        .replaceOne(device_query, device);
                    });
                } else {
                  console.error(err);
                  res.sendStatus(500);
                }
              }
            );
          }
        }
      } else {
        res.status(403).send("The person has not loaned that device");
      }
    });
  });

function addDeviceNames(person, devices) {
  for (let i = 0; i < person.devices.length; i++) {
    let personsDevice = person.devices[i];
    devices.forEach((device) => {
      if (personsDevice.device_sn === device.device_sn) {
        personsDevice.device_name = device.device_name;
      }
    });
  }
}

module.exports = personRoutes;

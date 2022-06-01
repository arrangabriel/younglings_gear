const express = require("express");
const deviceRoutes = express.Router();
const dbo = require("../db_conn");

require("dotenv").config({ path: "./config.env" });

// Get all devices
deviceRoutes.route("/device").get((req, res) => {
  let db_connect = dbo.getDb(process.env.DB);
  db_connect
    .collection("devices")
    .find({})
    .project({
      _id: 0,
    })
    .toArray((err, result) => {
      if (err) throw err;
      res.json(result);
    });
});

// Create new device
deviceRoutes.route("/device").post((req, res) => {
  let db_connect = dbo.getDb(process.env.DB);
  if (!(req.body.device_sn && req.body.device_name)) {
    res.status(400).send("Missing required fields");
  } else {
    let device = {
      device_name: req.body.device_name,
      device_sn: req.body.device_sn,
      loaned: false,
    };
    db_connect.collection("devices").insertOne(device, function (err, result) {
      if (!err) {
        // change this to return the device_sn
        res.json(result).send();
      } else {
        if (err.name === "MongoServerError" && err.code === 11000) {
          res.status(403).send("Duplicate SN");
        } else {
          res.sendStatus(500);
        }
      }
    });
  }
});

// Get device
deviceRoutes.route("/device/:sn").get((req, res) => {
  let db_connect = dbo.getDb(process.env.DB);
  let query = { device_sn: req.params.sn };
  let options = {
    projection: {
      _id: 0,
    },
  };
  db_connect.collection("devices").findOne(
    query,
    {
      projection: {
        _id: 0,
      },
    },
    (err, result) => {
      if (err) throw err;
      res.json(result);
    }
  );
});

// Delete device
deviceRoutes.route("/device/:sn").delete((req, res) => {
  let db_connect = dbo.getDb(process.env.DB);
  let query = { device_sn: req.params.sn };
  db_connect
    .collection("people")
    .updateOne(
      { devices: { $elemMatch: { device_sn: req.params.sn } } },
      { $pull: { devices: { device_sn: req.params.sn } } }
    );
  db_connect.collection("devices").deleteOne(query, (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});

// Update device
deviceRoutes.route("/device/:sn").patch((req, res) => {
  let db_connect = dbo.getDb(process.env.DB);
  let query = { device_sn: req.params.sn };
  let old_device = db_connect.collection("devices").findOne(query);
  let new_device = {
    device_name:
      req.body.device_name == undefined
        ? old_device.device_name
        : req.body.device_name,
    device_sn:
      req.body.device_sn == undefined
        ? old_device.device_sn
        : req.body.device_sn,
  };
  db_connect
    .collection("devices")
    .updateOne(query, { $set: new_device }, (err, result) => {
      if (!err) {
        res.json(result).send();
      } else {
        if (err.name === "MongoServerError" && err.code === 11000) {
          res.status(403).send("Duplicate SN");
        } else {
          res.sendStatus(500);
        }
      }
    });
});

module.exports = deviceRoutes;

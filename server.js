const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config({ path: "./config.env" });
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
app.use(require("./routes/device"));
app.use(require("./routes/person"));

const dbo = require("./db_conn");

app.listen(port, () => {
  dbo.connectToServer(function (err) {
    if (err) throw err;
    // DB setup
    let db_connect = dbo.getDb(process.env.DB);
    db_connect.collection("devices").createIndex(
      {
        device_sn: 1,
      },
      {
        unique: true,
      }
    );
    db_connect.collection("people").createIndex(
      {
        firstname: 1,
        lastname: 1,
      },
      {
        unique: true,
      }
    );
  });

  console.log(`Server is running on port: ${port}`);
});

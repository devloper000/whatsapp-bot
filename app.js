require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const routes = require("./routes");

const app = express();

// Middleware
app.use(bodyParser.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/", routes);

module.exports = app;

// app.js
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res
    .status(200)
    .send('<h1>Welcome to the CI/CD Workshop!</h1>');
});

module.exports = app;

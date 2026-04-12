const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Hello, World!");
});
const errorHandler = require("./middleware/error-handler");
app.use(errorHandler);

const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
  console.log(`Server is listening on port ${port}...`)
);

module.exports = { app, server };

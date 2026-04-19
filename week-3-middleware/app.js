const express = require("express");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const dogsRouter = require("./routes/dogs");

const app = express();

// Your middleware here

//create uuid for all req
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

//logging request
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]: ${req.method} ${req.path} (${req.requestId})`);
  next();
});

//security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

//content type validation
app.use((req, res, next) => {
  if (req.method === "POST") {
    const contentType = req.get("Content-Type");

    // Check if Content-Type exists and includes application/json
    if (!contentType || !contentType.includes("application/json")) {
      return res.status(400).json({
        error: "Content-Type must be application/json",
        requestId: req.requestId,
      });
    }
  }
  next();
});

//static file
app.use("/images", express.static(path.join(__dirname, "public/images")));
//Body Parser
app.use(express.json({ limit: "1kb" }));
//Routes
app.use("/", dogsRouter); // Do not remove this line

// Global error handler
app.use((err, req, res, next) => {
  // Determine the status code from the error
  const statusCode = err.statusCode || 500;

  // Log based on error type
  if (statusCode >= 400 && statusCode < 500) {
    // 4xx errors: client errors (use console.warn)
    // This includes ValidationError (400), UnauthorizedError (401), NotFoundError (404)
    console.warn(`WARN: ${err.name}`);
  } else {
    // 5xx errors: server errors (use console.error)
    console.error(`ERROR: Error`);
  }

  // Send error response
  const message = statusCode === 500 ? "Internal Server Error" : err.message;

  return res.status(statusCode).json({
    error: message,
    requestId: req.requestId,
  });
});
//404 Error Handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    requestId: req.requestId || null,
  });
});
const server = app.listen(3000, () =>
  console.log("Server listening on port 3000")
);
module.exports = server;

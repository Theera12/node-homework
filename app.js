global.user_id = null;

const express = require("express");
const app = express();
const authMiddleware = require("./middleware/auth");
const taskRouter = require("./routes/taskRoutes");
const analyticsRouter = require("./routes/analyticsRoutes");
const prisma = require("./db/prisma");

//middleware to get the body of post request
app.use(express.json({ limit: "1kb" }));

//logging middleware
app.use((req, res, next) => {
  console.log(req.method);
  console.log(req.path);
  console.log(req.query);
  next();
});

//get route
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.post("/testpost", (req, res) => {
  res.json({ message: "Testing Port" });
});

//route for handling user routes
const userRouter = require("./routes/userRoutes");
app.use("/api/users", userRouter);

//protected routes
app.use("/api/tasks", authMiddleware, taskRouter);

//Analytics Users
app.use("/api/analytics", authMiddleware, analyticsRouter);

//db healthcheck
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res
      .status(500)
      .json({ status: "error", db: "not connected", error: err.message });
  }
});

//middleware to handle not found page
const caseNotFound = require("./middleware/not-found");
app.use(caseNotFound);

//middleware to handle errors
const errorHandler = require("./middleware/error-handler");
app.use(errorHandler);

//open server at port 3000
const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
  console.log(`Server is listening on port ${port}...`)
);

//close open port connection
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use.`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

let isShuttingDown = false;
async function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("Shutting down gracefully...");
  try {
    await new Promise((resolve) => server.close(resolve));
    console.log("HTTP server closed.");
    // If you have DB connections, close them here
    await prisma.$disconnect();
    console.log("Prisma disconnected");
  } catch (err) {
    console.error("Error during shutdown:", err);
    code = 1;
  } finally {
    console.log("Exiting process...");
    process.exit(code);
  }
}

process.on("SIGINT", () => shutdown(0)); // ctrl+c
process.on("SIGTERM", () => shutdown(0)); // e.g. `docker stop`
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  shutdown(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  shutdown(1);
});

module.exports = { app, server };

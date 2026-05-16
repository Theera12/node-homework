const { StatusCodes } = require("http-status-codes");
const { userSchema } = require("../validation/userSchema");
const prisma = require("../db/prisma");

//hashing password and storing
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

//register a new user
const register = async (req, res, next) => {
  if (!req.body) req.body = {};

  const { error, value } = userSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res
      .status(400)
      .json({ message: error.message, details: error.details });
  } //validation
  let user = null;

  //hashed password
  value.hashedPassword = await hashPassword(value.password);
  delete value.password;
  const { name, email, hashedPassword } = value;
  // the code to here is like the in-memory version
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create user account (similar to Assignment 6, but using tx instead of prisma)
      const newUser = await tx.user.create({
        data: { email, name, hashedPassword },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      // Create 3 welcome tasks using createMany
      const welcomeTaskData = [
        {
          title: "Complete your profile",
          userId: newUser.id,
          isCompleted: false,
        },
        {
          title: "Add your first task",
          userId: newUser.id,
          isCompleted: false,
        },
        { title: "Explore the app", userId: newUser.id, isCompleted: false },
      ];
      await tx.task.createMany({ data: welcomeTaskData });

      // Fetch the created tasks to return them
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTaskData.map((t) => t.title) },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
        },
        orderBy: { id: "asc" },
      });

      return { user: newUser, welcomeTasks };
    });
    global.user_id = result.user.id;
    // Store the user ID globally for session management (not secure for production)

    // Send response with status 201
    return res.status(201).json({
      user: result.user,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success",
    });
    // user = await prisma.user.create({
    // data: { name, email, hashedPassword },
    //select: { name: true, email: true, id: true }, // specify the column values to return
    //});

    //global.user_id = user.id;

    //return res.status(201).json({
    //name: user.name,
    //email: user.email,
    //});
  } catch (err) {
    console.log("REGISTER ERROR:", err);
    if (err.code === "P2002") {
      // send the appropriate error back -- the email was already registered
      return res.status(400).json({ error: "Email already registered" });
      // the email might already be registered
      /*if (e.name === "PrismaClientKnownRequestError" && e.code === "P2002") {
      // this means the unique constraint for email was violated
      return res.status(400).json({
        message: "Email already registered",
      });*/
    }
    return next(err);
  }
};
//show all users
const show = async (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      Task: {
        where: { isCompleted: false },
        select: {
          id: true,
          title: true,
          priority: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json(user);
};
//logon with the user info
const logon = async (req, res) => {
  if (!req.body) req.body = {};

  let { email, password } = req.body;

  email = email.toLowerCase(); // Joi validation always converts the email to lower case
  // but you don't want logon to fail if the user types mixed case
  const user = await prisma.user.findUnique({ where: { email } });
  // also Prisma findUnique can't do a case insensitive search

  if (!user) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }

  const passwordMatch = await comparePassword(password, user.hashedPassword);

  if (!passwordMatch) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }
  global.user_id = null;
  global.user_id = user.id;

  return res
    .status(StatusCodes.OK)
    .json({ name: user.name, email: user.email });
};

//logoff the user
const logoff = (req, res) => {
  global.user_id = null;
  res.sendStatus(StatusCodes.OK);
};
module.exports = {
  register,
  logon,
  show,
  logoff,
};

const { StatusCodes } = require("http-status-codes");
const { userSchema } = require("../validation/userSchema");
const pool = require("../db/pg-pool");
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
    user = await prisma.user.create({
      data: { name, email, hashedPassword },
      select: { name: true, email: true, id: true }, // specify the column values to return
    });
    // user = await pool.query(
    // `INSERT INTO users (email, name, hashed_password)
    //VALUES ($1, $2, $3) RETURNING id, email, name`,
    //[value.email, value.name, value.hashed_password]
    //); // note that you use a parameterized query
    // Set logged-in user
    global.user_id = user.id;

    return res.status(201).json({
      name: user.name,
      email: user.email,
    });
  } catch (e) {
    // the email might already be registered
    if (e.name === "PrismaClientKnownRequestError" && e.code === "P2002") {
      // this means the unique constraint for email was violated
      return res.status(400).json({
        message: "Email already registered",
      });
    }
    return next(e);
  }
  //const newUser = { name: value.name, email: value.email, hashedPassword }; // this makes a copy

  //global.users.push(newUser);
  //global.user_id = newUser; // After the registration step, the user is set to logged on.

  //const userResponse = { ...newUser };
  //delete userResponse.hashedPassword;
  //res.status(StatusCodes.CREATED).json(userResponse);
};

//logon with the user info
const logon = async (req, res) => {
  if (!req.body) req.body = {};

  let { email, password } = req.body;

  //const user = global.users.find((r) => r.email === email);
  //const result = await pool.query("SELECT * FROM users WHERE email = $1", [
  //email,
  //]);

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
  logoff,
};

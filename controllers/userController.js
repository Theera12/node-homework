const { StatusCodes } = require("http-status-codes");
const { userSchema } = require("../validation/userSchema");
const pool = require("../db/pg-pool");

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
  value.hashed_password = await hashPassword(value.password);
  // the code to here is like the in-memory version
  try {
    user = await pool.query(
      `INSERT INTO users (email, name, hashed_password) 
      VALUES ($1, $2, $3) RETURNING id, email, name`,
      [value.email, value.name, value.hashed_password]
    ); // note that you use a parameterized query
    // Set logged-in user
    global.user_id = user.rows[0].id;

    return res.status(201).json({
      name: user.rows[0].name,
      email: user.rows[0].email,
    });
  } catch (e) {
    // the email might already be registered
    if (e.code === "23505") {
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

  const { email, password } = req.body;

  //const user = global.users.find((r) => r.email === email);
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  if (result.rows.length === 0) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }

  const passwordMatch = await comparePassword(
    password,
    result.rows[0].hashed_password
  );

  if (!passwordMatch) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }
  global.user_id = null;
  global.user_id = result.rows[0].id;

  return res
    .status(StatusCodes.OK)
    .json({ name: result.rows[0].name, email: result.rows[0].email });
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

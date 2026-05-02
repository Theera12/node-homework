const { StatusCodes } = require("http-status-codes");
const { userSchema } = require("../validation/userSchema");

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
const register = async (req, res) => {
  if (!req.body) req.body = {};

  const { error, value } = userSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({ message: error.message });
  } //validation

  //hashed password
  const hashedPassword = await hashPassword(value.password);

  const newUser = { name: value.name, email: value.email, hashedPassword }; // this makes a copy

  global.users.push(newUser);
  global.user_id = newUser; // After the registration step, the user is set to logged on.

  const userResponse = { ...newUser };
  delete userResponse.hashedPassword;

  res.status(StatusCodes.CREATED).json(userResponse);
};

//logon with the user info
const logon = async (req, res) => {
  if (!req.body) req.body = {};

  const { email, password } = req.body;

  const user = global.users.find((r) => r.email === email);

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

  global.user_id = user;

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

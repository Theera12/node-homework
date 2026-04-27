const { StatusCodes } = require("http-status-codes");

//register a new user
const register = (req, res) => {
  const newUser = { ...req.body }; // this makes a copy
  global.users.push(newUser);
  global.user_id = newUser; // After the registration step, the user is set to logged on.
  const userResponse = { ...newUser };
  delete userResponse.password;
  res.status(StatusCodes.CREATED).json(userResponse);
};

//logging on with the user
const logon = (req, res) => {
  const { email, password } = req.body;
  const user = global.users.find((r) => r.email === email);

  if (user && user.password === password) {
    global.user_id = user;
    return res
      .status(StatusCodes.OK)
      .json({ name: user.name, email: user.email });
  }
  return res
    .status(StatusCodes.UNAUTHORIZED)
    .json({ message: "Authentication Failed" });
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

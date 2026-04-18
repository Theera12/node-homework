const { StatusCodes } = require("http-status-codes");

const register = (req, res) => {
  const newUser = { ...req.body }; // this makes a copy
  global.users.push(newUser);
  global.user_id = newUser; // After the registration step, the user is set to logged on.
  delete newUser.password;
  res.status(StatusCodes.CREATED).json(newUser);
};

module.exports = {
  register,
};

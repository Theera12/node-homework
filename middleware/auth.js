const { StatusCodes } = require("http-status-codes");

module.exports = (req, res, next) => {
  if (global.user_id === null) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: "unauthorized" });
  }
  next();
};

const express = require("express");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const router = express.Router();
const {
  register,
  show,
  logon,
  logoff,
  googleLogon,
} = require("../controllers/userController");

router.route("/register").post(register);
router.route("/googleLogon").post(googleLogon);
router.route("/logon").post(logon);
router.route("/:id").get(show);
router.use(jwtMiddleware);
router.route("/logoff").post(logoff);

module.exports = router;

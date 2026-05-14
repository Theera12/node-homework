const express = require("express");

const router = express.Router();
const {
  register,
  show,
  logon,
  logoff,
} = require("../controllers/userController");

router.route("/register").post(register);
router.route("/logon").post(logon);
router.route("/:id").get(show);
router.route("/logoff").post(logoff);

module.exports = router;

const express = require("express");
const router = express.Router();
const {
  userStatistics,
  userListWithTask,
} = require("../controllers/analyticsController");

router.route("/users/:id").get(userStatistics);
router.route("/users").get(userListWithTask);

module.exports = router;

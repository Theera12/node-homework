const express = require("express");

const router = express.Router();
const {
  create,
  deleteTask,
  index,
  show,
  update,
} = require("../controllers/taskController");

router.route("/api/tasks").post(create);
router.route("/api/tasks").get(index);
router.route("api/tasks/:id").get(show);
router.route("api/tasks/:id").patch(update);
router.route("api/tasks/:id").delete(deleteTask);

module.exports = router;

const express = require("express");

const router = express.Router();
const {
  create,
  index,
  show,
  update,
  deleteTask,
} = require("../controllers/taskController");

router.route("/").post(create);
router.route("/").get(index);
router.route("/:id").get(show);
router.route("/:id").patch(update);
router.route("/:id").delete(deleteTask);

module.exports = router;

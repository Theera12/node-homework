const express = require("express");

const router = express.Router();
const {
  create,
  index,
  show,
  update,
  bulkCreate,
  deleteTask,
} = require("../controllers/taskController");

router.route("/").post(create);
router.route("/").get(index);
router.route("/bulk").post(bulkCreate);
router.route("/:id").get(show);
router.route("/:id").patch(update);
router.route("/:id").delete(deleteTask);

module.exports = router;

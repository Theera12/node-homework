const express = require("express");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const router = express.Router();
const {
  create,
  index,
  show,
  update,
  bulkCreate,
  deleteTask,
} = require("../controllers/taskController");
router.use(jwtMiddleware);
router.route("/").post(create);
router.route("/").get(index);
router.route("/bulk").post(bulkCreate);
router.route("/:id").get(show);
router.route("/:id").patch(update);
router.route("/:id").delete(deleteTask);

module.exports = router;

const { StatusCodes } = require("http-status-codes");
const { taskSchema } = require("../validation/taskSchema");
const { patchTaskSchema } = require("../validation/taskSchema");
const pool = require("../db/pg-pool");
const prisma = require("../db/prisma");

//create unique id for each task (This is called closure)
const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

//create a task
const create = async (req, res) => {
  if (!req.body) req.body = {};

  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  } //validation for the task
  const { title, isCompleted } = value;
  const task = await prisma.task.create({
    data: { title, isCompleted, userId: global.user_id },
    select: { title: true, isCompleted: true, id: true }, // specify the column values to return
  });
  // const task = await pool.query(
  // `INSERT INTO tasks (title, is_completed, user_id)
  //VALUES ( $1, $2, $3 ) RETURNING id, title, is_completed`,
  // [value.title, value.isCompleted, global.user_id]
  //);

  return res
    .status(StatusCodes.CREATED) // 201 for create
    .json(task);
};

//get all task for logged in users

const index = async (req, res) => {
  //const tasks = await pool.query(
  //`SELECT id, title, is_completed
  // FROM tasks
  // WHERE user_id = $1`,
  //[global.user_id]
  //);

  const tasks = await prisma.task.findMany({
    where: {
      userId: global.user_id, // only the tasks for this user!
    },
    select: { title: true, isCompleted: true, id: true },
  });

  if (tasks.length === 0) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: "No tasks found",
    });
  }

  return res.status(StatusCodes.OK).json(tasks);
};

//show a task
const show = async (req, res, next) => {
  //const task = await pool.query(
  //`SELECT id, title, is_completed
  //FROM tasks
  //WHERE id = $1 AND user_id = $2`,
  //[req.params.id, global.user_id]
  //);
  try {
    const task = await prisma.task.findUnique({
      where: {
        userId: global.user_id,
        id: req.params.id, // only the tasks for this user!
      },
      select: { title: true, isCompleted: true, id: true },
    });
    return res.status(StatusCodes.OK).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "That task was not found",
      });
    } else {
      return next(err);
    }
  }
};
//update a task
const update = async (req, res, next) => {
  if (!req.body) req.body = {};

  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });
  const id = parseInt(req.params.id);
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  } //validation for patchtask
  //let keys = Object.keys(value);
  //keys = keys.map((key) => (key === "isCompleted" ? "is_completed" : key));
  //const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
  //const idParm = `$${keys.length + 1}`;
  //const userParm = `$${keys.length + 2}`;
  // const updatedTask = await pool.query(
  // `UPDATE tasks SET ${setClauses}
  //WHERE id = ${idParm} AND user_id = ${userParm} RETURNING id, title, is_completed`,
  // [...Object.values(value), req.params.id, global.user_id]
  //);
  //if (updatedTask.rows.length === 0) {
  //return res.status(StatusCodes.NOT_FOUND).json({
  //message: "Task not found",
  //});
  //}

  try {
    const task = await prisma.task.update({
      data: value,
      where: {
        id,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
    });
    return res.status(StatusCodes.OK).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "The task was not found." });
    } else {
      return next(err); // pass other errors to the global error handler
    }
  }
};

//delete a task
const deleteTask = async (req, res, next) => {
  // const deletedTask = await pool.query(
  // `DELETE FROM tasks
  //WHERE id = $1 AND user_id = $2
  //RETURNING id, title, is_completed`,
  //[req.params.id, global.user_id]
  //);

  //if (deletedTask.rows.length === 0) {
  //return res.status(StatusCodes.NOT_FOUND).json({
  //message: "That task was not found",
  //});
  //}

  const id = parseInt(req.params.id);

  try {
    const task = await prisma.task.delete({
      where: {
        id,
        userId: global.user_id,
      },
    });

    return res.sendStatus(StatusCodes.OK).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "That task was not found",
      });
    }
    return next(err);
  }
};
module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};

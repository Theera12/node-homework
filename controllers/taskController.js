const { StatusCodes } = require("http-status-codes");
const { taskSchema } = require("../validation/taskSchema");
const { patchTaskSchema } = require("../validation/taskSchema");
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
    select: { title: true, isCompleted: true, id: true, priority: true }, // specify the column values to return
  });

  return res
    .status(StatusCodes.CREATED) // 201 for create
    .json(task);
};

//get all task for logged in users

const index = async (req, res) => {
  // Parse pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build where clause with optional search filter
  const whereClause = { userId: global.user_id };

  const getOrderBy = (query) => {
    const validSortFields = [
      "title",
      "priority",
      "createdAt",
      "id",
      "isCompleted",
    ];
    const sortBy = query.sortBy || "createdAt";
    const sortDirection = query.sortDirection === "asc" ? "asc" : "desc";

    if (validSortFields.includes(sortBy)) {
      return { [sortBy]: sortDirection };
    }
    return { createdAt: "desc" }; // default fallback
  };

  if (req.query.find) {
    whereClause.title = {
      contains: req.query.find, // Matches %find% pattern
      mode: "insensitive", // Case-insensitive search (ILIKE in PostgreSQL)
    };
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,

    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    skip: skip,
    take: limit,
    orderBy: getOrderBy(req.query),
  });

  // Get total count for pagination metadata
  const totalTasks = await prisma.task.count({
    where: whereClause,
  });

  if (tasks.length === 0) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: "No tasks found",
    });
  }

  // Build pagination object with complete metadata
  const pagination = {
    page,
    limit,
    total: totalTasks,
    pages: Math.ceil(totalTasks / limit),
    hasNext: page * limit < totalTasks,
    hasPrev: page > 1,
  };

  return res.status(StatusCodes.OK).json(tasks, pagination);
};

//show a task
const show = async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: {
        userId: global.user_id,
        id: parseInt(req.params.id), // only the tasks for this user!
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
  const id = parseInt(req.params.id);

  try {
    const task = await prisma.task.delete({
      where: {
        id,
        userId: global.user_id,
      },
    });

    return res.sendStatus(StatusCodes.OK);
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

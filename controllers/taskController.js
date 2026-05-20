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

  const { title, isCompleted, priority } = value;
  const task = await prisma.task.create({
    data: {
      title,
      isCompleted,
      priority: priority || "medium",
      userId: global.user_id,
    },
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
  //const skip = (page - 1) * limit;

  // validation
  if (
    (req.query.page && (isNaN(page) || page < 1)) ||
    (req.query.limit && (isNaN(limit) || limit < 1 || limit > 100))
  ) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Invalid pagination parameters",
    });
  }
  const safePage = !isNaN(page) && page >= 1 ? page : 1;
  const safeLimit = !isNaN(limit) && limit >= 1 && limit <= 100 ? limit : 10;

  const skip = (safePage - 1) * safeLimit;
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
    skip,
    take: safeLimit,
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
    page: safePage,
    limit: safeLimit,
    total: totalTasks,
    pages: Math.ceil(totalTasks / safeLimit),
    hasNext: safePage * safeLimit < totalTasks,
    hasPrev: safePage > 1,
  };

  return res
    .status(StatusCodes.OK)
    .json({ tasks: tasks, pagination: pagination });
};

//show a task
const show = async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: {
        userId: global.user_id,
        id: parseInt(req.params.id), // only the tasks for this user!
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
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
      select: { title: true, isCompleted: true, id: true, priority: true },
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

//Bulk task operation
const bulkCreate = async (req, res, next) => {
  const { tasks } = req.body;

  // Validate the tasks array
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  // Validate all tasks before insertion
  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || "medium",
      userId: global.user_id,
    });
  }

  // Use createMany for batch insertion
  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    res.status(201).json({
      message: "success!",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (err) {
    return next(err);
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
      select: { title: true, isCompleted: true, id: true, priority: true },
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
  bulkCreate,
  deleteTask,
};

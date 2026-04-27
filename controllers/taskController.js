const { StatusCodes } = require("http-status-codes");

//create unique id for each task (This is called closure)
const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

//create a task
const create = (req, res) => {
  const newTask = {
    ...req.body,
    id: taskCounter(),
    userId: global.user_id.email,
  };
  global.tasks.push(newTask);
  const { userId, ...sanitizedTask } = newTask;
  // we don't send back the userId! This statement removes it.
  return res
    .status(StatusCodes.CREATED) // 201 for create
    .json(sanitizedTask);
};

//get all task for logged in users
const index = (req, res) => {
  const userTasks = global.tasks.filter(
    (task) => task.userId === global.user_id.email
  );
  const sanitizedTasks = userTasks.map((task) => {
    const { userId, ...sanitizedTask } = task;
    return sanitizedTask;
  });
  return res.json(sanitizedTasks);
};

//show a task
const show = (req, res) => {
  const taskToFind = parseInt(req.params?.id);
  if (!taskToFind) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }
  const task = global.tasks.find(
    (task) => task.id === taskToFind && task.userId === global.user_id.email
  );

  if (!task) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }

  const { userId, ...sanitizedTask } = task;

  return res.json(sanitizedTask);
};

//update a task
const update = (req, res) => {
  const taskToFind = parseInt(req.params?.id); // if there are no params, the ? makes sure that you
  // get a null
  if (!taskToFind) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }
  const updateTask = global.tasks.find(
    (task) => task.id === taskToFind && task.userId === global.user_id.email
  );
  if (!updateTask) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }
  Object.assign(updateTask, req.body);

  const { userId, ...sanitizedTask } = updateTask;

  return res.json(sanitizedTask);
};

//delete a task
const deleteTask = (req, res) => {
  const taskToFind = parseInt(req.params?.id); // if there are no params, the ? makes sure that you
  // get a null
  if (!taskToFind) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }
  const taskIndex = global.tasks.findIndex(
    (task) => task.id === taskToFind && task.userId === global.user_id.email
  );
  // we get the index, not the task, so that we can splice it out
  if (taskIndex === -1) {
    // if no such task
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
    // else it's a 404.
  }
  const { userId, ...task } = global.tasks[taskIndex];
  // pull userId out and keep a copy of everything else, so the response is sanitized
  global.tasks.splice(taskIndex, 1); // do the delete
  return res.json(task); // return the deleted entry without its userId. The default status code, OK, is returned
};

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};

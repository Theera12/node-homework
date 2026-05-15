const prisma = require("../db/prisma");
const { StatusCodes } = require("http-status-codes");

const userStatistics = async (req, res) => {
  // Parse and validate user ID
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: "That task was not found",
    });
  }

  // Use groupBy to count tasks by completion status
  const taskStats = await prisma.task.groupBy({
    by: ["isCompleted"],
    where: { userId },
    _count: {
      id: true,
    },
  });

  // Include recent task activity with eager loading
  const recentTasks = await prisma.task.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      userId: true,
      User: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Calculate weekly progress using groupBy
  const oneWeekAgo = new Date(Date.now()); // ... you need to calculate this
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  // Then use groupBy with a where clause filtering by createdAt >= oneWeekAgo
  const weeklyProgress = await prisma.task.groupBy({
    by: ["createdAt"],
    where: {
      userId,
      createdAt: { gte: oneWeekAgo },
    },
    _count: { id: true },
  });

  // Return response with taskStats, recentTasks, and weeklyProgress
  res.status(200).json({
    taskStats: taskStats,
    recentTasks: recentTasks,
    weeklyProgress: weeklyProgress,
  });
  return;
};

//shows all users with their task statistics
const userListWithTask = async (req, res) => {
  // Parse pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const usersRaw = await prisma.user.findMany({
    include: {
      Task: {
        where: { isCompleted: false },
        select: { id: true },
        take: 5,
      },
      _count: {
        select: {
          Task: true,
        },
      },
    },
    skip: skip,
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  // Transform to only include the fields we want
  const users = usersRaw.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    _count: user._count,
    Task: user.Task,
  }));

  // Get total count for pagination
  const totalUsers = await prisma.user.count();

  // Build pagination object with page, limit, total, pages, hasNext, hasPrev
  const pagination = {
    page,
    limit,
    total: totalUsers,
    pages: Math.ceil(totalUsers / limit),
    hasNext: page * limit < totalUsers,
    hasPrev: page > 1,
  };
  // Return users and pagination
  res.status(200).json({
    users,
    pagination,
  });
};
module.exports = {
  userStatistics,
  userListWithTask,
};

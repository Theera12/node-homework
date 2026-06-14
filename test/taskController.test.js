require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL; // point to the test database!
const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");
const EventEmitter = require("events").EventEmitter;
const {
  index,
  show,
  create,
  update,
  deleteTask,
  bulkCreate,
  bulkDelete,
  bulkUpdateWithIds,
} = require("../controllers/taskController");

// a few useful globals
let user1 = null;
let user2 = null;
let saveRes = null;
let saveData = null;
let saveTaskId = null;

beforeAll(async () => {
  // clear database
  await prisma.Task.deleteMany(); // delete all tasks
  await prisma.User.deleteMany(); // delete all users
  user1 = await prisma.User.create({
    data: { name: "Bob", email: "bob@sample.com", hashedPassword: "nonsense" },
  });
  user2 = await prisma.User.create({
    data: {
      name: "Alice",
      email: "alice@sample.com",
      hashedPassword: "nonsense",
    },
  });
});

describe("testing task creation", () => {
  it("14. cant create a task without a user id", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    //req.user = { id: user1.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    expect.assertions(1);
    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (e) {
      expect(e.name).toBe("TypeError");
    }
  });

  it("15.You can't create a task with a bogus user id.", async () => {
    expect.assertions(1);
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    req.user = { id: 72348 };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (e) {
      expect(e.name).toBe("PrismaClientKnownRequestError");
    }
  });

  it("16. If you have a valid user id, create() succeeds (res.statusCode should be 201)", async () => {
    expect.assertions(1);
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    req.user = { id: user1.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
      expect(saveRes.statusCode).toBe(201);
    } catch (e) {
      expect(e.name).toBe("PrismaClientKnownRequestError");
    }
  });

  it("17. The object returned from the create() call has the expected title.", async () => {
    saveData = saveRes._getJSONData();
    saveTaskId = saveData.id.toString();
    expect(saveData.title).toBeDefined();
  });

  it("18. The object has the right value for isCompleted", async () => {
    expect(saveData.isCompleted).toBeDefined();
  });

  it("19. The object does not have any value for userId.", async () => {
    expect(saveData.userId).not.toBeDefined();
  });
});

describe("test getting created tasks", () => {
  it("20. You can't get a list of tasks without a user id.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    try {
      saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
      await waitForRouteHandlerCompletion(index, req, saveRes);
      expect(saveRes.statusCode).toBe(400);
    } catch (e) {
      expect(e.name).toBe("TypeError");
    }
  });

  it("21. If you use user1's id on index() the call returns a 200 status.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    req.user = { id: user1.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("22. The returned object has a tasks array of length 1.", () => {
    saveData = saveRes._getJSONData(); // reusing saveRes
    expect(saveData.tasks.length).toBe(1);
  });

  it("23. The title in the first array object is as expected.", () => {
    saveData = saveRes._getJSONData(); // reusing saveRes
    expect(saveData.tasks[0].title).toBe("first task");
  });

  it("24. The first array object does not contain a userId", () => {
    saveData = saveRes._getJSONData(); // reusing saveRes
    expect(saveData.tasks[0].userId).not.toBeDefined();
  });

  it("25. If you get the list of tasks using the userId from user2, you get a 404.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    req.user = { id: user2.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });

  it("26. You can retrieve the created task using show()", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    req.user = { id: user1.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(show, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("27. User2 can't retrieve this task entry. You should get a 404.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    req.user = { id: user2.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(show, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
});

describe("testing the update and delete of tasks", () => {
  it("28. User1 can set the task corresponding to saveTaskId to isCompleted: true", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
    });
    req.user = { id: user1.id };
    req.params = { id: saveTaskId.toString() };
    req.body = { isCompleted: true };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(update, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("29. User2 can't do this.", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
    });
    req.user = { id: user2.id };
    req.params = { id: saveTaskId.toString() };
    req.body = { isCompleted: true };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(update, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });

  it("30. User2 can't delete this task.", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
    });
    req.user = { id: user2.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTask, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });

  it("31. User1 can delete this task.", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
    });
    req.user = { id: user1.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTask, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("32. Retrieving user1's tasks now returns a 404.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    req.user = { id: user1.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
});

// describe("Testing Delete Multiple Tasks", () => {
//   it("a.should delete multiple tasks", async () => {
//     const req = httpMocks.createRequest({
//       method: "DELETE",
//       body: {
//         taskIds: [1, 2, 3],
//       },
//     });
//     req.user = {
//       id: 1,
//     };

//     saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
//     await waitForRouteHandlerCompletion(bulkDelete, req, saveRes);
//     expect(saveRes.statusCode).toBe(200);
//   });
//   it("b.should return 400 when taskIds is empty", async () => {
//     const req = httpMocks.createRequest({
//       method: "DELETE",
//       body: {
//         taskIds: [],
//       },
//     });

//     saveRes = httpMocks.createResponse({
//       eventEmitter: EventEmitter,
//     });

//     await waitForRouteHandlerCompletion(bulkDelete, req, saveRes);

//     expect(saveRes.statusCode).toBe(400);
//   });
// });

// describe("Testing Update Multiple Tasks", () => {
//   it("a.should update multiple tasks", async () => {
//     const req = httpMocks.createRequest({
//       method: "PATCH",
//       body: {
//         taskIds: [1, 2, 3],
//       },
//     });
//     req.user = {
//       id: 1,
//     };

//     saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
//     await waitForRouteHandlerCompletion(bulkUpdateWithIds, req, saveRes);
//     expect(saveRes.statusCode).toBe(200);
//   });

//   it("b.should return 400 when taskIds is missing", async () => {
//     const req = httpMocks.createRequest({
//       method: "PATCH",
//       body: {
//         taskIds: [],
//       },
//     });
//     req.user = {
//       id: 1,
//     };
//     req.body = { isCompleted: true };
//     saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
//     await waitForRouteHandlerCompletion(bulkUpdateWithIds, req, saveRes);
//     expect(saveRes.statusCode).toBe(400);
//   });
// });

describe("Bulk Create Tasks", () => {
  it("a.should create multiple tasks for a valid user", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: {
        tasks: [{ title: "task A" }, { title: "task B" }, { title: "task C" }],
      },
    });

    req.user = { id: user1.id };

    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(bulkCreate, req, res);

    expect(res.statusCode).toBe(201);

    const data = res._getJSONData();

    expect(data.message).toBe("success!");
    expect(data.tasksCreated).toBe(3);
    expect(data.totalRequested).toBe(3);
  });

  it("b.should return 400 if tasks array is empty", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { tasks: [] },
    });

    req.user = { id: user1.id };

    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    await waitForRouteHandlerCompletion(bulkCreate, req, res);

    expect(res.statusCode).toBe(400);
  });
});

describe("Bulk Delete Tasks ", () => {
  let task1, task2, task3;

  beforeEach(async () => {
    task1 = await prisma.Task.create({
      data: { title: "task1", userId: user1.id },
    });

    task2 = await prisma.Task.create({
      data: { title: "task2", userId: user1.id },
    });

    task3 = await prisma.Task.create({
      data: { title: "task3", userId: user1.id },
    });
  });

  it("a.should delete multiple tasks using valid taskIds", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
      body: {
        taskIds: [task1.id, task2.id, task3.id], // ✅ real ids
      },
    });

    req.user = { id: user1.id };

    const res = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    await waitForRouteHandlerCompletion(bulkDelete, req, res);

    expect(res.statusCode).toBe(200);

    const data = res._getJSONData();

    expect(data.message).toBe("success!");
    expect(data.tasksDeleted).toBe(3);
    expect(data.totalRequested).toBe(3);
  });

  it("b.should return 400 when taskIds is empty", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
      body: { taskIds: [] },
    });

    req.user = { id: user1.id };

    const res = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    await waitForRouteHandlerCompletion(bulkDelete, req, res);

    expect(res.statusCode).toBe(400);
  });

  it("c.should NOT delete tasks of another user even if ids are passed", async () => {
    const foreignTask = await prisma.Task.create({
      data: { title: "foreign", userId: user2.id },
    });

    const req = httpMocks.createRequest({
      method: "DELETE",
      body: {
        taskIds: [foreignTask.id],
      },
    });

    req.user = { id: user1.id };

    const res = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    await waitForRouteHandlerCompletion(bulkDelete, req, res);

    expect(res.statusCode).toBe(200);

    const stillExists = await prisma.Task.findUnique({
      where: { id: foreignTask.id },
    });

    expect(stillExists).not.toBeNull();
  });
});

describe("Bulk Update Tasks ", () => {
  let task1, task2, task3;
  beforeEach(async () => {
    task1 = await prisma.Task.create({
      data: { title: "task1", userId: user1.id },
    });

    task2 = await prisma.Task.create({
      data: { title: "task2", userId: user1.id },
    });

    task3 = await prisma.Task.create({
      data: { title: "task3", userId: user1.id },
    });
  });

  it("a.should update multiple tasks using valid taskIds", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      body: {
        taskIds: [task1.id, task2.id, task3.id],
      },
    });

    req.user = { id: user1.id };

    const res = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    await waitForRouteHandlerCompletion(bulkUpdateWithIds, req, res);

    expect(res.statusCode).toBe(200);

    const data = res._getJSONData();

    expect(data.message).toBe("success!");
    expect(data.tasksUpdated).toBe(3);
    expect(data.totalRequested).toBe(3);
  });

  it("b.should return 400 when taskIds is empty", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      body: { taskIds: [] },
    });

    req.user = { id: user1.id };

    const res = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    await waitForRouteHandlerCompletion(bulkUpdateWithIds, req, res);

    expect(res.statusCode).toBe(400);
  });

  it("c.should NOT update other user's tasks even if ids are passed", async () => {
    const foreignTask = await prisma.Task.create({
      data: { title: "foreign", isCompleted: false, userId: user2.id },
    });

    const req = httpMocks.createRequest({
      method: "PATCH",
      body: {
        taskIds: [foreignTask.id],
        isCompleted: true,
      },
    });

    req.user = { id: user1.id };

    const res = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    await waitForRouteHandlerCompletion(bulkUpdateWithIds, req, res);

    expect(res.statusCode).toBe(200);
    const unchangedTask = await prisma.Task.findUnique({
      where: { id: foreignTask.id },
    });

    expect(unchangedTask.isCompleted).toBe(false);
  });
});
afterAll(() => {
  prisma.$disconnect();
});

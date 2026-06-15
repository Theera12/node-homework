const { StatusCodes } = require("http-status-codes");
const { userSchema } = require("../validation/userSchema");
const prisma = require("../db/prisma");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const cookieFlags = (req) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only when HTTPS is available
    sameSite: "Strict",
  };
};

const setJwtCookie = (req, res, user) => {
  // Sign JWT
  const payload = { id: user.id, csrfToken: randomUUID() };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }); // 1 hour expiration
  // Set cookie.
  res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 }); // 1 hour expiration
  return payload.csrfToken; // this is needed in the body returned by logon() or register()
};

//hashing password and storing
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

//google logon
const googleLogon = async (req, res, next) => {
  try {
    const { code } = req.body;
    console.log(code);

    if (!code) {
      return res.status(400).json({ error: "No credential provided" });
    }

    const { tokens } = await client.getToken(code);

    console.log(tokens);

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;
    console.log(email);
    console.log(name);

    let user = await prisma.user.findUnique({
      where: { email: email },
    });
    if (!user) {
      const result = await prisma.$transaction(async (tx) => {
        // Create user account
        const newUser = await tx.user.create({
          data: { email, name, hashedPassword: "hashedGoogleUser" },
          select: { id: true, email: true, name: true, createdAt: true },
        });

        // Create 3 welcome tasks using createMany
        const welcomeTaskData = [
          {
            title: "Complete your profile",
            userId: newUser.id,
            isCompleted: false,
          },
          {
            title: "Add your first task",
            userId: newUser.id,
            isCompleted: false,
          },
          { title: "Explore the app", userId: newUser.id, isCompleted: false },
        ];
        await tx.task.createMany({ data: welcomeTaskData });

        // Fetch the created tasks to return them
        const welcomeTasks = await tx.task.findMany({
          where: {
            userId: newUser.id,
            title: { in: welcomeTaskData.map((t) => t.title) },
          },
          select: {
            id: true,
            title: true,
            isCompleted: true,
            userId: true,
          },
          orderBy: { id: "asc" },
        });

        return { user: newUser, welcomeTasks };
      });
      const csrfToken = setJwtCookie(req, res, result.user);
      return res.status(201).json({
        user: result.user,
        welcomeTasks: result.welcomeTasks,
        transactionStatus: "success",
        csrfToken: csrfToken,
      });
    } else {
      const csrfToken = setJwtCookie(req, res, user);
      return res.status(201).json({
        user: user,
        csrfToken: csrfToken,
      });
    }
  } catch (err) {
    next(err);
  }
};
//register a new user
const register = async (req, res, next) => {
  if (!req.body) req.body = {};

  //check for recaptcha token
  let isPerson = false;
  if (req.body.recaptchaToken) {
    const token = req.body.recaptchaToken;
    const params = new URLSearchParams();
    params.append("secret", process.env.RECAPTCHA_SECRET);
    params.append("response", token);
    params.append("remoteip", req.ip);
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        body: params.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const data = await response.json();
    if (data.success) isPerson = true;
    delete req.body.recaptchaToken;
  } else if (
    process.env.RECAPTCHA_BYPASS &&
    req.get("X-Recaptcha-Test") === process.env.RECAPTCHA_BYPASS
  ) {
    isPerson = true;
  }

  if (!isPerson) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Bot verification failed. Please complete the reCAPTCHA.",
    });
  }

  //userschema validation
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res
      .status(400)
      .json({ message: error.message, details: error.details });
  } //validation
  let user = null;

  //hashed password
  value.hashedPassword = await hashPassword(value.password);
  delete value.password;
  const { name, email, hashedPassword } = value;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create user account
      const newUser = await tx.user.create({
        data: { email, name, hashedPassword },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      // Create 3 welcome tasks using createMany
      const welcomeTaskData = [
        {
          title: "Complete your profile",
          userId: newUser.id,
          isCompleted: false,
        },
        {
          title: "Add your first task",
          userId: newUser.id,
          isCompleted: false,
        },
        { title: "Explore the app", userId: newUser.id, isCompleted: false },
      ];
      await tx.task.createMany({ data: welcomeTaskData });

      // Fetch the created tasks to return them
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTaskData.map((t) => t.title) },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
        },
        orderBy: { id: "asc" },
      });

      return { user: newUser, welcomeTasks };
    });
    const csrfToken = setJwtCookie(req, res, result.user);
    // Send response with status 201
    return res.status(201).json({
      user: result.user,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success",
      csrfToken: csrfToken,
    });
  } catch (err) {
    console.log("REGISTER ERROR:", err);
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Email already registered" });
    }
    return next(err);
  }
};
//show all users
const show = async (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      Task: {
        where: { isCompleted: false },
        select: {
          id: true,
          title: true,
          priority: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json(user);
};
//logon with the user info
const logon = async (req, res) => {
  if (!req.body) req.body = {};

  let { email, password } = req.body;

  email = email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }

  const passwordMatch = await comparePassword(password, user.hashedPassword);

  if (!passwordMatch) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }
  const csrfToken = setJwtCookie(req, res, user);

  return res
    .status(StatusCodes.OK)
    .json({ name: user.name, email: user.email, csrfToken: csrfToken });
};

//logoff the user
const logoff = (req, res) => {
  res.clearCookie("jwt", cookieFlags(req));
  res.sendStatus(StatusCodes.OK);
};
module.exports = {
  register,
  logon,
  show,
  logoff,
  googleLogon,
};

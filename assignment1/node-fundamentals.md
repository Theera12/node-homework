# Node.js Fundamentals

## What is Node.js?

- Node.js is a version of JavaScript that runs locally on any machine, instead of in the browser.
- Node benefits from being a single-threaded language with an event loop for asynchronous operations that is highly performant.

## How does Node.js differ from running JavaScript in the browser?

- Node js gives us a luxury to start a process, or start a server socket, or access the file system. It gives us access to hardware resources like the screen and the file system. Whereas running Javascript on browser lacks such features.

## What is the V8 engine, and how does Node use it?

- The V8 engine is a core component of Node.js that executes JavaScript code. It compiles JavaScript directly into machine code to improve performance and execution speed.
- Node.js uses the Chrome V8 engine to execute JavaScript code.

## What are some key use cases for Node.js?

- On Node Js we have file system access, process information and control, local operating system services, open a web server socket , and networking APIs.

- Node runs on a server, and not on the browser, so we can safely store secrets.

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

Browser side Js uses ESM standard for importing and exporting functions between modules. Whereas in Node we use CJS standard which uses "require" to access between modules.

**CommonJS (default in Node.js):**

```js
//For Imports
const { register, logoff } = require("../controllers/userController");
const fs = require("fs");
const path = require("path");
//For Exports
module.exports = { add, multiply };
```

**ES Modules (supported in modern Node.js):**

```js
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
//For Exports
export default { add, multiply };
```

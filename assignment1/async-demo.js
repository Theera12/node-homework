const fs = require("fs");
const path = require("path");
const fsPromises = require("fs/promises");

// Write a sample file for demonstration

// 1. Callback style
fs.writeFile(
  path.join(__dirname, "sample-files", "sample.txt"),
  "Hello, async world!",
  (err) => {
    if (err) return err;
    fs.readFile(
      path.join(__dirname, "sample-files", "sample.txt"),
      "utf8",
      (err, data) => {
        if (err) throw err;
        console.log("Callback read: " + data);
      }
    );
  }
);

// Callback hell example (test and leave it in comments):
// fs.writeFile(
//   path.join(__dirname, "sample-files", "sample.txt"),
//   "Thank You",
//   (err) => {
//     if (err) throw err;
//     console.log("Write complete");
//     fs.appendFile(
//       path.join(__dirname, "sample-files", "sample.txt"),
//       "\n\n See You Later",
//       (err) => {
//         if (err) throw err;
//         console.log("Append complete");
//       }
//     );
//   }
// );

// 2. Promise style
const doFileOperation = async () => {
  try {
    const filehandle = await new Promise((resolve, reject) => {
      fs.readFile(
        path.join(__dirname, "sample-files", "sample.txt"),
        "utf8",
        (err, data) => {
          return err ? reject(err) : resolve(data);
        }
      );
    });
    console.log("Promise read:" + filehandle);
  } catch (err) {
    console.log("An Error Occured", err);
  }
};
doFileOperation();
// 3. Async/Await style
const doAsyncFileOperation = async () => {
  try {
    const fileData = await fsPromises.readFile(
      path.join(__dirname, "sample-files", "sample.txt"),
      "utf8"
    );
    console.log("Async/Await read: " + fileData);
  } catch (err) {
    console.log("An Error Occurred", err);
  }
};
doAsyncFileOperation();

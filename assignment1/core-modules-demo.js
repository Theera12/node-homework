const os = require("os");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;

const sampleFilesDir = path.join(__dirname, "sample-files");
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
const cpus = os.cpus();
console.log(`Platform:${os.platform()}`);
console.log("CPU:", cpus[0].model);
console.log(`Total Memory:${os.totalmem()}`);

// Path module
const filePath = path.join("path", "to", "sample-files", "folder", "file.txt");
console.log("Joined path:", filePath);

// fs.promises API
const fileOperation = async () => {
  try {
    await fsPromises.writeFile(
      path.join(__dirname, "sample-files", "demo.txt"),
      "Hello from fs.promises!"
    );
    const data = await fsPromises.readFile(
      path.join(__dirname, "sample-files", "demo.txt"),
      "utf8"
    );
    console.log("fs.promises read:", data);
  } catch (err) {
    console.log(err);
  }
};
fileOperation();

// Streams for large files- log first 40 chars of each chunk
const fileChunkOperation = async () => {
  try {
    for (let i = 0; i < 100; i++) {
      await fsPromises.appendFile(
        path.join(__dirname, "sample-files", "largefile.txt"),
        `This is a line in a large file`
      );
    }
    const readStream = fs.createReadStream(
      path.join(__dirname, "sample-files", "largefile.txt"),
      { encoding: "utf8", highWaterMark: 1024 }
    );
    readStream.on("data", (chunk) => {
      console.log("Read chunk:", chunk.slice(0, 40));
    });
    readStream.on("end", () => {
      console.log("Finished reading large file with streams.");
    });
  } catch (err) {
    console.log(err);
  }
};
fileChunkOperation();

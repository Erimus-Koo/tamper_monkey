/**
 * Restful API for file handling, read and write file on local.
 *
 * Auto Startup
 * 1. `pnpm add -g pm2`
 * 2. `pm2 start {this.js}`
 * 3. `pm2 startup` then copy and run the sudo cmd.
 */

/* 1. pnpm add -g express
 * 2. `pnpm root -g` Get full module path
 * PM2 requires the full path for global installs when using pnpm
 */
const express = require("/Users/erimus/Library/pnpm/global/5/node_modules/express");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 6001;

// Middleware to parse JSON bodies
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Custom middleware to log request information
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.url}\n` +
      `body: ${JSON.stringify(req.body)}`
  );
  next();
});

// Endpoint to handle file read requests
app.post("/read-file", (req, res) => {
  console.log("req:", req);
  const filePath = req.body.filePath;
  console.log("filePath:", filePath);

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error(`Error reading file '${filePath}':`, err);
      res.status(500).json({ error: "Failed to read file" });
      return;
    }

    res.json({ content: data });
  });
});

// Endpoint to handle file write requests
app.post("/write-file", (req, res) => {
  const filePath = req.body.filePath;
  const content = req.body.content;

  fs.writeFile(filePath, content, "utf8", (err) => {
    if (err) {
      console.error(`Error writing file '${filePath}':`, err);
      res.status(500).json({ error: "Failed to write file" });
      return;
    }

    res.json({ success: true });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`An error occurred: ${err}`);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start the server
app.listen(port, () => {
  console.log(`Local server listening at http://localhost:${port}`);
});

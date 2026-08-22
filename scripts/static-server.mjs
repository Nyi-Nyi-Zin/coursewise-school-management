import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(directory, "public");
const port = Number(process.env.PORT || 3000);
const app = express();

app.use(express.static(publicDirectory, { index: "index.html", maxAge: "1h" }));
app.get("*", (_request, response) => response.sendFile(path.join(publicDirectory, "index.html")));
app.listen(port, "0.0.0.0");

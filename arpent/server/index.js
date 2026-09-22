"use strict";

const path = require("path");
const express = require("express");
const cors = require("cors");
const searchRouter = require("./routes/search");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api", searchRouter);

app.use("/vendor/leaflet", express.static(path.join(__dirname, "..", "node_modules", "leaflet", "dist")));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Arpent en écoute sur http://localhost:${PORT}`);
});

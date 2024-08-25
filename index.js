const dotenv = require("dotenv");
const express = require("express");
const connectDB = require("./config/db");
const morgan = require("morgan");
const cors = require("cors");
const app = express();
const authRoute = require("./routes/user");
const postRoute = require("./routes/post");
const commentRoute = require("./routes/comment");
dotenv.config();
connectDB();

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/comment", commentRoute);

PORT = 8080;
app.listen(8080, (req, res) => {
  console.log(`Server is running on port ${PORT}`);
});

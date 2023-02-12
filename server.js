const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const { DATABASE, DATABASE_LOGIN } = require('./config');
const app = express();

// db
mongoose.set("strictQuery", false);
mongoose.connect(DATABASE, DATABASE_LOGIN)
    .then(() => {
        console.log("DB connected.");
        app.listen(8000, () => {
            console.log("server running on port 8000");
        });
    })
    .catch(err => console.log(err));

// middlewares
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

// routes middlewares
app.use("/api", authRoutes);

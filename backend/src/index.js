import express from "express";
import dotenv from "dotenv";
import fs from "fs";

import { connectDB } from "./lib/db.js";
import { clerkMiddleware } from "@clerk/express";
import fileUpload from "express-fileupload";
import path from "path"; 
import cors from "cors";
import { createServer } from "http";

import cron from "node-cron";

import { initializeSocket } from "./lib/socket.js";

import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import songRoutes from "./routes/songRoutes.js";
import albumRoutes from "./routes/albumRoutes.js";
import statsRoutes from "./routes/statsRouts.js";


const __dirname = path.resolve();
const app = express();

dotenv.config();

const PORT = process.env.PORT || 5001;

//for building socket server on top of express
const httpServer = createServer(app);
initializeSocket(httpServer);

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));

const tempDir = path.join(process.cwd(), "tmp");
// Ensure the temporary directory exists
//cron jobs
cron.schedule("0 0 * * *", () => {
    if(fs.existsSync(tempDir)) {
        fs.readdir(tempDir, (err, files) => {
            if (err) {
                console.log("error", err);
                return;
            }
        for(const file of files) {
            fs.unlink(path.join(tempDir, file), (err) => {
                
            });
        }
        });
    }
});

app.use(express.json());   //to parse req.body
app.use(clerkMiddleware());   // this will add auth to req obj => req.auth.userId
app.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: path.join(__dirname, "tmp"),
        createParentPath: true,
        limits: {
            fileSize: 10 * 1024 * 1024, //10MB max file size
        },
    })
);

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/stats", statsRoutes);

if(process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));
    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "../frontend/dist/index.html"));
    });
}

//error handler
app.use((err,req,res,next) => {
    res.status(500).json({message: process.env.NODE_ENV === "production" ? "Internal server prror": err.message });
});


httpServer.listen(PORT, () => {
    console.log(`server is running at ${PORT}`);
    connectDB();
});


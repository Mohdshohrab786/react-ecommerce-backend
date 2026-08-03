const mongoose = require("mongoose");

const connectDB = async() => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB Connected");
    } catch (error) {
        console.log("Database connection failed. Running server in Local Mock Mode.");
        console.log("Mongoose Connection Error: " + error.message);
        // Do not crash the server process
    }
};

module.exports = connectDB;
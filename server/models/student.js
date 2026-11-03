
const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        rollNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        course: {
            type: String,
            required: true,
            trim: true
        },
        year: {
            type: Number,
            required: true
        },
        email: {
            type: String,
            sparse: true,
            unique: true,
            trim: true,
            lowercase: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);

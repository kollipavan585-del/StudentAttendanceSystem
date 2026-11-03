
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true
        },
        date: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["Present", "Absent", "Late"],
            required: true
        }
    },
    { timestamps: true }
);

attendanceSchema.index(
    { student: 1, date: 1 },
    { unique: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);

import { Schema, model, models } from "mongoose";

const TaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    isMock: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

export const Task = models.Task || model("Task", TaskSchema);

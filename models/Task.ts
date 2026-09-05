import { Schema, model, models } from "mongoose";

const TaskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    isMock: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

TaskSchema.index({ userId: 1, archivedAt: 1, createdAt: -1 });

export const Task = models.Task || model("Task", TaskSchema);

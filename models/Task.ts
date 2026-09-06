import { Schema, model, models, deleteModel } from "mongoose";

const TaskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    isMock: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

TaskSchema.index({ userId: 1, archivedAt: 1, createdAt: -1 });

// Hot reload retains Mongoose models even after this module's schema changes.
// Recompile the pre-projectId model so strict writes cannot drop the new field.
if (models.Task && (models.Task.schema.path("projectId")?.instance !== "ObjectId" || models.Task.schema.path("project"))) {
  deleteModel("Task");
}

export const Task = models.Task || model("Task", TaskSchema);

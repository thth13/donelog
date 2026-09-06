import { Schema, model, models } from "mongoose";

const ProjectSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  key: { type: String, required: true }
}, { timestamps: true });
ProjectSchema.index({ userId: 1, key: 1 }, { unique: true });

export const Project = models.Project || model("Project", ProjectSchema);

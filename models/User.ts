import { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  login: { type: String, required: true, unique: true },
  secretHash: { type: String, required: true, unique: true, select: false }
}, { timestamps: true });

export const User = models.User || model("User", UserSchema);

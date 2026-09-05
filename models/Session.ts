import { Schema, model, models } from "mongoose";

const SessionSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  encryptedSecret: { type: String, select: false },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  expiresAt: { type: Date, required: true, expires: 0 }
}, { timestamps: true });

export const Session = models.Session || model("Session", SessionSchema);

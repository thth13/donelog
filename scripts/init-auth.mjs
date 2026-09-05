import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import mongoose from "mongoose";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const keyPath = new URL("../.donelog-owner-key.json", import.meta.url);
const hash = value => createHash("sha256").update(value).digest("hex");
if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI in .env.local or .env before running auth:init.");

try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const users = mongoose.connection.collection("users");
  await users.createIndex({ login: 1 }, { unique: true });
  await users.createIndex({ secretHash: 1 }, { unique: true });
  let owner = await users.findOne({ login: "thth13" });
  if (!owner) {
    let secret;
    try {
      const saved = JSON.parse(await readFile(keyPath, "utf8"));
      if (saved.login !== "thth13" || !/^done_[a-f0-9]{64}$/.test(saved.secret)) throw new Error("Invalid owner key file.");
      secret = saved.secret;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      secret = `done_${randomBytes(32).toString("hex")}`;
      // Write before creating the account so an interrupted run cannot lose its key.
      await writeFile(keyPath, JSON.stringify({ login: "thth13", secret }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    }
    await users.updateOne({ login: "thth13" }, { $setOnInsert: {
      login: "thth13", secretHash: hash(secret), createdAt: new Date(), updatedAt: new Date()
    } }, { upsert: true });
    owner = await users.findOne({ login: "thth13" });
    if (owner.secretHash !== hash(secret)) throw new Error("Owner already has a different key. No credentials were changed.");
    console.log("Created thth13. Secret key saved in .donelog-owner-key.json (keep this file private).");
  } else {
    console.log("thth13 already exists. Its secret key is unchanged.");
  }
  // null matches missing fields too. Existing ownership and timestamps are preserved.
  const result = await mongoose.connection.collection("tasks").updateMany(
    { userId: null }, { $set: { userId: owner._id } }
  );
  await mongoose.connection.collection("tasks").createIndex({ userId: 1, archivedAt: 1, createdAt: -1 });
  await mongoose.connection.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true });
  await mongoose.connection.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  console.log(`Assigned ${result.modifiedCount} existing tasks (including archived entries) to thth13.`);
} catch {
  console.error("Auth initialization failed. Check database connectivity and permissions, then rerun npm run auth:init. Existing keys and task ownership are preserved.");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

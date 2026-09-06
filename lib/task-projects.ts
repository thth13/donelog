import { Types } from "mongoose";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";

export async function ensureProject(userId: string, name: string) {
  const filter = { userId, key: name.toLowerCase() };
  try {
    return await Project.findOneAndUpdate(filter, { $setOnInsert: { name } }, { upsert: true, new: true, runValidators: true });
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== 11000) throw error;
    const project = await Project.findOne(filter);
    if (!project) throw error;
    return project;
  }
}

// Upgrade entries from the initial name-based implementation in place.
// Tasks stay in the tasks collection, including archived entries.
export async function migrateTaskProjects(userId: string) {
  const owner = new Types.ObjectId(userId);
  const names = await Task.collection.distinct("project", { userId: owner, projectId: null });
  for (const value of names) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > 80) continue;
    const project = await ensureProject(userId, value.trim());
    await Task.collection.updateMany(
      { userId: owner, projectId: null, project: value },
      { $set: { projectId: project._id }, $unset: { project: "" } }
    );
  }
  await Task.collection.updateMany(
    { userId: owner, project: { $exists: true }, $or: [{ projectId: { $ne: null } }, { project: "" }] },
    { $unset: { project: "" } }
  );
}

export function validProjectInput(body: { projectId?: unknown; project?: unknown }) {
  if (body.projectId !== undefined) return body.projectId === null || (typeof body.projectId === "string" && /^[a-f0-9]{24}$/.test(body.projectId));
  return body.project === undefined || (typeof body.project === "string" && body.project.trim().length <= 80);
}

export async function resolveTaskProject(userId: string, body: { projectId?: string | null; project?: string }) {
  if (body.projectId) {
    const project = await Project.findOne({ _id: body.projectId, userId }).select("_id");
    if (!project) return undefined;
    return project._id as Types.ObjectId;
  }
  // Accept pending tasks from older browser tabs without losing their project.
  if (body.projectId === undefined && body.project?.trim()) {
    return (await ensureProject(userId, body.project.trim()))._id as Types.ObjectId;
  }
  return null;
}

// The name is response-only display data; tasks persist only projectId.
export async function withProjectNames<T extends { projectId?: unknown }>(userId: string, tasks: T[]) {
  const ids = tasks.flatMap(task => task.projectId ? [task.projectId] : []);
  const projects = await Project.find({ userId, _id: { $in: ids } }).select("name").lean();
  const names = new Map(projects.map(project => [String(project._id), String(project.name)]));
  return tasks.map(task => ({ ...task, project: names.get(String(task.projectId)) || "" }));
}

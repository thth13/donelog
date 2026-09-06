import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { authorizeTaskRequest } from "@/lib/auth";
import { Task, TaskCollection } from "@/models/Task";
import { migrateTaskProjects, resolveTaskProject, validProjectInput, withProjectNames } from "@/lib/task-projects";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await authorizeTaskRequest(request);
    if (user instanceof NextResponse) return user;
    await migrateTaskProjects(user.id);
    const tasks = await Task.find({ userId: user.id, archivedAt: null }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(await withProjectNames(user.id, tasks));
  } catch {
    return NextResponse.json({ error: "Could not load tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "Enter a task" }, { status: 400 });
    if (title.length > 300) return NextResponse.json({ error: "Maximum 300 characters" }, { status: 400 });
    if (!validProjectInput(body)) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 });
    }
    if (body._id !== undefined && (typeof body._id !== "string" || !/^[a-f0-9]{24}$/.test(body._id))) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }
    if (body.createdAt !== undefined && (typeof body.createdAt !== "string" || !Number.isFinite(Date.parse(body.createdAt)))) {
      return NextResponse.json({ error: "Invalid task date" }, { status: 400 });
    }
    const user = await authorizeTaskRequest(request);
    if (user instanceof NextResponse) return user;
    await migrateTaskProjects(user.id);
    const projectId = await resolveTaskProject(user.id, body);
    if (projectId === undefined) return NextResponse.json({ error: "Project not found" }, { status: 400 });
    const values = { userId: user.id, title, projectId, createdAt: body.createdAt ? new Date(body.createdAt) : new Date() };
    let task;
    if (body._id) {
      // The built-in unique _id index deduplicates retries, including concurrent tabs.
      const _id = new Types.ObjectId(body._id);
      try {
        task = await Task.findOneAndUpdate({ _id, userId: user.id }, { $setOnInsert: { ...values, isMock: false, updatedAt: new Date() } },
          { upsert: true, new: true, runValidators: true, timestamps: false }).lean();
      } catch (error) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== 11000) throw error;
        task = await Task.findOne({ _id, userId: user.id }).lean();
      }
      if (!task) return NextResponse.json({ error: "Task ID conflict" }, { status: 409 });
      // Recover a queued insert whose projectId was dropped by the stale schema.
      // Match the original task and never replace an explicit projectId (even null).
      if (projectId && task.projectId === undefined && task.title === title && body.createdAt) {
        const recovered = await TaskCollection.findOneAndUpdate(
          { _id, userId: new Types.ObjectId(user.id), title, createdAt: values.createdAt,
            archivedAt: null, projectId: { $exists: false } },
          { $set: { projectId }, $unset: { project: "" } },
          { returnDocument: "after", includeResultMetadata: false }
        );
        // A concurrent retry may already have restored this same task.
        task = recovered || await Task.findOne({ _id, userId: user.id }).lean();
      }
      if (!task || task.title !== title || String(task.projectId || "") !== String(projectId || "")) return NextResponse.json({ error: "Task ID conflict" }, { status: 409 });
    } else {
      task = (await Task.create(values)).toObject();
    }
    return NextResponse.json((await withProjectNames(user.id, [task]))[0], { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save task" }, { status: 500 });
  }
}

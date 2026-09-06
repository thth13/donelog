import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { authorizeTaskRequest } from "@/lib/auth";
import { Task } from "@/models/Task";
import { migrateTaskProjects, resolveTaskProject, validProjectInput, withProjectNames } from "@/lib/task-projects";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 300) return NextResponse.json({ error: "Enter a task title of up to 300 characters." }, { status: 400 });
  if (typeof body.createdAt !== "string" || !Number.isFinite(Date.parse(body.createdAt))) {
    return NextResponse.json({ error: "Enter a valid date and time." }, { status: 400 });
  }
  try {
    const user = await authorizeTaskRequest(request);
    if (user instanceof NextResponse) return user;
    if (!validProjectInput(body)) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 });
    }
    await migrateTaskProjects(user.id);
    const changesProject = body.projectId !== undefined || body.project !== undefined;
    const projectId = changesProject ? await resolveTaskProject(user.id, body) : null;
    if (projectId === undefined) return NextResponse.json({ error: "Project not found" }, { status: 400 });
    // createdAt is the user-editable completion time. Use the collection directly
    // because Mongoose's timestamps make createdAt immutable in model updates.
    const task = await Task.collection.findOneAndUpdate(
      { _id: new Types.ObjectId(id), userId: new Types.ObjectId(user.id), archivedAt: null },
      { $set: { title, ...(changesProject ? { projectId } : {}), createdAt: new Date(body.createdAt), updatedAt: new Date() } },
      { returnDocument: "after", includeResultMetadata: false }
    );
    if (!task) return NextResponse.json({ error: "This task is no longer available." }, { status: 404 });
    return NextResponse.json((await withProjectNames(user.id, [task]))[0]);
  } catch {
    return NextResponse.json({ error: "Could not save changes. Please try again." }, { status: 500 });
  }
}

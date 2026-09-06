import { NextResponse } from "next/server";
import { authorizeTaskRequest } from "@/lib/auth";
import { Project } from "@/models/Project";
import { ensureProject, migrateTaskProjects } from "@/lib/task-projects";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await authorizeTaskRequest(request);
    if (user instanceof NextResponse) return user;
    await migrateTaskProjects(user.id);
    const projects = await Project.find({ userId: user.id }).select("name").sort({ name: 1 }).lean();
    return NextResponse.json(projects.map(project => ({ _id: String(project._id), name: project.name })));
  } catch {
    return NextResponse.json({ error: "Could not load projects." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) return NextResponse.json({ error: "Enter a project name of up to 80 characters." }, { status: 400 });
  try {
    const user = await authorizeTaskRequest(request);
    if (user instanceof NextResponse) return user;
    const project = await ensureProject(user.id, name);
    return NextResponse.json({ _id: String(project._id), name: project.name }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create project. Please try again." }, { status: 500 });
  }
}

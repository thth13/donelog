import { NextResponse } from "next/server";
import { authorizeTaskRequest } from "@/lib/auth";
import { Task } from "@/models/Task";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }
  try {
    const user = await authorizeTaskRequest(request);
    if (user instanceof NextResponse) return user;
    const task = await Task.findOneAndUpdate(
      { _id: id, userId: user.id, archivedAt: null },
      { $set: { archivedAt: new Date() } },
      { new: true }
    ) || await Task.findOne({ _id: id, userId: user.id });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Could not delete task. Please try again." }, { status: 500 });
  }
}

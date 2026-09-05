import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Task } from "@/models/Task";

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
    await connectDB();
    // createdAt is the user-editable completion time. Use the collection directly
    // because Mongoose's timestamps make createdAt immutable in model updates.
    const task = await Task.collection.findOneAndUpdate(
      { _id: new Types.ObjectId(id), archivedAt: null },
      { $set: { title, createdAt: new Date(body.createdAt), updatedAt: new Date() } },
      { returnDocument: "after", includeResultMetadata: false }
    );
    if (!task) return NextResponse.json({ error: "This task is no longer available." }, { status: 404 });
    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Could not save changes. Please try again." }, { status: 500 });
  }
}

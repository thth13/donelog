import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Task } from "@/models/Task";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const tasks = await Task.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: "Could not load tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "Enter a task" }, { status: 400 });
    if (title.length > 300) return NextResponse.json({ error: "Maximum 300 characters" }, { status: 400 });
    await connectDB();
    const task = await Task.create({ title });
    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save task" }, { status: 500 });
  }
}

import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Task } from "@/models/Task";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const tasks = await Task.find({ archivedAt: null }).sort({ createdAt: -1 }).lean();
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
    if (body._id !== undefined && (typeof body._id !== "string" || !/^[a-f0-9]{24}$/.test(body._id))) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }
    if (body.createdAt !== undefined && (typeof body.createdAt !== "string" || !Number.isFinite(Date.parse(body.createdAt)))) {
      return NextResponse.json({ error: "Invalid task date" }, { status: 400 });
    }
    await connectDB();
    const values = { title, createdAt: body.createdAt ? new Date(body.createdAt) : new Date() };
    let task;
    if (body._id) {
      // The built-in unique _id index deduplicates retries, including concurrent tabs.
      const _id = new Types.ObjectId(body._id);
      try {
        task = await Task.findOneAndUpdate({ _id }, { $setOnInsert: { ...values, isMock: false, updatedAt: new Date() } },
          { upsert: true, new: true, runValidators: true, timestamps: false });
      } catch (error) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== 11000) throw error;
        task = await Task.findById(_id);
        if (!task) throw error;
      }
      if (task.title !== title) return NextResponse.json({ error: "Task ID conflict" }, { status: 409 });
    } else {
      task = await Task.create(values);
    }
    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save task" }, { status: 500 });
  }
}

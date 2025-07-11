import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const dbPath = path.resolve(process.cwd(), 'todos.json');

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  userId: string;
  dueDate?: string;
}

async function readTodos(): Promise<Todo[]> {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeTodos(todos: Todo[]) {
  await fs.writeFile(dbPath, JSON.stringify(todos, null, 2));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const todos = await readTodos();
  const userTodos = todos.filter(todo => todo.userId === session.user.id);
  return NextResponse.json(userTodos);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { text, dueDate } = await request.json();
  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  const todos = await readTodos();
  const newTodo: Todo = {
    id: Date.now(),
    text,
    completed: false,
    userId: session.user.id,
    dueDate,
  };
  const updatedTodos = [...todos, newTodo];
  await writeTodos(updatedTodos);
  return NextResponse.json(newTodo, { status: 201 });
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    const { id, text, completed, dueDate } = await request.json();
    const todos = await readTodos();
    const todoIndex = todos.findIndex(t => t.id === id && t.userId === session.user.id);
  
    if (todoIndex === -1) {
      return NextResponse.json({ error: 'Todo not found or not owned by user' }, { status: 404 });
    }
  
    const updatedTodo = { ...todos[todoIndex], text, completed, dueDate };
    const updatedTodos = [...todos];
    updatedTodos[todoIndex] = updatedTodo;
    await writeTodos(updatedTodos);
    return NextResponse.json(updatedTodo);
  }
  
  export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    const { id } = await request.json();
    const todos = await readTodos();
    const initialLength = todos.length;
    const updatedTodos = todos.filter(t => !(t.id === id && t.userId === session.user.id));
  
    if (updatedTodos.length === initialLength) {
      return NextResponse.json({ error: 'Todo not found or not owned by user' }, { status: 404 });
    }
  
    await writeTodos(updatedTodos);
    return new Response(null, { status: 204 });
  }
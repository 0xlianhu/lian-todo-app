
'use client';

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarIcon, Trash2, Pencil, Save, X } from 'lucide-react';
import { format } from 'date-fns';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  userId: string;
  dueDate?: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(true);
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editDueDate, setEditDueDate] = useState<Date | undefined>();

  const fetchTodos = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const res = await fetch('/api/todos');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        setTodos(data);
      }
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchTodos();
    }
  }, [status, session, router, fetchTodos]);

  const addTodo = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !session) return;
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, userId: session.user.id, dueDate: dueDate?.toISOString() }),
    });
    setText('');
    setDueDate(undefined);
    fetchTodos();
  };

  const toggleTodo = async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    await fetch('/api/todos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...todo, completed: !todo.completed }),
    });
    fetchTodos();
  };

  const deleteTodo = async (id: number) => {
    await fetch('/api/todos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchTodos();
  };

  const startEditing = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setEditText(todo.text);
    setEditDueDate(todo.dueDate ? new Date(todo.dueDate) : undefined);
  };

  const cancelEditing = () => {
    setEditingTodoId(null);
    setEditText('');
    setEditDueDate(undefined);
  };

  const saveEditing = async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (!todo || !editText.trim()) return;

    await fetch('/api/todos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...todo, text: editText, dueDate: editDueDate?.toISOString() }),
    });
    cancelEditing();
    fetchTodos();
  };

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return <LoadingSkeleton />;
  }

  if (!session) {
    return null;
  }

  const pendingTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Welcome, {session.user?.name}!</h1>
          <Button variant="outline" onClick={() => signOut({ callbackUrl: '/login' })}>Sign Out</Button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Add a New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addTodo} className="flex gap-4 items-start">
              <Input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What needs to be done?"
                className="flex-grow"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a due date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                </PopoverContent>
              </Popover>
              <Button type="submit">Add Task</Button>
            </form>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="mt-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All ({todos.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingTodos.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedTodos.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all"><TodoList todos={todos} toggleTodo={toggleTodo} deleteTodo={deleteTodo} startEditing={startEditing} editingTodoId={editingTodoId} editText={editText} setEditText={setEditText} editDueDate={editDueDate} setEditDueDate={setEditDueDate} cancelEditing={cancelEditing} saveEditing={saveEditing} /></TabsContent>
          <TabsContent value="pending"><TodoList todos={pendingTodos} toggleTodo={toggleTodo} deleteTodo={deleteTodo} startEditing={startEditing} editingTodoId={editingTodoId} editText={editText} setEditText={setEditText} editDueDate={editDueDate} setEditDueDate={setEditDueDate} cancelEditing={cancelEditing} saveEditing={saveEditing} /></TabsContent>
          <TabsContent value="completed"><TodoList todos={completedTodos} toggleTodo={toggleTodo} deleteTodo={deleteTodo} startEditing={startEditing} editingTodoId={editingTodoId} editText={editText} setEditText={setEditText} editDueDate={editDueDate} setEditDueDate={setEditDueDate} cancelEditing={cancelEditing} saveEditing={saveEditing} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

interface TodoListProps {
  todos: Todo[];
  toggleTodo: (id: number) => void;
  deleteTodo: (id: number) => void;
  startEditing: (todo: Todo) => void;
  editingTodoId: number | null;
  editText: string;
  setEditText: (text: string) => void;
  editDueDate: Date | undefined;
  setEditDueDate: (date: Date | undefined) => void;
  cancelEditing: () => void;
  saveEditing: (id: number) => void;
}

function TodoList({ todos, toggleTodo, deleteTodo, startEditing, editingTodoId, editText, setEditText, editDueDate, setEditDueDate, cancelEditing, saveEditing }: TodoListProps) {
  if (todos.length === 0) {
    return <p className="text-center text-gray-500 mt-8">No tasks here!</p>;
  }
  return (
    <ul className="space-y-3 mt-4">
      {todos.map(todo => (
        <li key={todo.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
          <div className="flex items-center gap-4 flex-grow">
            <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            {editingTodoId === todo.id ? (
              <div className="flex flex-col w-full">
                <Input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="mb-2"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-[240px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editDueDate ? format(editDueDate, "PPP") : <span>Pick a due date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={editDueDate} onSelect={setEditDueDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div>
                <span className={`${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>{todo.text}</span>
                {todo.dueDate && <p className="text-sm text-gray-500">Due: {format(new Date(todo.dueDate), 'PPP')}</p>}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {editingTodoId === todo.id ? (
              <>
                <Button variant="ghost" size="icon" onClick={() => saveEditing(todo.id)}>
                  <Save className="h-4 w-4 text-green-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={cancelEditing}>
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="icon" onClick={() => startEditing(todo)}>
                  <Pencil className="h-4 w-4 text-gray-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteTodo(todo.id)}>
                  <Trash2 className="h-4 w-4 text-gray-500" />
                </Button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card className="mb-8">
        <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
        <CardContent><Skeleton className="h-10 w-full" /></CardContent>
      </Card>
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

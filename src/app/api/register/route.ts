
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';

const usersPath = path.resolve(process.cwd(), 'users.json');

async function getUsers() {
  try {
    const data = await fs.readFile(usersPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const { name, email, password } = await request.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const users = await getUsers();
  const userExists = users.some((u: { email: string }) => u.email === email);

  if (userExists) {
    return NextResponse.json({ error: 'User already exists' }, { status: 409 });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    password: hashedPassword,
  };

  const updatedUsers = [...users, newUser];
  await fs.writeFile(usersPath, JSON.stringify(updatedUsers, null, 2));

  return NextResponse.json({ message: 'User created' }, { status: 201 });
}

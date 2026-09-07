import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const APP_LOGIN_ID = 'gold';
const APP_LOGIN_PASSWORD = '1234';

export async function POST(req: Request) {
  const { id, pw } = await req.json();

  if (id === APP_LOGIN_ID && pw === APP_LOGIN_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set('session', 'authenticated', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7日間
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}

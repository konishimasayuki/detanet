import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// ID/パスワードは環境変数(Vercelの Settings > Environment Variables)に設定する。
// APP_LOGIN_ID / APP_LOGIN_PASSWORD
// コード上には値を一切書かない。

export async function POST(req: Request) {
  const { id, pw } = await req.json();

  const validId = process.env.APP_LOGIN_ID;
  const validPw = process.env.APP_LOGIN_PASSWORD;

  if (!validId || !validPw) {
    // 環境変数が未設定の場合は安全側に倒して常に失敗させる
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (id === validId && pw === validPw) {
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

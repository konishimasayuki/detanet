'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pw }),
    });

    setLoading(false);

    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      setError(true);
    }
  }

  return (
    <div className="login-wrapper">
      <form onSubmit={handleSubmit} className="login-card">
        <h1 className="login-title">ログイン</h1>
        <input
          className="login-input"
          type="text"
          placeholder="ID"
          value={id}
          onChange={(e) => setId(e.target.value)}
          autoComplete="off"
        />
        <input
          className="login-input"
          type="password"
          placeholder="パスワード"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {error && <p className="login-error">IDまたはパスワードが違います</p>}
        <button className="login-button" type="submit" disabled={loading}>
          {loading ? '確認中...' : 'ログイン'}
        </button>
      </form>
    </div>
  );
}

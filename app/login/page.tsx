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
    <div style={styles.wrapper}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>ログイン</h1>
        <input
          style={styles.input}
          type="text"
          placeholder="ID"
          value={id}
          onChange={(e) => setId(e.target.value)}
          autoComplete="off"
        />
        <input
          style={styles.input}
          type="password"
          placeholder="パスワード"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {error && <p style={styles.error}>IDまたはパスワードが違います</p>}
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? '確認中...' : 'ログイン'}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f2f2f2',
  },
  card: {
    background: '#fff',
    padding: '40px 32px',
    borderRadius: 8,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    width: 300,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  title: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    padding: '10px 12px',
    fontSize: 15,
    border: '1px solid #ccc',
    borderRadius: 4,
  },
  button: {
    marginTop: 8,
    padding: '10px 12px',
    fontSize: 15,
    fontWeight: 600,
    background: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  error: {
    color: '#c0392b',
    fontSize: 13,
    margin: 0,
  },
};

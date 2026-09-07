'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function NavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="nav-menu">
      <button
        className="nav-hamburger"
        onClick={() => setOpen((v) => !v)}
        aria-label="メニュー"
      >
        <span />
        <span />
        <span />
      </button>

      {open && (
        <>
          <div className="nav-overlay" onClick={() => setOpen(false)} />
          <nav className="nav-drawer">
            <Link href="/" className="nav-link" onClick={() => setOpen(false)}>
              狙い台リスト
            </Link>
            <Link href="/settings" className="nav-link" onClick={() => setOpen(false)}>
              機種設定
            </Link>
          </nav>
        </>
      )}
    </div>
  );
}

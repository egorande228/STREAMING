'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.endsWith('/login')) {
      const token = localStorage.getItem('wc26_admin_token');
      if (!token) router.push('/admin/login');
    }
  }, [pathname, router]);

  if (pathname.endsWith('/login')) return <>{children}</>;

  function logout() {
    localStorage.removeItem('wc26_admin_token');
    router.push('/admin/login');
  }

  const navItems = [
    { href: '/admin/matches', label: 'Matches' },
    { href: '/admin/streams', label: 'Streams' },
    { href: '/admin/streams/launch', label: 'Launch Stream' },
    { href: '/admin/mirrors', label: 'Mirrors' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-48 bg-gray-900 flex flex-col py-6 px-4 gap-2 shrink-0">
        <div className="text-white font-bold text-lg mb-4">WC2026 Admin</div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 rounded text-sm font-medium ${
              pathname.startsWith(item.href)
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {item.label}
          </Link>
        ))}
        <div className="mt-auto">
          <button onClick={logout} className="text-gray-500 hover:text-red-400 text-sm px-3 py-2">
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}

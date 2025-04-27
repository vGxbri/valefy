'use client'

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();

  return (
    <div>
      <button
            className="text-text/80 hover:bg-primary/10 hover:text-text px-4 py-2 rounded-xl transition-all"
            onClick={() => signOut().then(() => router.push('/'))}

          >
            Cerrar sesión
      </button>
    </div>
  )
}

'use client';

import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

export function PlReturnLink() {
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    fetch('/api/pl/session', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<{ returnPath?: unknown }> : null)
      .then((body) => {
        if (!current || typeof body?.returnPath !== 'string') return;
        const plOrigin = process.env.NEXT_PUBLIC_PL_APP_BASE_URL?.trim().replace(/\/$/, '');
        if (plOrigin) setReturnUrl(`${plOrigin}${body.returnPath}`);
      })
      .catch(() => undefined);
    return () => { current = false; };
  }, []);

  if (!returnUrl) return null;
  return (
    <a
      href={returnUrl}
      className="shrink-0 inline-flex h-9 items-center gap-2 rounded-full border border-gray-200/70 bg-white/70 px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-white dark:border-gray-700/70 dark:bg-gray-800/70 dark:text-gray-200 dark:hover:bg-gray-800"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Return to PL
    </a>
  );
}

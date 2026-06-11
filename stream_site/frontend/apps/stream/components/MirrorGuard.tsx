'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';

// Fetches the mirrors list and redirects to the primary mirror if current
// hostname is not the primary one. This handles ISP-level domain bans:
// if this domain gets blocked, operator marks another mirror as primary in
// the admin panel, and users who somehow load the page are bounced there.
export default function MirrorGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    api.mirrors.list().then(({ mirrors }) => {
      const primary = mirrors.find((m) => m.is_primary && m.health_status === 'healthy' && m.is_active)
        ?? mirrors.find((m) => m.is_active && m.health_status === 'healthy');

      if (!primary) return;

      const currentHost = window.location.hostname;
      // Normalise: strip www.
      const normalize = (h: string) => h.replace(/^www\./, '');

      if (normalize(currentHost) !== normalize(primary.domain)) {
        const target = `https://${primary.domain}${window.location.pathname}${window.location.search}`;
        window.location.replace(target);
      }
    }).catch(() => {
      // Mirrors unreachable — stay on current domain
    });
  }, []);

  return null;
}

'use client';

import React, { useEffect, useMemo, useState } from 'react';

interface Props {
  scheduledAt: string;
  className?: string;
  style?: React.CSSProperties;
  startingNowLabel?: string;
}

function formatCountdown(ms: number, startingNowLabel: string): string {
  if (ms <= 0) return startingNowLabel;

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export default function LiveCountdown({
  scheduledAt,
  className = '',
  style,
  startingNowLabel = 'Starting now',
}: Props) {
  const targetMs = useMemo(() => new Date(scheduledAt).getTime(), [scheduledAt]);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (Number.isNaN(targetMs)) return null;

  const diff = targetMs - nowMs;
  return <span className={className} style={style}>{formatCountdown(diff, startingNowLabel)}</span>;
}

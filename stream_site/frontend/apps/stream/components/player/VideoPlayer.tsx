'use client';

import { useEffect, useRef, useState } from 'react';
import type { Stream } from '@/lib/api';
import { useTranslations } from 'next-intl';

interface Props {
  streams: Stream[];
  preferredLang?: string;
  preferredRegion?: string;
  compact?: boolean;
}

function resolveClientStreamUrl(rawUrl: string): string {
  if (typeof window === 'undefined') return rawUrl;
  if (!rawUrl || rawUrl.startsWith('/')) return rawUrl;

  try {
    const url = new URL(rawUrl);
    if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(url.hostname)) {
      url.protocol = window.location.protocol;
      url.hostname = window.location.hostname;
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

export default function VideoPlayer({ streams, preferredLang = 'en', preferredRegion = 'global', compact = false }: Props) {
  const tPlayer = useTranslations('player');
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import('hls.js').default | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [langFilter, setLangFilter] = useState(preferredLang);
  const [qualityLevels, setQualityLevels] = useState<{ height: number; index: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = auto

  // Sort streams: preferred lang first, then region, then by priority
  const sorted = [...streams].sort((a, b) => {
    const aLang = a.language_code === langFilter ? 0 : 1;
    const bLang = b.language_code === langFilter ? 0 : 1;
    if (aLang !== bLang) return aLang - bLang;
    const aRegion = a.region === preferredRegion || a.region === 'global' ? 0 : 1;
    const bRegion = b.region === preferredRegion || b.region === 'global' ? 0 : 1;
    if (aRegion !== bRegion) return aRegion - bRegion;
    return b.priority - a.priority;
  });

  const filteredByLang = sorted.filter((s) => s.language_code === langFilter);
  const displayed = filteredByLang.length > 0 ? filteredByLang : sorted;
  const activeStream = displayed[activeIdx] ?? null;
  const activeSourceType = activeStream?.source_type ?? 'hls';
  const activeStreamUrl = activeStream ? resolveClientStreamUrl(activeStream.url) : null;

  const uniqueLangs = Array.from(new Set(streams.map((s) => s.language_code)));

  useEffect(() => {
    setActiveIdx(0);
  }, [langFilter, streams]);

  useEffect(() => {
    if (!activeStream) return;

    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (activeSourceType === 'iframe') {
      setQualityLevels([]);
      setCurrentLevel(-1);
      return;
    }

    if (!videoRef.current) return;

    const video = videoRef.current;
    const url = activeStreamUrl;

    if (!url) return;

    const tryNextSource = () => {
      if (activeIdx < displayed.length - 1) {
        setActiveIdx((i) => i + 1);
      }
    };

    // Safari native HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.play().catch(() => {});
      return;
    }

    // HLS.js
    import('hls.js').then(({ default: Hls }) => {
      if (!Hls.isSupported()) {
        video.src = url;
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 1,
        liveMaxLatencyDurationCount: 2,
        maxLiveSyncPlaybackRate: 2,
        backBufferLength: 20,
        maxBufferLength: 6,
      });
      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setQualityLevels(
          data.levels.map((l, i) => ({ height: l.height ?? 0, index: i }))
        );
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) tryNextSource();
      });
    });

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [activeIdx, activeSourceType, activeStream, activeStreamUrl, displayed.length]);

  const setQuality = (level: number) => {
    setCurrentLevel(level);
    if (hlsRef.current) hlsRef.current.currentLevel = level;
  };

  if (!activeStream) {
    return (
      <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center text-gray-500">
        {tPlayer('noStreams')}
      </div>
    );
  }

  return (
    <div className={compact ? 'h-full w-full bg-black' : 'w-full'}>
      <div
        className={compact ? 'relative h-full w-full overflow-hidden bg-black' : 'relative aspect-video overflow-hidden group rounded-[24px]'}
        style={{
          background: '#000',
          border: compact ? '0' : '1px solid var(--outline-subtle)',
          boxShadow: compact ? 'none' : '0 28px 60px rgba(0,0,0,0.36)',
        }}
      >
        {activeSourceType === 'iframe' ? (
          <iframe
            src={activeStreamUrl ?? activeStream.url}
            title={activeStream.label || 'Video player'}
            className="h-full w-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          />
        ) : (
          <video
            ref={videoRef}
            className="h-full w-full"
            controls
            playsInline
          />
        )}
      </div>

      {/* Controls */}
      {!compact && <div className="mt-3 flex flex-wrap gap-2 items-center">
        {/* Language selector */}
        {uniqueLangs.length > 1 && (
          <div className="flex items-center gap-1 rounded-xl px-2.5 py-1.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--outline-subtle)' }}>
            <span className="text-xs" style={{ color: 'var(--text-mid)' }}>{tPlayer('language')}:</span>
            <select
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value)}
              className="bg-transparent text-xs outline-none cursor-pointer"
              style={{ color: 'var(--text-hi)' }}
            >
              {uniqueLangs.map((l) => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}

        {/* Stream source selector */}
        {displayed.length > 1 && (
          <div className="flex items-center gap-1 rounded-xl px-2.5 py-1.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--outline-subtle)' }}>
            <span className="text-xs" style={{ color: 'var(--text-mid)' }}>{tPlayer('source')}:</span>
            <select
              value={activeIdx}
              onChange={(e) => setActiveIdx(Number(e.target.value))}
              className="bg-transparent text-xs outline-none cursor-pointer"
              style={{ color: 'var(--text-hi)' }}
            >
              {displayed.map((s, i) => (
                <option key={s.id} value={i}>{s.label || s.quality}</option>
              ))}
            </select>
          </div>
        )}

        {/* Quality selector */}
        {activeSourceType === 'hls' && qualityLevels.length > 1 && (
          <div className="flex items-center gap-1 rounded-xl px-2.5 py-1.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--outline-subtle)' }}>
            <span className="text-xs" style={{ color: 'var(--text-mid)' }}>{tPlayer('quality')}:</span>
            <select
              value={currentLevel}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="bg-transparent text-xs outline-none cursor-pointer"
              style={{ color: 'var(--text-hi)' }}
            >
              <option value={-1}>{tPlayer('auto')}</option>
              {qualityLevels.map((l) => (
                <option key={l.index} value={l.index}>{l.height}p</option>
              ))}
            </select>
          </div>
        )}

        {/* Active stream label */}
        <span className="ml-auto text-xs truncate max-w-xs" style={{ color: 'var(--primary)' }}>
          {activeStream.label || `${activeStream.language_code.toUpperCase()} · ${activeStream.quality}`}
        </span>
      </div>}
    </div>
  );
}

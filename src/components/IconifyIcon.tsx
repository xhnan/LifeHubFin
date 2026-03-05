import React, { useEffect, useState, useRef } from 'react';
import { Text } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface IconifyIconProps {
  icon: string;
  size?: number;
  color?: string;
  fallback?: string;
}

// Cache raw SVG (without color baked in) so color changes don't re-fetch
const svgRawCache = new Map<string, string>();
// Track ongoing fetches to avoid parallel requests for the same icon
const pendingFetches = new Map<string, Promise<string>>();
// Track failed icons with retry count
const failCount = new Map<string, number>();
const MAX_RETRIES = 3;

function fetchIconSvg(icon: string): Promise<string> {
  // Return cached
  if (svgRawCache.has(icon)) return Promise.resolve(svgRawCache.get(icon)!);

  // Return pending
  if (pendingFetches.has(icon)) return pendingFetches.get(icon)!;

  // Check retry limit
  const fails = failCount.get(icon) || 0;
  if (fails >= MAX_RETRIES) return Promise.reject(new Error('max retries'));

  const [prefix, ...rest] = icon.split(':');
  const name = rest.join(':');
  const url = `https://api.iconify.design/${prefix}/${name}.svg`;

  const promise = fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then(svg => {
      svgRawCache.set(icon, svg);
      pendingFetches.delete(icon);
      failCount.delete(icon); // Reset fails on success
      return svg;
    })
    .catch(err => {
      pendingFetches.delete(icon);
      failCount.set(icon, fails + 1);
      throw err;
    });

  pendingFetches.set(icon, promise);
  return promise;
}

function applySvgColor(rawSvg: string, color: string): string {
  // Replace fill="currentColor" with the actual color
  return rawSvg.replace(/fill="currentColor"/g, `fill="${color}"`);
}

const IconifyIcon = ({ icon, size = 24, color, fallback = '📌' }: IconifyIconProps) => {
  const [svgXml, setSvgXml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const mountedRef = useRef(true);

  const isIconify = icon && icon.includes(':');

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load SVG when icon changes
  useEffect(() => {
    if (!isIconify) return;

    // Check cache immediately (sync)
    const cached = svgRawCache.get(icon);
    if (cached) {
      setSvgXml(color ? applySvgColor(cached, color) : cached);
      setFailed(false);
      return;
    }

    // Reset state
    setSvgXml(null);
    setFailed(false);

    fetchIconSvg(icon)
      .then(raw => {
        if (!mountedRef.current) return;
        setSvgXml(color ? applySvgColor(raw, color) : raw);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setFailed(true);
      });
  }, [icon]); // Only re-fetch when icon itself changes

  // When color changes, just re-apply from cache (no re-fetch)
  useEffect(() => {
    if (!isIconify) return;
    const cached = svgRawCache.get(icon);
    if (cached) {
      setSvgXml(color ? applySvgColor(cached, color) : cached);
    }
  }, [color]);

  // Non-iconify format: render as text
  if (!isIconify) {
    return (
      <Text style={{ fontSize: size * 0.8, color: color || undefined }}>
        {icon || fallback}
      </Text>
    );
  }

  if (failed) {
    return (
      <Text style={{ fontSize: size * 0.8, color: color || undefined }}>
        {fallback}
      </Text>
    );
  }

  if (!svgXml) {
    // Show fallback while loading (not an error — still loading)
    return (
      <Text style={{ fontSize: size * 0.8, color: color || undefined, opacity: 0.3 }}>
        {fallback}
      </Text>
    );
  }

  return <SvgXml xml={svgXml} width={size} height={size} />;
};

export default IconifyIcon;

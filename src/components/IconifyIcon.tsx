import React, {useEffect, useState} from 'react';
import {Text} from 'react-native';
import {SvgXml} from 'react-native-svg';

interface IconifyIconProps {
  icon: string;
  size?: number;
  color?: string;
  fallback?: string;
}

const svgCache = new Map<string, string>();
const failedCache = new Set<string>();

const IconifyIcon = ({icon, size = 24, color, fallback = '📌'}: IconifyIconProps) => {
  const [svgXml, setSvgXml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const isIconify = icon && icon.includes(':');
  const cacheKey = `${icon}_${color || ''}`;

  useEffect(() => {
    if (!isIconify) return;
    if (failedCache.has(icon)) {
      setFailed(true);
      return;
    }
    if (svgCache.has(cacheKey)) {
      setSvgXml(svgCache.get(cacheKey)!);
      return;
    }

    const [prefix, ...rest] = icon.split(':');
    const name = rest.join(':');
    const colorParam = color ? `?color=${encodeURIComponent(color)}` : '';
    const url = `https://api.iconify.design/${prefix}/${name}.svg${colorParam}`;

    let cancelled = false;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('fetch failed');
        return res.text();
      })
      .then(svg => {
        if (cancelled) return;
        svgCache.set(cacheKey, svg);
        setSvgXml(svg);
      })
      .catch(() => {
        if (cancelled) return;
        failedCache.add(icon);
        setFailed(true);
      });

    return () => { cancelled = true; };
  }, [icon, color, isIconify, cacheKey]);

  // 非 iconify 格式，显示文本
  if (!isIconify) {
    return (
      <Text style={{fontSize: size * 0.8, color: color || undefined}}>
        {icon || fallback}
      </Text>
    );
  }

  if (failed || failedCache.has(icon)) {
    return (
      <Text style={{fontSize: size * 0.8, color: color || undefined}}>
        {fallback}
      </Text>
    );
  }

  if (!svgXml) {
    return (
      <Text style={{fontSize: size * 0.8, color: color || undefined}}>
        {fallback}
      </Text>
    );
  }

  return <SvgXml xml={svgXml} width={size} height={size} />;
};

export default IconifyIcon;

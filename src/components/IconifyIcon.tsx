import React, {useEffect, useState} from 'react';
import {Image, Text} from 'react-native';

interface IconifyIconProps {
  icon: string;
  size?: number;
  color?: string;
  fallback?: string;
}

// 内存缓存，避免重复请求
const uriCache: Record<string, string> = {};

function buildSvgDataUri(svg: string, color?: string): string {
  let processed = svg;
  if (color) {
    processed = processed.replace(/currentColor/g, color);
  }
  // 编码为 data URI
  const encoded = encodeURIComponent(processed)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
}

/**
 * 渲染 Iconify 图标（纯 JS，无原生 SVG 依赖）。
 * 接受 "prefix:name" 格式（如 "mdi:cash"），通过 Iconify API 获取 SVG，
 * 转为 data URI 用 Image 渲染。
 * 不含 ":" 则当作 emoji 回退。
 */
const IconifyIcon = ({icon, size = 24, color, fallback = '📌'}: IconifyIconProps) => {
  const cacheKey = `${icon}_${color || ''}`;
  const [uri, setUri] = useState<string | null>(uriCache[cacheKey] || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!icon || !icon.includes(':')) {
      return;
    }
    if (uriCache[cacheKey]) {
      setUri(uriCache[cacheKey]);
      return;
    }

    setFailed(false);
    const [prefix, name] = icon.split(':');
    fetch(`https://api.iconify.design/${prefix}/${name}.svg`)
      .then(res => {
        if (!res.ok) throw new Error('not found');
        return res.text();
      })
      .then(svg => {
        const dataUri = buildSvgDataUri(svg, color);
        uriCache[cacheKey] = dataUri;
        setUri(dataUri);
      })
      .catch(() => setFailed(true));
  }, [icon, color, cacheKey]);

  // 非 Iconify 格式或加载失败，显示 fallback
  if (!icon || !icon.includes(':') || failed) {
    return <Text style={{fontSize: size * 0.8}}>{icon && !icon.includes(':') ? icon : fallback}</Text>;
  }

  if (!uri) {
    // 加载中，显示占位
    return <Text style={{fontSize: size * 0.8}}>{fallback}</Text>;
  }

  return (
    <Image
      source={{uri}}
      style={{width: size, height: size}}
      resizeMode="contain"
    />
  );
};

export default IconifyIcon;

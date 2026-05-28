'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getMediaAsset, type MediaAsset } from '@/lib/mediaService';

interface BackendImageProps {
  mediaKey: string;
  className?: string;
  alt?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  fallbackSrc?: string;
  style?: React.CSSProperties;
}

export function BackendImage({
  mediaKey,
  className,
  alt,
  fill,
  width,
  height,
  priority,
  sizes,
  quality = 75,
  fallbackSrc,
  style,
}: BackendImageProps) {
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getMediaAsset(mediaKey)
      .then((data) => {
        setAsset(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [mediaKey]);

  const src = asset?.image_url || fallbackSrc;
  const altText = alt || asset?.alt_text || '';

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 ${className || ''}`} style={style} />
    );
  }

  if (!src || error) {
    if (fallbackSrc) {
      return fill ? (
        <Image src={fallbackSrc} alt={altText} fill className={className} sizes={sizes} priority={priority} quality={quality} style={style} />
      ) : (
        <Image src={fallbackSrc} alt={altText} width={width || 800} height={height || 600} className={className} priority={priority} quality={quality} style={style} />
      );
    }
    return <div className={`bg-gray-100 ${className || ''}`} style={style} />;
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={altText}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        quality={quality}
        style={style}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={altText}
      width={width || 800}
      height={height || 600}
      className={className}
      sizes={sizes}
      priority={priority}
      quality={quality}
      style={style}
    />
  );
}

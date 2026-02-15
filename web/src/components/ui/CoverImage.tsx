"use client";

import { useState } from "react";
import Image from "next/image";
import CoverPlaceholder from "./CoverPlaceholder";

/**
 * Image component with automatic broken-image fallback.
 * Wraps next/image and falls back to CoverPlaceholder on error.
 *
 * Use this everywhere a cover image is rendered so broken URLs
 * never show the browser's broken-image icon.
 */
export default function CoverImage({
  src,
  alt,
  width,
  height,
  fill,
  sizes,
  priority,
  loading,
  format = "omnibus",
  className,
}: {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
  format?: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <CoverPlaceholder
        format={format}
        width={fill ? undefined : (width || 64)}
        height={fill ? undefined : (height || 96)}
        className={fill ? "w-full h-full" : className}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={loading}
        className={className}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 64}
      height={height || 96}
      sizes={sizes}
      priority={priority}
      loading={loading}
      className={className}
      onError={() => setBroken(true)}
    />
  );
}

/**
 * Raw <img> version for use in D3/SVG foreignObjects and server components
 * that can't use next/image. Falls back to a simple colored div.
 */
export function RawCoverImage({
  src,
  alt,
  width,
  height,
  className,
  style,
}: {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <CoverPlaceholder
        format="omnibus"
        width={width}
        height={height}
        className={className}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ width, height, objectFit: "cover", display: "block", ...style }}
      onError={() => setBroken(true)}
    />
  );
}

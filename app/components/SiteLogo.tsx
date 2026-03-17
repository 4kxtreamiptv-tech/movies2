"use client";

import Link from "next/link";

/**
 * 123moviesfree.net style logo:
 * - Header uses "123MOVIES" where the "O" is a green play button.
 */
const BRAND_GREEN = "#79c142";

export type SiteLogoProps = {
  /** Show tagline under logo */
  tagline?: string;
  /** Link wrapper (default: Link to /) */
  href?: string;
  /** Logo size: nav (header), hero (landing), footer */
  size?: "nav" | "hero" | "footer";
  /** Variant: play-O (123M + play + VIES) */
  variant?: "playO" | "split";
  /** Optional custom first part (e.g. keyword pages "F") */
  first?: string;
  /** Optional custom second part (e.g. "MOVIES") */
  second?: string;
  /** Optional custom first part color */
  firstColor?: string;
  /** Optional custom second part color */
  secondColor?: string;
};

const sizeClasses = {
  nav: { wrap: "gap-0.5", first: "text-2xl md:text-3xl", second: "text-2xl md:text-3xl", tag: "text-xs ml-0.5" },
  hero: { wrap: "gap-1", first: "text-4xl md:text-5xl", second: "text-4xl md:text-5xl", tag: "text-sm mt-1" },
  footer: { wrap: "gap-1", first: "text-3xl", second: "text-2xl", tag: "text-xs mt-0.5" },
};

export default function SiteLogo({
  tagline = "Watch HD Movies Online Free",
  href = "/",
  size = "nav",
  variant = "playO",
  first = "123",
  second = "MOVIES",
  firstColor = BRAND_GREEN,
  secondColor = "#ffffff",
}: SiteLogoProps) {
  const c = sizeClasses[size];
  // Match the cap-height of the text in each size
  const playSize =
    size === "nav" ? 26 : size === "footer" ? 24 : 44;

  const content =
    variant === "playO" ? (
      <>
        <div className={`flex items-center ${c.wrap}`}>
          <span className={`${c.first} font-black tracking-tight`} style={{ color: secondColor }}>
            123M
          </span>
          <span
            className="inline-flex items-center justify-center rounded-full"
            style={{ width: playSize, height: playSize, background: firstColor }}
            aria-hidden="true"
          >
            <svg
              width={Math.round(playSize * 0.55)}
              height={Math.round(playSize * 0.55)}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9 7v10l8-5-8-5z" fill="#ffffff" />
            </svg>
          </span>
          <span className={`${c.second} font-black tracking-tight`} style={{ color: firstColor }}>
            VIES
          </span>
        </div>
        {tagline && (
          <p className={`${c.tag} font-medium text-gray-400 hidden sm:block`}>
            {tagline}
          </p>
        )}
      </>
    ) : (
      <>
        <div className={`flex items-center ${c.wrap}`}>
          <span className={`${c.first} font-black tracking-tight`} style={{ color: firstColor }}>
            {first}
          </span>
          <span className={`${c.second} font-bold tracking-tight`} style={{ color: secondColor }}>
            {second}
          </span>
        </div>
        {tagline && (
          <p className={`${c.tag} font-medium text-gray-400 hidden sm:block`}>
            {tagline}
          </p>
        )}
      </>
    );

  if (href) {
    return (
      <Link href={href} className="flex flex-col">
        {content}
      </Link>
    );
  }
  return <div className="flex flex-col">{content}</div>;
}

import { BRAND } from "@/lib/brand";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="8" fill="#7FF0D6" />
      <g
        transform="translate(6.5 6.5) scale(0.62)"
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
          stroke="#04201C"
        />
        <path
          d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
          stroke="#0A6B5D"
        />
      </g>
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="brand-lockup">
      <LogoMark />
      <span className="brand-name">{BRAND.name}</span>
    </span>
  );
}
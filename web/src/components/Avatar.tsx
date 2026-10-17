type Props = {
  address: string;
  name?: string;
  size?: number;
};

// A round badge with colors taken from the wallet address.
// Two people with the same name still look different.
export default function Avatar({ address, name, size = 44 }: Props) {
  const hex = address.replace("0x", "");
  const h1 = parseInt(hex.slice(0, 6), 16) % 360;
  const h2 = (h1 + 40 + (parseInt(hex.slice(6, 12), 16) % 80)) % 360;
  const initials = (name ?? "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${h1} 55% 38%), hsl(${h2} 60% 52%))`,
      }}
    >
      {initials || "?"}
    </span>
  );
}
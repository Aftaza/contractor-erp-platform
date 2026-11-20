interface LogoItem {
  src: string;
  name: string;
}

interface LogoMarqueeProps {
  logos: LogoItem[];
}

function Logo({ logo }: { logo: LogoItem }) {
  return (
    <div
      className="flex h-16 w-40 shrink-0 items-center justify-center px-4 transition-all duration-300 grayscale hover:grayscale-0 hover:scale-110 cursor-default"
      title={logo.name}
    >
      <img
        src={logo.src}
        alt={logo.name}
        className="max-h-12 max-w-[120px] w-auto h-auto object-contain"
        loading="lazy"
      />
    </div>
  );
}

export function LogoMarquee({ logos }: LogoMarqueeProps) {
  const doubled = [...logos, ...logos];

  return (
    <div className="relative overflow-hidden py-2">
      {/* Fade kiri */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-white to-transparent" />
      {/* Fade kanan */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-white to-transparent" />

      {/* Baris 1 — scroll kiri, pause on hover */}
      <div className="group flex overflow-hidden">
        <div
          className="flex shrink-0 group-hover:[animation-play-state:paused]"
          style={{ animation: "marquee-left 30s linear infinite" }}
        >
          {doubled.map((logo, i) => (
            <Logo key={`r1-${i}`} logo={logo} />
          ))}
        </div>
      </div>

      {/* Baris 2 — scroll kanan, kecepatan berbeda, pause on hover */}
      <div className="group flex overflow-hidden mt-3">
        <div
          className="flex shrink-0 group-hover:[animation-play-state:paused]"
          style={{ animation: "marquee-right 24s linear infinite" }}
        >
          {doubled.map((logo, i) => (
            <Logo key={`r2-${i}`} logo={logo} />
          ))}
        </div>
      </div>
    </div>
  );
}

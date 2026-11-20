import type { ReactNode } from "react";

// Pembungkus statis: konten selalu terlihat tanpa JS. Animasi masuk dipasang
// setelah JS jalan oleh skrip `motion` vanilla di Layout.astro (atribut data-reveal).
interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  // Diterima demi kompatibilitas pemanggil lama; tak dipakai.
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
}

export function AnimatedSection({ children, className = "" }: AnimatedSectionProps) {
  return (
    <div data-reveal className={className}>
      {children}
    </div>
  );
}

interface StaggerChildProps {
  children: ReactNode;
  className?: string;
  index: number;
  baseDelay?: number;
  stagger?: number;
}

export function StaggerChild({ children, className = "" }: StaggerChildProps) {
  return <AnimatedSection className={className}>{children}</AnimatedSection>;
}

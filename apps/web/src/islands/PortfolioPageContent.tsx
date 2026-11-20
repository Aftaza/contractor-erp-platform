import { useState, useEffect } from "react";
import { ArrowRight, Phone } from "lucide-react";
import { ImageWithFallback } from '../components/ImageWithFallback';
import { AnimatedSection } from '../components/AnimatedSection';
import { allProjects, type Category, type Project } from '../data/projects';

const filters: Category[] = ["Semua", "Industri", "Infrastruktur", "Sipil", "Gedung"];

const CAT_COLORS: Record<string, string> = {
  Industri: "#CC0000",
  Infrastruktur: "#3b82f6",
  Sipil: "#10b981",
  Gedung: "#8b5cf6",
};

function ProjectCard({ p, delay = 0 }: { p: Project; delay?: number }) {
  const images = p.imgs && p.imgs.length > 0 ? p.imgs : p.img ? [p.img] : [];
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % images.length);
        setFading(false);
      }, 400);
    }, 3800);
    return () => clearInterval(timer);
  }, [images.length]);

  const catColor = CAT_COLORS[p.cat] ?? "#CC0000";

  return (
    <AnimatedSection delay={delay}>
      <div
        className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-[4/3] shadow-md hover:shadow-2xl transition-shadow bg-slate-800"
      >
        {/* Rotating image layer */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: fading ? 0 : 1 }}
        >
          {images.length > 0 && (
            <ImageWithFallback
              src={images[idx]}
              alt={p.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          )}
        </div>

        {/* Dot indicators for multiple images */}
        {images.length > 1 && (
          <div className="absolute top-3 right-3 flex gap-1 z-10">
            {images.map((_, i) => (
              <span
                key={i}
                className="block rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? 14 : 6,
                  height: 6,
                  background: i === idx ? "white" : "rgba(255,255,255,0.45)",
                }}
              />
            ))}
          </div>
        )}

        {/* Always-visible gradient overlay with project info */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-[#0f172a]/30 to-transparent flex flex-col justify-end p-5">
          <span
            className="inline-block w-fit px-2.5 py-1 rounded-full mb-2 text-white"
            style={{ fontSize: 10, fontWeight: 700, background: catColor }}
          >
            {p.cat}
          </span>
          <h3 className="text-white leading-snug mb-1" style={{ fontSize: 15, fontWeight: 700 }}>
            {p.title}
          </h3>
          <p className="text-white/65" style={{ fontSize: 12 }}>
            {p.year} &bull; {p.client || p.location}
          </p>
        </div>
      </div>
    </AnimatedSection>
  );
}

/**
 * `projects` opsional — default `allProjects` (data statis). Halaman
 * `portofolio.astro` mengopernya berisi data ERP + statis; kalau ERP mati,
 * yang dioper tinggal data statis. Lihat
 * acme-management/docs/superpowers/plans/fase-3-pelaporan-publikasi.md §2.8.
 */
export default function PortfolioPageContent({
  projects = allProjects,
}: {
  projects?: Project[];
} = {}) {
  const [active, setActive] = useState<Category>("Semua");
  // Render awal (HTML statis) menampilkan semua kartu agar terbaca tanpa JS;
  // setelah hidrasi dipangkas ke 6 + tombol "Muat Lebih Banyak".
  // shortcut: pemangkasan 6 kartu memakai state + hidrasi (HTML statis memuat semua), bukan CSS; ganti saat filter per klien dibangun (W3-04)
  const [showCount, setShowCount] = useState(Infinity);
  useEffect(() => setShowCount(6), []);

  const filtered = projects.filter((p) => active === "Semua" || p.cat === active);
  const visible = filtered.slice(0, showCount);

  return (
    <div className="overflow-hidden">
      {/* HERO */}
      <section className="relative bg-[#0f172a] py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <ImageWithFallback src="/assets/contoh/hero-portofolio.webp" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/80 to-[#0f172a]" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#CC0000]/15 border border-[#CC0000]/30 text-[#F5F5F2] rounded-full mb-6"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            <span className="w-2 h-2 bg-[#CC0000] rounded-full" />
            Portofolio
          </span>
          <h1
            className="text-white mb-5"
            style={{ fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 800, lineHeight: 1.1 }}
          >
            Proyek yang Telah Kami{" "}
            <span className="text-white">Selesaikan</span>
          </h1>
          <p
            className="text-slate-400 max-w-xl mx-auto"
            style={{ fontSize: 17, lineHeight: 1.8 }}
          >
            Beragam proyek yang telah kami kerjakan dengan standar kualitas tertinggi di seluruh Indonesia.
          </p>
        </div>
      </section>

      {/* FILTER & GRID */}
      <section className="py-14 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filter Buttons */}
          <AnimatedSection>
            <div className="flex gap-2 flex-wrap justify-center mb-12">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => { setActive(f); setShowCount(6); }}
                  className={`px-5 py-2.5 rounded-full transition-all cursor-pointer ${
                    active === f
                      ? "bg-[#CC0000] text-white shadow-lg shadow-[#CC0000]/20"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-[#CC0000]/30 hover:text-[#CC0000]"
                  }`}
                  style={{ fontSize: 14, fontWeight: 500 }}
                >
                  {f}
                  {f !== "Semua" && (
                    <span className="ml-1.5 opacity-60">
                      ({projects.filter((p) => p.cat === f).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </AnimatedSection>

          {/* Project Grid */}
            <div
              key={active}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
            >
              {visible.map((p, i) => (
                <ProjectCard key={`${p.title}-${i}`} p={p} delay={i * 0.07} />
              ))}
            </div>
          

          {/* Load More */}
          {showCount < filtered.length && (
            <AnimatedSection>
              <div className="text-center mt-12">
                <button
                  onClick={() => setShowCount((c) => c + 3)}
                  className="px-7 py-3 border-2 border-[#CC0000] text-[#CC0000] rounded-xl hover:bg-[#CC0000] hover:text-white transition-all cursor-pointer"
                  style={{ fontSize: 14, fontWeight: 600 }}
                >
                  Muat Lebih Banyak ({filtered.length - showCount} lagi)
                </button>
              </div>
            </AnimatedSection>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-24 bg-[#111418] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#CC0000]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <AnimatedSection>
            <h2 className="text-white mb-5" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800 }}>
              Ingin Proyek Anda Menjadi yang Berikutnya?
            </h2>
            <p className="text-blue-200/80 mb-8 max-w-lg mx-auto" style={{ fontSize: 16, lineHeight: 1.7 }}>
              Hubungi kami untuk konsultasi gratis dan rencana proyek yang sesuai kebutuhan Anda.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/kontak"
                className="px-8 py-4 bg-[#CC0000] hover:bg-[#A30000] text-white rounded-xl cursor-pointer shadow-lg shadow-[#CC0000]/30 flex items-center gap-2"
                style={{ fontSize: 16, fontWeight: 700 }}
              >
                <Phone className="w-5 h-5" /> Hubungi Kami
              </a>
              <a
                href="/layanan"
                className="px-8 py-4 border-2 border-white/40 text-white rounded-xl hover:bg-white/10 cursor-pointer flex items-center gap-2 transition-colors"
                style={{ fontSize: 16, fontWeight: 600 }}
              >
                Lihat Layanan <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}

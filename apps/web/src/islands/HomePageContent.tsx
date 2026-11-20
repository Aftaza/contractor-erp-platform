import {
  Building, HardHat, Ruler, Users, ArrowRight, Quote, CheckCircle2,
  ShieldCheck, Clock, Star, ChevronRight, Phone
} from "lucide-react";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { AnimatedSection } from "../components/AnimatedSection";
import { LogoMarquee } from "../components/LogoMarquee";

interface HomePageContentProps {
  projectImages: {
    ndt: string;
    net: string;
    bridge: string;
  };
  clientLogos: Array<{ src: string; name: string }>;
}

const HERO_IMG = "https://images.unsplash.com/photo-1770821034037-623e8720c32a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBza3lzY3JhcGVyJTIwY29uc3RydWN0aW9uJTIwY3JhbmUlMjBhZXJpYWx8ZW58MXx8fHwxNzcyMDczMTM3fDA&ixlib=rb-4.1.0&q=80&w=1080";
const TEAM_IMG = "https://images.unsplash.com/photo-1768158988512-ad31657fe5b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjB0ZWFtJTIwZW5naW5lZXJzJTIwc2FmZXR5JTIwaGVsbWV0fGVufDF8fHx8MTc3MjA3MzE1MXww&ixlib=rb-4.1.0&q=80&w=600";

const stats = [
  { icon: Building, value: "150+", label: "Proyek Selesai", color: "#CC0000" },
  { icon: Star, value: "★5", label: "Rating direktori kontraktor", color: "#CC0000" },
  { icon: HardHat, value: "500+", label: "Tenaga Ahli", color: "#10b981" },
  // ⚠️ Angka di atas perlu konfirmasi dari klien
  { icon: Ruler, value: "8+", label: "Tahun Pengalaman", color: "#8b5cf6" },
];

const services = [
  {
    icon: Building,
    title: "Instalasi Mekanikal",
    desc: "Modifikasi, fabrikasi, service, penggantian & pemasangan sistem mekanikal industri skala besar.",
    color: "#CC0000",
  },
  {
    icon: Ruler,
    title: "Konstruksi Gedung & Sipil",
    desc: "Konstruksi gedung industri, bangunan sipil, jembatan, dan saluran air sesuai standar KBLI.",
    color: "#CC0000",
  },
  {
    icon: HardHat,
    title: "Instalasi Tenaga Listrik",
    desc: "Pembangunan dan pemasangan instalasi tenaga listrik berlisensi dengan 3 nomor SBU aktif.",
    color: "#10b981",
  },
  {
    icon: CheckCircle2,
    title: "Fabrikasi & Supplier",
    desc: "Fabrikasi struktur baja, ducting, damper blade, perancah, dan penyediaan material industri.",
    color: "#8b5cf6",
  },
];

const whyUs = [
  { icon: ShieldCheck, title: "Standar K3 Terjamin", desc: "Keselamatan Kesehatan Kerja diterapkan di setiap proyek tanpa kompromi." },
  { icon: Clock, title: "Tepat Waktu", desc: "Komitmen menyelesaikan setiap proyek sesuai jadwal yang disepakati." },
  { icon: Star, title: "Kualitas Terverifikasi", desc: "SBU KBLI aktif dan izin instalasi listrik resmi dari pemerintah." },
  { icon: Users, title: "Tim Profesional", desc: "Tenaga ahli bersertifikat di bidang mekanikal, sipil, dan elektrikal." },
];

const testimonials = [
  {
    quote: "Pelayanan dari perusahaan ini sangat ramah dan profesional. Mereka sangat responsif terhadap setiap permintaan dan pertanyaan. Sangat puas dengan kerja mereka.",
    name: "Putri Wulandari",
    role: "Klien",
  },
  {
    quote: "Perusahaan ini mampu menyelesaikan proyek dengan sangat cepat tanpa mengorbankan kualitas. Semua pekerjaan dilakukan dengan teliti dan berkualitas tinggi. Sangat direkomendasikan!",
    name: "Lia Fitriani",
    role: "Klien",
  },
  {
    quote: "Sangat senang dengan kerja sama yang baik dari perusahaan ini. Mereka sangat mendengarkan kebutuhan klien dan memberikan solusi terbaik. Sangat direkomendasikan!",
    name: "Hadi Santoso",
    role: "Klien",
  },
];

export default function HomePageContent({ projectImages, clientLogos }: HomePageContentProps) {
  const featuredProjects = [
    {
      img: projectImages.ndt,
      category: "Industri",
      title: "NDT & Kontrak Payung",
      desc: "Non-Destructive Testing & kontrak payung multi-tahun — PT Industri Semen Contoh, 2019–2025",
    },
    {
      img: projectImages.net,
      category: "Industri",
      title: "Steel Structure Net",
      desc: "Fabrikasi & pemasangan steel structure pagar paranet — PT Agro Contoh, 2023–2024",
    },
    {
      img: projectImages.bridge,
      category: "Infrastruktur",
      title: "Jembatan Pipa Contoh",
      desc: "Fabrikasi & erection struktur jembatan pipa di Jawa Timur — BUMN Karya Contoh, 2023",
    },
  ];

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center">
        <div className="absolute inset-0">
          <ImageWithFallback src={HERO_IMG} alt="Construction" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/95 via-[#0f172a]/75 to-[#0f172a]/30" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-24 lg:py-32">
          <div className="max-w-2xl">
            <span
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#CC0000]/15 border border-[#CC0000]/30 text-[#F5F5F2] rounded-full mb-6 backdrop-blur-sm"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              <span className="w-2 h-2 bg-[#CC0000] rounded-full animate-pulse" />
              PT Acme Konstruksi
            </span>

            <h1
              className="text-white mb-6"
              style={{ fontSize: "clamp(34px, 5.5vw, 56px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em" }}
            >
              Membangun{" "}
              <span className="text-white">
                Infrastruktur
              </span>{" "}
              Berkualitas untuk Indonesia
            </h1>

            <p
              className="text-slate-300 mb-10 max-w-lg"
              style={{ fontSize: 17, lineHeight: 1.8 }}
            >
              Mitra terpercaya dalam bidang kontraktor mekanikal, sipil, elektrikal & supplier. Berpengalaman menangani proyek-proyek industri berskala besar sejak 2017.
            </p>

            <div
              className="flex flex-wrap gap-4"
            >
              <a href="/portofolio"
                className="group px-7 py-3.5 border-2 border-white/80 text-white rounded-xl hover:bg-white hover:text-[#0f172a] transition-all duration-300 cursor-pointer flex items-center gap-2"
                style={{ fontSize: 15, fontWeight: 600 }}
              >
                Lihat Proyek
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="/kontak"
                className="px-7 py-3.5 bg-[#CC0000] hover:bg-[#A30000] text-white rounded-xl transition-all duration-300 cursor-pointer flex items-center gap-2 shadow-lg shadow-[#CC0000]/25"
                style={{ fontSize: 15, fontWeight: 600 }}
              >
                <Phone className="w-4 h-4" />
                Hubungi Kami
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-white/50" style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em" }}>SCROLL</span>
          <div
            className="w-5 h-8 border-2 border-white/30 rounded-full flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-1.5 bg-white/60 rounded-full" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative bg-white py-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-16 z-20">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 lg:p-10">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                {stats.map((s, i) => (
                  <AnimatedSection key={s.label} delay={i * 0.1}>
                    <div className="text-center group">
                      {/*<div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300 group-hover:scale-110"
                        style={{ background: `${s.color}12` }}
                      >
                        <s.icon className="w-7 h-7" style={{ color: s.color }} />
                      </div>*/}
                      <p className="text-[#0f172a]" style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em" }}>{s.value}</p>
                      <p className="text-slate-500 mt-1" style={{ fontSize: 14 }}>{s.label}</p>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Snippet */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <AnimatedSection>
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <ImageWithFallback src={TEAM_IMG} alt="Tim Acme Grup" className="w-full h-[400px] lg:h-[480px] object-cover" />
                </div>
                <div
                  className="absolute -bottom-6 -right-4 lg:-right-8 bg-white rounded-xl shadow-xl border border-slate-100 p-5 max-w-[200px]"
                >
                  <p className="text-[#CC0000]" style={{ fontSize: 32, fontWeight: 800 }}>8+</p>
                  <p className="text-slate-600 mt-1" style={{ fontSize: 13, lineHeight: 1.5 }}>Tahun membangun kepercayaan di industri konstruksi</p>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <span className="inline-block px-4 py-1.5 bg-[#CC0000]/10 text-[#CC0000] rounded-full mb-5" style={{ fontSize: 13, fontWeight: 600 }}>
                Tentang Kami
              </span>
              <h2 className="text-[#0f172a] mb-5" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
                Mitra Konstruksi{" "}
                <span className="text-[#CC0000]">Terpercaya</span>{" "}
                Sejak 2017
              </h2>
              <p className="text-slate-600 mb-6" style={{ fontSize: 16, lineHeight: 1.8 }}>
                PT Acme Konstruksi adalah kontraktor mekanikal, sipil, elektrikal & supplier yang berfokus pada proyek industri skala besar. Kepuasan klien adalah tujuan kami dalam setiap pekerjaan yang dipercayakan.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {whyUs.map((w) => (
                  <div key={w.title} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#CC0000]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <w.icon className="w-4 h-4 text-[#CC0000]" />
                    </div>
                    <div>
                      <p className="text-[#0f172a]" style={{ fontSize: 14, fontWeight: 600 }}>{w.title}</p>
                      <p className="text-slate-500 mt-0.5" style={{ fontSize: 12, lineHeight: 1.5 }}>{w.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a href="/tentang"
                className="group inline-flex items-center gap-2 px-6 py-3 bg-[#CC0000] text-white rounded-xl hover:bg-[#CC0000]/90 transition-all cursor-pointer"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                Selengkapnya
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 lg:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 bg-[#CC0000]/10 text-[#CC0000] rounded-full mb-4" style={{ fontSize: 13, fontWeight: 600 }}>
                Layanan Kami
              </span>
              <h2 className="text-[#0f172a] mb-4" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.01em" }}>
                Solusi Konstruksi <span className="text-[#CC0000]">Terpadu</span>
              </h2>
              <p className="text-slate-500 max-w-2xl mx-auto" style={{ fontSize: 16, lineHeight: 1.7 }}>
                Kami menyediakan layanan konstruksi menyeluruh mulai dari perencanaan hingga serah terima proyek.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s, i) => (
              <AnimatedSection key={s.title} delay={i * 0.1}>
                <div
                  className="bg-white rounded-2xl p-7 shadow-sm border border-slate-100 cursor-pointer group h-full"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-colors duration-300 group-hover:shadow-lg"
                    style={{ background: `${s.color}12` }}
                  >
                    <s.icon className="w-7 h-7 transition-colors duration-300" style={{ color: s.color }} />
                  </div>
                  <h3 className="text-[#0f172a] mb-3" style={{ fontSize: 18, fontWeight: 700 }}>{s.title}</h3>
                  <p className="text-slate-500 mb-5" style={{ fontSize: 14, lineHeight: 1.7 }}>{s.desc}</p>
                  <span
                    className="inline-flex items-center gap-1.5 transition-colors duration-300 group-hover:gap-2.5"
                    style={{ fontSize: 14, fontWeight: 600, color: s.color }}
                  >
                    Selengkapnya <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Klien Kami */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-10">
              <span
                className="inline-block px-4 py-1.5 bg-[#CC0000]/10 text-[#CC0000] rounded-full mb-4"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                Klien Kami
              </span>
              <h2
                className="text-[#0f172a]"
                style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 800, letterSpacing: "-0.01em" }}
              >
                Dipercaya oleh{" "}
                <span className="text-[#CC0000]">Klien-Klien Terkemuka</span>
              </h2>
            </div>
          </AnimatedSection>
          <LogoMarquee logos={clientLogos} />
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-14">
              <div>
                <span className="inline-block px-4 py-1.5 bg-[#CC0000]/10 text-[#CC0000] rounded-full mb-4" style={{ fontSize: 13, fontWeight: 600 }}>
                  Portofolio
                </span>
                <h2 className="text-[#0f172a]" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.01em" }}>
                  Proyek <span className="text-[#CC0000]">Unggulan</span> Kami
                </h2>
              </div>
              <a href="/portofolio"
                className="group inline-flex items-center gap-2 px-6 py-3 border-2 border-[#CC0000] text-[#CC0000] rounded-xl hover:bg-[#CC0000] hover:text-white transition-all duration-300 cursor-pointer shrink-0"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                Lihat Semua
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {featuredProjects.map((p, i) => (
              <AnimatedSection key={p.title} delay={i * 0.15}>
                <a
                  href="/portofolio"
                  className="group relative block rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-shadow duration-500"
                >
                  <div className="aspect-[3/4] sm:aspect-[4/5]">
                    <ImageWithFallback src={p.img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                    <span className="inline-block w-fit px-3 py-1.5 bg-[#CC0000] text-white rounded-full mb-3" style={{ fontSize: 11, fontWeight: 600 }}>{p.category}</span>
                    <h3 className="text-white mb-1.5" style={{ fontSize: 20, fontWeight: 700 }}>{p.title}</h3>
                    <p className="text-white/70" style={{ fontSize: 13, lineHeight: 1.5 }}>{p.desc}</p>
                    <div className="flex items-center gap-1.5 mt-4 text-white" style={{ fontSize: 13, fontWeight: 600 }}>
                      Lihat Detail <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </a>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-28 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 bg-white/10 text-[#F5F5F2] rounded-full mb-4" style={{ fontSize: 13, fontWeight: 600 }}>
                Testimoni
              </span>
              <h2 className="text-white" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.01em" }}>
                Kata Mereka tentang <span className="text-[#F5F5F2]">Acme</span>
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {testimonials.map((t, i) => (
              <AnimatedSection key={t.name} delay={i * 0.15}>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-7 h-full flex flex-col hover:bg-white/10 transition-colors duration-300">
                  <Quote className="w-10 h-10 text-[#A7AEB5] mb-5 shrink-0" />
                  <p className="text-slate-300 flex-1 mb-6" style={{ fontSize: 15, lineHeight: 1.8 }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-5 border-t border-white/10">
                    <div className="w-11 h-11 bg-gradient-to-br from-[#CC0000] to-[#CC0000] rounded-full flex items-center justify-center text-white" style={{ fontSize: 14, fontWeight: 700 }}>
                      {t.name !== "—" ? t.name.split(" ").map((n: string) => n[0]).join("") : "?"}
                    </div>
                    <div>
                      <p className="text-white" style={{ fontSize: 15, fontWeight: 600 }}>{t.name}</p>
                      <p className="text-slate-400" style={{ fontSize: 12 }}>{t.role}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-[#111418] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#CC0000]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#3b82f6]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <AnimatedSection>
            <span className="inline-block px-4 py-1.5 bg-white/10 text-[#F5F5F2] rounded-full mb-6" style={{ fontSize: 13, fontWeight: 600 }}>
              Mulai Proyek Anda
            </span>
            <h2 className="text-white mb-5" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
              Siap Memulai Proyek Anda Bersama Kami?
            </h2>
            <p className="text-blue-200/80 mb-10 max-w-xl mx-auto" style={{ fontSize: 17, lineHeight: 1.8 }}>
              Hubungi tim kami untuk konsultasi gratis dan dapatkan penawaran terbaik untuk proyek konstruksi Anda.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/kontak"
                className="px-8 py-4 bg-[#CC0000] hover:bg-[#A30000] text-white rounded-xl cursor-pointer shadow-lg shadow-[#CC0000]/30 flex items-center gap-2"
                style={{ fontSize: 16, fontWeight: 700 }}
              >
                <Phone className="w-5 h-5" />
                Hubungi Kami Sekarang
              </a>
              <a href="/portofolio"
                className="px-8 py-4 border-2 border-white/40 text-white rounded-xl hover:bg-white/10 cursor-pointer flex items-center gap-2 transition-colors"
                style={{ fontSize: 16, fontWeight: 600 }}
              >
                Lihat Portofolio
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}

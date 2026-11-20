import {
  Building, Zap, HardHat, CheckCircle2, Container, ArrowRight, Phone,
  ClipboardList, Cog, Eye, Truck, ShieldCheck, BarChart3
} from "lucide-react";
import { ImageWithFallback } from '../components/ImageWithFallback';
import { AnimatedSection, StaggerChild } from '../components/AnimatedSection';

const IMG_MEKANIK  = "https://images.unsplash.com/photo-1615219023549-5c9abdb7df9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGVlbCUyMHN0cnVjdHVyZSUyMGluZHVzdHJpYWwlMjB3ZWxkaW5nfGVufDF8fHx8MTc3MjA3MzYyMXww&ixlib=rb-4.1.0&q=80&w=600";
const IMG_SIPIL    = "https://images.unsplash.com/photo-1559843788-693858bf7338?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaWdod2F5JTIwYnJpZGdlJTIwaW5mcmFzdHJ1Y3R1cmUlMjBzdW5zZXR8ZW58MXx8fHwxNzcyMDczMTQzfDA&ixlib=rb-4.1.0&q=80&w=600";
const IMG_LISTRIK  = "https://images.unsplash.com/photo-1758101755915-462eddc23f57?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJpY2FsJTIwaW5zdGFsbGF0aW9uJTIwaW5kdXN0cmlhbHxlbnwxfHx8fDE3NzIwNzM2MjJ8MA&ixlib=rb-4.1.0&q=80&w=600";
const IMG_FABRIK   = "https://images.unsplash.com/photo-1508465818649-14a170138405?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBnbGFzcyUyMG9mZmljZSUyMGJ1aWxkaW5nJTIwZXh0ZXJpb3J8ZW58MXx8fHwxNzcyMDIxNDYyfDA&ixlib=rb-4.1.0&q=80&w=600";
const IMG_CONCRETE = "https://images.unsplash.com/photo-1764856601179-dfeca7b37e4c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jcmV0ZSUyMHBvdXJpbmclMjBjb25zdHJ1Y3Rpb24lMjB3b3JrZXJzfGVufDF8fHx8MTc3MjA3MzYyMHww&ixlib=rb-4.1.0&q=80&w=1080";

const services = [
  {
    id: "mekanikal",
    icon: HardHat,
    color: "#CC0000",
    title: "Instalasi Mekanikal",
    subtitle: "Fabrikasi & perawatan sistem mekanikal industri",
    img: IMG_MEKANIK,
    desc: "Kami menangani pekerjaan mekanikal industri secara menyeluruh mulai dari modifikasi, fabrikasi, service, penggantian, hingga pemasangan. Berpengalaman di sektor semen, energi, dan manufaktur dengan klien utama PT Industri Semen Contoh sejak 2019.",
    features: [
      "Bin, Appron & Stacker",
      "Non-Destructive Testing (NDT) — UT, RT, PT, MT",
      "Hoist Crane & Lift Maintenance",
      "Drag Bucket — Service, Fabrikasi & Pemasangan",
      "Reclaimer & Crusher",
      "Maintenance Gondola",
    ],
    stats: { projects: "8+", period: "2019–2025", scope: "PT Industri Semen Contoh" },
  },
  {
    id: "sipil",
    icon: Building,
    color: "#CC0000",
    title: "Konstruksi Gedung & Sipil",
    subtitle: "Konstruksi gedung industri, jembatan & sipil",
    img: IMG_SIPIL,
    desc: "Meliputi konstruksi gedung industri, bangunan sipil jalan, jembatan pipa, saluran air, dan steel structure. Kami mengerjakan proyek mulai dari tahap pembuatan pondasi, fabrikasi, hingga erection dan instalasi di lapangan.",
    features: [
      "Konstruksi gedung industri (KBLI 41013)",
      "Konstruksi gedung lainnya (KBLI 41019)",
      "Konstruksi bangunan sipil jalan (KBLI 42101)",
      "Fabrikasi & erection steel structure",
      "Jembatan pipa & infrastruktur",
      "Saluran air & drainase industri",
    ],
    stats: { projects: "6+", period: "2019–2024", scope: "Multi-Lokasi" },
  },
  {
    id: "listrik",
    icon: Zap,
    color: "#10b981",
    title: "Instalasi Tenaga Listrik",
    subtitle: "Pembangunan & pemasangan instalasi listrik berlisensi",
    img: IMG_LISTRIK,
    desc: "Memiliki tiga izin resmi pembangunan dan pemasangan instalasi tenaga listrik dari pemerintah. Layanan mencakup perencanaan, pengadaan material, pemasangan, hingga pengujian sistem kelistrikan industri sesuai standar keselamatan.",
    features: [
      "Instalasi listrik industri berlisensi",
      "3 nomor SBU izin instalasi aktif",
      "Elektrikal instrumen industri",
      "Panel & distribusi listrik",
      "Kabel tray & conduit",
      "Pengujian & komisioning",
    ],
    stats: { projects: "3 SBU", period: "Aktif", scope: "Terlisensi" },
  },
  {
    id: "fabrikasi",
    icon: Container,
    color: "#8b5cf6",
    title: "Fabrikasi & Supplier",
    subtitle: "Fabrikasi struktur baja & penyediaan material",
    img: IMG_FABRIK,
    desc: "Pengadaan material berkualitas, fabrikasi struktur baja, ducting, damper blade, perancah (steiger), dan bag filter untuk berbagai kebutuhan industri. Workshop kami di Surabaya dilengkapi untuk menangani fabrikasi skala besar.",
    features: [
      "Fabrikasi ducting & struktur baja",
      "Fabrikasi damper blade & structure stack",
      "Pemasangan perancah / steiger (KBLI 43902)",
      "Fabrication & erection bag filter & dedusting system",
      "Insulasi ducting",
      "Pengadaan & supply material industri",
    ],
    stats: { projects: "10+", period: "2021–2024", scope: "Industri" },
  },
];

const processSteps = [
  { icon: ClipboardList, title: "Konsultasi & Survei", desc: "Diskusi kebutuhan, survei lokasi, dan analisis kelayakan proyek secara menyeluruh." },
  { icon: Eye, title: "Perencanaan & Desain", desc: "Penyusunan RAB, jadwal kerja, metode konstruksi, dan dokumentasi teknis lengkap." },
  { icon: Cog, title: "Pelaksanaan", desc: "Konstruksi dengan pengawasan ketat, laporan berkala, dan kontrol mutu setiap tahap." },
  { icon: Truck, title: "Serah Terima", desc: "Inspeksi akhir, penyerahan dokumen as-built, dan masa retensi garansi pekerjaan." },
];

const advantages = [
  { icon: ShieldCheck, title: "Standar K3 Ketat", desc: "Keselamatan Kesehatan Kerja diterapkan di setiap proyek tanpa pengecualian." },
  { icon: BarChart3, title: "Kontrak Multi-Tahun", desc: "Dipercaya klien BUMN dan swasta untuk kontrak berkelanjutan sejak 2019." },
  { icon: CheckCircle2, title: "SBU KBLI Lengkap", desc: "6 sertifikat SBU KBLI aktif & 3 izin instalasi tenaga listrik resmi." },
  { icon: Building, title: "Workshop Sendiri", desc: "Fasilitas workshop di Surabaya untuk fabrikasi & pengerjaan mandiri skala besar." },
];

const statLabels: Record<string, string> = {
  projects: "Proyek",
  period: "Periode",
  scope: "Klien",
};

export default function ServicesPageContent() {
  return (
    <div className="overflow-hidden">
      {/* HERO */}
      <section className="relative bg-[#0f172a] py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <ImageWithFallback src={IMG_CONCRETE} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/80 to-[#0f172a]" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#CC0000]/15 border border-[#CC0000]/30 text-[#F5F5F2] rounded-full mb-6 backdrop-blur-sm"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            <span className="w-2 h-2 bg-[#CC0000] rounded-full" />
            Layanan PT Acme Konstruksi
          </span>
          <h1
            className="text-white mb-5"
            style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em" }}
          >
            Solusi Konstruksi{" "}
            <span className="text-white">Terpadu</span>
          </h1>
          <p
            className="text-slate-400 max-w-2xl mx-auto"
            style={{ fontSize: 17, lineHeight: 1.8 }}
          >
            Dari perencanaan hingga serah terima, kami menyediakan layanan konstruksi lengkap dengan standar kualitas internasional.
          </p>
        </div>
      </section>

      {/* SERVICE CARDS OVERVIEW */}
      <section className="bg-white py-0 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-14">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
              {services.map((s, i) => (
                <StaggerChild key={s.id} index={i}>
                  <a
                    href={`#${s.id}`}
                    className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 text-center block cursor-pointer hover:shadow-2xl transition-shadow"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: `${s.color}12` }}>
                      <s.icon className="w-6 h-6" style={{ color: s.color }} />
                    </div>
                    <h3 className="text-[#0f172a] mb-1" style={{ fontSize: 16, fontWeight: 700 }}>{s.title}</h3>
                    <p className="text-slate-500" style={{ fontSize: 12, lineHeight: 1.5 }}>{s.subtitle}</p>
                  </a>
                </StaggerChild>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SERVICE DETAILS */}
      {services.map((s, idx) => (
        <section key={s.id} id={s.id} className={`py-20 lg:py-28 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center ${idx % 2 !== 0 ? "lg:[direction:rtl]" : ""}`}>
              <AnimatedSection direction={idx % 2 === 0 ? "left" : "right"}>
                <div className="lg:[direction:ltr]">
                  <div className="relative rounded-2xl overflow-hidden shadow-xl group">
                    <ImageWithFallback src={s.img} alt={s.title} className="w-full h-[350px] lg:h-[420px] object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 flex gap-4">
                      {Object.entries(s.stats).map(([key, val]) => (
                        <div key={key} className="bg-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 text-white">
                          <p style={{ fontSize: 18, fontWeight: 800 }}>{val}</p>
                          <p className="text-white/70 capitalize" style={{ fontSize: 11 }}>{statLabels[key] ?? key}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              <AnimatedSection direction={idx % 2 === 0 ? "right" : "left"} delay={0.15}>
                <div className="lg:[direction:ltr]">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5" style={{ background: `${s.color}12`, color: s.color, fontSize: 13, fontWeight: 600 }}>
                    <s.icon className="w-4 h-4" />
                    {s.title}
                  </div>
                  <h2 className="text-[#0f172a] mb-5" style={{ fontSize: "clamp(26px, 3vw, 36px)", fontWeight: 800, lineHeight: 1.15 }}>
                    {s.subtitle}
                  </h2>
                  <p className="text-slate-600 mb-8" style={{ fontSize: 15, lineHeight: 1.8 }}>
                    {s.desc}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                    {s.features.map((f) => (
                      <div key={f} className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: s.color }} />
                        <span className="text-slate-700" style={{ fontSize: 14 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <a href="/kontak"
                    className="group inline-flex items-center gap-2 px-6 py-3 text-white rounded-xl cursor-pointer transition-all hover:shadow-lg"
                    style={{ background: s.color, fontSize: 14, fontWeight: 600 }}
                  >
                    Konsultasi Gratis
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>
      ))}

      {/* PROSES KERJA */}
      <section className="py-20 lg:py-28 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 bg-white/10 text-[#F5F5F2] rounded-full mb-4" style={{ fontSize: 13, fontWeight: 600 }}>Proses Kami</span>
              <h2 className="text-white" style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800 }}>
                Alur Kerja yang <span className="text-[#F5F5F2]">Terstruktur</span>
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto mt-4" style={{ fontSize: 16, lineHeight: 1.7 }}>
                Setiap proyek kami lalui dengan tahapan yang jelas untuk memastikan hasil terbaik.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((p, i) => (
              <StaggerChild key={p.title} index={i}>
                <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-7 h-full hover:bg-white/10 transition-colors">
                  <div className="absolute -top-3 -left-1 w-8 h-8 bg-[#CC0000] rounded-full flex items-center justify-center text-white shadow-lg" style={{ fontSize: 14, fontWeight: 800 }}>
                    {i + 1}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-5 mt-2">
                    <p.icon className="w-6 h-6 text-[#F5F5F2]" />
                  </div>
                  <h3 className="text-white mb-2" style={{ fontSize: 17, fontWeight: 700 }}>{p.title}</h3>
                  <p className="text-slate-400" style={{ fontSize: 14, lineHeight: 1.7 }}>{p.desc}</p>
                  {i < processSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 border-t-2 border-dashed border-white/15" />
                  )}
                </div>
              </StaggerChild>
            ))}
          </div>
        </div>
      </section>

      {/* KEUNGGULAN */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 bg-[#CC0000]/10 text-[#CC0000] rounded-full mb-4" style={{ fontSize: 13, fontWeight: 600 }}>Keunggulan</span>
              <h2 className="text-[#0f172a]" style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800 }}>
                Mengapa Memilih <span className="text-[#CC0000]">PT Acme Konstruksi</span>?
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {advantages.map((a, i) => (
              <StaggerChild key={a.title} index={i}>
                <div
                  className="bg-slate-50 rounded-2xl p-7 border border-slate-100 text-center h-full hover:shadow-lg transition-shadow cursor-default"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#CC0000]/10 flex items-center justify-center mx-auto mb-5">
                    <a.icon className="w-7 h-7 text-[#CC0000]" />
                  </div>
                  <h3 className="text-[#0f172a] mb-2" style={{ fontSize: 17, fontWeight: 700 }}>{a.title}</h3>
                  <p className="text-slate-500" style={{ fontSize: 14, lineHeight: 1.7 }}>{a.desc}</p>
                </div>
              </StaggerChild>
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
            <h2 className="text-white mb-5" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, lineHeight: 1.15 }}>
              Punya Proyek yang Perlu Dikerjakan?
            </h2>
            <p className="text-blue-200/80 mb-10 max-w-xl mx-auto" style={{ fontSize: 17, lineHeight: 1.8 }}>
              Ceritakan kebutuhan Anda dan tim kami akan menyiapkan solusi terbaik beserta estimasi biaya.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/kontak"
                className="px-8 py-4 bg-[#CC0000] hover:bg-[#A30000] text-white rounded-xl cursor-pointer shadow-lg shadow-[#CC0000]/30 flex items-center gap-2"
                style={{ fontSize: 16, fontWeight: 700 }}>
                <Phone className="w-5 h-5" /> Konsultasi Gratis
              </a>
              <a href="/portofolio"
                className="px-8 py-4 border-2 border-white/40 text-white rounded-xl hover:bg-white/10 cursor-pointer flex items-center gap-2 transition-colors"
                style={{ fontSize: 16, fontWeight: 600 }}>
                Lihat Portofolio <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}

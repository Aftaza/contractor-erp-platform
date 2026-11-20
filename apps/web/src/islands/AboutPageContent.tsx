import {
  Building, Star, HardHat, Ruler, Target, Eye, Heart,
  ShieldCheck, Award, TrendingUp, Phone, ArrowRight, CheckCircle2
} from "lucide-react";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { AnimatedSection, StaggerChild } from "../components/AnimatedSection";

const HERO_IMG = "https://images.unsplash.com/photo-1769740333462-9a63bfa914bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Jwb3JhdGUlMjBvZmZpY2UlMjBtZWV0aW5nJTIwYm9hcmRyb29tfGVufDF8fHx8MTc3MTk1NTc0Mnww&ixlib=rb-4.1.0&q=80&w=1080";
const TEAM_IMG = "https://images.unsplash.com/photo-1768158988512-ad31657fe5b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbmdpbmVlciUyMGhhcmRoYXQlMjBjb25zdHJ1Y3Rpb24lMjBzaXRlJTIwaW5zcGVjdGlvbnxlbnwxfHx8fDE3NzIwNzM2MTl8MA&ixlib=rb-4.1.0&q=80&w=600";
const BLUEPRINT_IMG = "https://images.unsplash.com/photo-1762146828422-50a8bd416d3c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBibHVlcHJpbnQlMjBhcmNoaXRlY3QlMjBwbGFubmluZ3xlbnwxfHx8fDE3NzIwNzM2MTl8MA&ixlib=rb-4.1.0&q=80&w=600";

const stats = [
  { icon: Building, value: "150+", label: "Proyek Selesai", color: "#CC0000" },
  { icon: Star, value: "★5", label: "Rating direktori kontraktor", color: "#CC0000" },
  { icon: HardHat, value: "500+", label: "Tenaga Ahli", color: "#10b981" },
  { icon: Ruler, value: "8+", label: "Tahun Pengalaman", color: "#8b5cf6" },
];

const values = [
  { icon: ShieldCheck, title: "Integritas", desc: "Menjunjung tinggi kejujuran dan transparansi di setiap aspek pekerjaan.", color: "#CC0000" },
  { icon: Award, title: "Kualitas", desc: "Mengutamakan standar mutu tertinggi dalam setiap proyek yang dikerjakan.", color: "#CC0000" },
  { icon: Heart, title: "Keselamatan", desc: "Standar K3 (Keselamatan Kesehatan Kerja) adalah prioritas utama bagi seluruh tim.", color: "#ef4444" },
  { icon: TrendingUp, title: "Inovasi", desc: "Terus mengadopsi teknologi dan metode konstruksi terkini untuk efisiensi optimal.", color: "#10b981" },
  // ⚠️ Nilai inti di atas bersifat inferensi — konfirmasi dengan klien
];

const milestones = [
  { year: "2017", title: "Pendirian Perusahaan", desc: "PT Acme Konstruksi berdiri pada 2017 di Surabaya, Jawa Timur." },
  { year: "2019", title: "Kontrak Perdana PT Industri Semen Contoh", desc: "Dipercaya mengerjakan kontrak payung Bin, Appron & Stacker serta Non-Destructive Testing (NDT) di Pabrik Surabaya." },
  { year: "2021", title: "Ekspansi Layanan — Bag Filter & Crane", desc: "Menyelesaikan fabrikasi & erection Bag Filter, pemasangan Hoist Crane Structure, dan awal kontrak Maintenance Gondola." },
  { year: "2022", title: "Proyek Multi-Site — Drag Bucket & Stack", desc: "Maintenance Hoist Crane, kontrak Drag Bucket, pengecatan Stack & branding Silo, serta fabrikasi Damper Blade & Structure Stack." },
  { year: "2023", title: "Diversifikasi — Infrastruktur & Telekomunikasi", desc: "Ekspansi ke Jembatan Pipa Contoh (BUMN Karya Contoh), Steel Structure Net (grup agro), dan pemasangan Fiber Optik Asosiasi Contoh di Bogor." },
  { year: "2024-Now", title: "Proyek Terbaru", desc: "Instalasi Hydrant PT Agro Contoh, Fabrication Ducting, Insulasi Ducting, dan Steel Structure Aula Sekolah di Surabaya." },
];

const leadership = [
  { name: "Budi Santoso", role: "Direktur", initial: "BS" },
  { name: "Siti Rahmawati", role: "Komisaris", initial: "SR" },
];

const certifications = [
  "SBU KBLI 43291 — Instalasi Mekanikal (PB-UMKU: 0000000000000000000)",
  "SBU KBLI 41013 — Konstruksi Gedung Industri (PB-UMKU: 0000000000000000000)",
  "SBU KBLI 41019 — Konstruksi Gedung Lainnya (PB-UMKU: 0000000000000000000)",
  "SBU KBLI 42101 — Konstruksi Bangunan Sipil Jalan (PB-UMKU: 0000000000000000000)",
  "SBU KBLI 42203 — Konstruksi Sipil Prasarana Pengolahan Limbah (PB-UMKU: 0000000000000000000)",
  "SBU KBLI 43902 — Pemasangan Perancah / Steiger (PB-UMKU: 0000000000000000000)",
  "Izin Instalasi Tenaga Listrik — No. 000.0.0.000.X.0X.0000.X00",
  "Izin Instalasi Tenaga Listrik — No. 000.0.0.000.X.0X.0000.X00",
  "Izin Instalasi Tenaga Listrik — No. 000.0.0.000.X.0X.0000.X00",
  // ⚠️ ISO 9001/14001/45001 tidak tercantum dalam Company Profile — perlu konfirmasi klien
];

export default function AboutPageContent() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative bg-[#0f172a] py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <ImageWithFallback src={HERO_IMG} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/80 to-[#0f172a]" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#CC0000]/15 border border-[#CC0000]/30 text-[#F5F5F2] rounded-full mb-6 backdrop-blur-sm"
            style={{ fontSize: 13, fontWeight: 600 }}>
            <span className="w-2 h-2 bg-[#CC0000] rounded-full" />Tentang Acme Grup
          </span>
          <h1
            className="text-white mb-5" style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Membangun Indonesia dengan{" "}
            <span className="text-white">Dedikasi</span>
          </h1>
          <p
            className="text-slate-400 max-w-2xl mx-auto" style={{ fontSize: 17, lineHeight: 1.8 }}>
            Sejak 2017, PT Acme Konstruksi telah menjadi mitra terpercaya dalam membangun infrastruktur berkualitas di seluruh Indonesia.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-0 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-12">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 lg:p-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                {stats.map((s, i) => (
                  <StaggerChild key={s.label} index={i}>
                    <div className="text-center">
                      {/*<div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: `${s.color}12` }}>
                        <s.icon className="w-6 h-6" style={{ color: s.color }} />
                      </div>*/}
                      <p className="text-[#0f172a]" style={{ fontSize: 32, fontWeight: 800 }}>{s.value}</p>
                      <p className="text-slate-500 mt-0.5" style={{ fontSize: 13 }}>{s.label}</p>
                    </div>
                  </StaggerChild>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <AnimatedSection direction="left">
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <ImageWithFallback src={TEAM_IMG} alt="Tim Acme Grup" className="w-full h-[380px] lg:h-[460px] object-cover" />
                </div>
                <div
                  className="absolute -bottom-6 -right-4 lg:-right-8 bg-[#CC0000] rounded-xl shadow-xl p-5 text-white">
                  <p style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>8+</p>
                  <p className="text-blue-200 mt-1" style={{ fontSize: 13 }}>Tahun Pengalaman</p>
                </div>
              </div>
            </AnimatedSection>
            <AnimatedSection direction="right" delay={0.15}>
              <span className="inline-block px-4 py-1.5 bg-[#CC0000]/10 text-[#CC0000] rounded-full mb-5" style={{ fontSize: 13, fontWeight: 600 }}>Cerita Kami</span>
              <h2 className="text-[#0f172a] mb-5" style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800, lineHeight: 1.15 }}>
                Dari Surabaya untuk <span className="text-[#CC0000]">Seluruh Indonesia</span>
              </h2>
              <p className="text-slate-600 mb-5" style={{ fontSize: 15, lineHeight: 1.8 }}>
                PT Acme Konstruksi bergerak dalam bidang kontraktor mekanikal, sipil, elektrikal & supplier. Berdiri sejak 2017 di Surabaya, Jawa Timur, kami konsisten memberikan karya nyata pada proyek-proyek pemerintah maupun swasta, dengan standar K3 (Keselamatan Kesehatan Kerja) di setiap pekerjaan.
              </p>
              <p className="text-slate-600 mb-7" style={{ fontSize: 15, lineHeight: 1.8 }}>
                Kepercayaan klien-klien besar seperti PT Industri Semen Contoh, Pembangkit Listrik Contoh, BUMN Karya Contoh, Gas Nusantara Contoh, dan PT Agro Contoh menjadi bukti komitmen kami terhadap kualitas dan ketepatan setiap pekerjaan yang dipercayakan.
              </p>
              <div className="flex flex-wrap gap-3">
                {["SBU KBLI Mekanikal", "SBU KBLI Konstruksi Gedung", "Izin Instalasi Listrik"].map((cert) => (
                  <span key={cert} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-100" style={{ fontSize: 12, fontWeight: 500 }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> {cert}
                  </span>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Visi & Misi */}
      <section className="py-20 lg:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 bg-[#CC0000]/10 text-[#CC0000] rounded-full mb-4" style={{ fontSize: 13, fontWeight: 600 }}>Visi & Misi</span>
              <h2 className="text-[#0f172a]" style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800 }}>Arah dan <span className="text-[#CC0000]">Tujuan</span> Kami</h2>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnimatedSection delay={0.1}>
              <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-sm border border-slate-100 h-full">
                <div className="w-14 h-14 rounded-2xl bg-[#CC0000]/10 flex items-center justify-center mb-6"><Eye className="w-7 h-7 text-[#CC0000]" /></div>
                <h3 className="text-[#0f172a] mb-4" style={{ fontSize: 22, fontWeight: 700 }}>Visi</h3>
                <p className="text-slate-600" style={{ fontSize: 16, lineHeight: 1.8 }}>PT. Acme Konstruksi akan menjadi salah satu perusahaan konstruksi terbaik di Indonesia dengan penekanan pada pertumbuhan yang berkelanjutan dan pembangunan kompetensi melalui pengembangan sumber daya manusia, manajemen teknologi, dan tata kelola perusahaan yang baik.</p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.2}>
              <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-sm border border-slate-100 h-full">
                <div className="w-14 h-14 rounded-2xl bg-[#CC0000]/10 flex items-center justify-center mb-6"><Target className="w-7 h-7 text-[#CC0000]" /></div>
                <h3 className="text-[#0f172a] mb-4" style={{ fontSize: 22, fontWeight: 700 }}>Misi</h3>
                <ul className="space-y-3">
                  {["Meningkatkan daya saing perusahaan di industri jasa konstruksi dengan mengembangkan pelayanan dan teknologi terbaik kepada konsumen dalam memenuhi harapan pemangku kepentingan.", "Meningkatkan pelatihan SDM untuk menghasilkan tenaga kerja yang berkualitas dan menciptakan lingkungan kerja yang kondusif, serta menyediakan lapangan kerja yang luas."].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#CC0000] shrink-0 mt-0.5" />
                      <span className="text-slate-600" style={{ fontSize: 15, lineHeight: 1.7 }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Nilai Inti */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 bg-[#CC0000]/10 text-[#CC0000] rounded-full mb-4" style={{ fontSize: 13, fontWeight: 600 }}>Nilai Inti</span>
              <h2 className="text-[#0f172a]" style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800 }}>Prinsip yang <span className="text-[#CC0000]">Kami Pegang</span></h2>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <StaggerChild key={v.title} index={i}>
                <div
                  className="bg-slate-50 rounded-2xl p-7 border border-slate-100 text-center cursor-default h-full hover:shadow-lg transition-shadow">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: `${v.color}12` }}>
                    <v.icon className="w-7 h-7" style={{ color: v.color }} />
                  </div>
                  <h3 className="text-[#0f172a] mb-2" style={{ fontSize: 18, fontWeight: 700 }}>{v.title}</h3>
                  <p className="text-slate-500" style={{ fontSize: 14, lineHeight: 1.7 }}>{v.desc}</p>
                </div>
              </StaggerChild>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 lg:py-28 bg-[#0f172a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 bg-white/10 text-[#F5F5F2] rounded-full mb-4" style={{ fontSize: 13, fontWeight: 600 }}>Perjalanan Kami</span>
              <h2 className="text-white" style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800 }}>Milestone <span className="text-[#F5F5F2]">Acme Grup</span></h2>
            </div>
          </AnimatedSection>
          <div className="relative">
            <div className="absolute left-4 lg:left-1/2 top-0 bottom-0 w-px bg-white/10 lg:-translate-x-px" />
            <div className="space-y-8 lg:space-y-12">
              {milestones.map((m, i) => (
                <AnimatedSection key={m.year} delay={i * 0.1} direction={i % 2 === 0 ? "left" : "right"}>
                  <div className={`relative flex items-start gap-6 lg:gap-0 ${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"}`}>
                    <div className="absolute left-4 lg:left-1/2 w-3 h-3 bg-[#CC0000] rounded-full ring-4 ring-[#CC0000]/20 -translate-x-1.5 lg:-translate-x-1.5 mt-1.5 z-10" />
                    <div className={`flex-1 ml-10 lg:ml-0 ${i % 2 === 0 ? "lg:pr-12 lg:text-right" : "lg:pl-12"}`}>
                      <span className="inline-block px-3 py-1 bg-[#CC0000]/15 text-[#F5F5F2] rounded-full mb-2" style={{ fontSize: 13, fontWeight: 700 }}>{m.year}</span>
                      <h3 className="text-white mb-1.5" style={{ fontSize: 18, fontWeight: 700 }}>{m.title}</h3>
                      <p className="text-slate-400" style={{ fontSize: 14, lineHeight: 1.7 }}>{m.desc}</p>
                    </div>
                    <div className="hidden lg:block flex-1" />
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 bg-[#CC0000]/10 text-[#CC0000] rounded-full mb-4" style={{ fontSize: 13, fontWeight: 600 }}>Tim Kami</span>
              <h2 className="text-[#0f172a]" style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800 }}>Jajaran <span className="text-[#CC0000]">Direksi</span></h2>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {leadership.map((l, i) => (
              <StaggerChild key={l.name} index={i}>
                <div
                  className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center hover:shadow-lg transition-shadow">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#CC0000] to-[#9B0000] rounded-2xl flex items-center justify-center text-white" style={{ fontSize: 24, fontWeight: 800 }}>{l.initial}</div>
                  <h3 className="text-[#0f172a] mb-1" style={{ fontSize: 16, fontWeight: 700 }}>{l.name}</h3>
                  <p className="text-slate-500" style={{ fontSize: 13 }}>{l.role}</p>
                </div>
              </StaggerChild>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-20 lg:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <AnimatedSection>
              <span className="inline-block px-4 py-1.5 bg-[#CC0000]/10 text-[#CC0000] rounded-full mb-5" style={{ fontSize: 13, fontWeight: 600 }}>Sertifikasi & Legalitas</span>
              <h2 className="text-[#0f172a] mb-5" style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800, lineHeight: 1.15 }}>Standar <span className="text-[#CC0000]">Internasional</span></h2>
              <p className="text-slate-600 mb-8" style={{ fontSize: 15, lineHeight: 1.8 }}>Kami memegang berbagai sertifikasi nasional dan internasional sebagai bukti komitmen terhadap mutu, keselamatan, dan pengelolaan lingkungan.</p>
              <div className="space-y-3">
                {certifications.map((cert, i) => (
                  <AnimatedSection key={cert} delay={i * 0.08}>
                    <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-[#0f172a]" style={{ fontSize: 14, fontWeight: 500 }}>{cert}</p>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </AnimatedSection>
            <AnimatedSection direction="right" delay={0.15}>
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <ImageWithFallback src={BLUEPRINT_IMG} alt="Blueprint" className="w-full h-[400px] lg:h-[500px] object-cover" />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-[#111418] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#CC0000]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#3b82f6]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <AnimatedSection>
            <h2 className="text-white mb-5" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, lineHeight: 1.15 }}>Tertarik Bekerja Sama?</h2>
            <p className="text-blue-200/80 mb-10 max-w-xl mx-auto" style={{ fontSize: 17, lineHeight: 1.8 }}>Diskusikan proyek Anda bersama tim kami. Konsultasi awal gratis tanpa kewajiban.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/kontak"
                className="px-8 py-4 bg-[#CC0000] hover:bg-[#A30000] text-white rounded-xl cursor-pointer shadow-lg shadow-[#CC0000]/30 flex items-center gap-2" style={{ fontSize: 16, fontWeight: 700 }}>
                <Phone className="w-5 h-5" /> Hubungi Kami
              </a>
              <a href="/portofolio"
                className="px-8 py-4 border-2 border-white/40 text-white rounded-xl hover:bg-white/10 cursor-pointer flex items-center gap-2 transition-colors" style={{ fontSize: 16, fontWeight: 600 }}>
                Lihat Proyek <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}

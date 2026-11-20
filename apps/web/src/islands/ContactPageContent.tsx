import { MapPin, Phone, Mail, MessageCircle, Clock, Building2 } from "lucide-react";
import { AnimatedSection } from '../components/AnimatedSection';

const contactInfo = [
  {
    icon: MapPin,
    label: "Kantor",
    value: "Jl. Contoh Raya No. 1, Surabaya",
    color: "#CC0000",
  },
  {
    icon: Phone,
    label: "Telepon",
    value: "+62 800 0000 0001",
    color: "#CC0000",
  },
  {
    icon: Mail,
    label: "Email",
    value: "info@acme.example",
    color: "#10b981",
  },
  {
    icon: Clock,
    label: "Jam Kerja",
    value: "Senin – Jumat, 08:00 – 17:00 WIB",
    color: "#8b5cf6",
  },
];

const inputCls =
  "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-all";

export default function ContactPageContent() {
  return (
    <div className="overflow-hidden">
      {/* HERO */}
      <section className="relative bg-[#0f172a] py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] to-[#CC0000]/30" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#CC0000]/15 border border-[#CC0000]/30 text-[#F5F5F2] rounded-full mb-6"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            <span className="w-2 h-2 bg-[#CC0000] rounded-full" />
            Hubungi Kami
          </span>
          <h1
            className="text-white mb-5"
            style={{ fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 800, lineHeight: 1.1 }}
          >
            Mari{" "}
            <span className="text-white">Berdiskusi</span>{" "}
            tentang Proyek Anda
          </h1>
          <p
            className="text-slate-400 max-w-xl mx-auto"
            style={{ fontSize: 17, lineHeight: 1.8 }}
          >
            Siap membantu Anda mewujudkan proyek konstruksi impian. Konsultasi awal gratis!
          </p>
        </div>
      </section>

      {/* FORM + SIDEBAR */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Form */}
            <div className="lg:col-span-3">
              <AnimatedSection>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8 shadow-sm">
                  <h2 className="text-[#0f172a] mb-2" style={{ fontSize: 22, fontWeight: 700 }}>Kirim Pesan</h2>
                  <p className="text-slate-500 mb-6" style={{ fontSize: 14 }}>Isi formulir di bawah dan kami akan menghubungi Anda.</p>
                  {/* shortcut: form belum terhubung ke backend (tanpa JS, submit memuat ulang halaman); sambungkan di W3-04 */}
                  <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-slate-700 mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>Nama Lengkap *</label>
                        <input className={inputCls} style={{ fontSize: 14 }} required placeholder="Masukkan nama Anda" />
                      </div>
                      <div>
                        <label className="block text-slate-700 mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>Email *</label>
                        <input type="email" className={inputCls} style={{ fontSize: 14 }} required placeholder="nama@email.com" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-slate-700 mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>Perusahaan</label>
                        <input className={inputCls} style={{ fontSize: 14 }} placeholder="Nama perusahaan (opsional)" />
                      </div>
                      <div>
                        <label className="block text-slate-700 mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>No. Telepon</label>
                        <input type="tel" className={inputCls} style={{ fontSize: 14 }} placeholder="+62 xxx xxxx xxxx" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>Kategori Layanan</label>
                      <select className={`${inputCls} appearance-none`} style={{ fontSize: 14 }}>
                        <option>Pilih kategori...</option>
                        <option>Instalasi Mekanikal</option>
                        <option>Konstruksi Gedung &amp; Sipil</option>
                        <option>Instalasi Tenaga Listrik</option>
                        <option>Fabrikasi &amp; Supplier</option>
                        <option>Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1.5" style={{ fontSize: 13, fontWeight: 500 }}>Detail Proyek *</label>
                      <textarea
                        rows={5}
                        className={`${inputCls} resize-none`}
                        style={{ fontSize: 14 }}
                        required
                        placeholder="Ceritakan tentang proyek Anda: lokasi, ukuran, anggaran estimasi, dan timeline yang diharapkan..."
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3.5 bg-[#CC0000] hover:bg-[#A30000] text-white rounded-xl transition-colors cursor-pointer shadow-lg shadow-[#CC0000]/20"
                      style={{ fontSize: 16, fontWeight: 600 }}
                    >
                      Kirim Pesan
                    </button>
                  </form>
                </div>
              </AnimatedSection>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-6">
              <AnimatedSection direction="right" delay={0.1}>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <h3 className="text-[#0f172a] mb-5" style={{ fontSize: 18, fontWeight: 700 }}>Kantor Pusat</h3>
                  <div className="space-y-5">
                    {contactInfo.map((c) => (
                      <div key={c.label} className="flex items-start gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${c.color}12` }}
                        >
                          <c.icon className="w-5 h-5" style={{ color: c.color }} />
                        </div>
                        <div>
                          <p className="text-[#0f172a]" style={{ fontSize: 14, fontWeight: 600 }}>{c.label}</p>
                          <p className="text-slate-500 mt-0.5" style={{ fontSize: 14 }}>{c.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedSection>

              <AnimatedSection direction="right" delay={0.2}>
                <a
                  href="https://wa.me/6280000000001"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 bg-[#25d366] hover:bg-[#1fb855] text-white rounded-2xl p-5 transition-colors shadow-lg shadow-[#25d366]/20 block"
                >
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 700 }}>Chat via WhatsApp</p>
                    <p className="text-white/80" style={{ fontSize: 13 }}>Respon cepat 08.00 - 17.00 WIB</p>
                  </div>
                </a>
              </AnimatedSection>

              <AnimatedSection direction="right" delay={0.3}>
                <div className="bg-[#0f172a] rounded-2xl overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Building2 className="w-5 h-5 text-[#F5F5F2]" />
                      <h3 className="text-white" style={{ fontSize: 16, fontWeight: 700 }}>PT Acme Konstruksi</h3>
                    </div>
                    <p className="text-slate-400" style={{ fontSize: 13, lineHeight: 1.7 }}>
                      <strong className="text-white/80">Kantor:</strong><br />
                      Jl. Contoh Raya No. 1<br />
                      Surabaya, Jawa Timur<br />
                      <br />
                      <strong className="text-white/80">Workshop:</strong><br />
                      Jl. Industri Contoh No. 2<br />
                      Sidoarjo, Jawa Timur<br />
                      +62 800 0000 0002
                    </p>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

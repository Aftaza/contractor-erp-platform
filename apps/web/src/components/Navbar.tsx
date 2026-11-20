import { useState, useEffect } from "react";
import { Menu, X, Phone, ArrowUp } from "lucide-react";

const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/tentang", label: "Tentang" },
  { href: "/layanan", label: "Layanan" },
  { href: "/portofolio", label: "Proyek" },
  { href: "/kontak", label: "Kontak" },
];

interface NavbarProps {
  currentPath: string;
  logoSrc: string;
}

export default function Navbar({ currentPath, logoSrc }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
      setShowBackToTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return currentPath === "/" || currentPath === "";
    return currentPath === href;
  };

  return (
    <>
      <nav
        className={`sticky top-0 z-50 backdrop-blur-lg border-b border-slate-100/80 transition-colors duration-300 ${scrolled ? "bg-white/95 shadow-[0_1px_0_#D9DDE1]" : "bg-white/85"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[72px]">
            {/* Logo */}
            <a href="/" className="flex items-center group">
              <img
                src={logoSrc}
                alt="PT Acme Konstruksi"
                height={40}
                className="h-10 w-auto object-contain transition-opacity duration-300 group-hover:opacity-80"
                loading="eager"
              />
            </a>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive(l.href)
                      ? "text-[#CC0000] bg-[#CC0000]/5"
                      : "text-slate-600 hover:text-[#CC0000] hover:bg-slate-50"
                  }`}
                  style={{ fontSize: 15, fontWeight: 500 }}
                >
                  {l.label}
                </a>
              ))}
            </div>

            {/* CTA + Hamburger */}
            <div className="flex items-center gap-3">
              <a
                href="/kontak"
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-[#CC0000] hover:bg-[#A30000] text-white rounded-xl transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-[#CC0000]/20"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                <Phone className="w-3.5 h-3.5" />
                Ajukan Penawaran
              </a>
              <button
                className="lg:hidden text-slate-600 cursor-pointer p-1"
                aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden overflow-hidden bg-white border-t border-slate-100">
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((l) => (
                <div key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-xl transition-colors ${
                      isActive(l.href)
                        ? "bg-[#CC0000]/5 text-[#CC0000]"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                    style={{ fontSize: 15, fontWeight: 500 }}
                  >
                    {l.label}
                  </a>
                </div>
              ))}
              <div>
                <a
                  href="/kontak"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full mt-3 px-5 py-3.5 bg-[#CC0000] hover:bg-[#A30000] text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                  style={{ fontSize: 14, fontWeight: 600 }}
                >
                  <Phone className="w-4 h-4" />
                  Ajukan Penawaran
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Back to Top */}
      {showBackToTop && (
        <button
          aria-label="Kembali ke atas"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#CC0000] hover:bg-[#A30000] text-white rounded-xl shadow-lg cursor-pointer flex items-center justify-center transition-colors duration-300"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </>
  );
}

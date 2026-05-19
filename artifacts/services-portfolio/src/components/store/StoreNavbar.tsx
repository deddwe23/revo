import { ShoppingBag, Store } from "lucide-react";
import { useLocation } from "wouter";

interface StoreNavbarProps {
  activePath?: "/" | "/products";
}

export default function StoreNavbar({ activePath = "/products" }: StoreNavbarProps) {
  const [, navigate] = useLocation();

  const links = [
    { label: "الرئيسية", href: "/" as const },
    { label: "المنتجات", href: "/products" as const },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-white/10">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <button type="button" onClick={() => navigate("/")} className="inline-flex items-center gap-3 text-right text-white transition hover:text-white/90">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-[0_0_15px_rgba(124,58,237,0.35)]">
            <Store className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-xs font-bold text-white/50">متجر الخدمات الرقمية</span>
            <span className="block text-lg font-extrabold">DEVSTORE</span>
          </span>
        </button>

        <div className="flex items-center gap-3 sm:gap-6">
          {links.map((link) => {
            const isActive = activePath === link.href;

            return (
              <button
                key={link.href}
                type="button"
                onClick={() => navigate(link.href)}
                className={`relative inline-flex items-center gap-2 px-1 py-2 text-sm font-bold transition sm:text-base ${
                  isActive ? "text-white" : "text-white/65 hover:text-white"
                }`}
              >
                {link.href === "/products" ? <ShoppingBag className="h-4 w-4" /> : null}
                {link.label}
                <span
                  className={`absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-primary to-secondary transition-opacity ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
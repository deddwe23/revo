import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface StoreBreadcrumbsProps {
  items: BreadcrumbItem[];
  theme?: "light" | "dark";
}

export default function StoreBreadcrumbs({ items, theme = "light" }: StoreBreadcrumbsProps) {
  const [, navigate] = useLocation();
  const isDark = theme === "dark";

  return (
    <div
      className={
        isDark
          ? "w-full border-y border-white/10 bg-[linear-gradient(90deg,rgba(20,11,48,0.95),rgba(12,22,52,0.94),rgba(20,11,48,0.95))]"
          : "w-full border-y border-slate-200/80 bg-white/90"
      }
    >
      <div className={`mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-3 text-sm md:px-[5vw] ${isDark ? "text-slate-300" : "text-slate-600"}`}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <div key={`${item.label}-${index}`} className="inline-flex items-center gap-2 rounded-full px-1.5 py-0.5">
              {item.href && !isLast ? (
                <button
                  type="button"
                  onClick={() => navigate(item.href as never)}
                  className={`font-extrabold transition ${isDark ? "text-slate-200 hover:text-white" : "hover:text-slate-900"}`}
                >
                  {item.label}
                </button>
              ) : (
                <span className={isLast ? (isDark ? "font-extrabold text-white" : "font-extrabold text-slate-900") : "font-extrabold"}>{item.label}</span>
              )}

              {!isLast ? <ChevronLeft className={`h-4 w-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
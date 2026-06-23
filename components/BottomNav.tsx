"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "기록", icon: "🍚" },
  { href: "/history", label: "히스토리", icon: "📊" },
  { href: "/weight", label: "체중", icon: "⚖️" },
  { href: "/report", label: "보고서", icon: "📝" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {tabs.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs transition ${
                  active ? "text-neutral-900" : "text-neutral-400"
                }`}
              >
                <span className={`text-xl ${active ? "" : "grayscale"}`}>
                  {tab.icon}
                </span>
                <span className={active ? "font-semibold" : ""}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

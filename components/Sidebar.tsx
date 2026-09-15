"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/retailers", label: "Retailers" },
  { href: "/stores", label: "Stores" },
  { href: "/devices", label: "Devices" },
  { href: "/products", label: "Products" },
  { href: "/purchases", label: "Purchases" },
  { href: "/inventory", label: "Inventory" },
  { href: "/fba-shipments", label: "FBA Shipments" },
  { href: "/settings", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-surface min-h-screen p-4 flex flex-col gap-1">
      <div className="px-3 py-4 mb-2">
        <div className="text-sm font-semibold text-gray-100">Retail Arbitrage</div>
        <div className="text-xs text-muted">FBA Opportunity Engine</div>
      </div>
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("nav-link", active && "nav-link-active")}
          >
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}

"use client";

import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import type { CollectedEdition } from "@/lib/types";
import { DollarSign, ShoppingCart, AlertTriangle, Clock, Monitor } from "lucide-react";

interface PurchasePlannerProps {
  pathName: string;
  pathSlug: string;
  inPrint: CollectedEdition[];
  outOfPrint: CollectedEdition[];
  upcoming: CollectedEdition[];
  digitalOnly: CollectedEdition[];
  totalCover: number;
}

function EditionRow({ edition }: { edition: CollectedEdition }) {
  return (
    <Link href={`/edition/${edition.slug}`} className="group">
      <div
        className="flex items-center justify-between gap-3 p-3 rounded-lg border transition-all hover:border-[var(--accent-red)]"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold group-hover:text-[var(--accent-red)] transition-colors truncate">
            {edition.title}
          </h4>
          <p
            className="text-xs mt-0.5 truncate"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
          >
            {edition.issues_collected}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ImportanceBadge level={edition.importance} />
          <StatusBadge status={edition.print_status} />
          {edition.cover_price ? (
            <span
              className="text-xs font-mono"
              style={{ color: "var(--accent-green)" }}
            >
              ${edition.cover_price}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function StatusSection({
  title,
  icon,
  color,
  editions,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  editions: CollectedEdition[];
  emptyText: string;
}) {
  if (editions.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3
          className="text-lg font-bold tracking-tight"
          style={{ fontFamily: "var(--font-bricolage), sans-serif", color }}
        >
          {title.toUpperCase()}
        </h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-mono"
          style={{ background: color + "20", color }}
        >
          {editions.length}
        </span>
      </div>
      <div className="space-y-2">
        {editions.map((ed) => (
          <EditionRow key={ed.slug} edition={ed} />
        ))}
      </div>
    </div>
  );
}

export default function PurchasePlanner({
  pathName,
  pathSlug,
  inPrint,
  outOfPrint,
  upcoming,
  digitalOnly,
  totalCover,
}: PurchasePlannerProps) {
  const totalEditions = inPrint.length + outOfPrint.length + upcoming.length + digitalOnly.length;
  const buyableNow = inPrint.length;
  const needsWaiting = outOfPrint.length + upcoming.length;

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div
          className="rounded-lg border p-4 text-center"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <div className="text-2xl font-bold" style={{ color: "var(--accent-green)" }}>
            {buyableNow}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            Available Now
          </div>
        </div>
        <div
          className="rounded-lg border p-4 text-center"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <div className="text-2xl font-bold" style={{ color: "var(--accent-red)" }}>
            {outOfPrint.length}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            Out of Print
          </div>
        </div>
        <div
          className="rounded-lg border p-4 text-center"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <div className="text-2xl font-bold" style={{ color: "var(--accent-purple)" }}>
            {upcoming.length}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            Upcoming
          </div>
        </div>
        <div
          className="rounded-lg border p-4 text-center"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {totalEditions}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            Total Editions
          </div>
        </div>
      </div>

      {/* Estimated cost */}
      {totalCover > 0 && (
        <div
          className="rounded-lg border p-4 mb-8 flex items-center gap-3"
          style={{ background: "var(--bg-tertiary)", borderColor: "var(--border-default)" }}
        >
          <DollarSign size={20} style={{ color: "var(--accent-gold)" }} />
          <div>
            <div className="text-sm font-bold">
              Estimated Cover Price Total:{" "}
              <span style={{ color: "var(--accent-gold)" }}>
                ${totalCover.toFixed(2)}
              </span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Check IST, DCBS, or CGN for 30-50% discounts on in-print editions
            </div>
          </div>
        </div>
      )}

      {/* Grouped editions */}
      <StatusSection
        title="Available Now"
        icon={<ShoppingCart size={18} style={{ color: "var(--accent-green)" }} />}
        color="var(--accent-green)"
        editions={inPrint}
        emptyText="No editions currently in print"
      />

      <StatusSection
        title="Out of Print"
        icon={<AlertTriangle size={18} style={{ color: "var(--accent-red)" }} />}
        color="var(--accent-red)"
        editions={outOfPrint}
        emptyText=""
      />

      <StatusSection
        title="Upcoming / Reprinting"
        icon={<Clock size={18} style={{ color: "var(--accent-purple)" }} />}
        color="var(--accent-purple)"
        editions={upcoming}
        emptyText=""
      />

      <StatusSection
        title="Digital Only"
        icon={<Monitor size={18} style={{ color: "var(--accent-blue)" }} />}
        color="var(--accent-blue)"
        editions={digitalOnly}
        emptyText=""
      />

      {/* Buy tips */}
      {needsWaiting > 0 && (
        <div
          className="rounded-lg border p-4 mt-4"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--accent-gold)" + "40" }}
        >
          <h4 className="text-sm font-bold mb-2" style={{ color: "var(--accent-gold)" }}>
            Collector Tips
          </h4>
          <ul className="text-xs space-y-1" style={{ color: "var(--text-secondary)" }}>
            <li>Check eBay for OOP editions — prices vary widely, be patient for good deals</li>
            <li>Marvel Unlimited ($10/mo) has nearly everything digitally with a 3-month delay</li>
            <li>InStockTrades and DCBS offer 30-50% off cover for in-print books</li>
            <li>Pre-order upcoming reprints at DCBS for the best discount</li>
          </ul>
        </div>
      )}
    </div>
  );
}

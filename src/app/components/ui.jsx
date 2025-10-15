"use client";

export const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 shadow-[inset_0_0_0_1px_rgba(255,255,255,.6)]">
    {children}
  </span>
);

export const SectionTitle = ({ children }) => (
  <h3 className="text-sm font-semibold text-slate-800 tracking-wide">
    {children}
  </h3>
);

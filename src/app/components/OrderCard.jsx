"use client";

import { useState } from "react";
import { ALL_ICONS, isBusinessCard } from "../components/order-helpers";
import { SectionTitle } from "./ui";

/* ======= tiny helpers ======= */
const _norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const toDataUrl = (file) =>
  new Promise((resolve) => {
    if (!file) return resolve("");
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.readAsDataURL(file);
  });

/* ======= small UI bits ======= */
function ProductCallBanner({ name, tel = "+919424498204" }) {
  return (
    <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 shadow">
      <div className="text-sm font-semibold">
        Take a screenshot of this number. Then call us to submit your details.
        Tell us your 4-digit order ID (shown above) and your product name (shown above the call button).
      </div>
      <ul className="mt-1 list-disc pl-5 text-sm">
        <li>{name}</li>
      </ul>
      <button
        type="button"
        onClick={() => typeof window !== "undefined" && window.open(`tel:${tel}`, "_self")}
        className="mt-3 inline-flex items-center rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-xs font-bold text-white shadow transition-transform hover:scale-105"
      >
        📞 Call Us Now: {tel.replace(/^\+91/, "")}
      </button>
    </div>
  );
}

/* ======= icons + “Other” text field ======= */
function IconSlot({ value, onChange, custom, onCustomChange, disabled, label }) {
  const showCustom = value === "Other" || (!!value && !ALL_ICONS.includes(value));
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <select
        value={
          value && ALL_ICONS.includes(value)
            ? value
            : value === "" || showCustom
            ? value === ""
              ? ""
              : "Other"
            : value
        }
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 hover:shadow-sm disabled:bg-slate-100"
      >
        <option value="">Select icon</option>
        {ALL_ICONS.map((ic) => (
          <option key={ic} value={ic}>
            {ic}
          </option>
        ))}
      </select>

      {showCustom && (
        <input
          type="text"
          value={custom || ""}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="Enter custom icon name"
          disabled={disabled}
          className="w-full rounded-lg border border-indigo-300/70 bg-indigo-50/40 px-3 py-2 text-sm outline-none transition placeholder:text-indigo-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
        />
      )}
    </div>
  );
}

/* ======= file picker with preview ======= */
function FilePicker({ label, onPick, preview, disabled, dashed = true }) {
  return (
    <div className="mt-2">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <label
        className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border ${
          dashed ? "border-dashed" : ""
        } border-slate-300 bg-slate-50/60 px-3 py-3 text-sm transition hover:bg-slate-100`}
      >
        <span className="text-slate-700">Choose file</span>
        <input type="file" accept="image/*" onChange={onPick} disabled={disabled} className="hidden" />
        <span className="text-slate-400">Browse</span>
      </label>
      {preview ? (
        <img src={preview} alt="preview" className="mt-3 h-24 w-24 rounded-md border object-cover shadow-sm" />
      ) : null}
    </div>
  );
}

/* ======= grouping helpers ======= */
function makeEvenSplit(q) {
  const a = Math.ceil(q / 2);
  const b = q - a;
  return b ? [a, b] : [a];
}
function makeAltSplit(q) {
  const a = Math.max(1, q - 1);
  const b = q - a;
  return b ? [a, b] : [a];
}
function membersForPattern(q, pattern) {
  const out = [];
  let cur = 1;
  for (const size of pattern) {
    const g = [];
    for (let i = 0; i < size && cur <= q; i++, cur++) g.push(cur);
    if (g.length) out.push(g);
  }
  return out;
}

/* ======================= MAIN ======================= */

export default function OrderCard({
  order,
  form,
  onBizChange,
  expanded,
  toggleExpanded,
  unknownProducts = [],
  supportNumber = "+919424498204",
  onAfterSubmit, // parent passes a reload handler
}) {
  if (!form) return null;

  const quantity = Number(order.quantity || form.quantity || 1);
  const products = form.products || [];

  // per-product quantity editor state
  const [perProdState, setPerProdState] = useState(() =>
    products.map((prod, pi) => {
      const slots = form.iconsSelected?.[pi]?.length || 4;
      const baseIcons = Array(slots).fill("");

      return {
        mode: quantity > 1 && !isBusinessCard(prod) ? "groups" : "same",
        same: {
          icons: baseIcons.slice(),
          custom: Array(slots).fill(""),
          logoFile: null,
          logoPreview: "",
          upiFile: null,
          upiPreview: "",
        },
        items: Array.from({ length: quantity }).map(() => ({
          icons: baseIcons.slice(),
          custom: Array(slots).fill(""),
          logoFile: null,
          logoPreview: "",
          upiFile: null,
          upiPreview: "",
        })),
        groups: (() => {
          const pattern = quantity <= 1 ? [1] : makeEvenSplit(quantity);
          const members = membersForPattern(quantity, pattern);
          return members.map((m, gi) => ({
            name: String.fromCharCode(65 + gi),
            members: m,
            icons: baseIcons.slice(),
            custom: Array(slots).fill(""),
            logoFile: null,
            logoPreview: "",
            upiFile: null,
            upiPreview: "",
          }));
        })(),
      };
    })
  );

  const updateProdState = (pi, updater) =>
    setPerProdState((prev) => prev.map((p, i) => (i === pi ? (typeof updater === "function" ? updater(p) : updater) : p)));

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  /* ===== Build payload and submit to /api/update-business-shopify ===== */
  async function handleSave() {
    try {
      setSaving(true);
      setToast("");

      const businessName = form.biz || "";
      const orderId = order.order_name;

      const payload = {
        orderId,
        businessName,
        customerNames: form.customerNames || [],
        products: [],
      };

      for (let pi = 0; pi < products.length; pi++) {
        const prodName = products[pi];
        const card = isBusinessCard(prodName);
        const state = perProdState[pi];

        const materializeIcons = (values, customs) =>
          (values || []).map((v, idx) => {
            if (v === "Other") return (customs?.[idx] || "").trim() || "Other";
            if (!ALL_ICONS.includes(v)) return (v || "").trim();
            return v;
          });

        if (card || quantity <= 1 || state.mode === "same") {
          const icons = materializeIcons(state.same.icons, state.same.custom);
          const logo_url = await toDataUrl(state.same.logoFile);
          const confirm_img = await toDataUrl(state.same.upiFile);

          payload.products.push({
            product_name: prodName,
            icons,
            logo_url,
            confirm_img,
            quantity,
          });
        } else if (state.mode === "items") {
          for (let i = 0; i < quantity; i++) {
            const it = state.items[i];
            const icons = materializeIcons(it.icons, it.custom);
            const logo_url = await toDataUrl(it.logoFile);
            const confirm_img = await toDataUrl(it.upiFile);

            payload.products.push({
              product_name: `${prodName} #${i + 1}`,
              icons,
              logo_url,
              confirm_img,
              item_no: i + 1,
            });
          }
        } else if (state.mode === "groups") {
          for (let gi = 0; gi < state.groups.length; gi++) {
            const g = state.groups[gi];
            const icons = materializeIcons(g.icons, g.custom);
            const logo_url = await toDataUrl(g.logoFile);
            const confirm_img = await toDataUrl(g.upiFile);

            payload.products.push({
              product_name: `${prodName} [Group ${g.name}]`,
              icons,
              logo_url,
              confirm_img,
              members: g.members,
            });
          }
        }
      }

      const res = await fetch("/api/update-business-shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to save");
      }

      setToast("Saved ✅");
      // Ask parent to reload orders so this card disappears / shows 'already submitted'
      if (typeof onAfterSubmit === "function") onAfterSubmit();
    } catch (e) {
      setToast(`Failed to save: ${e?.message || e}`);
    } finally {
      setSaving(false);
      setTimeout(() => setToast(""), 4000);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="group w-full flex items-center justify-between gap-4 px-4 sm:px-6 py-4 text-left transition-colors hover:bg-gradient-to-r hover:from-indigo-50/70 hover:to-sky-50/70"
      >
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-slate-900">Order #{order.order_name}</span>
            <span className="inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-medium">
              {order.payment_status || "payment"}
            </span>
            {order.fulfillment_status && (
              <span className="inline-flex items-center rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-xs font-medium">
                {order.fulfillment_status}
              </span>
            )}
          </div>
          <div className="text-sm text-slate-600 line-clamp-1">
            {order.product_name || "—"}{" "}
            {quantity ? <span className="text-slate-500">(Qty: {quantity})</span> : null}
          </div>
        </div>

        <svg
          className={`h-5 w-5 text-slate-500 transition-transform group-hover:text-slate-700 ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 sm:px-6 pb-6">
          {/* Business Name */}
          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Business Name <span className="text-slate-500">(Printed over the standee)</span>
            </label>
            <input
              type="text"
              value={form.biz}
              onChange={(e) => onBizChange(e.target.value)}
              disabled={saving}
              placeholder="Your shop / clinic / brand name"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100"
            />
          </div>

          {/* Products */}
          <div className="space-y-10">
            {products.map((prod, pi) => {
              const isCard = isBusinessCard(prod);
              const isUnknown = (unknownProducts || []).some((u) => _norm(u) === _norm(prod));
              const slots = form.iconsSelected?.[pi]?.length || 4;
              const state = perProdState[pi];
              const mode = state.mode;

              if (isUnknown) {
                return (
                  <div key={pi} className="border-t border-slate-200 pt-6 first:border-0 first:pt-0">
                    <ProductCallBanner name={prod} tel={supportNumber} />
                  </div>
                );
              }

              return (
                <div key={pi} className="border-t border-slate-200 pt-6 first:border-0 first:pt-0">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <SectionTitle>
                      {prod} {quantity ? <span className="text-sm font-normal text-slate-500">(Qty: {quantity})</span> : null}
                    </SectionTitle>
                    {isCard ? (
                      <span className="rounded-full bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 px-2 py-0.5 text-[11px]">
                        Business Card
                      </span>
                    ) : (
                      <span className="rounded-full bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 text-[11px]">
                        Standee / Product
                      </span>
                    )}
                  </div>

                  {/* If business card or qty 1 → single block */}
                  {isCard || quantity <= 1 ? (
                    <SingleEditor
                      slots={slots}
                      state={state.same}
                      disabled={saving}
                      onChange={(patch) => updateProdState(pi, (p) => ({ ...p, same: { ...p.same, ...patch } }))}
                    />
                  ) : (
                    <>
                      {/* Mode selector */}
                      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { key: "same", title: "Same for all", desc: `Apply one logo, icons & UPI to all ${quantity}` },
                          { key: "items", title: "Different per item", desc: "Customize each piece separately" },
                          { key: "groups", title: "Group by sets", desc: "Share settings within groups (e.g., 2+2)" },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => updateProdState(pi, (p) => ({ ...p, mode: opt.key }))}
                            className={`rounded-xl border p-3 text-left transition hover:bg-slate-50 ${
                              mode === opt.key ? "border-indigo-400 bg-indigo-50" : "border-slate-200"
                            }`}
                            disabled={saving}
                          >
                            <div className="font-semibold text-sm">{opt.title}</div>
                            <div className="text-xs text-slate-500">{opt.desc}</div>
                          </button>
                        ))}
                      </div>

                      {mode === "same" && (
                        <SingleEditor
                          slots={slots}
                          state={state.same}
                          disabled={saving}
                          onChange={(patch) => updateProdState(pi, (p) => ({ ...p, same: { ...p.same, ...patch } }))}
                        />
                      )}

                      {mode === "items" && (
                        <ItemsEditor
                          quantity={quantity}
                          slots={slots}
                          items={state.items}
                          disabled={saving}
                          onChangeItem={(idx, patch) =>
                            updateProdState(pi, (p) => {
                              const next = p.items.slice();
                              next[idx] = { ...next[idx], ...patch };
                              return { ...p, items: next };
                            })
                          }
                        />
                      )}

                      {mode === "groups" && (
                        <GroupsEditor
                          quantity={quantity}
                          slots={slots}
                          groups={state.groups}
                          disabled={saving}
                          onSplit={(pattern) =>
                            updateProdState(pi, (p) => {
                              const mems = membersForPattern(quantity, pattern);
                              const next = mems.map((m, gi) => {
                                const was = p.groups[gi];
                                return {
                                  name: was?.name || String.fromCharCode(65 + gi),
                                  members: m,
                                  icons: was?.icons?.length === slots ? was.icons : Array(slots).fill(""),
                                  custom: was?.custom?.length === slots ? was.custom : Array(slots).fill(""),
                                  logoFile: was?.logoFile || null,
                                  logoPreview: was?.logoPreview || "",
                                  upiFile: was?.upiFile || null,
                                  upiPreview: was?.upiPreview || "",
                                };
                              });
                              return { ...p, groups: next };
                            })
                          }
                          onChangeGroup={(gi, patch) =>
                            updateProdState(pi, (p) => {
                              const next = p.groups.slice();
                              next[gi] = { ...next[gi], ...patch };
                              return { ...p, groups: next };
                            })
                          }
                          onRenameGroup={(gi, name) =>
                            updateProdState(pi, (p) => {
                              const next = p.groups.slice();
                              next[gi] = { ...next[gi], name };
                              return { ...p, groups: next };
                            })
                          }
                          onReassignItem={(itemNo, targetGi) =>
                            updateProdState(pi, (p) => {
                              // remove from all groups
                              const next = p.groups.map((g) => ({
                                ...g,
                                members: (g.members || []).filter((n) => n !== itemNo),
                              }));
                              // add to target
                              const tgt = next[targetGi] || next[0];
                              const merged = Array.from(new Set([...(tgt.members || []), itemNo])).sort((a, b) => a - b);
                              next[targetGi] = { ...tgt, members: merged };
                              return { ...p, groups: next };
                            })
                          }
                          onAddGroup={() =>
                            updateProdState(pi, (p) => {
                              const gi = p.groups.length;
                              return {
                                ...p,
                                groups: [
                                  ...p.groups,
                                  {
                                    name: String.fromCharCode(65 + gi),
                                    members: [],
                                    icons: Array(slots).fill(""),
                                    custom: Array(slots).fill(""),
                                    logoFile: null,
                                    logoPreview: "",
                                    upiFile: null,
                                    upiPreview: "",
                                  },
                                ],
                              };
                            })
                          }
                          onRemoveGroup={(gi) =>
                            updateProdState(pi, (p) => {
                              if (p.groups.length <= 1) return p;
                              const toMove = p.groups[gi]?.members || [];
                              const keep = p.groups.filter((_, i) => i !== gi);
                              // move members to Group A
                              const g0 = keep[0];
                              const merged = Array.from(new Set([...(g0.members || []), ...toMove])).sort((a, b) => a - b);
                              keep[0] = { ...g0, members: merged };
                              // re-label names A, B, C ...
                              const relabeled = keep.map((g, idx) => ({ ...g, name: String.fromCharCode(65 + idx) }));
                              return { ...p, groups: relabeled };
                            })
                          }
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Single submit button */}
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-slate-500">{toast}</div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================= EDITORS ======================= */

function SingleEditor({ slots, state, onChange, disabled }) {
  const hasUPI = (state.icons || []).includes("UPI");

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FilePicker
            label="Logo (PNG/JPG)"
            dashed
            disabled={disabled}
            preview={state.logoPreview}
            onPick={async (e) => {
              const file = e.target.files?.[0] || null;
              const preview = file ? await toDataUrl(file) : "";
              onChange({ logoFile: file, logoPreview: preview });
            }}
          />
        </div>
        <div>
          {hasUPI && (
            <FilePicker
              label="UPI QR (PNG/JPG)"
              dashed
              disabled={disabled}
              preview={state.upiPreview}
              onPick={async (e) => {
                const file = e.target.files?.[0] || null;
                const preview = file ? await toDataUrl(file) : "";
                onChange({ upiFile: file, upiPreview: preview });
              }}
            />
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: slots }).map((_, ii) => (
          <IconSlot
            key={ii}
            label={`Icon slot ${ii + 1}`}
            value={state.icons[ii] || ""}
            custom={state.custom[ii] || ""}
            disabled={disabled}
            onChange={(val) => {
              const next = state.icons.slice();
              next[ii] = val;
              onChange({ icons: next });
            }}
            onCustomChange={(txt) => {
              const next = state.custom.slice();
              next[ii] = txt;
              onChange({ custom: next });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ItemsEditor({ quantity, slots, items, onChangeItem, disabled }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: quantity }).map((_, idx) => {
        const s = items[idx];
        const hasUPI = (s.icons || []).includes("UPI");
        return (
          <div key={idx} className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-700">Item {idx + 1}</div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FilePicker
                label="Logo (PNG/JPG)"
                dashed
                disabled={disabled}
                preview={s.logoPreview}
                onPick={async (e) => {
                  const file = e.target.files?.[0] || null;
                  const preview = file ? await toDataUrl(file) : "";
                  onChangeItem(idx, { logoFile: file, logoPreview: preview });
                }}
              />
              {hasUPI && (
                <FilePicker
                  label="UPI QR (PNG/JPG)"
                  dashed
                  disabled={disabled}
                  preview={s.upiPreview}
                  onPick={async (e) => {
                    const file = e.target.files?.[0] || null;
                    const preview = file ? await toDataUrl(file) : "";
                    onChangeItem(idx, { upiFile: file, upiPreview: preview });
                  }}
                />
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: slots }).map((_, ii) => (
                <IconSlot
                  key={ii}
                  label={`Icon slot ${ii + 1}`}
                  value={s.icons[ii] || ""}
                  custom={s.custom[ii] || ""}
                  disabled={disabled}
                  onChange={(val) => {
                    const next = s.icons.slice();
                    next[ii] = val;
                    onChangeItem(idx, { icons: next });
                  }}
                  onCustomChange={(txt) => {
                    const next = s.custom.slice();
                    next[ii] = txt;
                    onChangeItem(idx, { custom: next });
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GroupsEditor({
  quantity,
  slots,
  groups,
  onSplit,
  onChangeGroup,
  onReassignItem,
  onAddGroup,
  onRemoveGroup,
  onRenameGroup,
  disabled,
}) {
  const even = makeEvenSplit(quantity);
  const alt = makeAltSplit(quantity);

  const isInGroup = (g, n) => Array.isArray(g.members) && g.members.includes(n);

  const Chip = ({ active, children, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "h-7 min-w-[2rem] rounded-full border px-2 text-xs font-medium",
        active ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
      ].join(" ")}
      title={String(children)}
    >
      {children}
    </button>
  );

  const allAssigned = new Set(groups.flatMap((g) => g.members || []));
  const unassigned = Array.from({ length: quantity })
    .map((_, i) => i + 1)
    .filter((n) => !allAssigned.has(n));

  return (
    <div className="space-y-4">
      {/* Quick split buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Split</span>
        <button
          type="button"
          onClick={() => onSplit(even)}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
          disabled={disabled}
        >
          {`Split ${even.join(" + ")}`}
        </button>
        {JSON.stringify(alt) !== JSON.stringify(even) && (
          <button
            type="button"
            onClick={() => onSplit(alt)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
            disabled={disabled}
          >
            {`Split ${alt.join(" + ")}`}
          </button>
        )}

        {/* Advanced controls when quantity > 5 */}
        {quantity > 5 && (
          <>
            <span className="mx-2 h-5 w-px bg-slate-300" />
            <button
              type="button"
              onClick={onAddGroup}
              className="rounded-md border border-indigo-300 px-2 py-1 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
              disabled={disabled}
            >
              + Add group
            </button>
            <button
              type="button"
              onClick={() => onSplit([quantity])}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
              disabled={disabled}
            >
              Reset (all in A)
            </button>
          </>
        )}
      </div>

      {/* Unassigned quick-assign */}
      {quantity > 5 && unassigned.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="mb-2 text-xs font-semibold text-amber-900">Unassigned items</div>
          <div className="flex flex-wrap gap-1.5">
            {unassigned.map((n) => (
              <div key={n} className="flex items-center gap-1.5">
                <Chip active={false}>{n}</Chip>
                <select
                  onChange={(e) => {
                    const gi = Number(e.target.value);
                    if (!Number.isNaN(gi)) onReassignItem(n, gi);
                  }}
                  disabled={disabled}
                  className="h-7 rounded-md border border-slate-300 bg-white px-2 text-xs"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Assign to…
                  </option>
                  {groups.map((g, gi) => (
                    <option key={gi} value={gi}>
                      Group {g.name || String.fromCharCode(65 + gi)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Groups */}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g, gi) => {
          const hasUPI = (g.icons || []).includes("UPI");
          return (
            <div key={gi} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Group</span>
                  <input
                    type="text"
                    value={g.name || String.fromCharCode(65 + gi)}
                    onChange={(e) => onRenameGroup(gi, e.target.value)}
                    disabled={disabled}
                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
                {quantity > 5 && groups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveGroup(gi)}
                    disabled={disabled}
                    className="text-xs text-rose-700 hover:underline"
                    title="Remove group (its items move to Group A)"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="mt-3">
                <div className="mb-1 text-xs text-slate-500">Members</div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: quantity }).map((_, n0) => {
                    const n = n0 + 1;
                    return (
                      <Chip key={n} active={isInGroup(g, n)} onClick={() => onReassignItem(n, gi)}>
                        {n}
                      </Chip>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FilePicker
                  label="Group Logo (PNG/JPG)"
                  dashed
                  disabled={disabled}
                  preview={g.logoPreview}
                  onPick={async (e) => {
                    const file = e.target.files?.[0] || null;
                    const preview = file ? await toDataUrl(file) : "";
                    onChangeGroup(gi, { logoFile: file, logoPreview: preview });
                  }}
                />
                {hasUPI && (
                  <FilePicker
                    label="UPI QR (PNG/JPG)"
                    dashed
                    disabled={disabled}
                    preview={g.upiPreview}
                    onPick={async (e) => {
                      const file = e.target.files?.[0] || null;
                      const preview = file ? await toDataUrl(file) : "";
                      onChangeGroup(gi, { upiFile: file, upiPreview: preview });
                    }}
                  />
                )}
              </div>

              <div className="mt-4 grid gap-3">
                {Array.from({ length: slots }).map((_, ii) => (
                  <IconSlot
                    key={ii}
                    label={`Group ${g.name || String.fromCharCode(65 + gi)} — Icon slot ${ii + 1}`}
                    value={g.icons?.[ii] || ""}
                    custom={g.custom?.[ii] || ""}
                    disabled={disabled}
                    onChange={(val) => {
                      const next = (g.icons || Array(slots).fill("")).slice();
                      next[ii] = val;
                      onChangeGroup(gi, { icons: next });
                    }}
                    onCustomChange={(txt) => {
                      const next = (g.custom || Array(slots).fill("")).slice();
                      next[ii] = txt;
                      onChangeGroup(gi, { custom: next });
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
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

/* ======= small UI bits (palette-aware) ======= */
function Pill({ children, tone = "c2" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium`}
      style={{
        color: "var(--ink)",
        background: `var(--${tone}bg, var(--c4))`,
        borderColor: `var(--${tone}bd, var(--c2))`,
      }}
    >
      {children}
    </span>
  );
}

function ProductCallBanner({ name, tel = "+919424498204" }) {
  return (
    <div
      className="mb-3 rounded-xl border p-3 shadow"
      style={{
        color: "var(--ink)",
        background: "var(--c3)",
        borderColor: "var(--c2)",
      }}
    >
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
        className="mt-3 inline-flex items-center rounded-lg px-4 py-2 text-xs font-bold shadow transition-transform hover:scale-105"
        style={{
          color: "#fff",
          background: "linear-gradient(to right, var(--c2), var(--c1))",
        }}
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
      <label className="text-xs font-medium" style={{ color: "var(--ink)" }}>
        {label}
      </label>
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
        className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition hover:shadow-sm disabled:bg-slate-100"
        style={{
          color: "var(--ink)",
          borderColor: "var(--c2)",
          boxShadow: "0 0 0 0 rgba(0,0,0,0)",
        }}
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
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition placeholder:opacity-70"
          style={{
            color: "var(--ink)",
            background: "var(--c4)",
            borderColor: "var(--c2)",
          }}
        />
      )}
    </div>
  );
}

/* ======= file picker with preview ======= */
function FilePicker({ label, onPick, preview, disabled, dashed = true }) {
  return (
    <div className="mt-2">
      <label className="mb-1 block text-sm font-medium" style={{ color: "var(--ink)" }}>
        {label}
      </label>
      <label
        className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-3 text-sm transition`}
        style={{
          color: "var(--ink)",
          background: "var(--c4)",
          borderColor: "var(--c2)",
          borderStyle: dashed ? "dashed" : "solid",
        }}
      >
        <span>Choose file</span>
        <input type="file" accept="image/*" onChange={onPick} disabled={disabled} className="hidden" />
        <span style={{ opacity: 0.6 }}>Browse</span>
      </label>
      {preview ? (
        <img
          src={preview}
          alt="preview"
          className="mt-3 h-24 w-24 rounded-md border object-cover shadow-sm"
          style={{ borderColor: "var(--c2)" }}
        />
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

/* === reusable editor-state creator (same/items/groups) === */
function createEditorState(slots, quantity, isCardLike) {
  const baseIcons = Array(Math.max(0, slots || 0)).fill("");
  const mode = quantity > 1 && !isCardLike ? "groups" : "same";
  return {
    mode,
    same: {
      icons: baseIcons.slice(),
      custom: Array(baseIcons.length).fill(""),
      logoFile: null,
      logoPreview: "",
      upiFile: null,
      upiPreview: "",
    },
    items: Array.from({ length: quantity }).map(() => ({
      icons: baseIcons.slice(),
      custom: Array(baseIcons.length).fill(""),
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
        custom: Array(baseIcons.length).fill(""),
        logoFile: null,
        logoPreview: "",
        upiFile: null,
        upiPreview: "",
      }));
    })(),
  };
}

/* ======= validations (no payload change, only guard) ======= */
const isFilled = (v) => String(v || "").trim().length > 0;
const iconsFilled = (icons = [], slots = 0) =>
  Array.from({ length: slots }).every((_, i) => isFilled(icons[i]));
const hasUPI = (icons = []) => icons.includes("UPI");
const hasImg = (file, preview) => !!file || !!(preview && preview.length);

function validateBlock({ icons, slots, logoFile, logoPreview, upiFile, upiPreview }, labelForError) {
  if (!iconsFilled(icons, slots)) {
    throw new Error(`${labelForError}: Please select all ${slots} icons.`);
  }
  if (!hasImg(logoFile, logoPreview)) {
    throw new Error(`${labelForError}: Logo image is required.`);
  }
  if (hasUPI(icons) && !hasImg(upiFile, upiPreview)) {
    throw new Error(`${labelForError}: UPI selected — please upload UPI QR image.`);
  }
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
  onAfterSubmit,
}) {
  if (!form) return null;

  const quantity = Number(order.quantity || form.quantity || 1);
  const products = form.products || [];

  /* ---- per-product catalog meta (so bundles expose children) ---- */
  const [prodMeta, setProdMeta] = useState(() => Array(products.length).fill(null));
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        products.map(async (name) => {
          try {
            const r = await fetch(`/api/product-by-name?name=${encodeURIComponent(name)}`, { cache: "no-store" });
            const j = await r.json();
            return j?.success ? j.product : null;
          } catch {
            return null;
          }
        })
      );
        if (!cancelled) setProdMeta(results);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(products)]);

  /* ---- state for normal (non-bundle) products ---- */
  const [perProdState, setPerProdState] = useState(() =>
    products.map((prod, pi) => {
      const slots = form.iconsSelected?.[pi]?.length || 4;
      return createEditorState(slots, quantity, isBusinessCard(prod));
    })
  );
  const updateProdState = (pi, updater) =>
    setPerProdState((prev) =>
      prev.map((p, i) => (i === pi ? (typeof updater === "function" ? updater(p) : updater) : p))
    );

  /* ---- state for bundle children (keyed per product index) ---- */
  const [childStates, setChildStates] = useState({});
  useEffect(() => {
    prodMeta.forEach((meta, pi) => {
      if (Array.isArray(meta?.children) && meta.children.length > 0) {
        setChildStates((prev) => {
          if (prev[pi] && prev[pi].length === meta.children.length) return prev;
          const next = { ...prev };
          next[pi] = meta.children.map((c) =>
            createEditorState(c.iconsCount || 0, quantity, isBusinessCard(c.name))
          );
          return next;
        });
      }
    });
  }, [prodMeta, quantity]);

  const updateChildState = (pi, ci, patchOrFn) =>
    setChildStates((prev) => {
      const arr = (prev[pi] || []).slice();
      const cur = arr[ci] || null;
      if (!cur) return prev;
      arr[ci] = typeof patchOrFn === "function" ? patchOrFn(cur) : patchOrFn;
      return { ...prev, [pi]: arr };
    });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  /* ===== Build payload and submit to /api/update-business-shopify ===== */
  async function handleSave() {
    try {
      setSaving(true);
      setToast("");

      const businessName = form.biz || "";
      const orderId = order.order_name;

      // ====== VALIDATION (no payload change) ======
      // Normal products
      for (let pi = 0; pi < products.length; pi++) {
        const prodName = products[pi];
        const slots = form.iconsSelected?.[pi]?.length || 4;
        const meta = prodMeta[pi];
        const hasChildren = Array.isArray(meta?.children) && meta.children.length > 0;

        if (!hasChildren) {
          const st = perProdState[pi];
          if (isBusinessCard(prodName)) {
            validateBlock(
              { ...st.same, slots },
              `${prodName} (Business Card)`
            );
          } else if (st.mode === "same" || quantity <= 1) {
            validateBlock({ ...st.same, slots }, `${prodName} (All items)`);
          } else if (st.mode === "items") {
            for (let i = 0; i < quantity; i++) {
              validateBlock({ ...st.items[i], slots }, `${prodName} — Item #${i + 1}`);
            }
          } else if (st.mode === "groups") {
            for (let gi = 0; gi < st.groups.length; gi++) {
              validateBlock({ ...st.groups[gi], slots }, `${prodName} — Group ${st.groups[gi].name || String.fromCharCode(65 + gi)}`);
            }
          }
        } else {
          // Children validations
          const childArr = childStates[pi] || [];
          for (let ci = 0; ci < meta.children.length; ci++) {
            const child = meta.children[ci];
            const cSlots = child.iconsCount || 0;
            const st = childArr[ci];
            if (!st) continue;
            if (isBusinessCard(child.name)) {
              validateBlock({ ...st.same, slots: cSlots }, `${child.name} (Business Card)`);
            } else if (st.mode === "same" || quantity <= 1) {
              validateBlock({ ...st.same, slots: cSlots }, `${child.name} (All items)`);
            } else if (st.mode === "items") {
              for (let i = 0; i < quantity; i++) {
                validateBlock({ ...st.items[i], slots: cSlots }, `${child.name} — Item #${i + 1}`);
              }
            } else if (st.mode === "groups") {
              for (let gi = 0; gi < st.groups.length; gi++) {
                validateBlock(
                  { ...st.groups[gi], slots: cSlots },
                  `${child.name} — Group ${st.groups[gi].name || String.fromCharCode(65 + gi)}`
                );
              }
            }
          }
        }
      }
      // ====== /VALIDATION ======

      const payload = {
        orderId,
        businessName,
        customerNames: form.customerNames || [],
        products: [],
      };

      const materializeIcons = (values, customs) =>
        (values || []).map((v, idx) => {
          if (v === "Other") return (customs?.[idx] || "").trim() || "Other";
          if (!ALL_ICONS.includes(v)) return (v || "").trim();
          return v;
        });

      const productsList = form.products || [];
      for (let pi = 0; pi < productsList.length; pi++) {
        const prodName = productsList[pi];
        const meta = prodMeta[pi];
        const hasChildren = Array.isArray(meta?.children) && meta.children.length > 0;

        if (hasChildren) {
          const childArr = childStates[pi] || [];
          for (let ci = 0; ci < meta.children.length; ci++) {
            const child = meta.children[ci];
            const st =
              childArr[ci] || createEditorState(child.iconsCount || 0, quantity, isBusinessCard(child.name));

            if (isBusinessCard(child.name) || quantity <= 1 || st.mode === "same") {
              const icons = materializeIcons(st.same.icons, st.same.custom);
              const logo_url = await toDataUrl(st.same.logoFile);
              const confirm_img = await toDataUrl(st.same.upiFile);
              payload.products.push({
                product_name: child.name,
                icons,
                logo_url,
                confirm_img,
                quantity,
              });
            } else if (st.mode === "items") {
              for (let i = 0; i < quantity; i++) {
                const it = st.items[i];
                const icons = materializeIcons(it.icons, it.custom);
                const logo_url = await toDataUrl(it.logoFile);
                const confirm_img = await toDataUrl(it.upiFile);
                payload.products.push({
                  product_name: `${child.name} #${i + 1}`,
                  icons,
                  logo_url,
                  confirm_img,
                  item_no: i + 1,
                });
              }
            } else if (st.mode === "groups") {
              for (let gi = 0; gi < st.groups.length; gi++) {
                const g = st.groups[gi];
                const icons = materializeIcons(g.icons, g.custom);
                const logo_url = await toDataUrl(g.logoFile);
                const confirm_img = await toDataUrl(g.upiFile);
                payload.products.push({
                  product_name: `${child.name} [Group ${g.name}]`,
                  icons,
                  logo_url,
                  confirm_img,
                  members: g.members,
                });
              }
            }
          }
          continue;
        }

        // Normal product
        const card = isBusinessCard(prodName);
        const state = perProdState[pi];

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
      if (typeof onAfterSubmit === "function") onAfterSubmit();
    } catch (e) {
      setToast(`Failed to save: ${e?.message || e}`);
    } finally {
      setSaving(false);
      setTimeout(() => setToast(""), 5000);
    }
  }

  /* ==== UI helpers for mode cards ==== */
  const ModeGrid = ({ current, onPick, quantity }) => {
    const opts = [
      { key: "same", title: "Same for all", desc: `Apply one logo, icons & UPI to all ${Math.max(1, quantity)}` },
      { key: "items", title: "Different per item", desc: "Customize each piece separately" },
      ...(quantity >= 2 ? [{ key: "groups", title: "Group by sets", desc: "Share settings within groups (e.g., 2+2)" }] : []),
    ];
    return (
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {opts.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onPick(opt.key)}
            className="rounded-xl border p-3 text-left transition"
            style={{
              color: "var(--ink)",
              borderColor: current === opt.key ? "var(--c2)" : "var(--c2)",
              background: current === opt.key ? "var(--c1)" : "var(--c4)",
              boxShadow: current === opt.key ? "0 0 0 2px rgba(0,0,0,0.05) inset" : "none",
            }}
          >
            <div className="font-semibold text-sm">{opt.title}</div>
            <div className="text-xs opacity-70">{opt.desc}</div>
          </button>
        ))}
      </div>
    );
  };

  /* ======================= RENDER ======================= */
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        /* palette from your uploaded image */
        ["--c1"]: "#A9CED6",
        ["--c2"]: "#6F86A3",
        ["--c3"]: "#EDC6C6",
        ["--c4"]: "#F8E8E8",
        ["--ink"]: "#000000",
        color: "var(--ink)",
        borderColor: "var(--c2)",
        background: "var(--c4)",
        boxShadow: "0 10px 24px rgba(111,134,163,0.15)",
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="group w-full flex items-center justify-between gap-4 px-4 sm:px-6 py-4 text-left transition-colors"
        style={{
          background:
            "linear-gradient(90deg, var(--c1) 0%, var(--c2) 50%, var(--c3) 100%)",
          color: "var(--ink)",
        }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base sm:text-lg font-bold">Order #{order.order_name}</span>
            <Pill>{order.payment_status || "payment"}</Pill>
            {order.fulfillment_status ? <Pill tone="c1">{order.fulfillment_status}</Pill> : null}
          </div>
          <div className="text-sm opacity-80 line-clamp-1">
            {order.product_name || "—"} {quantity ? <span className="opacity-70">(Qty: {quantity})</span> : null}
          </div>
        </div>

        <svg
          className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`}
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
            <label className="mb-1 block text-sm font-medium">Business Name <span className="opacity-70">(Printed over the standee)</span></label>
            <input
              type="text"
              value={form.biz}
              onChange={(e) => onBizChange(e.target.value)}
              disabled={saving}
              placeholder="Your shop / clinic / brand name"
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition disabled:bg-slate-100"
              style={{ borderColor: "var(--c2)", color: "var(--ink)" }}
            />
          </div>

          {/* Products */}
          <div className="space-y-10">
            {(form.products || []).map((prod, pi) => {
              const meta = prodMeta[pi];
              const hasChildren = Array.isArray(meta?.children) && meta.children.length > 0;

              const isUnknown = (unknownProducts || []).some((u) => _norm(u) === _norm(prod)) && !hasChildren;

              const slotsForNormal = form.iconsSelected?.[pi]?.length || 4;
              const state = perProdState[pi];
              const mode = state?.mode;

              // For quantity = 1 => show only two mode cards (same & items); "groups" hidden via ModeGrid rule.

              return (
                <div key={pi} className="pt-6 first:pt-0 border-t first:border-0" style={{ borderColor: "var(--c2)" }}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <SectionTitle>
                      {prod} {quantity ? <span className="text-sm font-normal opacity-70">(Qty: {quantity})</span> : null}
                    </SectionTitle>

                    {isBusinessCard(prod) ? (
                      <span
                        className="rounded-full border px-2 py-0.5 text-[11px]"
                        style={{ borderColor: "var(--c2)", background: "var(--c3)", color: "var(--ink)" }}
                      >
                        Business Card
                      </span>
                    ) : (
                      <span
                        className="rounded-full border px-2 py-0.5 text-[11px]"
                        style={{ borderColor: "var(--c2)", background: "var(--c1)", color: "var(--ink)" }}
                      >
                        {hasChildren ? "Bundle" : "Standee / Product"}
                      </span>
                    )}
                  </div>

                  {/* Unknown – call to submit by phone */}
                  {isUnknown && <ProductCallBanner name={prod} tel={supportNumber} />}

                  {/* BUNDLE: render each child independently */}
                  {hasChildren && (
                    <div className="space-y-8">
                      {meta.children.map((child, ci) => {
                        const childStateArr = childStates[pi] || [];
                        const cState = childStateArr[ci];
                        const cSlots = child.iconsCount || 0;
                        const cMode = cState?.mode || "same";
                        const childIsCard = isBusinessCard(child.name);

                        return (
                          <div
                            key={ci}
                            className="rounded-xl border p-4"
                            style={{ borderColor: "var(--c2)", background: "var(--c4)" }}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="font-semibold" style={{ color: "var(--ink)" }}>
                                {child.name}
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <Pill>Icons: {cSlots}</Pill>
                                <Pill tone="c1">Logo: {child.logoRequired ? "Required" : "Optional"}</Pill>
                              </div>
                            </div>

                            {/* Show mode cards even if qty=1 (2 cards). Group only when qty>=2 */}
                            {!childIsCard && (
                              <ModeGrid
                                current={cMode}
                                quantity={quantity}
                                onPick={(key) => updateChildState(pi, ci, (st) => ({ ...st, mode: key }))}
                              />
                            )}

                            {/* Mode content */}
                            {(childIsCard || cMode === "same") && cState && (
                              <SingleEditor
                                slots={cSlots}
                                state={cState.same}
                                disabled={saving}
                                onChange={(patch) =>
                                  updateChildState(pi, ci, (st) => ({ ...st, same: { ...st.same, ...patch } }))
                                }
                              />
                            )}

                            {cMode === "items" && cState && (
                              <ItemsEditor
                                quantity={quantity}
                                slots={cSlots}
                                items={cState.items}
                                disabled={saving}
                                onChangeItem={(idx, patch) =>
                                  updateChildState(pi, ci, (st) => {
                                    const next = st.items.slice();
                                    next[idx] = { ...next[idx], ...patch };
                                    return { ...st, items: next };
                                  })
                                }
                              />
                            )}

                            {cMode === "groups" && quantity >= 2 && cState && (
                              <GroupsEditor
                                quantity={quantity}
                                slots={cSlots}
                                groups={cState.groups}
                                disabled={saving}
                                onSplit={(pattern) =>
                                  updateChildState(pi, ci, (st) => {
                                    const mems = membersForPattern(quantity, pattern);
                                    const next = mems.map((m, gi) => {
                                      const was = st.groups[gi];
                                      return {
                                        name: was?.name || String.fromCharCode(65 + gi),
                                        members: m,
                                        icons: was?.icons?.length === cSlots ? was.icons : Array(cSlots).fill(""),
                                        custom: was?.custom?.length === cSlots ? was.custom : Array(cSlots).fill(""),
                                        logoFile: was?.logoFile || null,
                                        logoPreview: was?.logoPreview || "",
                                        upiFile: was?.upiFile || null,
                                        upiPreview: was?.upiPreview || "",
                                      };
                                    });
                                    return { ...st, groups: next };
                                  })
                                }
                                onChangeGroup={(gi, patch) =>
                                  updateChildState(pi, ci, (st) => {
                                    const next = st.groups.slice();
                                    next[gi] = { ...next[gi], ...patch };
                                    return { ...st, groups: next };
                                  })
                                }
                                onRenameGroup={(gi, name) =>
                                  updateChildState(pi, ci, (st) => {
                                    const next = st.groups.slice();
                                    next[gi] = { ...next[gi], name };
                                    return { ...st, groups: next };
                                  })
                                }
                                onReassignItem={(itemNo, targetGi) =>
                                  updateChildState(pi, ci, (st) => {
                                    const next = st.groups.map((g) => ({
                                      ...g,
                                      members: (g.members || []).filter((n) => n !== itemNo),
                                    }));
                                    const tgt = next[targetGi] || next[0];
                                    const merged = Array.from(new Set([...(tgt.members || []), itemNo])).sort((a, b) => a - b);
                                    next[targetGi] = { ...tgt, members: merged };
                                    return { ...st, groups: next };
                                  })
                                }
                                onAddGroup={() =>
                                  updateChildState(pi, ci, (st) => {
                                    const gi = st.groups.length;
                                    return {
                                      ...st,
                                      groups: [
                                        ...st.groups,
                                        {
                                          name: String.fromCharCode(65 + gi),
                                          members: [],
                                          icons: Array(cSlots).fill(""),
                                          custom: Array(cSlots).fill(""),
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
                                  updateChildState(pi, ci, (st) => {
                                    if (st.groups.length <= 1) return st;
                                    const toMove = st.groups[gi]?.members || [];
                                    const keep = st.groups.filter((_, i) => i !== gi);
                                    const g0 = keep[0];
                                    const merged = Array.from(new Set([...(g0.members || []), ...toMove])).sort((a, b) => a - b);
                                    keep[0] = { ...g0, members: merged };
                                    const relabeled = keep.map((g, idx) => ({ ...g, name: String.fromCharCode(65 + idx) }));
                                    return { ...st, groups: relabeled };
                                  })
                                }
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* NORMAL (non-bundle) */}
                  {!hasChildren && !isUnknown && (
                    <>
                      {/* Mode selector always visible; Group card only when quantity >= 2 */}
                      {!isBusinessCard(prod) && (
                        <ModeGrid
                          current={mode}
                          quantity={quantity}
                          onPick={(key) => updateProdState(pi, (p) => ({ ...p, mode: key }))}
                        />
                      )}

                      {/* same / editor blocks */}
                      {(isBusinessCard(prod) || mode === "same") && (
                        <SingleEditor
                          slots={slotsForNormal}
                          state={state.same}
                          disabled={saving}
                          onChange={(patch) => updateProdState(pi, (p) => ({ ...p, same: { ...p.same, ...patch } }))}
                        />
                      )}

                      {mode === "items" && (
                        <ItemsEditor
                          quantity={quantity}
                          slots={slotsForNormal}
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

                      {mode === "groups" && quantity >= 2 && (
                        <GroupsEditor
                          quantity={quantity}
                          slots={slotsForNormal}
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
                                  icons: was?.icons?.length === slotsForNormal ? was.icons : Array(slotsForNormal).fill(""),
                                  custom: was?.custom?.length === slotsForNormal ? was.custom : Array(slotsForNormal).fill(""),
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
                              const next = p.groups.map((g) => ({
                                ...g,
                                members: (g.members || []).filter((n) => n !== itemNo),
                              }));
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
                                    icons: Array(slotsForNormal).fill(""),
                                    custom: Array(slotsForNormal).fill(""),
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
                              const g0 = keep[0];
                              const merged = Array.from(new Set([...(g0.members || []), ...toMove])).sort((a, b) => a - b);
                              keep[0] = { ...g0, members: merged };
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
            <div className="text-sm opacity-80">{toast}</div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg font-semibold disabled:opacity-60"
              style={{
                color: "#fff",
                background: "var(--c2)",
                boxShadow: "0 4px 12px rgba(111,134,163,0.35)",
              }}
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
  const _hasUPI = (state.icons || []).includes("UPI");

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--c2)", background: "var(--c4)" }}>
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
          {_hasUPI && (
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
        const _hasUPI = (s.icons || []).includes("UPI");
        return (
          <div key={idx} className="rounded-xl border p-4" style={{ borderColor: "var(--c2)", background: "var(--c4)" }}>
            <div className="mb-2 text-sm font-semibold">Item {idx + 1}</div>

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
              {_hasUPI && (
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
      className="h-7 min-w-[2rem] rounded-full border px-2 text-xs font-medium"
      style={{
        color: active ? "#fff" : "var(--ink)",
        background: active ? "var(--c2)" : "white",
        borderColor: "var(--c2)",
      }}
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
        <span className="text-xs opacity-70">Split</span>
        <button
          type="button"
          onClick={() => onSplit(even)}
          className="rounded-md border px-2 py-1 text-xs"
          style={{ borderColor: "var(--c2)", background: "var(--c4)" }}
          disabled={disabled}
        >
          {`Split ${even.join(" + ")}`}
        </button>
        {JSON.stringify(alt) !== JSON.stringify(even) && (
          <button
            type="button"
            onClick={() => onSplit(alt)}
            className="rounded-md border px-2 py-1 text-xs"
            style={{ borderColor: "var(--c2)", background: "var(--c4)" }}
            disabled={disabled}
          >
            {`Split ${alt.join(" + ")}`}
          </button>
        )}

        {/* Advanced controls when quantity > 5 */}
        {quantity > 5 && (
          <>
            <span className="mx-2 h-5 w-px" style={{ background: "var(--c2)" }} />
            <button
              type="button"
              onClick={onAddGroup}
              className="rounded-md border px-2 py-1 text-xs"
              style={{ color: "var(--ink)", borderColor: "var(--c2)", background: "var(--c1)" }}
              disabled={disabled}
            >
              + Add group
            </button>
            <button
              type="button"
              onClick={() => onSplit([quantity])}
              className="rounded-md border px-2 py-1 text-xs"
              style={{ borderColor: "var(--c2)", background: "var(--c4)" }}
              disabled={disabled}
            >
              Reset (all in A)
            </button>
          </>
        )}
      </div>

      {/* Unassigned quick-assign */}
      {quantity > 5 && unassigned.length > 0 && (
        <div className="rounded-lg border p-3" style={{ borderColor: "var(--c2)", background: "var(--c3)" }}>
          <div className="mb-2 text-xs font-semibold">Unassigned items</div>
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
                  className="h-7 rounded-md border bg-white px-2 text-xs"
                  style={{ borderColor: "var(--c2)", color: "var(--ink)" }}
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
          const _hasUPI = (g.icons || []).includes("UPI");
          return (
            <div key={gi} className="rounded-xl border p-4" style={{ borderColor: "var(--c2)", background: "var(--c4)" }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-70">Group</span>
                  <input
                    type="text"
                    value={g.name || String.fromCharCode(65 + gi)}
                    onChange={(e) => onRenameGroup(gi, e.target.value)}
                    disabled={disabled}
                    className="w-24 rounded-md border px-2 py-1 text-sm"
                    style={{ borderColor: "var(--c2)", color: "var(--ink)", background: "white" }}
                  />
                </div>
                {quantity > 5 && groups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveGroup(gi)}
                    disabled={disabled}
                    className="text-xs underline-offset-2 hover:underline"
                    style={{ color: "var(--ink)" }}
                    title="Remove group (its items move to Group A)"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="mt-3">
                <div className="mb-1 text-xs opacity-70">Members</div>
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
                {_hasUPI && (
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

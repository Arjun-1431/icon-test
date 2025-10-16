"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import OrderCard from "../../components/OrderCard";
import WelcomeScreen from "../../components/WelcomeScreen";
import { Badge } from "../../components/ui";

/* helpers */
const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const isEmptyish = (v) => {
  if (v == null) return true;
  const s = String(v).trim().toLowerCase();
  return !s || s === "null" || s === "[]" || s === "undefined";
};
async function safeJson(res) {
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

export const ALL_ICONS = ["Google","Instagram","Facebook","WhatsApp","YouTube","Twitter","UPI","Other"];

export default function PageForDetail() {
  const { customerNumber } = useParams();
  const phone = decodeURIComponent(customerNumber || "");

  const [openOrders, setOpenOrders] = useState([]);
  const [submittedOrders, setSubmittedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogMap, setCatalogMap] = useState({});
  const [forms, setForms] = useState({});
  const [expanded, setExpanded] = useState({});
  const [unknownByOrder, setUnknownByOrder] = useState({});

  const updateForm = (orderName, updater) =>
    setForms((prev) => ({ ...prev, [orderName]: updater(prev[orderName]) }));

  async function loadAll() {
    setLoading(true);
    try {
      // 1) orders by phone
      const res = await fetch("/api/get-order-by-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
        cache: "no-store",
      });
      const data = res.ok ? await safeJson(res) : {};
      const orders = Array.isArray(data?.openOrders) || Array.isArray(data?.submittedOrders)
        ? [...(data.openOrders || []), ...(data.submittedOrders || [])]
        : Array.isArray(data?.orders) ? data.orders : [];

      const open = (data?.openOrders ?? orders.filter((r) => isEmptyish(r.logo_url))) || [];
      const submitted = (data?.submittedOrders ?? orders.filter((r) => !isEmptyish(r.logo_url))) || [];

      setOpenOrders(open);
      setSubmittedOrders(submitted);

      // 2) product names
      const productNames = new Set();
      for (const o of open) {
        const parts = String(o.product_name || "")
          .split(",").map((s) => s.trim()).filter(Boolean);
        for (const p of parts) productNames.add(p);
      }

      // 3) catalog details
      const map = {};
      for (const name of productNames) {
        try {
          const resp = await fetch(`/api/product-by-name?name=${encodeURIComponent(name)}`);
          const info = await safeJson(resp);
          if (info?.success && info.product) {
            const p = info.product;
            map[norm(p.name)] = {
              name: p.name,
              category: p.category,
              iconsCount: Number(p.iconsCount || 0),
              logoRequired: !!p.logoRequired,
            };
          }
        } catch {}
      }
      setCatalogMap(map);

      // 4) init forms only for open orders
      const init = {};
      const expandInit = {};
      const unknownMap = {};

      open.forEach((o, idx) => {
        const products = String(o.product_name || "")
          .split(",").map((s) => s.trim()).filter(Boolean);

        const iconsInit = products.map((p) => {
          const n = map[norm(p)]?.iconsCount ?? 0;
          return n > 0 ? Array(n).fill("") : [];
        });

        products.forEach((p) => {
          if (!map[norm(p)]) (unknownMap[o.order_name] ||= []).push(p);
        });

        init[o.order_name] = {
          biz: o.business_name || "",
          products,
          quantity: o.quantity || 1,
          iconsSelected: iconsInit,
          customerNames: products.map(() => ""),
          done: false,
        };
        expandInit[o.order_name] = idx === 0;
      });

      setForms(init);
      setExpanded(expandInit);
      setUnknownByOrder(unknownMap);
    } catch (e) {
      setOpenOrders([]); setSubmittedOrders([]);
      setForms({}); setExpanded({}); setUnknownByOrder({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); /* initial */ }, [phone]);

  const handleAfterSubmit = () => {
    // reload everything so the just-submitted order moves to submittedOrders
    loadAll();
  };

  if (loading) {
    return (
      <>
        <WelcomeScreen customerNumber={customerNumber} />
        <div className="p-6 text-gray-600 text-center">Loading orders…</div>
      </>
    );
  }

  const noOpenButSubmitted = openOrders.length === 0 && submittedOrders.length > 0;

  return (
    <>
      <WelcomeScreen customerNumber={customerNumber} />

      <div className="mx-auto max-w-5xl py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Orders</h1>
          <Badge>{openOrders.length} open orders</Badge>
        </div>

        {/* If already submitted and nothing open, show message */}
        {noOpenButSubmitted && (
          <div className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
            <div className="font-semibold">You are submitted your detail.</div>
            <div className="text-sm opacity-80">
              If you want to update anything, please contact support.
            </div>
          </div>
        )}

        {openOrders.map((o) => {
          const isExpanded = !!expanded[o.order_name];
          const toggleExpanded = () =>
            setExpanded((prev) => ({ ...prev, [o.order_name]: !prev[o.order_name] }));

          return (
            <OrderCard
              key={o.order_name}
              order={o}
              form={forms[o.order_name]}
              unknownProducts={unknownByOrder[o.order_name] || []}
              expanded={isExpanded}
              toggleExpanded={toggleExpanded}
              onBizChange={(v) => updateForm(o.order_name, (f) => ({ ...f, biz: v }))}
              onAfterSubmit={handleAfterSubmit}   // <<— important
            />
          );
        })}

        {/* NOTE: removed the extra "Save Details" button so only one submit exists (inside each card) */}
      </div>
    </>
  );
}

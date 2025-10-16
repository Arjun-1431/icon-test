import { NextResponse } from "next/server";
import db from "@/app/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------- helpers ---------- */
const isEmptyish = (v) =>
  v == null ||
  String(v).trim() === "" ||
  String(v).trim().toLowerCase() === "null" ||
  String(v).trim() === "[]";

const safeParse = (v) => {
  try {
    if (v == null) return null;
    if (typeof v !== "string") return v;
    const s = v.trim();
    if (!s || s === "null" || s === "undefined") return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
};

/* ---------- route ---------- */
export async function POST(req) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json(
        { success: false, message: "Phone is required" },
        { status: 400 }
      );
    }

    // Detect columns present in the table so we can select bundle fields safely.
    const [cols] = await db.query(
      "SHOW COLUMNS FROM nextjsdb.orders_shopify"
    );
    const has = (name) => Array.isArray(cols) && cols.some((c) => c.Field === name);

    // Base columns that should exist.
    const baseCols = [
      "id",
      "order_name",
      "customer_name",
      "phone",
      "business_name",
      "product_name",
      "quantity",
      "product_image_url",
      "total_price",
      "discount",
      "payment_status",
      "partially_paid_amount",
      "fulfillment_status",
      "icon",
      "logo_url",
      "confirm_img",
      "created_at",
    ];

    // Build SELECT list with optional bundle columns (or NULL fallbacks).
    let selectList = baseCols.join(",\n         ");

    // bundle_children_json or bundle_children
    if (has("bundle_children_json") || has("bundle_children")) {
      selectList +=
        ",\n         " +
        (has("bundle_children_json") ? "bundle_children_json" : "bundle_children") +
        " AS bundle_children_json";
    } else {
      selectList += ",\n         NULL AS bundle_children_json";
    }

    // bundle_qty_json or bundle_qty_map
    if (has("bundle_qty_json") || has("bundle_qty_map")) {
      selectList +=
        ",\n         " +
        (has("bundle_qty_json") ? "bundle_qty_json" : "bundle_qty_map") +
        " AS bundle_qty_json";
    } else {
      selectList += ",\n         NULL AS bundle_qty_json";
    }

    const sql = `SELECT 
         ${selectList}
       FROM nextjsdb.orders_shopify
       WHERE phone = ?
       ORDER BY created_at DESC`;

    const [rows] = await db.query(sql, [phone]);

    // Parse bundle JSONs so the frontend can consume objects directly.
    const normalized = (rows || []).map((r) => ({
      ...r,
      bundle_children_json: safeParse(r.bundle_children_json),
      bundle_qty_json: safeParse(r.bundle_qty_json),
    }));

    const openOrders = normalized.filter((r) => isEmptyish(r.logo_url));
    const submittedOrders = normalized.filter((r) => !isEmptyish(r.logo_url));

    return NextResponse.json(
      { success: true, phone, openOrders, submittedOrders },
      { status: 200 }
    );
  } catch (e) {
    console.error("get-order-by-phone error:", e);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

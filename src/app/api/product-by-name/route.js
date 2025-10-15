import { NextResponse } from "next/server";
import db from "@/app/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ========= Helpers ========= */
const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

const tryJSON = (v) => {
  if (v == null) return null;
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (!s || s === "null" || s === "undefined") return null;
  if (/^[\[{"]/.test(s)) {
    try {
      return JSON.parse(s);
    } catch {}
  }
  return v;
};

/* ========= Normalize DB row ========= */
function normalizeRow(row) {
  const category = row.category || "";
  const logoRequired = String(row.logo || "").toLowerCase() === "yes";

  const pn = tryJSON(row.product_name);
  const iconsJson = tryJSON(row.icons);

  const mainName =
    (typeof pn === "object" && pn?.name)
      ? String(pn.name)
      : Array.isArray(Object.keys(pn || {}))
      ? Object.keys(pn)[0]
      : String(pn || "");

  const out = {
    id: row.id,
    category,
    name: mainName,
    logoRequired,
    iconsCount: 0,
    children: [],
  };

  if (!iconsJson || typeof iconsJson !== "object") return out;

  const keys = Object.keys(iconsJson);
  if (!keys.length) return out;

  const topKey = keys[0];
  const val = iconsJson[topKey];

  // Normal product: { "Product": number }
  if (typeof val !== "object") {
    out.iconsCount = Number(val || 0) || 0;
    return out;
  }

  // Bundle: { "Bundle": { "Child": number } }
  out.iconsCount = 0;
  for (const childName of Object.keys(val || {})) {
    out.children.push({
      name: childName,
      iconsCount: Number(val[childName] || 0) || 0,
      logoRequired,
      category: "Bundal",
      parentBundle: mainName,
    });
  }

  return out;
}

/* ========= Load full catalog ========= */
async function loadCatalog() {
  const [rows] = await db.query(
    "SELECT id, category, product_name, icons, logo FROM shopify_product"
  );
  return rows.map(normalizeRow);
}

/* ========= Search in catalog ========= */
function findByName(catalog, queryName) {
  const q = norm(queryName);

  // 1️⃣ Direct product match (case-insensitive)
  const direct = catalog.find((r) => norm(r.name) === q);
  if (direct) {
    return {
      source: "product",
      id: direct.id,
      name: direct.name,
      category: direct.category,
      iconsCount: direct.iconsCount,
      logoRequired: !!direct.logoRequired,
      parentBundle: null,
      children: direct.children || [],
    };
  }

  // 2️⃣ Fuzzy match — partial includes
  const fuzzy = catalog.find((r) => norm(r.name).includes(q));
  if (fuzzy) {
    return {
      source: "product-fuzzy",
      id: fuzzy.id,
      name: fuzzy.name,
      category: fuzzy.category,
      iconsCount: fuzzy.iconsCount,
      logoRequired: !!fuzzy.logoRequired,
      parentBundle: null,
      children: fuzzy.children || [],
    };
  }

  // 3️⃣ Child product match
  for (const r of catalog) {
    const child = (r.children || []).find((c) => norm(c.name) === q);
    if (child) {
      return {
        source: "bundle-child",
        id: r.id,
        name: child.name,
        category: child.category,
        iconsCount: child.iconsCount,
        logoRequired: !!child.logoRequired,
        parentBundle: child.parentBundle || r.name,
        children: [],
      };
    }
  }

  return null;
}

/* ========= GET /api/product-by-name?name=... ========= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const name = (searchParams.get("name") || "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Query param 'name' is required" },
        { status: 400 }
      );
    }

    const catalog = await loadCatalog();
    const hit = findByName(catalog, name);

    if (!hit) {
      return NextResponse.json(
        { success: false, message: `No product found for '${name}'` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, product: hit }, { status: 200 });
  } catch (e) {
    console.error("GET /api/product-by-name error:", e);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

/* ========= POST /api/product-by-name ========= */
export async function POST(req) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Body field 'name' is required" },
        { status: 400 }
      );
    }

    const catalog = await loadCatalog();
    const hit = findByName(catalog, name);

    if (!hit) {
      return NextResponse.json(
        { success: false, message: `No product found for '${name}'` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, product: hit }, { status: 200 });
  } catch (e) {
    console.error("POST /api/product-by-name error:", e);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

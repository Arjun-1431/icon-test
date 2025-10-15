import { NextResponse } from "next/server";
import db from "@/app/lib/db";

export const runtime = "nodejs";

// ✅ GET - fetch all single products for Bundal dropdown
export async function GET() {
  try {
    const [rows] = await db.execute(`
      SELECT 
        id,
        category,
        JSON_UNQUOTE(JSON_EXTRACT(product_name, '$.name')) AS product_name,
        icons,
        logo
      FROM shopify_product
      WHERE category IN ('Card','Standee')
    `);
    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ POST - insert product or bundal
export async function POST(req) {
  try {
    const body = await req.json();
    const category = String(body?.category || "").trim();
    if (!category) return NextResponse.json({ error: "category required" }, { status: 400 });

    let product_name_json = null;
    let icons_json = null;
    let logo_value = "no";

    // 🟢 Bundal category
    if (category === "Bundal") {
      const bundleName = String(body?.bundleName || "").trim();
      const bundle = Array.isArray(body?.bundle) ? body.bundle : [];

      if (!bundleName) {
        return NextResponse.json({ error: "bundleName required" }, { status: 400 });
      }
      if (bundle.length === 0) {
        return NextResponse.json({ error: "bundle must have at least one product" }, { status: 400 });
      }

      // product_name = { "BundleName": [ {name}, ... ] }
      const productNameObj = {
        [bundleName]: bundle.map((p) => ({ name: p.name })),
      };

      // icons = { "BundleName": { "ProductName": count, ... } }
      const iconsObj = {
        [bundleName]: Object.fromEntries(
          bundle.map((p) => [p.name, Math.max(0, Number(p.icons_count || 0))])
        ),
      };

      // logo = yes if any product has yes
      const hasLogo = bundle.some((p) => p.logo === "yes");
      logo_value = hasLogo ? "yes" : "no";

      product_name_json = JSON.stringify(productNameObj);
      icons_json = JSON.stringify(iconsObj);
    }

    // 🟡 Card or Standee
    else {
      const p = body.product || {};
      const name = String(p?.name || "").trim();
      if (!name) {
        return NextResponse.json({ error: "product.name required" }, { status: 400 });
      }

      product_name_json = JSON.stringify({ name });

      const iconCount =
        category === "Standee" ? Math.max(0, Number(p?.icons_count || 0)) : 0;

      // icons = { "ProductName": count }
      icons_json = JSON.stringify({ [name]: iconCount });
      logo_value = p?.logo === "yes" ? "yes" : "no";
    }

    // ✅ Insert
    const [result] = await db.execute(
      `
      INSERT INTO shopify_product
        (category, product_name, icons, logo)
      VALUES
        (?, CAST(? AS JSON), CAST(? AS JSON), ?)
      `,
      [category, product_name_json, icons_json, logo_value]
    );

    return NextResponse.json(
      { ok: true, message: "Inserted successfully", result },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}

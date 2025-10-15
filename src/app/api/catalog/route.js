import { NextResponse } from "next/server";
import db from "@/app/lib/db";

export const runtime = "nodejs";

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

    const products = rows.map((r) => {
      let iconsCount = 0;
      try {
        const iconsObj =
          typeof r.icons === "string" ? JSON.parse(r.icons) : r.icons || {};
        if (iconsObj && typeof iconsObj === "object") {
          const v = iconsObj[r.product_name];
          if (typeof v === "number") {
            iconsCount = v;
          } else {
            const first = Object.values(iconsObj).find((x) => typeof x === "number");
            if (typeof first === "number") iconsCount = first;
          }
        }
      } catch {
        iconsCount = 0;
      }
      return {
        id: r.id,
        name: r.product_name || "",
        category: r.category,
        iconsCount,
      };
    });

    // Always return JSON body
    return NextResponse.json({ products }, { status: 200 });
  } catch (err) {
    console.error(err);
    // Still return JSON so client safeJson has content to parse (client also checks res.ok)
    return NextResponse.json(
      { products: [], error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}

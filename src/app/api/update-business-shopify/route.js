import { NextResponse } from "next/server";
import db from "@/app/lib/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const s3Url = (key) =>
  `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

const TABLE = process.env.DB_TABLE_ORDERS_SHOPIFY || "nextjsdb.orders_shopify";

/* helpers */
function sanitizeFilename(name = "") {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}
function safeJson(v, d = null) { try { return typeof v === "string" ? JSON.parse(v) : (v ?? d); } catch { return d; } }
async function runQuery(sql, params) {
  if (typeof db.query === "function") { const [rows] = await db.query(sql, params); return rows; }
  if (typeof db.execute === "function") { const [rows] = await db.execute(sql, params); return rows; }
  return await db(sql, params);
}
function parseDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || "");
  if (!m) return null;
  const [, mime, b64] = m;
  return { mime, buf: Buffer.from(b64, "base64") };
}
async function uploadDataUrlToS3(dataUrl, prefix, filenameHint = "image") {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  const ext = (parsed.mime.split("/")[1] || "bin").split("+")[0];
  const key = `${prefix}-${Date.now()}-${sanitizeFilename(`${filenameHint}.${ext}`)}`;
  await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key, Body: parsed.buf, ContentType: parsed.mime }));
  return s3Url(key);
}

function toIconKV(existing) {
  const x = safeJson(existing, null);
  if (x && typeof x === "object" && !Array.isArray(x)) return { ...x };
  return {};
}
function mergeIconKV(existingKV, productName, iconsArray, logoUrl, upiUrl, prevLogo, prevUpi) {
  const kv = { ...(existingKV || {}) };
  const key = (productName || "default").trim();
  const prev = kv[key] && typeof kv[key] === "object" ? kv[key] : {};
  kv[key] = {
    icons: Array.isArray(iconsArray) ? iconsArray : [],
    logo_url: logoUrl || prevLogo || prev.logo_url || "",
    upi_url: upiUrl || prevUpi || prev.upi_url || "",
  };
  return kv;
}
async function getRow(whereSql, whereParam) {
  const rows = await runQuery(
    `SELECT id, order_name, icon, logo_url, confirm_img, business_name, customer_name
     FROM ${TABLE} WHERE ${whereSql} LIMIT 1`,
    [whereParam]
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

/* ================= handler ================= */
export async function POST(req) {
  try {
    const ct = req.headers.get("content-type") || "";

    /* ------------ JSON (preferred) ------------ */
    if (ct.includes("application/json")) {
      const body = await req.json();

      const orderId = body.orderId || body.order_name;
      const businessName = body.businessName ?? body.business_name;
      const customerNames = body.customerNames;
      const products = Array.isArray(body.products) ? body.products : [];

      if (!orderId) {
        return NextResponse.json({ success: false, message: "orderId required" }, { status: 400 });
      }

      const row = await getRow("order_name = ?", orderId);
      const existingKV = toIconKV(row?.icon);

      let nameForCard = "";
      const arr = safeJson(customerNames, null);
      if (Array.isArray(arr)) {
        nameForCard = (arr.find((x) => (x ?? "").toString().trim() !== "") || "").toString().trim();
      }

      let mergedKV = { ...existingKV };
      let lastLogoUrl = "";
      let lastUpiUrl = "";

      for (const p of products) {
        const pname = p?.product_name || "default";
        const icons = safeJson(p?.icons, p?.icon) || [];

        let finalLogo = "";
        let finalUpi = "";

        if (typeof p?.logo_url === "string" && p.logo_url.startsWith("data:")) {
          finalLogo = await uploadDataUrlToS3(p.logo_url, `logos/${orderId}`, "logo");
        }
        if (typeof p?.confirm_img === "string" && p.confirm_img.startsWith("data:")) {
          finalUpi = await uploadDataUrlToS3(p.confirm_img, `upi/${orderId}`, "upi");
        }

        mergedKV = mergeIconKV(
          mergedKV,
          pname,
          icons,
          finalLogo,
          finalUpi,
          row?.logo_url || "",
          row?.confirm_img || ""
        );

        if (finalLogo) lastLogoUrl = finalLogo;
        if (finalUpi) lastUpiUrl = finalUpi;
      }

      const sets = ["icon = ?"];
      const params = [JSON.stringify(mergedKV)];

      if (typeof businessName === "string") { sets.push("business_name = ?"); params.push(businessName); }
      if (nameForCard) { sets.push("customer_name = ?"); params.push(nameForCard); }
      if (lastLogoUrl) { sets.push("logo_url = ?"); params.push(lastLogoUrl); }
      if (lastUpiUrl) { sets.push("confirm_img = ?"); params.push(lastUpiUrl); }

      const sql = `UPDATE ${TABLE} SET ${sets.join(", ")} WHERE order_name = ? LIMIT 1`;
      const result = await runQuery(sql, [...params, orderId]);

      return NextResponse.json({
        success: true,
        affectedRows: result?.affectedRows ?? 0,
        logoUrl: lastLogoUrl || null,
        upiUrl: lastUpiUrl || null,
        iconKV: mergedKV,
      });
    }

    /* ---- multipart fallback (kept for old clients) ---- */
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const orderId = form.get("orderId");
      const businessName = form.get("businessName") ?? "";
      if (!orderId) return NextResponse.json({ success: false, message: "orderId required" }, { status: 400 });

      let logoFile = null, upiFile = null;
      for (const [k, v] of form.entries()) {
        if (!(v instanceof File)) continue;
        if (!logoFile && k.startsWith("file_")) logoFile = v;
        if (!upiFile && k.startsWith("upi_")) upiFile = v;
        if (logoFile && upiFile) break;
      }

      let logoUrl = "", upiUrl = "";
      if (logoFile) {
        const key = `logos/${orderId}-${Date.now()}-${sanitizeFilename(logoFile.name)}`;
        const body = Buffer.from(await logoFile.arrayBuffer());
        await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key, Body: body, ContentType: logoFile.type || "application/octet-stream" }));
        logoUrl = s3Url(key);
      }
      if (upiFile) {
        const key = `upi/${orderId}-${Date.now()}-${sanitizeFilename(upiFile.name)}`;
        const body = Buffer.from(await upiFile.arrayBuffer());
        await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key, Body: body, ContentType: upiFile.type || "application/octet-stream" }));
        upiUrl = s3Url(key);
      }

      const icons = safeJson(form.get("icons") ?? "[]", []);
      const productName = form.get("product_name") || "default";

      const row = await getRow("order_name = ?", orderId);
      const mergedKV = mergeIconKV(
        toIconKV(row?.icon),
        productName,
        icons,
        logoUrl,
        upiUrl,
        row?.logo_url || "",
        row?.confirm_img || ""
      );

      const sets = ["icon = ?", "business_name = ?"];
      const params = [JSON.stringify(mergedKV), businessName];
      if (logoUrl) { sets.push("logo_url = ?"); params.push(logoUrl); }
      if (upiUrl)  { sets.push("confirm_img = ?"); params.push(upiUrl); }

      const sql = `UPDATE ${TABLE} SET ${sets.join(", ")} WHERE order_name = ? LIMIT 1`;
      const result = await runQuery(sql, [...params, orderId]);

      return NextResponse.json({ success: true, affectedRows: result?.affectedRows ?? 0, logoUrl: logoUrl || null, upiUrl: upiUrl || null, iconKV: mergedKV });
    }

    return NextResponse.json({ success: false, message: "Unsupported content-type" }, { status: 415 });
  } catch (e) {
    console.error("update-business-shopify error:", e);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

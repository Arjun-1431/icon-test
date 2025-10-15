import { NextResponse } from "next/server";
import db from "@/app/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isEmptyish = (v) =>
  v == null ||
  String(v).trim() === "" ||
  String(v).trim().toLowerCase() === "null" ||
  String(v).trim() === "[]";

export async function POST(req) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json(
        { success: false, message: "Phone is required" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `SELECT 
         id, order_name, customer_name, phone, business_name,
         product_name, quantity, product_image_url, total_price, discount,
         payment_status, partially_paid_amount, fulfillment_status,
         icon, logo_url, confirm_img, created_at
       FROM nextjsdb.orders_shopify
       WHERE phone = ?
       ORDER BY created_at DESC`,
      [phone]
    );

    const openOrders = rows.filter((r) => isEmptyish(r.logo_url));
    const submittedOrders = rows.filter((r) => !isEmptyish(r.logo_url));

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

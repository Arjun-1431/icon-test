"use client";

import { useEffect, useMemo, useState } from "react";

const CATEGORIES = ["Card", "Standee", "Bundal"];
const ICON_COUNT_OPTIONS = Array.from({ length: 20 }, (_, i) => i);

export default function AddProductDescription() {
  const [category, setCategory] = useState("");
  const [productName, setProductName] = useState("");

  // Card-only flags
  const [customerNameFlag, setCustomerNameFlag] = useState("no"); // "yes" | "no"
  const [logo, setLogo] = useState("no");                         // "yes" | "no"

  // Standee-only
  const [iconsCount, setIconsCount] = useState(0);

  // Bundal
  const [bundleName, setBundleName] = useState("");
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");

  useEffect(() => {
    if (category === "Bundal") {
      fetch("/api/products")
        .then((res) => res.json())
        .then((data) => setAvailableProducts(data || []))
        .catch((err) => console.error("Failed to load products", err));
    }
  }, [category]);

  const onCategoryChange = (val) => {
    setCategory(val);
    // reset all fields appropriately
    setProductName("");
    setCustomerNameFlag("no");
    setLogo("no");
    setIconsCount(0);
    setBundleName("");
    setSelectedProducts([]);
    setSelectedProductId("");
  };

  const addProductToBundle = () => {
    const product = availableProducts.find((p) => String(p.id) === selectedProductId);
    if (!product) return;
    if (selectedProducts.some((p) => p.id === product.id)) {
      alert("This product is already added!");
      return;
    }
    setSelectedProducts([...selectedProducts, product]);
    setSelectedProductId("");
  };

  const removeProduct = (id) =>
    setSelectedProducts((prev) => prev.filter((p) => p.id !== id));

  // Build payload
  const payload = useMemo(() => {
    if (category === "Bundal") {
      const iconsMap = Object.fromEntries(
        selectedProducts.map((p) => {
          let iconsObj = {};
          try {
            iconsObj = typeof p.icons === "string" ? JSON.parse(p.icons) : p.icons || {};
          } catch {}
          const iconCount =
            iconsObj && typeof iconsObj === "object"
              ? Object.values(iconsObj)[0] ?? 0
              : 0;
          return [p.product_name, iconCount];
        })
      );
      const anyLogo = selectedProducts.some((p) => p.logo === "yes");
      return {
        category,
        bundleName,
        bundle: selectedProducts.map((p) => ({
          name: p.product_name,
          icons_count: iconsMap[p.product_name],
          logo: p.logo,
        })),
        logo: anyLogo ? "yes" : "no",
      };
    }

    if (category === "Standee") {
      return {
        category,
        product: { name: productName, icons_count: iconsCount, logo },
      };
    }

    // Card: send flags (customer_name yes/no + logo yes/no)
    return {
      category,
      product: { name: productName, customer_name: customerNameFlag, logo },
    };
  }, [category, bundleName, selectedProducts, productName, customerNameFlag, iconsCount, logo]);

  const submit = async (e) => {
    e.preventDefault();

    if (!payload.category) return alert("Category required");

    if (payload.category === "Bundal") {
      if (!bundleName) return alert("Bundle name required");
      if (selectedProducts.length === 0) return alert("Select at least one product");
    } else {
      if (!payload.product.name) return alert("Product name required");

      if (payload.category === "Card") {
        if (payload.product.customer_name !== "yes") {
          return alert('For Card, "Customer Name" must be YES');
        }
        if (payload.product.logo !== "yes") {
          return alert('For Card, "Logo" must be YES');
        }
      }
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || "Save failed");
      alert("Product Saved!");

      // reset
      onCategoryChange("");
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Add Product Description</h1>

      <form onSubmit={submit} className="space-y-5">
        {/* Category */}
        <label className="block">
          <span className="text-sm font-medium">Category</span>
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            required
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {/* Card / Standee */}
        {category && category !== "Bundal" && (
          <>
            <label className="block">
              <span className="text-sm font-medium">Product Name</span>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={`Enter ${category} name`}
              />
            </label>

            {/* Card: flags */}
            {category === "Card" && (
              <>
                <label className="block">
                  <span className="text-sm font-medium">Customer Name (YES/NO)</span>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={customerNameFlag}
                    onChange={(e) => setCustomerNameFlag(e.target.value)}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                  {customerNameFlag !== "yes" && (
                    <p className="mt-1 text-xs text-red-600">
                      For Card, Customer Name must be YES.
                    </p>
                  )}
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Has Logo? (must be YES for Card)</span>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                  {logo !== "yes" && (
                    <p className="mt-1 text-xs text-red-600">
                      For Card, Logo must be set to YES.
                    </p>
                  )}
                </label>
              </>
            )}

            {/* Standee: Icons + Logo */}
            {category === "Standee" && (
              <>
                <label className="block">
                  <span className="text-sm font-medium">Icons Count</span>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={iconsCount}
                    onChange={(e) => setIconsCount(Number(e.target.value))}
                  >
                    {ICON_COUNT_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Has Logo?</span>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>
              </>
            )}
          </>
        )}

        {/* Bundal */}
        {category === "Bundal" && (
          <>
            <label className="block">
              <span className="text-sm font-medium">Bundle Name</span>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={bundleName}
                onChange={(e) => setBundleName(e.target.value)}
                placeholder="e.g., M Size / Combo Pack"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Select Product</span>
              <div className="flex items-center gap-2 mt-1">
                <select
                  className="flex-1 rounded-lg border px-3 py-2"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">Select a product</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.product_name} ({p.category})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm"
                  onClick={addProductToBundle}
                  disabled={!selectedProductId}
                >
                  Add
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Icons & logo info auto-applied from selected products.
              </p>
            </label>

            {selectedProducts.length > 0 && (
              <div className="mt-3 border rounded-lg p-3 bg-gray-50">
                <div className="text-sm font-medium mb-2">Selected Products:</div>
                <ul className="space-y-1 text-sm">
                  {selectedProducts.map((p) => (
                    <li key={p.id} className="flex justify-between items-center">
                      <span>
                        {p.product_name} ({p.category}) – Logo: {p.logo}
                      </span>
                      <button
                        type="button"
                        className="text-red-600 text-xs"
                        onClick={() => removeProduct(p.id)}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Preview */}
        <div className="rounded-lg bg-gray-50 p-3 text-xs">
          <div className="mb-1 font-medium">Payload Preview</div>
          <pre className="whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-black px-4 py-2 text-sm text-white"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

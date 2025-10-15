// helpers + constants shared by page and components

export const CATALOG = [
  { name: "NFC Digital Business Card", icons: 0 },
  { name: "Black Metal Card", icons: 0 },
  { name: "Instagram Social Media NFC Card", icons: 0 },
  { name: "Youtube Subscribe NFC Card", icons: 0 },
  { name: "Facebook Social Media NFC QR Card", icons: 0 },

  { name: "4 QR Digital Frosted Standee", icons: 4 },
  { name: "3-in-1 Multi Colour QR Standee with Payment QR", icons: 4 },

  { name: "3 QR Digital Frosted Colour Standee", icons: 3 },
  { name: "4x6 Size 1 Qr Frosted Standee", icons: 1 },
  { name: "7 QR Round Edge Standee", icons: 7 },
  { name: "2 QR Tooth Shaped Red Colour Standee", icons: 2 },
  { name: "3-in-1 Double side White Standee", icons: 4 },
  { name: "3-in-1 Digital QR NFC Standee", icons: 4 },
  { name: "7 QR Smart Premium Standee", icons: 7 },
  { name: "2 Frosted Standee Bundle - Google + Instagram + Payment", icons: 3 },
  { name: "10 Google Review NFC Card Bundle", icons: 1 },
  { name: "5 Google Review NFC Card Bundle", icons: 1 },
  { name: "Google Review NFC Card", icons: 1 },
  { name: "Custom 4 QR Standees", icons: 4 },
  { name: "4-in-1 Black Horizontal Standee with Payment QR", icons: 5 },
  { name: "3 QR Vertical Digital Standee", icons: 3 },
  { name: "4 QR Black Colour Vertical Standee", icons: 4 },
  { name: "2 QR White Colour Standee", icons: 2 },
  { name: "2 QR Green Colour Standee", icons: 2 },
  { name: "2 QR Frosted Colour Standee", icons: 2 },
  { name: "Blue Colour 3 QR Standee", icons: 3 },
  { name: "2 QR Black Colour Standee", icons: 2 },
  { name: "3-in-1 Blue Colour QR Standee with Payment QR", icons: 4 },
  { name: "3-in-1 White Colour QR Standee with Payment QR", icons: 4 },
  { name: "Black Colour 4 QR Digital Standee", icons: 4 },
  { name: "3-in-1 Golden Frosted QR Standee with Payment QR", icons: 4 },
  { name: "3 QR Black Colour Stand", icons: 3 },
  { name: "1 QR Digital Google Standee", icons: 1 },
  { name: "2 QR Digital Frosted Colour Standee", icons: 2 },
  { name: "2 QR Premium Standee Black Cutout", icons: 2 },
  { name: "6QR Premium Standee", icons: 6 },
  { name: "5QR Premium Standee - Landscape", icons: 5 },
  { name: "Google reviews PVC QR Code Standee", icons: 1 },
  { name: "4 QR Digital Vertical Standee", icons: 4 },
  { name: "3 QR Round Shape Vertical Standee", icons: 3 },
  { name: "2-in-1 QR Horizontal Standee with Payment QR", icons: 3 },
  { name: "Smart NFC 2 QR Table Top Standee - Icon Edition", icons: 2 },
  { name: "1 QR Smart Google Review Standee", icons: 1 },
  { name: "4 QR Premium Horizontal Standee", icons: 4 },
  { name: "1 QR Smart Payment Standee", icons: 1 },
];

// short list you’re using in UI
export const ALL_ICONS = [
  "Google",
  "Instagram",
  "Facebook",
  "WhatsApp",
  "YouTube",
  "Twitter",
  "UPI",
  "Other",
];

export const BUSINESS_CARD_SET = new Set(
  CATALOG.filter((x) => x.icons === 0).map((x) => x.name.toLowerCase())
);

export const isBusinessCard = (prod) =>
  Array.from(BUSINESS_CARD_SET).some((n) =>
    (prod || "").toLowerCase().includes(n)
  );

export const isEmptyCol = (v) =>
  v == null ||
  String(v).trim() === "" ||
  String(v).trim().toLowerCase() === "null" ||
  String(v).trim() === "[]";

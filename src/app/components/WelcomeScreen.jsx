"use client";
import { useEffect, useState } from "react";

/**
 * Shows the loading GIF for ~5s, then redirects to
 * /pagefordetail/{customerNumber}. To avoid an infinite loop,
 * it runs only once per tab using sessionStorage.
 */
const WelcomeScreen = ({ customerNumber, seconds = 5, once = true }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const alreadyShown = once && sessionStorage.getItem("welcomeShown") === "1";
    if (alreadyShown) return;

    setShow(true);

    const t = setTimeout(() => {
      try {
        if (once) sessionStorage.setItem("welcomeShown", "1");
      } catch {}

      if (customerNumber) {
        window.location.href = `/pagefordetail/${encodeURIComponent(
          customerNumber
        )}`;
      } else {
        // if no customerNumber provided, just hide the splash
        setShow(false);
      }
    }, seconds * 1000);

    return () => clearTimeout(t);
  }, [customerNumber, seconds, once]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black">
      <div className="text-center">
        <img src="/loadingCard.gif" alt="loading animation" />
      </div>
    </div>
  );
};

export default WelcomeScreen;
"use client";

import { useEffect } from "react";
import WelcomeScreen from "./components/WelcomeScreen";

export default function Landing() {
  useEffect(() => {
    const timer = setTimeout(() => {
      // 🔹 current URL se customerNumber nikaalo
      const pathParts = window.location.pathname.split("/");
      const customerNumber = pathParts[pathParts.length - 1] || "default";

      // 🔹 redirect with number
      window.location.href = `/pagefordetail/${customerNumber}`;
    }, 500); // 0.5 sec splash

    return () => clearTimeout(timer);
  }, []);

  return <WelcomeScreen />;
}

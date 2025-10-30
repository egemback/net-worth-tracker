"use client";

import { useEffect, useState } from "react";

export default function ToastHub() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string>;
      setMsg(String(ce.detail || ""));
      setTimeout(() => setMsg(null), 2000);
    };
    window.addEventListener("toast", handler as any);
    return () => window.removeEventListener("toast", handler as any);
  }, []);

  if (!msg) return null;
  return (
    <div className="fixed bottom-8 right-8 z-50 animate-fade-in">
      <div className="rounded-lg bg-gray-900 text-white px-6 py-4 shadow-2xl text-base font-medium backdrop-blur-sm bg-opacity-90 border border-gray-800">
        {msg}
      </div>
    </div>
  );
}

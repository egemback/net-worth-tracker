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
    <div className="fixed bottom-4 right-4 z-50">
      <div className="rounded bg-gray-900 text-white px-3 py-2 shadow-lg text-sm">
        {msg}
      </div>
    </div>
  );
}

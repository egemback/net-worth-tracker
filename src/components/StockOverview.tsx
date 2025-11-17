"use client";

import { useEffect, useState } from "react";
import { getCompanyProfile } from "@/lib/stocks";

export default function StockOverview({ stock }: { stock: any }) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    getCompanyProfile(stock.symbol).then(setProfile);
  }, [stock]);

  if (!profile) return <div>Loading company profile...</div>;

  return (
    <div className="rounded-lg border p-4 bg-white shadow-sm">
      <div className="flex items-center gap-4 mb-2">
        {profile.image && (
          <img
            src={profile.image}
            alt={profile.companyName}
            className="w-12 h-12 rounded"
          />
        )}
        <div>
          <h2 className="text-lg font-medium">{profile.companyName}</h2>
          <p className="text-sm text-gray-600">
            {profile.exchangeShortName} • {profile.industry}
          </p>
        </div>
      </div>
      <p className="text-sm text-gray-700 mb-2">{profile.description}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <strong>Sector:</strong> {profile.sector}
        </div>
        <div>
          <strong>Country:</strong> {profile.country}
        </div>
        <div>
          <strong>Market Cap:</strong> $
          {Number(profile.mktCap).toLocaleString()}
        </div>
        <div>
          <strong>Currency:</strong> {profile.currency}
        </div>
      </div>
    </div>
  );
}

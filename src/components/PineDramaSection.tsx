import React, { useState, useEffect } from "react";
import { Drama } from "../types";
import { PineDramaService } from "../services/pineDramaService";
import { DramaCard } from "./DramaCard";
import { HeroBanner } from "./HeroBanner";

export const PineDramaSection: React.FC = () => {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPineDramaData = async () => {
      setLoading(true);
      try {
        // Fetch both for you and trending
        const [forYou, trending] = await Promise.all([
          PineDramaService.getForYou(),
          PineDramaService.getTrending(),
        ]);

        // Combine and deduplicate by title
        const allDramas = [...forYou, ...trending];
        const seen = new Set();
        const uniqueDramas = allDramas.filter((d) => {
          if (seen.has(d.title)) return false;
          seen.add(d.title);
          return true;
        });

        setDramas(uniqueDramas);
        setError(null);
      } catch (err: any) {
        console.error("Failed to load PineDrama data:", err);
        setError(err.message || "Failed to load PineDrama data");
      } finally {
        setLoading(false);
      }
    };

    loadPineDramaData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <span className="animate-spin inline-block mr-2"></span>
        Loading PineDrama content...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-400">
        <p>Error loading PineDrama: {error}</p>
        <button
          onClick={() => setDramas([])}
          className="mt-2 text-blue-400 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (dramas.length === 0) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>No PineDrama data available</p>
      </div>
    );
  }

  return (
    <section className="py-12 bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a]">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">
              <span className="text-amber-400">PineDrama</span> Recommendations
            </h2>
            <a
              href="https://api.sansekai.my.id/#/PineDrama"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-amber-300 hover:underline"
            >
              View API Docs
            </a>
          </div>

          {/* Drama Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dramas.map((drama) => (
              <DramaCard
                key={drama.id}
                drama={drama}
                onSelect={(d) => console.log("Select:", d.title)}
                isFavorite={false}
                onToggleFavorite={undefined}
                isInWatchlist={false}
                onToggleWatchlist={undefined}
              />
            ))}
          </div>

          {/* Show more button if many dramas */}
          {dramas.length > 12 && (
            <div className="mt-6 text-center">
              <button
                className="px-4 py-2 bg-white/10 text-white rounded-full hover:bg-black/30 transition-colors"
              >
                View More ({dramas.length} dramas available)
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
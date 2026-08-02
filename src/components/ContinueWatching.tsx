import React from "react";
import { Play, X, Clock, RotateCcw } from "lucide-react";
import { Drama, WatchHistoryItem } from "../types";

interface ContinueWatchingProps {
  historyItems: WatchHistoryItem[];
  dramas: Drama[];
  onSelectDrama: (drama: Drama, epNum: number, seekSeconds?: number) => void;
  onRemoveItem: (e: React.MouseEvent, dramaId: string) => void;
}

export const ContinueWatching: React.FC<ContinueWatchingProps> = ({
  historyItems,
  dramas,
  onSelectDrama,
  onRemoveItem,
}) => {
  if (!historyItems || historyItems.length === 0) return null;

  // Map history items to full drama objects
  const continueList = historyItems
    .map((item) => {
      const drama = dramas.find((d) => d.id === item.dramaId);
      if (!drama) return null;
      const episode = drama.episodes.find((ep) => ep.number === item.epNumber) || drama.episodes[0];
      return {
        ...item,
        drama,
        episode,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (continueList.length === 0) return null;

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-red-500 animate-pulse" />
          <span>Continue Watching</span>
        </h2>
        <span className="text-xs text-gray-400 font-medium">
          {continueList.length} {continueList.length === 1 ? "series" : "series"} in progress
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {continueList.map((item) => {
          const { drama, episode, epNumber, currentTime, durationSeconds, progressPercent } = item;
          const displayPercent = Math.min(100, Math.max(0, Math.round(progressPercent || 0)));

          return (
            <div
              key={`${drama.id}_${epNumber}`}
              onClick={() => onSelectDrama(drama, epNumber, currentTime)}
              className="bg-[#161616] border border-white/10 rounded-2xl p-3 flex gap-3 group hover:border-red-500/50 hover:bg-[#1f1f1f] transition-all cursor-pointer relative overflow-hidden shadow-md"
            >
              {/* Thumbnail Container */}
              <div className="w-24 aspect-[3/4] bg-[#101010] rounded-xl overflow-hidden shrink-0 relative">
                <img
                  src={episode.thumbnailUrl || drama.posterUrl}
                  alt={drama.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                </div>
                <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] font-bold text-white px-1.5 py-0.5 rounded">
                  Ep {epNumber}
                </span>
              </div>

              {/* Info & Progress */}
              <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <h3 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">
                      {drama.title}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(e, drama.id);
                      }}
                      title="Remove from Continue Watching"
                      className="p-1 text-gray-500 hover:text-white rounded-md hover:bg-white/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">
                    {episode.title}
                  </p>
                </div>

                {/* Progress Details */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold">
                    <span className="flex items-center gap-1 text-red-400">
                      <RotateCcw className="w-3 h-3" /> Ep {epNumber}
                    </span>
                    <span>{formatTime(currentTime)} / {formatTime(durationSeconds)} ({displayPercent}%)</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-amber-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(5, displayPercent)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

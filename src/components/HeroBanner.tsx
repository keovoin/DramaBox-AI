import React from "react";
import { Play, Plus, Check, Star, Sparkles } from "lucide-react";
import { Drama } from "../types";

interface HeroBannerProps {
  drama: Drama;
  onWatchEpisode: (drama: Drama, episodeNumber?: number) => void;
  isFavorite: boolean;
  onToggleFavorite: (dramaId: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  drama,
  onWatchEpisode,
  isFavorite,
  onToggleFavorite,
}) => {
  return (
    <section className="relative h-72 sm:h-80 rounded-[32px] overflow-hidden group shadow-2xl border border-white/10 shrink-0">
      {/* Background image & gradient overlays */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{ backgroundImage: `url(${drama.bannerUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent z-10" />
      <div className="absolute inset-0 bg-[#251010]/40 mix-blend-multiply z-10" />

      {/* Content */}
      <div className="relative z-20 h-full flex flex-col justify-center px-5 sm:px-12 space-y-3 sm:space-y-4 max-w-2xl">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded tracking-wide uppercase shadow-sm">
            Featured
          </span>
          <span className="text-[11px] sm:text-xs text-white/70 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-red-400" /> New Episodes Daily
          </span>
          <span className="text-[11px] sm:text-xs text-amber-400 font-bold flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400" /> {drama.rating}
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black italic tracking-tighter text-white leading-tight uppercase line-clamp-2">
          {drama.title}
        </h1>

        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed line-clamp-2 opacity-90 max-w-lg">
          {drama.synopsis}
        </p>

        <div className="flex items-center gap-2.5 sm:gap-4 pt-1 sm:pt-2">
          <button
            onClick={() => onWatchEpisode(drama, 1)}
            className="bg-white text-black px-5 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold text-xs sm:text-sm hover:bg-gray-100 hover:scale-105 transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-black" />
            <span>Watch Episode 1</span>
          </button>

          <button
            onClick={() => onToggleFavorite(drama.id)}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold text-xs sm:text-sm border backdrop-blur-md transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95 ${
              isFavorite
                ? "bg-red-600/30 text-white border-red-500/50"
                : "bg-white/10 text-white border-white/10 hover:bg-white/20"
            }`}
          >
            {isFavorite ? (
              <>
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
                <span>In List</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>+ List</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};

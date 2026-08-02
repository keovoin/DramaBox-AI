import React, { useState } from "react";
import { Play, Star, Heart, Bookmark, Share2, Check } from "lucide-react";
import { Drama } from "../types";

interface DramaCardProps {
  drama: Drama;
  onSelect: (drama: Drama) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent, dramaId: string) => void;
  isInWatchlist?: boolean;
  onToggleWatchlist?: (e: React.MouseEvent, dramaId: string) => void;
  onShare?: (e: React.MouseEvent, drama: Drama) => void;
}

export const DramaCard: React.FC<DramaCardProps> = ({
  drama,
  onSelect,
  isFavorite = false,
  onToggleFavorite,
  isInWatchlist = false,
  onToggleWatchlist,
  onShare,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) {
      onShare(e, drama);
    } else {
      const shareUrl = `${window.location.origin}?drama=${encodeURIComponent(drama.id)}`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div 
      onClick={() => onSelect(drama)}
      className="group cursor-pointer select-none transition-all duration-300 relative"
    >
      <div className="aspect-[3/4] bg-[#1a1a1a] rounded-2xl border border-white/5 mb-3 overflow-hidden transition-all duration-300 group-hover:border-red-600/50 group-hover:shadow-lg group-hover:shadow-red-900/20 relative group-hover:-translate-y-1">
        {/* Poster Image */}
        <img
          src={drama.posterUrl}
          alt={drama.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md text-[10px] font-bold px-2 py-1 rounded-md text-amber-300 flex items-center gap-1 border border-white/10 shadow-sm z-10">
          <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
          <span>{drama.rating}</span>
        </div>

        {drama.category && (
          <div className="absolute top-2.5 left-2.5 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide shadow-sm z-10">
            {drama.category}
          </div>
        )}

        {/* Action Buttons Overlay (Favorite, Watchlist, Share) */}
        <div className="absolute bottom-2.5 right-2.5 left-2.5 flex items-center justify-end gap-1.5 z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          {/* Share Button */}
          <button
            type="button"
            onClick={handleShareClick}
            title="Share drama link"
            className="p-2 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-white transition-all hover:scale-110 active:scale-95 shadow-md"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-gray-200 hover:text-white" />}
          </button>

          {/* Watchlist Bookmark Button */}
          {onToggleWatchlist && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchlist(e, drama.id);
              }}
              title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
              className={`p-2 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-md ${
                isInWatchlist ? "text-amber-400" : "text-white"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isInWatchlist ? "fill-amber-400 text-amber-400" : "text-white"}`} />
            </button>
          )}

          {/* Favorite Heart Button */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(e, drama.id);
              }}
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              className="p-2 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-white transition-all hover:scale-110 active:scale-95 shadow-md"
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-red-500 text-red-500" : "text-white"}`} />
            </button>
          )}
        </div>

        {/* Hover Overlay with Play Icon */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info Title and Episode count */}
      <h3 className="text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
        {drama.title}
      </h3>
      <p className="text-[11px] text-gray-400 mt-0.5">
        {drama.category} • {drama.episodesCount} Episodes
      </p>
    </div>
  );
};

import React, { useState } from "react";
import { Play, Star, Heart, Bookmark, Share2, Check } from "lucide-react";
import { Drama } from "../types";
import { cn } from "../lib/cn";
import { Badge } from "./ui/Badge";

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

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}?drama=${encodeURIComponent(drama.id)}`;
    const shareData = {
      title: drama.title,
      text: `Watch "${drama.title}" on DramaHub!`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }

    if (onShare) {
      onShare(e, drama);
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Clipboard write failed:", err);
      }
    }
  };

  return (
    <div
      onClick={() => onSelect(drama)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(drama);
      }}
      className="group cursor-pointer select-none outline-none"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-ink-800 shadow-md shadow-black/40 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-brand-500/60 group-hover:shadow-xl group-hover:shadow-brand-950/50 group-focus-visible:ring-2 group-focus-visible:ring-brand-500/70 mb-3">
        {/* Poster */}
        <img
          src={drama.posterUrl}
          alt={drama.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Top badges */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <Badge variant="secondary" className="bg-black/70 backdrop-blur-md">
            <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
            {drama.rating}
          </Badge>
        </div>
        {drama.category && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <Badge variant="brand">{drama.category}</Badge>
          </div>
        )}

        {/* Quick actions */}
        <div className="absolute inset-x-2.5 bottom-2.5 z-20 flex items-center justify-end gap-1.5 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={handleShareClick}
            title="Share drama link"
            className="rounded-full bg-black/70 p-2 text-zinc-200 shadow-md backdrop-blur-md transition-all hover:scale-110 hover:bg-black/90 hover:text-white active:scale-95 cursor-pointer"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
          </button>
          {onToggleWatchlist && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchlist(e, drama.id);
              }}
              title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
              className={cn(
                "rounded-full bg-black/70 p-2 shadow-md backdrop-blur-md transition-all hover:scale-110 hover:bg-black/90 active:scale-95 cursor-pointer",
                isInWatchlist ? "text-amber-400" : "text-white"
              )}
            >
              <Bookmark
                className={cn("h-3.5 w-3.5", isInWatchlist && "fill-amber-400")}
              />
            </button>
          )}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(e, drama.id);
              }}
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              className={cn(
                "rounded-full bg-black/70 p-2 shadow-md backdrop-blur-md transition-all hover:scale-110 hover:bg-black/90 active:scale-95 cursor-pointer",
                isFavorite ? "text-red-500" : "text-white"
              )}
            >
              <Heart
                className={cn("h-3.5 w-3.5", isFavorite && "fill-red-500")}
              />
            </button>
          )}
        </div>

        {/* Hover play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 scale-75 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-950/60 transition-transform duration-300 group-hover:scale-100">
            <Play className="ml-0.5 h-6 w-6 fill-white" />
          </div>
        </div>
      </div>

      {/* Meta */}
      <h3 className="truncate text-sm font-bold text-zinc-100 transition-colors group-hover:text-brand-400">
        {drama.title}
      </h3>
      <p className="mt-0.5 text-[11px] text-zinc-500">
        {drama.category} • {drama.episodesCount} Episodes
      </p>
    </div>
  );
};

import React, { useState, useRef, useEffect } from "react";
import { 
  X, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Maximize, Heart, Share2, Star, Lock, Smartphone, Monitor, 
  Settings2, RefreshCw, MessageCircle, Send, Check, Bookmark, Sparkles
} from "lucide-react";
import { Drama, Episode } from "../types";

interface VideoPlayerModalProps {
  drama: Drama;
  initialEpisodeNumber?: number;
  initialSeekSeconds?: number;
  onClose: () => void;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  isFavorite: boolean;
  onToggleFavorite: (dramaId: string) => void;
  isInWatchlist?: boolean;
  onToggleWatchlist?: (dramaId: string) => void;
  isVipMember?: boolean;
  onWatchProgress?: (dramaId: string, epNumber: number, currentTime: number, durationSeconds: number) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  drama,
  initialEpisodeNumber = 1,
  initialSeekSeconds = 0,
  onClose,
  isFavorite,
  onToggleFavorite,
  isInWatchlist = false,
  onToggleWatchlist,
  isVipMember = false,
  onWatchProgress,
}) => {
  const [currentEpNum, setCurrentEpNum] = useState<number>(initialEpisodeNumber);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(initialSeekSeconds);
  const [duration, setDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [autoNext, setAutoNext] = useState<boolean>(true);
  const [useProxyStream, setUseProxyStream] = useState<boolean>(false);
  const [playerMode, setPlayerMode] = useState<"vertical" | "theater">("vertical");
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState<boolean>(true);
  const [shareToast, setShareToast] = useState<string | null>(null);
  
  // Interactions initialized from drama data and local storage
  const [likesCount, setLikesCount] = useState<number>(() => {
    const raw = parseInt(drama.likesCount?.replace(/[^0-9]/g, "") || "0", 10);
    return isNaN(raw) ? 0 : raw;
  });
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [comments, setComments] = useState<Array<{ id: string; user: string; text: string; time: string }>>(() => {
    try {
      const saved = localStorage.getItem(`dramahub_comments_${drama.id}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });
  const [newComment, setNewComment] = useState<string>("");
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(`dramahub_comments_${drama.id}`, JSON.stringify(comments));
    } catch {
      // ignore
    }
  }, [comments, drama.id]);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentEpisode: Episode = drama.episodes.find((ep) => ep.number === currentEpNum) || drama.episodes[0];
  const isLocked = currentEpisode.isVip && !isVipMember;

  // Reset error when episode or stream changes
  useEffect(() => {
    setVideoError(null);
  }, [currentEpNum, useProxyStream]);

  // Video URL generator (direct vs proxy)
  const effectiveVideoUrl = useProxyStream
    ? `/api/proxy-stream?url=${encodeURIComponent(currentEpisode.videoUrl)}`
    : currentEpisode.videoUrl;

  const handleVideoError = () => {
    console.warn("Video failed to load directly:", currentEpisode.videoUrl);
    if (!useProxyStream && currentEpisode.videoUrl.startsWith("http")) {
      setUseProxyStream(true);
      setVideoError("Direct stream unavailable. Switched to proxy stream mode.");
      setTimeout(() => setVideoError(null), 4000);
    } else {
      setVideoError("Unable to play video stream. Please check video URL or try another episode.");
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, currentEpNum]);

  // Initial seek on metadata load if provided
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      if (initialSeekSeconds > 0 && currentEpNum === initialEpisodeNumber) {
        videoRef.current.currentTime = initialSeekSeconds;
      }
      setDuration(videoRef.current.duration || 1);
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch((err) => console.log("Play error:", err));
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setCurrentTime(cur);
    setDuration(dur);
    const p = (cur / dur) * 100;
    setProgress(p);

    if (onWatchProgress && dur > 0) {
      onWatchProgress(drama.id, currentEpNum, cur, dur);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekPercent = parseFloat(e.target.value);
    if (videoRef.current && duration) {
      const newTime = (seekPercent / 100) * duration;
      videoRef.current.currentTime = newTime;
      setProgress(seekPercent);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (autoNext && currentEpNum < drama.episodes.length) {
      handleSelectEpisode(currentEpNum + 1);
    }
  };

  const handleSelectEpisode = (epNum: number) => {
    setCurrentEpNum(epNum);
    setProgress(0);
    setCurrentTime(0);
    setIsPlaying(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    }, 100);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    let userName = "Viewer";
    try {
      const uStr = localStorage.getItem("dramahub_user");
      if (uStr) {
        const u = JSON.parse(uStr);
        if (u?.name) userName = u.name;
      }
    } catch {
      // ignore
    }

    setComments([
      { id: Date.now().toString(), user: userName, text: newComment.trim(), time: "Just now" },
      ...comments,
    ]);
    setNewComment("");
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}?drama=${encodeURIComponent(drama.id)}&ep=${currentEpNum}`;
    const shareData = {
      title: `${drama.title} - Episode ${currentEpNum}`,
      text: `Watch Episode ${currentEpNum} of "${drama.title}" on DramaHub!`,
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

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setShareToast(`Copied Ep ${currentEpNum} share link!`);
      setTimeout(() => {
        setCopiedLink(false);
        setShareToast(null);
      }, 2500);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 sm:p-6 overflow-hidden">
      {/* Toast Notification Banner */}
      {shareToast && (
        <div className="fixed top-4 sm:top-6 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border border-red-400 animate-bounce">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* Container Card */}
      <div className="bg-[#121212] border-0 sm:border border-white/10 rounded-none sm:rounded-3xl w-full max-w-6xl h-[100dvh] sm:h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Top Player Navigation Bar */}
        <div className="min-h-[56px] py-2 px-3 sm:px-6 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a] shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            <button
              onClick={onClose}
              className="p-2.5 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
              title="Close player"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-base font-bold text-white truncate max-w-[160px] sm:max-w-md">
                  {drama.title}
                </h2>
                <span className="text-[10px] sm:text-xs bg-red-600/30 text-red-400 border border-red-500/30 px-1.5 sm:px-2 py-0.5 rounded font-semibold shrink-0">
                  Ep {currentEpisode.number}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 truncate max-w-[150px] sm:max-w-sm">
                {currentEpisode.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Aspect Mode Switcher */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-0.5 sm:p-1 flex items-center gap-1 text-xs">
              <button
                onClick={() => setPlayerMode("vertical")}
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg flex items-center gap-1.5 transition-colors font-medium min-h-[36px] ${
                  playerMode === "vertical"
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
                title="9:16 Vertical Reel Mode"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vertical 9:16</span>
              </button>
              <button
                onClick={() => setPlayerMode("theater")}
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg flex items-center gap-1.5 transition-colors font-medium min-h-[36px] ${
                  playerMode === "theater"
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
                title="16:9 Theater Player Mode"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Theater 16:9</span>
              </button>
            </div>

            {/* Proxy Mode Toggle */}
            <button
              onClick={() => setUseProxyStream(!useProxyStream)}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[36px] ${
                useProxyStream
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
              }`}
              title="Toggle CORS Express Proxy Stream route"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${useProxyStream ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">{useProxyStream ? "Proxy Active" : "Direct Stream"}</span>
            </button>

            {/* Share Link Button */}
            <button
              onClick={handleCopyLink}
              title="Share episode link"
              className="p-2 rounded-xl border bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10 transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Watchlist Button */}
            {onToggleWatchlist && (
              <button
                onClick={() => onToggleWatchlist(drama.id)}
                title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                className={`p-2 rounded-xl border transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center ${
                  isInWatchlist
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isInWatchlist ? "fill-amber-400 text-amber-400" : ""}`} />
              </button>
            )}

            {/* Favorite Button */}
            <button
              onClick={() => onToggleFavorite(drama.id)}
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              className={`p-2 rounded-xl border transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center ${
                isFavorite
                  ? "bg-red-600/30 text-red-400 border-red-500/30"
                  : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* Main Body Grid */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Video Section */}
          <div className="flex-1 bg-black flex flex-col items-center justify-center relative group p-2 sm:p-4 overflow-hidden min-h-[260px]">
            {/* Video Container */}
            <div
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center transition-all select-none ${
                playerMode === "vertical"
                  ? "h-full aspect-[9/16] max-h-[72vh]"
                  : "w-full max-w-4xl aspect-video"
              }`}
            >
              <video
                ref={videoRef}
                src={effectiveVideoUrl}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
                onError={handleVideoError}
                onClick={handlePlayPause}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                controlsList="nodownload noplaybackrate noremoteplayback"
                disablePictureInPicture
                autoPlay
                playsInline
                // @ts-ignore
                webkit-playsinline="true"
                className="w-full h-full object-contain cursor-pointer select-none"
              />

              {/* Center Play Button Overlay for Touch & Mobile */}
              {!isPlaying && !isLocked && (
                <button
                  onClick={handlePlayPause}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl backdrop-blur-md z-30 transition-transform active:scale-95 cursor-pointer border border-white/20"
                  aria-label="Play Episode"
                >
                  <Play className="w-8 h-8 ml-1 fill-current" />
                </button>
              )}

              {/* Video Error Notice Overlay */}
              {videoError && (
                <div className="absolute top-4 left-4 right-4 bg-red-950/90 border border-red-500/50 text-white px-4 py-2.5 rounded-xl shadow-2xl z-40 flex items-center justify-between gap-2 text-xs backdrop-blur-md animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-medium">{videoError}</span>
                  </div>
                  <button
                    onClick={() => setUseProxyStream(!useProxyStream)}
                    className="bg-white/10 hover:bg-white/20 text-xs px-2.5 py-1 rounded-lg font-bold shrink-0 text-amber-300 border border-amber-500/30"
                  >
                    {useProxyStream ? "Use Direct" : "Try Proxy"}
                  </button>
                </div>
              )}

              {/* Persistent Bottom Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20 z-30 pointer-events-none">
                <div 
                  className="h-full bg-gradient-to-r from-red-600 via-red-500 to-amber-500 transition-all duration-150 shadow-[0_0_10px_rgba(239,68,68,0.9)]" 
                  style={{ width: `${progress}%` }} 
                />
              </div>

              {/* Locked VIP Overlay */}
              {isLocked && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-400">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">VIP Episode Locked</h3>
                  <p className="text-xs text-gray-300 max-w-xs mb-6">
                    Episode {currentEpisode.number} is reserved for DramaHub VIP members. Unlock to continue watching!
                  </p>
                  <button className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold px-8 py-3 rounded-full text-sm shadow-xl active:scale-95 transition-all">
                    Unlock VIP Access
                  </button>
                </div>
              )}

              {/* Custom Controls Overlay on Video */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4 pointer-events-none z-20">
                {/* Top Info */}
                <div className="flex justify-between items-center text-xs text-white font-medium">
                  <span className="bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-sm">
                    Ep {currentEpisode.number} / {drama.episodes.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-sm">
                      {playbackSpeed}x Speed
                    </span>
                  </div>
                </div>

                {/* Bottom Controls Bar */}
                <div className="space-y-2 pointer-events-auto">
                  {/* Progress Bar */}
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span>{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progress || 0}
                      onChange={handleSeek}
                      className="flex-1 accent-red-600 cursor-pointer h-1.5 rounded-lg bg-white/20"
                    />
                    <span>{formatTime(duration)}</span>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handlePlayPause}
                        className="p-2 rounded-full bg-white text-black hover:scale-105 transition-transform"
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
                      </button>

                      <button
                        onClick={() => handleSelectEpisode(Math.max(1, currentEpNum - 1))}
                        disabled={currentEpNum <= 1}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-40"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleSelectEpisode(Math.min(drama.episodes.length, currentEpNum + 1))}
                        disabled={currentEpNum >= drama.episodes.length}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-40"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>

                      <button
                        onClick={toggleMute}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Speed selector */}
                      <select
                        value={playbackSpeed}
                        onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                        className="bg-black/60 text-white text-xs border border-white/20 rounded-lg px-2 py-1 outline-none cursor-pointer"
                      >
                        <option value={0.75}>0.75x</option>
                        <option value={1.0}>1.0x</option>
                        <option value={1.25}>1.25x</option>
                        <option value={1.5}>1.5x</option>
                        <option value={2.0}>2.0x</option>
                      </select>

                      {/* Auto next toggle */}
                      <button
                        onClick={() => setAutoNext(!autoNext)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                          autoNext
                            ? "bg-red-600/40 text-red-300 border-red-500/40"
                            : "bg-white/10 text-gray-400 border-white/10"
                        }`}
                      >
                        Auto-Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Episode Drawer & Comments Sidebar */}
          <div className="w-full md:w-80 lg:w-96 max-h-[40vh] md:max-h-none bg-[#0a0a0a] border-t md:border-t-0 md:border-l border-white/10 flex flex-col shrink-0">
            {/* Header Tabs */}
            <div className="flex border-b border-white/10 text-xs font-bold">
              <button
                onClick={() => setShowEpisodeDrawer(true)}
                className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                  showEpisodeDrawer
                    ? "border-red-600 text-white bg-white/5"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                Episodes ({drama.episodes.length})
              </button>
              <button
                onClick={() => setShowEpisodeDrawer(false)}
                className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                  !showEpisodeDrawer
                    ? "border-red-600 text-white bg-white/5"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                Comments ({comments.length})
              </button>
            </div>

            {/* Tab 1: Episode List */}
            {showEpisodeDrawer ? (
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
                  <span>Select Episode:</span>
                  <span className="text-red-400 font-semibold">Free Ep 1-5</span>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                  {drama.episodes.map((ep) => {
                    const isSelected = ep.number === currentEpNum;
                    return (
                      <button
                        key={ep.id}
                        onClick={() => handleSelectEpisode(ep.number)}
                        className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-all border ${
                          isSelected
                            ? "bg-red-600/20 border-red-500/50 text-white font-semibold shadow-inner"
                            : "bg-[#121212] border-white/5 text-gray-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                              isSelected
                                ? "bg-red-600 text-white"
                                : "bg-white/5 text-gray-400"
                            }`}
                          >
                            {ep.number}
                          </div>
                          <div>
                            <p className="text-xs font-medium truncate max-w-[170px]">
                              {ep.title}
                            </p>
                            <p className="text-[10px] text-gray-500">{ep.duration} • {ep.views} views</p>
                          </div>
                        </div>

                        {ep.isVip && (
                          <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> VIP
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Tab 2: Comments & Social */
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                {/* Social Actions */}
                <div className="flex items-center justify-around pb-4 border-b border-white/10 mb-4">
                  <button
                    onClick={() => {
                      setHasLiked(!hasLiked);
                      setLikesCount(hasLiked ? likesCount - 1 : likesCount + 1);
                    }}
                    className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                      hasLiked ? "text-red-500" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${hasLiked ? "fill-red-500" : ""}`} />
                    <span>{likesCount}</span>
                  </button>

                  <button
                    onClick={handleCopyLink}
                    className="flex flex-col items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedLink ? <Check className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5" />}
                    <span>{copiedLink ? "Copied!" : "Share"}</span>
                  </button>
                </div>

                {/* Comment Feed */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {comments.map((c) => (
                    <div key={c.id} className="bg-[#121212] p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-red-400">{c.user}</span>
                        <span className="text-[10px] text-gray-500">{c.time}</span>
                      </div>
                      <p className="text-xs text-gray-300">{c.text}</p>
                    </div>
                  ))}
                </div>

                {/* Add Comment Input */}
                <form onSubmit={handleAddComment} className="pt-3 border-t border-white/10 flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-xl transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import {
  Film,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Video,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  FileText
} from "lucide-react";
import { Drama, Episode } from "../types";

interface MultiDramaDraft {
  id: string;
  title: string;
  category: string;
  synopsis: string;
  posterUrl: string;
  bannerUrl: string;
  rating: number;
  vipFreeLimit: number; // e.g., 3 means ep 1..3 free, 4+ VIP
  episodeUrlsText: string; // multi-line episode links
}

interface MultiDramaBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingDramasCount: number;
  /** Normalized titles already in the catalog (informational; dedup also enforced by the import handler). */
  existingTitles?: string[];
  onImportDramas: (importedDramas: Drama[], mode: "append" | "replace") => void;
}

const DEFAULT_POSTERS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=600",
];

const CATEGORIES = [
  "Billionaire",
  "Revenge",
  "CEO",
  "Romantic Drama",
  "Action",
  "Historical Drama",
  "Fantasy",
  "Urban",
  "Suspense"
];

export const MultiDramaBatchModal: React.FC<MultiDramaBatchModalProps> = ({
  isOpen,
  onClose,
  existingDramasCount,
  onImportDramas,
}) => {
  const [activeTab, setActiveTab] = useState<"builder" | "quickText">("builder");

  // Tab 1: Interactive Multi-Drama Builder state
  const [dramaDrafts, setDramaDrafts] = useState<MultiDramaDraft[]>([
    {
      id: `draft_${Date.now()}_1`,
      title: "Revenge of the Hidden Billionaire",
      category: "Billionaire",
      synopsis: "He concealed his identity for 5 years until the greedy family forced him to reveal his trillion-dollar status.",
      posterUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600",
      bannerUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1200",
      rating: 9.8,
      vipFreeLimit: 3,
      episodeUrlsText: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4`,
    },
    {
      id: `draft_${Date.now()}_2`,
      title: "The CEO's Secret Surrogate Wife",
      category: "Romantic Drama",
      synopsis: "To pay for her brother's emergency hospital bills, Clara agrees to a secret surrogate contract with the ruthless billionaire CEO.",
      posterUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600",
      bannerUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=1200",
      rating: 9.6,
      vipFreeLimit: 2,
      episodeUrlsText: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4`,
    },
  ]);

  // Tab 2: Structured Text Multi-Drama Batch Paste
  const [quickBatchText, setQuickBatchText] = useState<string>(`=== DRAMA: Dragon King Returns ===
Category: Action
Synopsis: The legendary underworld king returns to protect his daughter.
Poster: https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600
FreeEpisodes: 2
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4

=== DRAMA: Flash Marriage with the Tyrant ===
Category: Romantic Drama
Synopsis: Dumped on her wedding day, she married the wealthiest man in town.
Poster: https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600
FreeEpisodes: 3
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4`);

  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);

  if (!isOpen) return null;

  // Helper to add a new drama card
  const handleAddNewDrama = () => {
    const nextIdx = dramaDrafts.length + 1;
    const randomPoster = DEFAULT_POSTERS[nextIdx % DEFAULT_POSTERS.length];
    setDramaDrafts([
      ...dramaDrafts,
      {
        id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: `Drama Series ${nextIdx}`,
        category: "Billionaire",
        synopsis: `An exciting story with high-stakes romance, betrayal and revenge.`,
        posterUrl: randomPoster,
        bannerUrl: randomPoster,
        rating: 9.7,
        vipFreeLimit: 3,
        episodeUrlsText: "",
      },
    ]);
  };

  const handleUpdateDraft = (id: string, updates: Partial<MultiDramaDraft>) => {
    setDramaDrafts(dramaDrafts.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const handleDeleteDraft = (id: string) => {
    if (dramaDrafts.length === 1) {
      setNotice({
        message: "You must keep at least 1 drama in the builder.",
        type: "error"
      });
      return;
    }
    setDramaDrafts(dramaDrafts.filter((d) => d.id !== id));
  };

  // Convert raw URLs string into Episode objects
  const parseEpisodesFromText = (urlsText: string, seriesTitle: string, vipLimit: number, posterUrl: string): Episode[] => {
    const cleanLines = urlsText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 5 && (l.startsWith("http://") || l.startsWith("https://") || l.startsWith("data:video") || l.startsWith("/")));

    if (cleanLines.length === 0) {
      // Fallback default episode
      return [
        {
          id: 1,
          number: 1,
          title: `Episode 1: ${seriesTitle}`,
          duration: "1:45",
          videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          isVip: false,
          views: "500K",
          thumbnailUrl: posterUrl,
        }
      ];
    }

    return cleanLines.map((url, idx) => {
      const epNum = idx + 1;
      return {
        id: epNum,
        number: epNum,
        title: `Episode ${epNum}: ${seriesTitle}`,
        duration: "1:45",
        videoUrl: url,
        isVip: epNum > vipLimit,
        views: `${Math.max(15, Math.floor(650 / epNum))}K`,
        thumbnailUrl: posterUrl,
      };
    });
  };

  // Parse Text block mode into Dramas
  const parseQuickBatchText = (): Drama[] => {
    const blocks = quickBatchText.split(/===\s*(?:DRAMA:?|SERIES:?)\s*/i).map((b) => b.trim()).filter(Boolean);
    const parsedDramas: Drama[] = [];

    blocks.forEach((block, index) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const firstLine = lines[0].replace(/^===|===$/g, "").trim();
      const title = firstLine || `Imported Series ${index + 1}`;
      
      let category = "Billionaire";
      let synopsis = `${title} short drama series full episodes.`;
      let posterUrl = DEFAULT_POSTERS[index % DEFAULT_POSTERS.length];
      let freeEpisodesLimit = 3;
      const videoUrls: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^category:\s*/i.test(line)) {
          category = line.replace(/^category:\s*/i, "").trim() || category;
        } else if (/^synopsis:\s*|^description:\s*/i.test(line)) {
          synopsis = line.replace(/^synopsis:\s*|^description:\s*/i, "").trim() || synopsis;
        } else if (/^poster:\s*|^image:\s*|^cover:\s*/i.test(line)) {
          posterUrl = line.replace(/^poster:\s*|^image:\s*|^cover:\s*/i, "").trim() || posterUrl;
        } else if (/^freeepisodes:\s*|^freelimit:\s*/i.test(line)) {
          const num = parseInt(line.replace(/^freeepisodes:\s*|^freelimit:\s*/i, "").trim(), 10);
          if (!isNaN(num)) freeEpisodesLimit = num;
        } else if (line.startsWith("http://") || line.startsWith("https://") || line.startsWith("data:video") || line.startsWith("/")) {
          videoUrls.push(line);
        }
      }

      const episodes = parseEpisodesFromText(videoUrls.join("\n"), title, freeEpisodesLimit, posterUrl);
      const dramaId = `drama_batch_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`;

      parsedDramas.push({
        id: dramaId,
        title,
        tagline: `${title} - Must Watch Drama`,
        synopsis,
        category,
        rating: 9.7,
        episodesCount: episodes.length,
        episodes,
        posterUrl,
        bannerUrl: posterUrl,
        featured: index === 0,
        trending: true,
        tags: [category, "Drama", "Top Hits"],
        releaseYear: "2026",
        viewsCount: "1.4M",
        likesCount: "110K",
      });
    });

    return parsedDramas;
  };

  const handleExecuteImport = () => {
    let resultDramas: Drama[] = [];

    if (activeTab === "builder") {
      resultDramas = dramaDrafts.map((draft, idx) => {
        const episodes = parseEpisodesFromText(
          draft.episodeUrlsText,
          draft.title,
          draft.vipFreeLimit,
          draft.posterUrl
        );

        return {
          id: `drama_bulk_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          title: draft.title.trim() || `Series ${idx + 1}`,
          tagline: `${draft.title} - Official Release`,
          synopsis: draft.synopsis.trim() || `${draft.title} short drama series.`,
          category: draft.category || "Billionaire",
          rating: draft.rating || 9.8,
          episodesCount: episodes.length,
          episodes,
          posterUrl: draft.posterUrl || DEFAULT_POSTERS[idx % DEFAULT_POSTERS.length],
          bannerUrl: draft.bannerUrl || draft.posterUrl || DEFAULT_POSTERS[idx % DEFAULT_POSTERS.length],
          featured: idx === 0,
          trending: true,
          tags: [draft.category, "Popular"],
          releaseYear: "2026",
          viewsCount: "1.2M",
          likesCount: "95K",
        };
      });
    } else {
      resultDramas = parseQuickBatchText();
    }

    if (resultDramas.length === 0) {
      setNotice({
        message: "No dramas could be generated. Please check your drama titles and episode links.",
        type: "error"
      });
      return;
    }

    onImportDramas(resultDramas, importMode);
    onClose();
  };

  // Calculate total episodes across all drafts for summary badge
  const totalEpisodesInBuilder = dramaDrafts.reduce((sum, d) => {
    const validLines = d.episodeUrlsText.split("\n").filter((l) => l.trim().length > 5).length;
    return sum + (validLines > 0 ? validLines : 1);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#121212] border border-white/15 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-gray-300 text-xs">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-[#17171e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Multi-Drama & Multi-Episode Bulk Creator
                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  All-in-One Multi-Episode
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Add multiple drama series at once, with <strong>unlimited episode video links</strong> for each series.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-2 border-b border-white/10 bg-[#141419]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("builder")}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "builder"
                  ? "bg-red-600 text-white shadow-md shadow-red-900/30"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Multi-Drama Builder ({dramaDrafts.length} Series, {totalEpisodesInBuilder} Total Episodes)</span>
            </button>
            <button
              onClick={() => setActiveTab("quickText")}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "quickText"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/30"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Batch Script Paste Mode</span>
            </button>
          </div>

          {activeTab === "builder" && (
            <button
              onClick={handleAddNewDrama}
              className="px-3.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Drama Series</span>
            </button>
          )}
        </div>

        {/* Notice Alert */}
        {notice && (
          <div className={`mx-4 sm:mx-6 mt-3 p-3 rounded-xl flex items-center justify-between ${
            notice.type === "error" ? "bg-red-950/40 border border-red-500/40 text-red-300" : "bg-emerald-950/40 border border-emerald-500/40 text-emerald-300"
          }`}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{notice.message}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-xs underline cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-[#0f0f13]">
          
          {/* TAB 1: Visual Interactive Builder */}
          {activeTab === "builder" && (
            <div className="space-y-6">
              <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-indigo-300">
                  <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                  <p className="text-xs">
                    Each drama card below accepts <strong>multiple episode stream URLs</strong> (1 URL per line). You can also set where VIP locking starts for each series.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full whitespace-nowrap">
                  {dramaDrafts.length} Series Configured
                </span>
              </div>

              <div className="space-y-4">
                {dramaDrafts.map((draft, idx) => {
                  const lineCount = draft.episodeUrlsText.split("\n").filter((l) => l.trim().length > 5).length;
                  return (
                    <div
                      key={draft.id}
                      className="bg-[#171720] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4 relative shadow-lg"
                    >
                      {/* Drama Card Top Bar */}
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-red-600 text-white font-black flex items-center justify-center text-xs">
                            {idx + 1}
                          </span>
                          <span className="font-black text-white text-sm">Drama #{idx + 1}</span>
                          <span className="bg-white/10 text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {lineCount || 1} Episode{lineCount === 1 ? "" : "s"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-red-600/30 text-gray-400 hover:text-red-400 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="Delete this drama"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Series</span>
                          </button>
                        </div>
                      </div>

                      {/* Drama Metadata Inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Title & Category */}
                        <div className="md:col-span-6 space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-300 mb-1">
                              Drama Series Title *
                            </label>
                            <input
                              type="text"
                              required
                              value={draft.title}
                              onChange={(e) => handleUpdateDraft(draft.id, { title: e.target.value })}
                              placeholder="e.g. Revenge of the Hidden Billionaire"
                              className="w-full bg-[#101015] border border-white/15 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-red-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                Genre / Category
                              </label>
                              <select
                                value={draft.category}
                                onChange={(e) => handleUpdateDraft(draft.id, { category: e.target.value })}
                                className="w-full bg-[#101015] border border-white/15 rounded-xl px-2.5 py-2 text-white text-xs focus:outline-none focus:border-red-500"
                              >
                                {CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                Free Episodes Limit
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={draft.vipFreeLimit}
                                onChange={(e) => handleUpdateDraft(draft.id, { vipFreeLimit: parseInt(e.target.value) || 0 })}
                                className="w-full bg-[#101015] border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-300 mb-1">
                              Synopsis (Story Overview)
                            </label>
                            <textarea
                              rows={2}
                              value={draft.synopsis}
                              onChange={(e) => handleUpdateDraft(draft.id, { synopsis: e.target.value })}
                              placeholder="Story summary..."
                              className="w-full bg-[#101015] border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500 resize-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-300 mb-1">
                              Cover Poster Image URL
                            </label>
                            <input
                              type="url"
                              value={draft.posterUrl}
                              onChange={(e) => handleUpdateDraft(draft.id, { posterUrl: e.target.value })}
                              placeholder="https://images.unsplash.com/..."
                              className="w-full bg-[#101015] border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-red-500"
                            />
                          </div>
                        </div>

                        {/* Episode Video Links Area (Multiple Links Per Drama) */}
                        <div className="md:col-span-6 flex flex-col justify-between bg-[#121218] p-3.5 rounded-2xl border border-white/10 space-y-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-black text-indigo-300 flex items-center gap-1.5">
                                <Video className="w-3.5 h-3.5 text-indigo-400" />
                                Episode Video Stream Links (1 Per Line) *
                              </label>
                              <span className="text-[10px] font-bold text-gray-400">
                                {lineCount} Link{lineCount === 1 ? "" : "s"} Entered
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 mb-2">
                              Paste all episode MP4/video URLs for <strong>"{draft.title}"</strong> below. Ep 1 to Ep {draft.vipFreeLimit} are Free; Ep {draft.vipFreeLimit + 1}+ become VIP.
                            </p>
                            <textarea
                              rows={8}
                              required
                              value={draft.episodeUrlsText}
                              onChange={(e) => handleUpdateDraft(draft.id, { episodeUrlsText: e.target.value })}
                              placeholder={`https://domain.com/drama/ep1.mp4\nhttps://domain.com/drama/ep2.mp4\nhttps://domain.com/drama/ep3.mp4\nhttps://domain.com/drama/ep4.mp4\nhttps://domain.com/drama/ep5.mp4`}
                              className="w-full bg-[#0d0d12] border border-white/15 rounded-xl p-3 text-white font-mono text-[11px] placeholder-gray-600 focus:outline-none focus:border-indigo-500 custom-scrollbar leading-relaxed"
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/5">
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Auto-Sequencing Enabled (Ep 1, Ep 2...)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateDraft(draft.id, {
                                episodeUrlsText: draft.episodeUrlsText + `\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4`
                              })}
                              className="text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                            >
                              + Append Sample Ep
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Add Drama Button */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleAddNewDrama}
                  className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold text-xs flex items-center gap-2 mx-auto transition-all cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4 text-red-500" />
                  <span>+ Add Another Drama Series to Batch</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Direct Script/Text Multi-Drama Batch Paste */}
          {activeTab === "quickText" && (
            <div className="space-y-4">
              <div className="bg-[#171722] border border-indigo-500/30 rounded-2xl p-4 space-y-2">
                <h3 className="text-xs font-black text-indigo-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Batch Text Script Format (Multiple Dramas & Multiple Episodes)
                </h3>
                <p className="text-xs text-gray-400">
                  Separate each drama with <code className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">=== DRAMA: Series Name ===</code>. Then list Category, Synopsis, Poster, and as many episode video links as you want on separate lines.
                </p>
              </div>

              <textarea
                rows={16}
                value={quickBatchText}
                onChange={(e) => setQuickBatchText(e.target.value)}
                className="w-full bg-[#161616] border border-white/15 rounded-2xl p-4 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 custom-scrollbar leading-relaxed"
              />
            </div>
          )}

          {/* Import Strategy Option */}
          <div className="bg-[#171720] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-white">Catalog Import Strategy:</span>
            <div className="flex items-center gap-5">
              <label className="flex items-center gap-2 cursor-pointer text-gray-300 text-xs">
                <input
                  type="radio"
                  name="batchImportMode"
                  value="append"
                  checked={importMode === "append"}
                  onChange={() => setImportMode("append")}
                  className="accent-red-600"
                />
                <span>Append to Existing Catalog (Keep {existingDramasCount} current)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-red-300 text-xs">
                <input
                  type="radio"
                  name="batchImportMode"
                  value="replace"
                  checked={importMode === "replace"}
                  onChange={() => setImportMode("replace")}
                  className="accent-red-600"
                />
                <span>Replace Entire Catalog</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16161c] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleExecuteImport}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-red-900/40 transition-transform active:scale-95 cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>
              {activeTab === "builder"
                ? `Publish ${dramaDrafts.length} Dramas (${totalEpisodesInBuilder} Episodes)`
                : `Publish All Dramas from Script`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

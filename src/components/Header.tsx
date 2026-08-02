import React, { useState, useEffect, useRef } from "react";
import { Search, Bell, Server, Code, Sparkles, Shield, User, LogOut, Mail, Phone, Crown, Clock, X, Trash2, Play } from "lucide-react";
import { UserProfile } from "../types";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAdmin?: () => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenUpgrade: () => void;
  onOpenEditProfile?: () => void;
  notificationCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAdmin,
  user,
  onOpenAuth,
  onLogout,
  onOpenUpgrade,
  onOpenEditProfile,
  notificationCount = 2,
}) => {
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("dramahub_search_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync Search History to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("dramahub_search_history", JSON.stringify(searchHistory));
    } catch (err) {
      console.error("Failed to save search history", err);
    }
  }, [searchHistory]);

  // Handle clicking outside search container
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addSearchTermToHistory = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...filtered].slice(0, 10);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      addSearchTermToHistory(searchQuery);
      setIsSearchFocused(false);
    }
  };

  const handleSelectHistoryItem = (item: string) => {
    onSearchChange(item);
    addSearchTermToHistory(item);
    setIsSearchFocused(false);
  };

  const handleRemoveHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    setSearchHistory((prev) => prev.filter((i) => i !== item));
  };

  const handleClearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory([]);
  };

  const isAdminUser = user?.email === "keovoin@gmail.com";

  return (
    <header className="h-16 sm:h-20 flex items-center justify-between px-4 sm:px-8 relative z-30 shrink-0 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 gap-2">
      {/* Mobile Brand Logo */}
      <div className="md:hidden flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
          <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
        </div>
        <span className="text-sm font-black tracking-tight text-white">DRAMA<span className="text-red-600">HUB</span></span>
      </div>

      {/* Search Input with Search History Dropdown */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-[180px] xs:max-w-[240px] sm:max-w-xs md:w-80 lg:w-96 z-40">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onFocus={() => setIsSearchFocused(true)}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search series..."
          className="w-full bg-[#1a1a1a] border border-white/10 rounded-full py-2 pl-9 pr-8 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-600/50 focus:border-red-600/50 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => {
              onSearchChange("");
              setIsSearchFocused(true);
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white cursor-pointer p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Search History Dropdown Menu */}
        {isSearchFocused && (
          <div className="absolute left-0 right-0 top-12 bg-[#161616] border border-white/10 rounded-2xl p-3 shadow-2xl z-50 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between px-2 pb-2 border-b border-white/5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-500" /> Recent Search History
              </span>
              {searchHistory.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  className="text-[10px] text-gray-500 hover:text-red-400 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear All
                </button>
              )}
            </div>

            {searchHistory.length > 0 ? (
              <div className="space-y-1 max-h-56 overflow-y-auto custom-scrollbar">
                {searchHistory.map((item, idx) => (
                  <div
                    key={`${item}_${idx}`}
                    onClick={() => handleSelectHistoryItem(item)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-gray-200 hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <span className="flex items-center gap-2 font-medium truncate">
                      <Clock className="w-3.5 h-3.5 text-gray-500 group-hover:text-red-400 shrink-0" />
                      <span className="truncate">{item}</span>
                    </span>
                    <button
                      onClick={(e) => handleRemoveHistoryItem(e, item)}
                      title="Remove from search history"
                      className="p-1 text-gray-500 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-gray-500">
                No recent searches. Press Enter when searching to save terms.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Controls & User Info */}
      <div className="flex items-center gap-3">
        {/* Admin Portal Button - Strictly Restricted to keovoin@gmail.com */}
        {onOpenAdmin && isAdminUser && (
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-900/30 text-xs font-bold transition-all cursor-pointer animate-pulse"
            title="Open Admin Portal (Authorized: keovoin@gmail.com)"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Portal</span>
          </button>
        )}

        {/* Upgrade / Cutluy Payment Button */}
        <button
          onClick={onOpenUpgrade}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
          title="Buy VIP Membership via Cutluy Gateway"
        >
          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>{user?.isVip ? "VIP Active" : "Get VIP Pass"}</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button className="p-2.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors relative cursor-pointer">
            <Bell className="w-5 h-5 opacity-80" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full ring-2 ring-[#0a0a0a]" />
            )}
          </button>
        </div>

        {/* User Profile / Auth Button */}
        <div className="flex items-center gap-3 border-l border-white/10 pl-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight flex items-center justify-end gap-1">
                  {user.name}
                  {user.authMethod === "gmail" ? (
                    <Mail className="w-3 h-3 text-red-400" />
                  ) : (
                    <Phone className="w-3 h-3 text-emerald-400" />
                  )}
                </p>
                <p className="text-[10px] text-amber-400 font-semibold flex items-center justify-end gap-1">
                  <Crown className="w-2.5 h-2.5 text-amber-400" /> {user.isVip ? (user.vipPlanName || "VIP Member") : "Free Member"}
                </p>
              </div>

              <div className="relative group">
                <img
                  src={user.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                  alt={user.name}
                  className="w-10 h-10 rounded-full border-2 border-red-500/50 object-cover shadow-md cursor-pointer"
                />

                {/* Quick Profile / Logout Dropdown */}
                <div className="absolute right-0 top-12 w-52 bg-[#181818] border border-white/10 rounded-2xl p-2 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50 space-y-1">
                  <div className="px-3 py-2 border-b border-white/5 text-xs">
                    <p className="font-bold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {user.email || user.phone || "User Account"}
                    </p>
                  </div>

                  {user.isVip && (
                    <div className="mx-1 my-1 p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[10px]">
                      <p className="font-bold text-amber-300 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-400" /> {user.vipPlanName || "VIP Pass"}
                      </p>
                      {user.vipExpiresAt && (
                        <p className="text-gray-400 text-[9px] mt-0.5">
                          Expires: {new Date(user.vipExpiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Transaction History Log */}
                  {user.transactions && user.transactions.length > 0 && (
                    <div className="mx-1 my-1 p-2 bg-white/5 border border-white/10 rounded-xl text-[10px] max-h-32 overflow-y-auto custom-scrollbar space-y-1.5">
                      <p className="font-bold text-gray-300 text-[9px] uppercase tracking-wider">Payment History</p>
                      {user.transactions.slice(0, 3).map((tx) => (
                        <div key={tx.id} className="border-b border-white/5 pb-1 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between font-medium text-white">
                            <span className="truncate max-w-[110px]">{tx.planName}</span>
                            <span className="text-emerald-400 font-bold">${tx.finalPrice.toFixed(2)}</span>
                          </div>
                          {tx.discountAmount > 0 && (
                            <p className="text-[8px] text-amber-300 font-semibold">
                              Saved ${tx.discountAmount.toFixed(2)} (20% Renewal)
                            </p>
                          )}
                          <p className="text-[8px] text-gray-400">
                            {new Date(tx.purchasedAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Edit Profile & Username Option */}
                  {onOpenEditProfile && (
                    <button
                      onClick={onOpenEditProfile}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-gray-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-red-400" />
                      <span>Edit Profile & Name</span>
                    </button>
                  )}

                  <button
                    onClick={onLogout}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-400 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 text-xs font-bold transition-all cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Login (Gmail / Phone)</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


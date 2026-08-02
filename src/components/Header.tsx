import React, { useState, useEffect, useRef } from "react";
import { Search, Bell, Server, Code, Sparkles, Shield, User, LogOut, Mail, Phone, Crown, Clock, X, Trash2, Play, Menu, Home, Compass, Flame, Star, Bookmark } from "lucide-react";
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
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  favoritesCount?: number;
  watchlistCount?: number;
  historyCount?: number;
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
  currentTab = "home",
  onTabChange,
  favoritesCount = 0,
  watchlistCount = 0,
  historyCount = 0,
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Sync Search History to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("dramahub_search_history", JSON.stringify(searchHistory));
    } catch (err) {
      console.error("Failed to save search history", err);
    }
  }, [searchHistory]);

  // Handle clicking outside search container & user menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
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
    <header className="h-16 sm:h-20 flex items-center justify-between px-2.5 sm:px-8 relative z-30 shrink-0 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5 gap-1.5 sm:gap-3">
      {/* Mobile Hamburger Menu Toggle Button & Brand Logo */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          className="md:hidden p-2 -ml-1 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          aria-label="Toggle mobile navigation menu"
        >
          <Menu className="w-5 h-5 text-gray-200" />
        </button>

        <div
          onClick={() => {
            if (onTabChange) onTabChange("home");
            setIsMobileDrawerOpen(false);
          }}
          className="flex items-center gap-1.5 shrink-0 cursor-pointer group"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-600 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 shadow-md shadow-red-900/30">
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white ml-0.5" />
          </div>
          <span className="text-xs sm:text-sm font-black tracking-tight text-white hidden xs:inline">
            DRAMA<span className="text-red-600">HUB</span>
          </span>
        </div>
      </div>

      {/* Search Input with Search History Dropdown */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-[130px] min-w-[90px] xs:max-w-[180px] sm:max-w-xs md:w-80 lg:w-96 z-40">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onFocus={() => setIsSearchFocused(true)}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search..."
          className="w-full bg-[#1a1a1a] border border-white/10 rounded-full py-1.5 sm:py-2 pl-7 sm:pl-9 pr-6 sm:pr-8 text-[11px] sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-600/50 focus:border-red-600/50 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => {
              onSearchChange("");
              setIsSearchFocused(true);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white cursor-pointer p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Search History Dropdown Menu */}
        {isSearchFocused && (
          <div className="absolute left-0 right-0 top-11 bg-[#161616] border border-white/10 rounded-2xl p-3 shadow-2xl z-50 space-y-2 animate-fadeIn min-w-[200px]">
            <div className="flex items-center justify-between px-2 pb-2 border-b border-white/5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-500" /> Recent Search History
              </span>
              {searchHistory.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  className="text-[10px] text-gray-500 hover:text-red-400 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear
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
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Admin Portal Button - Restricted to keovoin@gmail.com */}
        {onOpenAdmin && isAdminUser && (
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-900/30 text-[11px] sm:text-xs font-bold transition-all cursor-pointer animate-pulse shrink-0"
            title="Open Admin Portal (Authorized: keovoin@gmail.com)"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Admin</span>
          </button>
        )}

        {/* Upgrade / Cutluy Payment Button */}
        <button
          onClick={onOpenUpgrade}
          className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0"
          title="Buy VIP Membership via Cutluy Gateway"
        >
          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>{user?.isVip ? "VIP" : "Get VIP"}</span>
        </button>

        {/* Notifications Button (hidden on tiny screens) */}
        <div className="relative hidden xs:block">
          <button className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors relative cursor-pointer">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full ring-2 ring-[#0a0a0a]" />
            )}
          </button>
        </div>

        {/* User Profile / Auth Button (Visible on ALL screens) */}
        <div className="flex items-center gap-2 border-l border-white/10 pl-2 sm:pl-3" ref={userMenuRef}>
          {user ? (
            <div className="flex items-center gap-2">
              <div className="text-right hidden md:block">
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

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="focus:outline-none block cursor-pointer"
                >
                  <img
                    src={user.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                    alt={user.name}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-red-500/50 object-cover shadow-md"
                  />
                </button>

                {/* Quick Profile / Logout Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-11 sm:top-12 w-52 bg-[#181818] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 space-y-1 animate-fadeIn">
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

                    {/* Edit Profile & Username Option */}
                    {onOpenEditProfile && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenEditProfile();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-gray-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-red-400" />
                        <span>Edit Profile & Name</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-400 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              <User className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Collapsible Side Drawer Overlay (Active below md: 768px) */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fadeIn">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Side Drawer Body */}
          <div className="relative w-72 max-w-[80vw] bg-[#121212] border-r border-white/10 h-full flex flex-col z-10 shadow-2xl overflow-y-auto custom-scrollbar">
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0e0e0e]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                </div>
                <span className="text-sm font-black text-white">DRAMA<span className="text-red-600">HUB</span></span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile User Profile & Authentication Section */}
            <div className="p-4 bg-white/5 border-b border-white/10">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                      alt={user.name}
                      className="w-11 h-11 rounded-full border-2 border-red-500/50 object-cover shadow-md shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                        {user.name}
                        {user.authMethod === "gmail" ? (
                          <Mail className="w-3 h-3 text-red-400 shrink-0" />
                        ) : (
                          <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {user.email || user.phone || "User Account"}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full mt-1">
                        <Crown className="w-2.5 h-2.5" /> {user.isVip ? (user.vipPlanName || "VIP Member") : "Free Member"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    {onOpenEditProfile && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileDrawerOpen(false);
                          onOpenEditProfile();
                        }}
                        className="flex-1 py-1.5 px-2 bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-red-400" />
                        <span>Edit Profile</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        onLogout();
                      }}
                      className="py-1.5 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 space-y-2">
                  <p className="text-xs text-gray-400 font-medium">Sign in to save dramas & track progress</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <User className="w-4 h-4" />
                    <span>Login (Gmail / Phone)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Navigation Items in Drawer */}
            <div className="p-3 space-y-1 flex-1">
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Navigation</p>
              {[
                { id: "home", label: "Home", icon: Home },
                { id: "browse", label: "Browse", icon: Compass },
                { id: "trending", label: "Trending", icon: Flame },
                ...(isAdminUser ? [{ id: "admin", label: "Admin Portal", icon: Shield }] : []),
              ].map((nav) => {
                const Icon = nav.icon;
                const isActive = currentTab === nav.id;
                return (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => {
                      if (onTabChange) onTabChange(nav.id);
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3 font-medium text-xs text-left cursor-pointer transition-all ${
                      isActive ? "bg-white/10 text-white font-bold" : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-red-500" : "opacity-70"}`} />
                    <span>{nav.label}</span>
                  </button>
                );
              })}

              <p className="px-3 pt-4 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Library</p>
              {[
                { id: "watchlist", label: "Watchlist", icon: Bookmark, badge: watchlistCount },
                { id: "favorites", label: "Favorites", icon: Star, badge: favoritesCount },
                { id: "history", label: "History", icon: Clock, badge: historyCount },
              ].map((lib) => {
                const Icon = lib.icon;
                const isActive = currentTab === lib.id;
                return (
                  <button
                    key={lib.id}
                    type="button"
                    onClick={() => {
                      if (onTabChange) onTabChange(lib.id);
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between font-medium text-xs text-left cursor-pointer transition-all ${
                      isActive ? "bg-white/10 text-white font-bold" : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? "text-red-500" : "opacity-70"}`} />
                      <span>{lib.label}</span>
                    </div>
                    {lib.badge && lib.badge > 0 ? (
                      <span className="bg-red-600/30 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {lib.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Upgrade CTA in Drawer */}
            <div className="p-4 border-t border-white/10 bg-[#0d0d0d]">
              <div className="bg-gradient-to-br from-red-600 to-red-900 p-3.5 rounded-2xl text-center shadow-lg relative overflow-hidden border border-red-500/20">
                <div className="flex justify-center mb-1">
                  <Crown className="w-4 h-4 text-amber-300" />
                </div>
                <p className="text-xs font-bold uppercase tracking-tight text-white mb-0.5">Go Premium</p>
                <p className="text-[10px] text-red-100/80 mb-2.5 leading-tight">Unlimited short-dramas & HD streaming</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenUpgrade();
                  }}
                  className="w-full bg-white text-red-600 py-1.5 rounded-lg font-bold text-xs shadow-md hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};



import React from "react";
import { Home, Compass, Flame, Star, Clock, Crown, Play, Shield, Bookmark, Lock } from "lucide-react";
import { UserProfile } from "../types";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  favoritesCount: number;
  watchlistCount: number;
  historyCount: number;
  onOpenUpgrade: () => void;
  user?: UserProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  favoritesCount,
  watchlistCount,
  historyCount,
  onOpenUpgrade,
  user,
}) => {
  const isAdminUser = user?.email === "keovoin@gmail.com";

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "browse", label: "Browse", icon: Compass },
    { id: "trending", label: "Trending", icon: Flame },
    ...(isAdminUser ? [{ id: "admin", label: "Admin Portal", icon: Shield }] : []),
  ];

  const libraryItems = [
    { id: "watchlist", label: "Watchlist", icon: Bookmark, badge: watchlistCount > 0 ? watchlistCount : null },
    { id: "favorites", label: "Favorites", icon: Star, badge: favoritesCount > 0 ? favoritesCount : null },
    { id: "history", label: "History", icon: Clock, badge: historyCount > 0 ? historyCount : null },
  ];

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-[#121212] border-r border-white/5 flex-col py-8 shrink-0 select-none h-screen sticky top-0">
        {/* Brand Logo */}
        <div className="px-8 mb-10">
          <div 
            onClick={() => onTabChange("home")} 
            className="text-2xl font-bold tracking-tighter text-red-600 flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 shadow-md shadow-red-900/30">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
            <span className="text-white font-extrabold tracking-tight">DRAMA<span className="text-red-600">HUB</span></span>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-medium text-sm transition-all text-left cursor-pointer ${
                  isActive
                    ? "bg-white/10 text-white font-semibold shadow-inner"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-red-500" : "opacity-70"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Library
          </div>

          {libraryItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full px-4 py-3 rounded-xl flex items-center justify-between font-medium text-sm transition-all text-left cursor-pointer ${
                  isActive
                    ? "bg-white/10 text-white font-semibold"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? "text-red-500" : "opacity-70"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span className="bg-red-600/30 text-red-400 text-xs px-2 py-0.5 rounded-full font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Go Premium Card */}
        <div className="px-6 pt-4">
          <div className="bg-gradient-to-br from-red-600 to-red-900 p-4 rounded-2xl text-center shadow-lg shadow-red-900/20 relative overflow-hidden border border-red-500/20">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex justify-center mb-1">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <p className="text-xs font-bold mb-0.5 uppercase tracking-tight text-white">Go Premium</p>
            <p className="text-[10px] text-red-100/80 mb-3 leading-tight">Unlimited short-dramas & HD streaming</p>
            <button 
              onClick={onOpenUpgrade}
              className="w-full bg-white text-red-600 py-2 rounded-lg font-bold text-xs shadow-md hover:bg-red-50 transition-colors active:scale-95 cursor-pointer"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121212]/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-around py-2 px-1 select-none shadow-2xl">
        <button
          onClick={() => onTabChange("home")}
          className={`flex flex-col items-center justify-center gap-1 p-1.5 min-w-[52px] min-h-[48px] cursor-pointer transition-all active:scale-95 ${
            currentTab === "home" ? "text-red-500 font-bold" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={() => onTabChange("browse")}
          className={`flex flex-col items-center justify-center gap-1 p-1.5 min-w-[52px] min-h-[48px] cursor-pointer transition-all active:scale-95 ${
            currentTab === "browse" ? "text-red-500 font-bold" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px]">Browse</span>
        </button>

        <button
          onClick={() => onTabChange("trending")}
          className={`flex flex-col items-center justify-center gap-1 p-1.5 min-w-[52px] min-h-[48px] cursor-pointer transition-all active:scale-95 ${
            currentTab === "trending" ? "text-red-500 font-bold" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Flame className="w-5 h-5" />
          <span className="text-[10px]">Trending</span>
        </button>

        <button
          onClick={() => onTabChange("watchlist")}
          className={`flex flex-col items-center justify-center gap-1 p-1.5 min-w-[52px] min-h-[48px] cursor-pointer relative transition-all active:scale-95 ${
            currentTab === "watchlist" ? "text-red-500 font-bold" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Bookmark className="w-5 h-5" />
          <span className="text-[10px]">Saved</span>
          {watchlistCount > 0 && (
            <span className="absolute top-1.5 right-2.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>

        <button
          onClick={onOpenUpgrade}
          className="flex flex-col items-center justify-center gap-1 p-1.5 min-w-[52px] min-h-[48px] cursor-pointer text-amber-400 font-bold transition-all active:scale-95"
        >
          <Crown className="w-5 h-5 text-amber-400 fill-amber-400/20" />
          <span className="text-[10px]">VIP</span>
        </button>

        {isAdminUser && (
          <button
            onClick={() => onTabChange("admin")}
            className={`flex flex-col items-center justify-center gap-1 p-1.5 min-w-[52px] min-h-[48px] cursor-pointer transition-all active:scale-95 ${
              currentTab === "admin" ? "text-red-500 font-bold" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Shield className="w-5 h-5 text-red-400" />
            <span className="text-[10px]">Admin</span>
          </button>
        )}
      </div>
    </>
  );
};

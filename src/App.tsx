import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { HeroBanner } from "./components/HeroBanner";
import { DramaCard } from "./components/DramaCard";
import { VideoPlayerModal } from "./components/VideoPlayerModal";
import { UpgradeModal } from "./components/UpgradeModal";
import { AdminPortal } from "./components/AdminPortal";
import { AuthModal } from "./components/AuthModal";
import { EditProfileModal } from "./components/EditProfileModal";
import { CutluyPaymentModal } from "./components/CutluyPaymentModal";
import { ContinueWatching } from "./components/ContinueWatching";
import { InstallAppPrompt } from "./components/InstallAppPrompt";
import { DRAMA_CATALOG } from "./data/dramas";
import { Drama, UserProfile, SubscriptionPlan, WatchHistoryItem, TransactionRecord, PaymentGatewayType } from "./types";
import { syncUserProfileToFirestore, subscribeToDramasFromFirestore, syncDramaToFirestore, deleteDramaFromFirestore, subscribeToUsersFromFirestore, db } from "./lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Flame, Sparkles, Star, Plus, Film, Compass, Heart, History, RefreshCw, Shield, Bookmark, Check, Mail } from "lucide-react";

export default function App() {
  const [dramas, setDramas] = useState<Drama[]>(() => {
    try {
      const saved = localStorage.getItem("dramahub_catalog");
      if (!saved) return DRAMA_CATALOG;
      const parsed: Drama[] = JSON.parse(saved);
      return parsed;
    } catch {
      return DRAMA_CATALOG;
    }
  });

  // Default User Accounts List (Real Owner / Admin Account)
  const INITIAL_USERS: UserProfile[] = [
    {
      id: "usr_001",
      name: "Keo Voin (Owner & Admin)",
      email: "keovoin@gmail.com",
      authMethod: "gmail",
      isVip: true,
      vipPlanName: "Yearly VIP",
      vipExpiryDate: "Aug 02, 2027",
      coins: 1000,
      createdAt: "Jul 15, 2026",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      isBlocked: false,
    },
  ];

  // User Auth State
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem("dramahub_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Global Registered Users List
  const [usersList, setUsersList] = useState<UserProfile[]>(() => {
    const FAKE_EMAILS = [
      "sokha.chan@gmail.com",
      "dara.rithy@gmail.com",
      "bopha.heng@gmail.com",
      "spambot99@tempmail.com",
    ];
    const FAKE_IDS = ["usr_002", "usr_003", "usr_004", "usr_005"];

    try {
      const saved = localStorage.getItem("dramahub_users_list");
      if (saved) {
        const parsed: UserProfile[] = JSON.parse(saved);
        // Filter out sample fake users if present
        const cleaned = parsed.filter(
          (u) => !FAKE_IDS.includes(u.id) && !FAKE_EMAILS.includes(u.email || "")
        );
        if (cleaned.length > 0) return cleaned;
      }
    } catch {
      // ignore
    }
    return INITIAL_USERS;
  });

  // Sync usersList to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("dramahub_users_list", JSON.stringify(usersList));
    } catch {
      // ignore
    }
  }, [usersList]);

  // Keep logged in user state synced when usersList changes
  useEffect(() => {
    if (!user) return;
    const match = usersList.find((u) => u.id === user.id || (u.email && u.email.toLowerCase() === user.email.toLowerCase()));
    if (match) {
      if (
        match.isBlocked !== user.isBlocked ||
        match.isVip !== user.isVip ||
        match.vipPlanName !== user.vipPlanName ||
        match.vipExpiryDate !== user.vipExpiryDate ||
        match.vipExpiresAt !== user.vipExpiresAt ||
        match.coins !== user.coins
      ) {
        setUser(match);
        try {
          localStorage.setItem("dramahub_user", JSON.stringify(match));
        } catch {
          // ignore
        }
      }
    }
  }, [usersList]);

  const [currentTab, setCurrentTab] = useState<string>("home");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Global anti-download / right-click protection listener
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) ||
        (e.ctrlKey && (e.key === "U" || e.key === "u" || e.key === "S" || e.key === "s")) ||
        (e.metaKey && e.altKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c" || e.key === "U" || e.key === "u"))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Sync user state to localStorage and check VIP expiration
  useEffect(() => {
    try {
      if (user) {
        if (user.isVip && user.vipExpiresAt) {
          const now = new Date();
          const expires = new Date(user.vipExpiresAt);
          if (now > expires) {
            setUser({
              ...user,
              isVip: false,
              vipPlanName: undefined,
            });
            showToast("Your VIP subscription has expired.");
            return;
          }
        }
        localStorage.setItem("dramahub_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("dramahub_user");
      }
    } catch (err) {
      console.error("Failed to save user session", err);
    }
  }, [user]);

  // Sync catalog changes to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("dramahub_catalog", JSON.stringify(dramas));
    } catch (err) {
      console.error("Failed to save catalog", err);
    }
  }, [dramas]);

  // 1. Real-time Firestore Sync for Drama Catalog (All Users)
  useEffect(() => {
    const unsubscribe = subscribeToDramasFromFirestore((firestoreDramas) => {
      if (firestoreDramas && firestoreDramas.length > 0) {
        // Sort alphabetically to maintain consistent UI rendering order
        const sorted = [...firestoreDramas].sort((a, b) => a.title.localeCompare(b.title));
        setDramas(sorted);
      } else {
        // If Firestore is empty, seed it with the default dramas so the catalog isn't empty
        DRAMA_CATALOG.forEach((drama) => {
          syncDramaToFirestore(drama);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore Sync for Users List (Admin Only)
  useEffect(() => {
    if (user?.email !== "keovoin@gmail.com") return;

    const unsubscribe = subscribeToUsersFromFirestore((firestoreUsers) => {
      if (firestoreUsers && firestoreUsers.length > 0) {
        setUsersList(firestoreUsers);
      }
    });
    return () => unsubscribe();
  }, [user?.email]);

  // 3. Real-time Firestore Sync for active logged-in User profile
  useEffect(() => {
    if (!user?.id) return;

    const userRef = doc(db, "users", user.id);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const raw = docSnap.data() as UserProfile;
        const normalizedRemote: UserProfile = {
          ...raw,
          isVip: Boolean(raw.isVip),
          vipPlanName: raw.isVip ? (raw.vipPlanName || undefined) : undefined,
          vipExpiryDate: raw.isVip ? (raw.vipExpiryDate || undefined) : undefined,
          vipExpiresAt: raw.isVip ? (raw.vipExpiresAt || undefined) : undefined,
        };
        setUser((prev) => {
          if (!prev) return normalizedRemote;
          if (
            prev.isVip !== normalizedRemote.isVip ||
            prev.vipPlanName !== normalizedRemote.vipPlanName ||
            prev.vipExpiryDate !== normalizedRemote.vipExpiryDate ||
            prev.isBlocked !== normalizedRemote.isBlocked ||
            prev.coins !== normalizedRemote.coins ||
            prev.name !== normalizedRemote.name
          ) {
            try {
              localStorage.setItem("dramahub_user", JSON.stringify(normalizedRemote));
            } catch {
              // ignore
            }
            return normalizedRemote;
          }
          return prev;
        });
      }
    }, (err) => {
      console.error("Firestore user snapshot error:", err);
    });
    return () => unsubscribe();
  }, [user?.id]);
  
  // Favorites Local Storage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("dramahub_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Watchlist Local Storage
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("dramahub_watchlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Detailed Watch Progress Local Storage
  const [watchProgressItems, setWatchProgressItems] = useState<WatchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem("dramahub_watch_progress");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [watchHistory, setWatchHistory] = useState<Array<{ dramaId: string; epNumber: number; timestamp: string }>>(() => {
    try {
      const saved = localStorage.getItem("dramahub_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active Modals
  const [activePlayerDrama, setActivePlayerDrama] = useState<Drama | null>(null);
  const [playerInitialEp, setPlayerInitialEp] = useState<number>(1);
  const [playerInitialSeek, setPlayerInitialSeek] = useState<number>(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [showCutluyModal, setShowCutluyModal] = useState<boolean>(false);
  const [cutluyGateway, setCutluyGateway] = useState<PaymentGatewayType>("cutluy");
  const [cutluyMode, setCutluyMode] = useState<"bakong" | "aba">("bakong");

  const handleUpdateUser = (updatedProfile: UserProfile | null) => {
    setUser(updatedProfile);
    if (updatedProfile) {
      setUsersList((prev) => {
        const index = prev.findIndex((u) => u.id === updatedProfile.id || (u.email && u.email.toLowerCase() === updatedProfile.email.toLowerCase()));
        if (index >= 0) {
          const next = [...prev];
          next[index] = updatedProfile;
          return next;
        }
        return [updatedProfile, ...prev];
      });
      syncUserProfileToFirestore(updatedProfile);
      try {
        localStorage.setItem("dramahub_user", JSON.stringify(updatedProfile));
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem("dramahub_user");
      } catch {
        // ignore
      }
    }
  };

  const handleSaveProfile = (updatedProfile: UserProfile) => {
    handleUpdateUser(updatedProfile);
    showToast("Profile & Username updated successfully!");
  };
  const [cutluyPlan, setCutluyPlan] = useState<SubscriptionPlan>({
    id: "plan_monthly",
    name: "Monthly VIP Pass",
    price: 8.99,
    coins: 250,
    period: "/ month",
    popular: true,
    features: ["Unlock All VIP Episodes", "1080p Ultra HD Quality", "Ad-Free Playback", "250 Bonus Coins"]
  });

  // Global Toast
  const [globalToast, setGlobalToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setGlobalToast(msg);
    setTimeout(() => setGlobalToast(null), 2500);
  };

  // Check URL parameters for share links (?drama=xyz&ep=2) on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sharedDramaId = params.get("drama");
      const sharedEp = parseInt(params.get("ep") || "1", 10);

      if (sharedDramaId) {
        const found = dramas.find((d) => d.id === sharedDramaId);
        if (found) {
          setActivePlayerDrama(found);
          setPlayerInitialEp(sharedEp);
        }
      }
    } catch (err) {
      console.error("Failed to parse shared link URL", err);
    }
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("dramahub_favorites", JSON.stringify(favorites));
    } catch (err) {
      console.error("Failed to save favorites", err);
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem("dramahub_watchlist", JSON.stringify(watchlist));
    } catch (err) {
      console.error("Failed to save watchlist", err);
    }
  }, [watchlist]);

  useEffect(() => {
    try {
      localStorage.setItem("dramahub_watch_progress", JSON.stringify(watchProgressItems));
    } catch (err) {
      console.error("Failed to save watch progress", err);
    }
  }, [watchProgressItems]);

  useEffect(() => {
    try {
      localStorage.setItem("dramahub_history", JSON.stringify(watchHistory));
    } catch (err) {
      console.error("Failed to save watch history", err);
    }
  }, [watchHistory]);

  const toggleFavorite = (dramaId: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(dramaId);
      const next = exists ? prev.filter((id) => id !== dramaId) : [...prev, dramaId];
      showToast(exists ? "Removed from Favorites" : "Added to Favorites!");
      return next;
    });
  };

  const toggleWatchlist = (dramaId: string) => {
    setWatchlist((prev) => {
      const exists = prev.includes(dramaId);
      const next = exists ? prev.filter((id) => id !== dramaId) : [...prev, dramaId];
      showToast(exists ? "Removed from Watchlist" : "Added to Watchlist!");
      return next;
    });
  };

  const handleWatchProgress = (dramaId: string, epNumber: number, currentTime: number, durationSeconds: number) => {
    if (!durationSeconds || durationSeconds <= 0) return;
    const progressPercent = Math.round((currentTime / durationSeconds) * 100);

    setWatchProgressItems((prev) => {
      const filtered = prev.filter((item) => item.dramaId !== dramaId);
      const newItem: WatchHistoryItem = {
        dramaId,
        epNumber,
        currentTime: Math.floor(currentTime),
        durationSeconds: Math.floor(durationSeconds),
        progressPercent,
        updatedAt: new Date().toISOString()
      };
      return [newItem, ...filtered];
    });
  };

  const handleRemoveProgressItem = (e: React.MouseEvent, dramaId: string) => {
    e.stopPropagation();
    setWatchProgressItems((prev) => prev.filter((item) => item.dramaId !== dramaId));
    showToast("Removed from Continue Watching");
  };

  const handleOpenPlayer = (drama: Drama, epNumber: number = 1, seekSeconds: number = 0) => {
    setActivePlayerDrama(drama);
    setPlayerInitialEp(epNumber);
    setPlayerInitialSeek(seekSeconds);

    // Record to watch history
    setWatchHistory((prev) => {
      const filtered = prev.filter((h) => h.dramaId !== drama.id);
      return [{ dramaId: drama.id, epNumber, timestamp: "Just now" }, ...filtered];
    });

    // Dynamically increment real catalog & episode views
    setDramas((prevDramas) => {
      const updated = prevDramas.map((d) => {
        if (d.id !== drama.id) return d;

        const currentViewsRaw = parseInt(d.viewsCount?.replace(/[^0-9]/g, "") || "0", 10);
        const newViewsNum = currentViewsRaw + 1;
        const newViewsStr = newViewsNum >= 1000000 
          ? `${(newViewsNum / 1000000).toFixed(1)}M`
          : newViewsNum >= 1000
          ? `${(newViewsNum / 1000).toFixed(1)}k`
          : newViewsNum.toString();

        const updatedEpisodes = d.episodes.map((ep) => {
          if (ep.number !== epNumber) return ep;
          const epViewsRaw = parseInt(ep.views?.replace(/[^0-9]/g, "") || "0", 10);
          const newEpViews = epViewsRaw + 1;
          return {
            ...ep,
            views: newEpViews >= 1000 ? `${(newEpViews / 1000).toFixed(1)}k` : newEpViews.toString()
          };
        });

        const updatedDrama: Drama = {
          ...d,
          viewsCount: newViewsStr,
          episodes: updatedEpisodes
        };

        setActivePlayerDrama(updatedDrama);
        return updatedDrama;
      });

      try {
        localStorage.setItem("dramahub_dramas", JSON.stringify(updated));
      } catch {
        // ignore
      }

      return updated;
    });
  };

  const handleUpdateDramas = async (updatedDramas: Drama[]) => {
    // Safety net: de-dupe by normalized title BEFORE syncing to Firestore.
    // When two copies of the same title exist, MERGE them instead of
    // dropping one (keeps every episode): winner = the copy with more
    // episodes; incoming episodes from the loser are appended if their
    // number+videoUrl don't already exist.
    const normalize = (t: string) =>
      t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const byTitle = new Map<string, Drama>();
    for (const d of updatedDramas) {
      const key = normalize(d.title);
      const prev = byTitle.get(key);
      if (!prev) {
        byTitle.set(key, d);
        continue;
      }
      const [winner, loser] =
        d.episodes.length >= prev.episodes.length ? [d, prev] : [prev, d];
      const seen = new Set(
        winner.episodes.map((e) => `${e.number}|${e.videoUrl}`)
      );
      const merged = [...winner.episodes];
      for (const e of loser.episodes) {
        const k = `${e.number}|${e.videoUrl}`;
        if (!seen.has(k)) {
          seen.add(k);
          merged.push(e);
        }
      }
      merged.sort((a, b) => a.number - b.number);
      byTitle.set(key, {
        ...winner,
        episodes: merged,
        episodesCount: merged.length,
      });
    }
    const dedupedUpdated = Array.from(byTitle.values());
    const removedByDedupe = updatedDramas.length - dedupedUpdated.length;
    if (removedByDedupe > 0) {
      console.warn(
        `[DramaHub] Merged ${removedByDedupe} duplicate-title drama(s) before sync`
      );
    }
    try {
      // Delta sync: Delete removed dramas from Firestore
      const deleted = dramas.filter(
        (d) => !dedupedUpdated.some((ud) => ud.id === d.id)
      );
      for (const d of deleted) {
        await deleteDramaFromFirestore(d.id);
      }
      // Delta sync: Upload added/updated dramas to Firestore
      const modifiedOrAdded = dedupedUpdated.filter((ud) => {
        const existing = dramas.find((d) => d.id === ud.id);
        return !existing || JSON.stringify(existing) !== JSON.stringify(ud);
      });
      for (const d of modifiedOrAdded) {
        await syncDramaToFirestore(d);
      }
    } catch (err) {
      console.error("Error syncing dramas delta to Firestore:", err);
    }
    setDramas(dedupedUpdated);
  };

  const handleAddCustomDrama = async (newDrama: Drama) => {
    setDramas((prev) => [newDrama, ...prev]);
    setActivePlayerDrama(newDrama);
    try {
      await syncDramaToFirestore(newDrama);
    } catch (err) {
      console.error("Error saving new drama to Firestore:", err);
    }
  };

  const handleUpdateUsersList = async (updatedUsers: UserProfile[]) => {
    try {
      // Delta sync: Sync any added/modified users to Firestore
      const modifiedOrAdded = updatedUsers.filter((uu) => {
        const existing = usersList.find((u) => u.id === uu.id);
        return !existing || JSON.stringify(existing) !== JSON.stringify(uu);
      });
      for (const u of modifiedOrAdded) {
        await syncUserProfileToFirestore(u);
      }
    } catch (err) {
      console.error("Error syncing users delta to Firestore:", err);
    }
    setUsersList(updatedUsers);
  };

  const handleOpenCutluyCheckout = (
    plan: SubscriptionPlan,
    gateway?: PaymentGatewayType,
    mode?: "bakong" | "aba"
  ) => {
    setCutluyPlan(plan);
    if (gateway) setCutluyGateway(gateway);
    if (mode) setCutluyMode(mode);
    setShowCutluyModal(true);
  };

  const handlePaymentSuccess = (plan: SubscriptionPlan) => {
    const now = new Date();
    const isVipActive = Boolean(user?.isVip && user?.vipExpiresAt && new Date(user.vipExpiresAt) > now);

    // Calculate base expiry date (extend from existing expiry if active, or from today if fresh)
    let baseExpiry = (isVipActive && user?.vipExpiresAt)
      ? new Date(user.vipExpiresAt)
      : new Date();

    const planLower = (plan.id + " " + plan.name).toLowerCase();
    if (planLower.includes("weekly")) {
      baseExpiry.setDate(baseExpiry.getDate() + 7);
    } else if (planLower.includes("yearly") || planLower.includes("annual")) {
      baseExpiry.setDate(baseExpiry.getDate() + 365);
    } else {
      baseExpiry.setDate(baseExpiry.getDate() + 30); // Monthly
    }

    const nextExpiryIso = baseExpiry.toISOString();

    // Determine prices and 20% discount calculation
    let origPrice = plan.originalPrice ?? plan.price;
    let finalPrice = plan.price;

    // Force 20% discount if user is an active VIP renewing early and plan doesn't already have originalPrice
    if (isVipActive && !plan.originalPrice) {
      origPrice = plan.price;
      finalPrice = Number((plan.price * 0.8).toFixed(2));
    }

    const discountAmt = Number((origPrice - finalPrice).toFixed(2));

    const newTx: TransactionRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      planName: plan.name,
      originalPrice: origPrice,
      discountAmount: discountAmt,
      finalPrice: finalPrice,
      currency: "USD",
      purchasedAt: now.toISOString(),
      vipExpiresAt: nextExpiryIso,
      status: "completed"
    };

    const existingTxs = user?.transactions || [];
    const updatedTransactions = [newTx, ...existingTxs];

    let updatedUser: UserProfile;
    if (user) {
      updatedUser = {
        ...user,
        isVip: true,
        vipPlanName: plan.name,
        vipExpiresAt: nextExpiryIso,
        coins: user.coins + (plan.coins || 0),
        transactions: updatedTransactions
      };
    } else {
      // Default user profile if non-logged in guest user purchases VIP
      updatedUser = {
        id: `usr_cutluy_${Date.now()}`,
        name: "VIP Member",
        email: "vipuser@gmail.com",
        authMethod: "gmail",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        isVip: true,
        vipPlanName: plan.name,
        vipExpiresAt: nextExpiryIso,
        coins: plan.coins || 0,
        createdAt: now.toISOString(),
        transactions: updatedTransactions
      };
    }

    // Save persistently to state, Firestore, and localStorage for both logged in and guest users
    handleUpdateUser(updatedUser);

    const toastMsg = discountAmt > 0
      ? `🎉 VIP Extended! 20% Early Renewal Discount logged ($${discountAmt.toFixed(2)} saved). Valid until ${baseExpiry.toLocaleDateString()}`
      : `🎉 VIP Activated! Plan: ${plan.name} (Valid until ${baseExpiry.toLocaleDateString()})`;

    showToast(toastMsg);
  };

  // Categories list
  const categories = ["All", "Revenge", "CEO", "Romantic Drama", "Billionaire", "Action", "Historical Drama", "Fantasy"];

  // Filtered Dramas logic (hidden dramas are excluded from all public views; admin still sees them)
  const visibleDramas = dramas.filter((d) => !d.hidden);
  const featuredDrama = visibleDramas.find((d) => d.featured) || visibleDramas[0];

  const filteredDramas = visibleDramas.filter((drama) => {
    const matchesSearch =
      drama.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drama.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drama.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "All" || drama.category === selectedCategory;

    if (currentTab === "favorites") {
      return favorites.includes(drama.id) && matchesSearch;
    }

    if (currentTab === "watchlist") {
      return watchlist.includes(drama.id) && matchesSearch;
    }

    if (currentTab === "history") {
      return watchHistory.some((h) => h.dramaId === drama.id) && matchesSearch;
    }

    if (currentTab === "trending") {
      return drama.trending && matchesSearch && matchesCategory;
    }

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full h-screen bg-[#0a0a0a] text-gray-100 flex overflow-hidden font-sans select-none relative">
      {/* Global Toast Notification */}
      {globalToast && (
        <div className="fixed top-5 right-5 z-50 bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border border-white/20 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{globalToast}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setSelectedCategory("All");
        }}
        favoritesCount={favorites.length}
        watchlistCount={watchlist.length}
        historyCount={watchHistory.length}
        onOpenUpgrade={() => setShowUpgradeModal(true)}
        user={user}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Top Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenAdmin={() => setCurrentTab("admin")}
          user={user}
          onOpenAuth={() => setShowAuthModal(true)}
          onLogout={() => setUser(null)}
          onOpenUpgrade={() => setShowUpgradeModal(true)}
          onOpenEditProfile={() => setShowEditProfileModal(true)}
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            setSelectedCategory("All");
          }}
          favoritesCount={favorites.length}
          watchlistCount={watchlist.length}
          historyCount={watchHistory.length}
        />

        {/* Scrollable View Container */}
        <div className="flex-1 px-4 sm:px-8 pb-24 md:pb-10 space-y-6 sm:space-y-8 overflow-y-auto custom-scrollbar pt-4 sm:pt-6">
          {currentTab === "admin" ? (
            user?.email === "keovoin@gmail.com" ? (
              <AdminPortal
                dramas={dramas}
                user={user}
                usersList={usersList}
                onUpdateDramas={handleUpdateDramas}
                onUpdateUser={handleUpdateUser}
                onUpdateUsersList={handleUpdateUsersList}
                onPreviewDrama={(drama, epNum) => handleOpenPlayer(drama, epNum || 1)}
              />
            ) : (
              <div className="max-w-xl mx-auto my-12 bg-[#121212] border border-red-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center mx-auto border border-red-500/30 shadow-lg shadow-red-900/30">
                  <Shield className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Admin Portal Restricted
                  </h2>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Access to the Admin Management Console is strictly reserved for the owner account:
                    <span className="block mt-1 font-mono font-bold text-red-400 bg-red-500/10 py-1.5 px-3 rounded-xl border border-red-500/20 w-fit mx-auto">
                      keovoin@gmail.com
                    </span>
                  </p>
                  {user ? (
                    <p className="text-[11px] text-amber-400 font-medium pt-2">
                      Currently logged in as: <strong className="text-white">{user.email || user.phone || user.name}</strong>
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-400 pt-2">
                      You are currently not logged in.
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-900/40 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Sign In as keovoin@gmail.com</span>
                  </button>
                  <button
                    onClick={() => setCurrentTab("home")}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-gray-200 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Return to Home
                  </button>
                </div>
              </div>
            )
          ) : (
            <>
              {/* Hero Banner on Home tab when no search filter active & dramas exist */}
              {currentTab === "home" && !searchQuery && selectedCategory === "All" && featuredDrama && (
                <HeroBanner
                  drama={featuredDrama}
                  onWatchEpisode={(drama, epNum) => handleOpenPlayer(drama, epNum)}
                  isFavorite={favorites.includes(featuredDrama.id)}
                  onToggleFavorite={toggleFavorite}
                />
              )}

              {/* Continue Watching Section on Home Tab */}
              {currentTab === "home" && !searchQuery && selectedCategory === "All" && (
                <ContinueWatching
                  historyItems={watchProgressItems}
                  dramas={dramas}
                  onSelectDrama={(drama, epNum, seek) => handleOpenPlayer(drama, epNum, seek)}
                  onRemoveItem={handleRemoveProgressItem}
                />
              )}

              {/* Category Filter Pills Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-red-600 text-white shadow-md shadow-red-900/30"
                        : "bg-[#181818] text-gray-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Main Content Grid Header */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 text-white">
                    <span className="w-1 h-6 bg-red-600 rounded-full" />
                    {currentTab === "home" && "Catalog Dramas"}
                    {currentTab === "browse" && "Browse Catalog"}
                    {currentTab === "trending" && "🔥 Top Trending Series"}
                    {currentTab === "watchlist" && "🔖 My Watchlist (Saved for later)"}
                    {currentTab === "favorites" && "⭐ My Favorite Dramas"}
                    {currentTab === "history" && "🕒 Watch History"}
                  </h2>

                  {user?.email === "keovoin@gmail.com" && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCurrentTab("admin")}
                        className="text-xs bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl font-bold hover:bg-red-600/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Shield className="w-3.5 h-3.5" /> Admin Portal
                      </button>
                    </div>
                  )}
                </div>

            {/* Drama Grid */}
            {filteredDramas.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
                {filteredDramas.map((drama) => (
                  <DramaCard
                    key={drama.id}
                    drama={drama}
                    onSelect={(d) => handleOpenPlayer(d, 1)}
                    isFavorite={favorites.includes(drama.id)}
                    onToggleFavorite={(e, id) => toggleFavorite(id)}
                    isInWatchlist={watchlist.includes(drama.id)}
                    onToggleWatchlist={(e, id) => toggleWatchlist(id)}
                    onShare={async (e, d) => {
                      const targetDrama = d || drama;
                      const shareUrl = `${window.location.origin}?drama=${encodeURIComponent(targetDrama.id)}`;
                      const shareData = {
                        title: targetDrama.title,
                        text: `Watch "${targetDrama.title}" on DramaHub!`,
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
                        showToast(`Link for "${targetDrama.title}" copied to clipboard!`);
                      } catch (err) {
                        console.error("Clipboard copy failed:", err);
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-[#121212] rounded-3xl border border-white/5 space-y-4">
                <Film className="w-12 h-12 text-gray-600 mx-auto" />
                <h3 className="text-base font-bold text-white">No drama series found</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  {currentTab === "watchlist"
                    ? "You haven't added any dramas to your watchlist yet. Click the bookmark icon on any drama card to save it for later!"
                    : currentTab === "favorites"
                    ? "You haven't added any dramas to your favorites list yet."
                    : currentTab === "history"
                    ? "No watch history recorded yet."
                    : user?.email === "keovoin@gmail.com"
                    ? "The drama catalog is currently empty. Open the Admin Portal to post your first original series or bulk paste episode video links!"
                    : "No drama series found matching your selection."}
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  {user?.email === "keovoin@gmail.com" ? (
                    <button
                      onClick={() => setCurrentTab("admin")}
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-900/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Shield className="w-4 h-4" /> Open Admin Portal
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setCurrentTab("home");
                        setSearchQuery("");
                        setSelectedCategory("All");
                      }}
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-900/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Compass className="w-4 h-4" /> Browse Catalog
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  </main>

      {/* Video Player Modal */}
      {activePlayerDrama && (
        <VideoPlayerModal
          drama={activePlayerDrama}
          initialEpisodeNumber={playerInitialEp}
          initialSeekSeconds={playerInitialSeek}
          onClose={() => setActivePlayerDrama(null)}
          isFavorite={favorites.includes(activePlayerDrama.id)}
          onToggleFavorite={toggleFavorite}
          isInWatchlist={watchlist.includes(activePlayerDrama.id)}
          onToggleWatchlist={toggleWatchlist}
          isVipMember={user?.isVip || false}
          onWatchProgress={handleWatchProgress}
          onRequestUpgrade={() => setShowUpgradeModal(true)}
          onUpdateDramaUrl={(dramaId, episodeNumber, newUrl) => {
            setDramas((prev) => {
              const updatedList = prev.map((d) => {
                if (d.id !== dramaId) return d;
                const updatedEps = d.episodes.map((ep) =>
                  ep.number === episodeNumber ? { ...ep, videoUrl: newUrl } : ep
                );
                const updatedDrama = { ...d, episodes: updatedEps };
                syncDramaToFirestore(updatedDrama).catch(() => {});
                if (activePlayerDrama?.id === dramaId) {
                  setActivePlayerDrama(updatedDrama);
                }
                return updatedDrama;
              });
              try {
                localStorage.setItem("dramahub_dramas", JSON.stringify(updatedList));
              } catch {
                // ignore
              }
              return updatedList;
            });
            showToast(`Episode ${episodeNumber} URL updated successfully!`);
          }}
        />
      )}

      {/* Upgrade VIP Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          user={user}
          onClose={() => setShowUpgradeModal(false)}
          onUpgradeSuccess={() => handlePaymentSuccess(cutluyPlan)}
          onOpenCutluyCheckout={handleOpenCutluyCheckout}
        />
      )}

      {/* Gmail & Phone Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={async (loggedUser) => {
            setUser(loggedUser);
            await syncUserProfileToFirestore(loggedUser);
            setUsersList((prev) => {
              const exists = prev.some((u) => u.id === loggedUser.id || u.email === loggedUser.email);
              if (exists) {
                return prev.map((u) => (u.id === loggedUser.id || u.email === loggedUser.email ? loggedUser : u));
              }
              return [loggedUser, ...prev];
            });
          }}
        />
      )}

      {/* Edit Profile & Username Modal */}
      {showEditProfileModal && user && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          user={user}
          onSave={handleSaveProfile}
        />
      )}

      {/* Cutluy / SenghongStore Payment Gateway Modal */}
      {showCutluyModal && (
        <CutluyPaymentModal
          isOpen={showCutluyModal}
          onClose={() => setShowCutluyModal(false)}
          plan={cutluyPlan}
          user={user}
          onPaymentSuccess={handlePaymentSuccess}
          initialGateway={cutluyGateway}
          initialMode={cutluyMode}
        />
      )}

      {/* Blocked User Modal Overlay */}
      {user?.isBlocked && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-md w-full bg-[#141414] border border-red-600/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 via-amber-600 to-red-600 animate-pulse" />
            <div className="w-16 h-16 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center mx-auto shadow-lg shadow-red-900/40">
              <Shield className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-black uppercase tracking-widest rounded-full">
                Account Suspended
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight pt-2">
                Your Account is Blocked
              </h2>
              <p className="text-xs text-gray-300 leading-relaxed">
                An administrator has restricted access for this account ({user.email || user.phone || user.name}).
              </p>
              {user.blockedReason && (
                <div className="bg-red-950/40 border border-red-500/20 p-3.5 rounded-2xl text-left mt-3">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Reason:</p>
                  <p className="text-xs text-red-200 mt-0.5">{user.blockedReason}</p>
                  {user.blockedAt && (
                    <p className="text-[10px] text-gray-400 mt-2">Blocked on: {user.blockedAt}</p>
                  )}
                </div>
              )}
            </div>
            <div className="pt-2 flex flex-col gap-3">
              <button
                onClick={() => setUser(null)}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                Log Out & Switch Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA 1-Click Install App Banner */}
      <InstallAppPrompt />
    </div>
  );
}


import { Drama, Episode } from "../types";

const SANSEKAI_API_BASE = "https://api.sansekai.my.id/api";

export interface PineDramaRawItem {
  collection_id: string;
  title: string;
  description: string | null;
  total_episodes: number;
  views: number;
  categories: string;
  tags: string[];
  is_limited_free: boolean;
  label_hot: boolean;
  label_new: boolean;
  cover: string;
}

export interface PineDramaListResponse {
  has_more: boolean;
  cursor: string;
  collections: PineDramaRawItem[];
}

export interface PineDramaDetailResponse {
  success: boolean;
  data: any;
  message?: string;
}

/**
 * Service for fetching PineDrama content from Sansekai API
 * API Documentation: https://api.sansekai.my.id/#/PineDrama
 */
export class PineDramaService {
  /**
   * Get "For You" recommended dramas from PineDrama
   */
  static async getForYou(cursor: string = "0"): Promise<Drama[]> {
    return this.fetchList(`${SANSEKAI_API_BASE}/pinedrama/foryou?cursor=${cursor}`);
  }

  /**
   * Get Trending dramas from PineDrama
   */
  static async getTrending(cursor: string = "0"): Promise<Drama[]> {
    return this.fetchList(`${SANSEKAI_API_BASE}/pinedrama/trending?cursor=${cursor}`);
  }

  /**
   * Search dramas from PineDrama
   * @param query - Search term
   */
  static async search(query: string): Promise<Drama[]> {
    if (!query.trim()) return [];
    
    try {
      const response = await fetch(`${SANSEKAI_API_BASE}/pinedrama/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`Failed to search PineDrama: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle different response structures
      const items = data.collections || data.data || data.results || [];
      
      if (!Array.isArray(items)) {
        console.warn("PineDrama search returned non-array data:", data);
        return [];
      }
      
      return items.map((item: any) => this.mapToDrama(item));
    } catch (error) {
      console.error("Error searching PineDrama:", error);
      return [];
    }
  }

  /**
   * Get detailed drama information by collection ID
   * @param collectionId - PineDrama collection ID
   */
  static async getDetail(collectionId: string): Promise<Drama | null> {
    if (!collectionId) return null;
    
    try {
      const response = await fetch(`${SANSEKAI_API_BASE}/pinedrama/detail?collection_id=${encodeURIComponent(collectionId)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch PineDrama detail: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle different response structures
      const detailData = data.data || data;
      
      if (!detailData || !detailData.collection_id) {
        throw new Error("Invalid detail response structure");
      }
      
      return this.mapToDramaDetail(detailData);
    } catch (error) {
      console.error("Error fetching PineDrama detail:", error);
      return null;
    }
  }

  /**
   * Get episode stream URL
   * @param collectionId - PineDrama collection ID
   * @param episodeNumber - Episode number
   */
  static async getEpisodeUrl(collectionId: string, episodeNumber: number): Promise<string | null> {
    if (!collectionId || !episodeNumber) return null;
    
    try {
      const response = await fetch(`${SANSEKAI_API_BASE}/pinedrama/episode?collection_id=${encodeURIComponent(collectionId)}&episode_number=${episodeNumber}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch episode URL: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.video_url) {
        return data.video_url;
      }
      
      if (data.data && data.data.video_url) {
        return data.data.video_url;
      }
      
      throw new Error("Invalid episode response");
    } catch (error) {
      console.error("Error fetching episode URL:", error);
      return null;
    }
  }

  /**
   * Internal: Fetch a list of dramas from an endpoint
   */
  private static async fetchList(url: string): Promise<Drama[]> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`PineDrama API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle different response structures
      const items = data.collections || data.data || data.results || [];
      
      if (!Array.isArray(items)) {
        console.warn("PineDrama returned non-array data:", data);
        return [];
      }
      
      return items.map((item: any) => this.mapToDrama(item));
    } catch (error) {
      console.error(`Error fetching from ${url}:`, error);
      return [];
    }
  }

  /**
   * Map PineDrama API item to internal Drama type
   */
  private static mapToDrama(item: any): Drama {
    // Format view count (e.g., 7060696 -> "7.1M", 89048499 -> "89.0M")
    const formatViews = (views: number): string => {
      if (views >= 1_000_000) {
        return `${(views / 1_000_000).toFixed(1)}M`;
      } else if (views >= 1_000) {
        return `${(views / 1_000).toFixed(1)}k`;
      }
      return views.toString();
    };

    // Use tags[0] as category, fallback to "Drama"
    const category = item.tags?.[0] || "Drama";
    const synopsis = item.description || item.categories || "PineDrama Series";
    
    return {
      id: `pinedrama_${item.collection_id}`,
      title: item.title,
      tagline: item.tags?.slice(0, 2).join(" • ") || "",
      synopsis,
      category,
      rating: 0, // PineDrama API doesn't provide rating in list view
      episodesCount: item.total_episodes || 0,
      episodes: [], // Episodes are fetched separately via getDetail
      posterUrl: item.cover || "",
      bannerUrl: item.cover || "", // Will be replaced with banner in detail
      featured: item.label_hot || false,
      trending: item.label_new || false,
      tags: item.tags || [],
      releaseYear: "", // Not provided by list API
      viewsCount: formatViews(item.views || 0),
      likesCount: "0", // Not provided by API
    };
  }

  /**
   * Map PineDrama detailed response to internal Drama type with episodes
   */
  private static mapToDramaDetail(data: any): Drama {
    const formatViews = (views: number): string => {
      if (views >= 1_000_000) {
        return `${(views / 1_000_000).toFixed(1)}M`;
      } else if (views >= 1_000) {
        return `${(views / 1_000).toFixed(1)}k`;
      }
      return views.toString();
    };

    const episodes: Episode[] = data.episodes?.map((ep: any, index: number) => ({
      id: index + 1,
      number: ep.episode_number || ep.number || index + 1,
      title: ep.title || `Episode ${ep.episode_number || index + 1}`,
      duration: ep.duration || "0:00",
      videoUrl: ep.video_url || ep.videoUrl || "",
      isVip: ep.is_vip || ep.isVip || false,
      thumbnailUrl: ep.thumbnail_url || ep.thumbnailUrl,
      views: ep.views || "0",
    })) || [];

    return {
      id: `pinedrama_${data.collection_id}`,
      title: data.title,
      tagline: data.tags?.slice(0, 2).join(" • ") || "",
      synopsis: data.description || data.synopsis || "",
      category: data.tags?.[0] || "Drama",
      rating: data.rating || 0,
      episodesCount: data.episodes?.length || data.total_episodes || 0,
      episodes,
      posterUrl: data.poster || data.cover || "",
      bannerUrl: data.banner || data.cover || data.poster || "",
      featured: data.label_hot || false,
      trending: data.label_new || false,
      tags: data.tags || [],
      releaseYear: data.release_year || "",
      viewsCount: formatViews(data.views || 0),
      likesCount: "0",
    };
  }
}
// Helper utilities for video stream detection, embed conversion, and URL sanitization

export interface StreamInfo {
  type: "direct" | "iframe" | "hls";
  url: string;
  embedUrl?: string;
  isEmbeddable: boolean;
  provider: "youtube" | "vimeo" | "dailymotion" | "gdrive" | "dropbox" | "direct" | "unknown";
}

// Reliable high-speed fallback backup sample streams for drama testing
export const BACKUP_DRAMA_STREAMS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
];

export function getFallbackBackupStream(episodeNumber: number = 1): string {
  const index = Math.max(0, (episodeNumber - 1) % BACKUP_DRAMA_STREAMS.length);
  return BACKUP_DRAMA_STREAMS[index];
}

/**
 * Analyzes and normalizes raw video URLs into playable direct streams or iframe embeds.
 */
export function analyzeStreamUrl(rawUrl: string): StreamInfo {
  if (!rawUrl || typeof rawUrl !== "string") {
    return {
      type: "direct",
      url: BACKUP_DRAMA_STREAMS[0],
      isEmbeddable: false,
      provider: "unknown",
    };
  }

  const trimmed = rawUrl.trim();

  // 1. YouTube detection & conversion
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: "iframe",
      url: trimmed,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1&modestbranding=1`,
      isEmbeddable: true,
      provider: "youtube",
    };
  }

  // 2. Google Drive detection & conversion
  if (trimmed.includes("drive.google.com")) {
    const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      return {
        type: "iframe",
        url: trimmed,
        // Google Drive preview embed URL plays reliably inside iframes
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        isEmbeddable: true,
        provider: "gdrive",
      };
    }
  }

  // 3. Vimeo detection & conversion
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const vimeoId = vimeoMatch[1];
    return {
      type: "iframe",
      url: trimmed,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=0&responsive=1`,
      isEmbeddable: true,
      provider: "vimeo",
    };
  }

  // 4. Dailymotion detection & conversion
  const dmMatch = trimmed.match(/(?:dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/)([a-zA-Z0-9]+)/i);
  if (dmMatch && dmMatch[1]) {
    const dmId = dmMatch[1];
    return {
      type: "iframe",
      url: trimmed,
      embedUrl: `https://www.dailymotion.com/embed/video/${dmId}?autoplay=1`,
      isEmbeddable: true,
      provider: "dailymotion",
    };
  }

  // 5. Dropbox raw stream conversion
  if (trimmed.includes("dropbox.com")) {
    const fixedDropbox = trimmed.replace(/\?dl=0$/, "?raw=1").replace(/&dl=0$/, "&raw=1");
    const directDropbox = fixedDropbox.includes("raw=1") ? fixedDropbox : `${fixedDropbox}${fixedDropbox.includes("?") ? "&" : "?"}raw=1`;
    return {
      type: "direct",
      url: directDropbox,
      isEmbeddable: false,
      provider: "dropbox",
    };
  }

  // 6. Generic iframe embed URLs (e.g. player.dramabox, embed.stream, etc.)
  if (trimmed.includes("/embed/") || trimmed.includes("/player/") || trimmed.includes("/preview")) {
    return {
      type: "iframe",
      url: trimmed,
      embedUrl: trimmed,
      isEmbeddable: true,
      provider: "unknown",
    };
  }

  // 7. HLS / m3u8 stream detection
  if (trimmed.includes(".m3u8")) {
    return {
      type: "hls",
      url: trimmed,
      isEmbeddable: false,
      provider: "direct",
    };
  }

  // Default: Direct HTML5 video file (.mp4, .webm, cdn streams)
  return {
    type: "direct",
    url: trimmed,
    isEmbeddable: false,
    provider: "direct",
  };
}

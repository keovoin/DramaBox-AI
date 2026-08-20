import { Drama, Episode } from "../types";

export const CSV_DRAMA_TEMPLATE = `title,category,tagline,synopsis,rating,releaseYear,posterUrl,bannerUrl,tags,viewsCount,likesCount,episodesCount,videoUrls,vipFromEpisode
"Revenge of the Hidden Billionaire","Billionaire","He concealed his fortune for 5 years...","After being betrayed and cast out by his greedy in-laws, Alexander reveals his true identity as the heir to a trillion-dollar empire and takes his sweet revenge.",9.8,"2026","https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600","https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1200","Billionaire;Revenge;Drama;CEO","1.8M","145K",6,"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4|https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4|https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4|https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4|https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4|https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",3
"The CEO's Secret Surrogate Wife","Romance","A contractual marriage turns into undeniable obsession.","To save her brother's medical surgery, Clara signs a secret surrogate marriage contract with the coldest CEO in the country, only to discover his unexpected tenderness.",9.6,"2026","https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600","https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=1200","Romance;CEO;Contract Marriage;Drama","2.4M","190K",5,"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4|https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4|https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4|https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4|https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",2
"Awakening of the Dragon King","Action","The underworld king returns to protect his daughter.","Five years after faking his death, the supreme Dragon King of the underground world returns to the city to protect his orphaned daughter from mafia bosses.",9.9,"2026","https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600","https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1200","Action;Martial Arts;Mafia;Revenge","3.1M","280K",4,"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4|https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4|https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4|https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",3
`;

export const JSON_DRAMA_TEMPLATE = `[
  {
    "title": "Revenge of the Hidden Billionaire",
    "category": "Billionaire",
    "tagline": "He concealed his fortune for 5 years...",
    "synopsis": "After being betrayed and cast out by his greedy in-laws, Alexander reveals his true identity as the heir to a trillion-dollar empire and takes his sweet revenge.",
    "rating": 9.8,
    "releaseYear": "2026",
    "posterUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600",
    "bannerUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1200",
    "tags": ["Billionaire", "Revenge", "Drama", "CEO"],
    "viewsCount": "1.8M",
    "likesCount": "145K",
    "featured": true,
    "trending": true,
    "episodes": [
      {
        "id": 1,
        "number": 1,
        "title": "Episode 1: The Scorned Son-in-Law",
        "duration": "1:45",
        "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "isVip": false,
        "views": "620K"
      },
      {
        "id": 2,
        "number": 2,
        "title": "Episode 2: The Black Card Reveal",
        "duration": "1:52",
        "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "isVip": false,
        "views": "480K"
      },
      {
        "id": 3,
        "number": 3,
        "title": "Episode 3: Kneeling for Mercy",
        "duration": "2:10",
        "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "isVip": true,
        "views": "390K"
      }
    ]
  },
  {
    "title": "The CEO's Secret Surrogate Wife",
    "category": "Romance",
    "tagline": "A contractual marriage turns into undeniable obsession.",
    "synopsis": "To save her brother's medical surgery, Clara signs a secret surrogate marriage contract with the coldest CEO in the country.",
    "rating": 9.6,
    "releaseYear": "2026",
    "posterUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600",
    "bannerUrl": "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=1200",
    "tags": ["Romance", "CEO", "Contract Marriage"],
    "viewsCount": "2.4M",
    "likesCount": "190K",
    "featured": false,
    "trending": true,
    "episodes": [
      {
        "id": 1,
        "number": 1,
        "title": "Episode 1: The Midnight Contract",
        "duration": "1:38",
        "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
        "isVip": false,
        "views": "710K"
      },
      {
        "id": 2,
        "number": 2,
        "title": "Episode 2: Meeting the Cold Master",
        "duration": "1:44",
        "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        "isVip": true,
        "views": "530K"
      }
    ]
  }
]`;

export function downloadCsvTemplate(): void {
  const blob = new Blob([CSV_DRAMA_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "dramahub_bulk_catalog_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadJsonTemplate(): void {
  const blob = new Blob([JSON_DRAMA_TEMPLATE], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "dramahub_bulk_catalog_template.json");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Simple RFC 4180 CSV parser
function parseCsvLine(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentToken = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentToken += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(currentToken.trim());
      currentToken = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(currentToken.trim());
      currentToken = "";
      if (row.some((cell) => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0 || row.length > 0) {
    row.push(currentToken.trim());
    if (row.some((cell) => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

export interface ParseResult {
  dramas: Drama[];
  errors: string[];
  warnings: string[];
  totalParsed: number;
}

export function parseDramasFromCsv(csvText: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dramas: Drama[] = [];

  if (!csvText || !csvText.trim()) {
    return { dramas: [], errors: ["CSV file is empty."], warnings: [], totalParsed: 0 };
  }

  const rows = parseCsvLine(csvText.trim());
  if (rows.length < 2) {
    return { dramas: [], errors: ["CSV must contain a header row and at least one drama row."], warnings: [], totalParsed: 0 };
  }

  // Normalize header mapping
  const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  
  const getCol = (names: string[]): number => {
    return headers.findIndex((h) => names.some((n) => h.includes(n)));
  };

  const titleIdx = getCol(["title", "name", "series"]);
  const categoryIdx = getCol(["category", "genre", "type"]);
  const taglineIdx = getCol(["tagline", "subtitle", "slogan"]);
  const synopsisIdx = getCol(["synopsis", "description", "desc", "story", "summary"]);
  const ratingIdx = getCol(["rating", "score", "stars"]);
  const yearIdx = getCol(["releaseyear", "year", "released"]);
  const posterIdx = getCol(["posterurl", "poster", "cover", "image", "thumbnail"]);
  const bannerIdx = getCol(["bannerurl", "banner", "backdrop", "hero"]);
  const tagsIdx = getCol(["tags", "keywords"]);
  const viewsIdx = getCol(["viewscount", "views", "watched"]);
  const likesIdx = getCol(["likescount", "likes"]);
  const videoUrlsIdx = getCol(["videourls", "videos", "urls", "episodesurls", "streamurls"]);
  const vipFromIdx = getCol(["vipfromepisode", "vipfrom", "vipepisode", "vipstart"]);

  if (titleIdx === -1) {
    return { dramas: [], errors: ["Required column 'title' or 'name' was not found in CSV header."], warnings: [], totalParsed: 0 };
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rawTitle = row[titleIdx] || "";
    if (!rawTitle.trim()) continue;

    const title = rawTitle.trim();
    const category = (categoryIdx !== -1 && row[categoryIdx]) ? row[categoryIdx].trim() : "Billionaire";
    const tagline = (taglineIdx !== -1 && row[taglineIdx]) ? row[taglineIdx].trim() : `${title} - Must Watch Short Drama`;
    const synopsis = (synopsisIdx !== -1 && row[synopsisIdx]) ? row[synopsisIdx].trim() : `${title} short drama series full episodes.`;
    const rating = (ratingIdx !== -1 && parseFloat(row[ratingIdx])) ? parseFloat(row[ratingIdx]) : 9.5;
    const releaseYear = (yearIdx !== -1 && row[yearIdx]) ? row[yearIdx].trim() : "2026";
    const posterUrl = (posterIdx !== -1 && row[posterIdx]) ? row[posterIdx].trim() : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600";
    const bannerUrl = (bannerIdx !== -1 && row[bannerIdx]) ? row[bannerIdx].trim() : posterUrl;
    
    // Parse tags
    let tags: string[] = [category];
    if (tagsIdx !== -1 && row[tagsIdx]) {
      const splitTags = row[tagsIdx].split(/[;,|]/).map((t) => t.trim()).filter(Boolean);
      if (splitTags.length > 0) tags = splitTags;
    }

    const viewsCount = (viewsIdx !== -1 && row[viewsIdx]) ? row[viewsIdx].trim() : "1.2M";
    const likesCount = (likesIdx !== -1 && row[likesIdx]) ? row[likesIdx].trim() : "95K";

    // Parse episodes from videoUrls column (separated by |, ;, or newlines)
    const rawVideoUrls = (videoUrlsIdx !== -1 && row[videoUrlsIdx]) ? row[videoUrlsIdx] : "";
    const videoUrlList = rawVideoUrls
      .split(/[|\n;]/)
      .map((u) => u.trim())
      .filter((u) => u.length > 5);

    const vipFromEp = (vipFromIdx !== -1 && parseInt(row[vipFromIdx], 10)) ? parseInt(row[vipFromIdx], 10) : 3;

    const episodes: Episode[] = [];
    if (videoUrlList.length > 0) {
      videoUrlList.forEach((url, i) => {
        const epNum = i + 1;
        episodes.push({
          id: epNum,
          number: epNum,
          title: `Episode ${epNum}: ${title}`,
          duration: "1:45",
          videoUrl: url,
          isVip: epNum >= vipFromEp,
          views: `${Math.max(10, Math.floor(600 / epNum))}K`,
          thumbnailUrl: posterUrl,
        });
      });
    } else {
      // Default 3 starter episodes if no video URLs were listed
      const defaultVideos = [
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      ];
      defaultVideos.forEach((url, i) => {
        const epNum = i + 1;
        episodes.push({
          id: epNum,
          number: epNum,
          title: `Episode ${epNum}: ${title}`,
          duration: "1:45",
          videoUrl: url,
          isVip: epNum >= 3,
          views: `${Math.max(10, Math.floor(600 / epNum))}K`,
          thumbnailUrl: posterUrl,
        });
      });
      warnings.push(`Row ${r + 1} ("${title}"): No video URLs found. Attached 3 starter episode streams.`);
    }

    const dramaId = `drama_csv_${Date.now()}_${r}_${Math.random().toString(36).substring(2, 6)}`;

    dramas.push({
      id: dramaId,
      title,
      tagline,
      synopsis,
      category,
      rating,
      episodesCount: episodes.length,
      episodes,
      posterUrl,
      bannerUrl,
      featured: r === 1,
      trending: true,
      tags,
      releaseYear,
      viewsCount,
      likesCount,
    });
  }

  return {
    dramas,
    errors,
    warnings,
    totalParsed: dramas.length,
  };
}

export function parseDramasFromJson(jsonText: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dramas: Drama[] = [];

  if (!jsonText || !jsonText.trim()) {
    return { dramas: [], errors: ["JSON file is empty."], warnings: [], totalParsed: 0 };
  }

  try {
    let parsed = JSON.parse(jsonText.trim());

    // Support both raw array or object with "dramas" or "items" property
    let itemsArray: any[] = [];
    if (Array.isArray(parsed)) {
      itemsArray = parsed;
    } else if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.dramas)) {
        itemsArray = parsed.dramas;
      } else if (Array.isArray(parsed.items)) {
        itemsArray = parsed.items;
      } else if (parsed.title) {
        itemsArray = [parsed];
      }
    }

    if (itemsArray.length === 0) {
      return { dramas: [], errors: ["No drama items found in JSON structure."], warnings: [], totalParsed: 0 };
    }

    itemsArray.forEach((item, index) => {
      if (!item || typeof item !== "object") {
        warnings.push(`Item #${index + 1} was skipped (invalid object).`);
        return;
      }

      const title = (item.title || item.name || `Drama Series ${index + 1}`).trim();
      const category = item.category || item.genre || "Billionaire";
      const tagline = item.tagline || item.subtitle || `${title} - Top Short Drama`;
      const synopsis = item.synopsis || item.description || `${title} drama series.`;
      const rating = typeof item.rating === "number" ? item.rating : 9.6;
      const releaseYear = String(item.releaseYear || item.year || "2026");
      const posterUrl = item.posterUrl || item.poster || item.coverImage || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600";
      const bannerUrl = item.bannerUrl || item.banner || posterUrl;
      const tags = Array.isArray(item.tags) ? item.tags : [category, "Drama"];
      const viewsCount = item.viewsCount || item.views || "1.5M";
      const likesCount = item.likesCount || item.likes || "120K";

      // Parse or construct episodes
      const episodes: Episode[] = [];
      if (Array.isArray(item.episodes) && item.episodes.length > 0) {
        item.episodes.forEach((ep: any, epIdx: number) => {
          const epNum = ep.number || epIdx + 1;
          episodes.push({
            id: ep.id || epNum,
            number: epNum,
            title: ep.title || `Episode ${epNum}: ${title}`,
            duration: ep.duration || "1:45",
            videoUrl: ep.videoUrl || ep.url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            isVip: ep.isVip !== undefined ? Boolean(ep.isVip) : epNum >= 3,
            views: ep.views || `${Math.max(10, Math.floor(500 / epNum))}K`,
            thumbnailUrl: ep.thumbnailUrl || posterUrl,
          });
        });
      } else if (item.videoUrls && Array.isArray(item.videoUrls)) {
        item.videoUrls.forEach((url: string, epIdx: number) => {
          const epNum = epIdx + 1;
          episodes.push({
            id: epNum,
            number: epNum,
            title: `Episode ${epNum}: ${title}`,
            duration: "1:45",
            videoUrl: url,
            isVip: epNum >= 3,
            views: `${Math.max(10, Math.floor(500 / epNum))}K`,
            thumbnailUrl: posterUrl,
          });
        });
      } else {
        // Fallback default episodes
        episodes.push({
          id: 1,
          number: 1,
          title: `Episode 1: ${title}`,
          duration: "1:45",
          videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          isVip: false,
          views: "500K",
          thumbnailUrl: posterUrl,
        });
        warnings.push(`Drama "${title}" had no episodes array. Added Episode 1.`);
      }

      const dramaId = item.id || `drama_json_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`;

      dramas.push({
        id: dramaId,
        title,
        tagline,
        synopsis,
        category,
        rating,
        episodesCount: episodes.length,
        episodes,
        posterUrl,
        bannerUrl,
        featured: Boolean(item.featured),
        trending: item.trending !== undefined ? Boolean(item.trending) : true,
        tags,
        releaseYear,
        viewsCount,
        likesCount,
      });
    });

    return {
      dramas,
      errors,
      warnings,
      totalParsed: dramas.length,
    };
  } catch (err: any) {
    return {
      dramas: [],
      errors: [`JSON syntax error: ${err.message}`],
      warnings: [],
      totalParsed: 0,
    };
  }
}

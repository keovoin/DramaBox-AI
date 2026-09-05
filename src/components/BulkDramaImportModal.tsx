import React, { useMemo, useState } from "react";
import {
  Upload,
  FileText,
  FileCode,
  Download,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Layers,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  GitMerge,
} from "lucide-react";
import { Drama } from "../types";
import {
  parseDramasFromCsv,
  parseDramasFromJson,
  downloadCsvTemplate,
  downloadJsonTemplate,
  CSV_DRAMA_TEMPLATE,
  JSON_DRAMA_TEMPLATE,
  ParseResult,
} from "../utils/dramaBulkParser";
import { cn } from "../lib/cn";
import {
  Button,
  Badge,
  Card,
  ScrollArea,
  SegmentedControl,
} from "./ui";

const PAGE_SIZE = 12;

const normalizeTitle = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

interface BulkDramaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingDramasCount: number;
  /** Normalized titles already in the catalog — used for auto-dedupe. */
  existingTitles?: string[];
  onImportDramas: (importedDramas: Drama[], mode: "append" | "replace") => void;
}

export const BulkDramaImportModal: React.FC<BulkDramaImportModalProps> = ({
  isOpen,
  onClose,
  existingDramasCount,
  existingTitles,
  onImportDramas,
}) => {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [fileType, setFileType] = useState<"csv" | "json">("csv");
  const [rawText, setRawText] = useState<string>("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedDramaIds, setSelectedDramaIds] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedTemplate, setCopiedTemplate] = useState<"csv" | "json" | null>(
    null
  );
  const [page, setPage] = useState(1);
  const [fileInputRef] = useState(() => ({ current: null as HTMLInputElement | null }));

  const existingTitleSet = useMemo(
    () => new Set((existingTitles || []).map(normalizeTitle)),
    [existingTitles]
  );
  const hasExisting = existingTitleSet.size > 0;

  const isDuplicate = (d: Drama) =>
    hasExisting && existingTitleSet.has(normalizeTitle(d.title));

  const handleReadFile = (file: File) => {
    setSelectedFileName(file.name);
    const isJson = file.name.endsWith(".json") || file.type.includes("json");
    setFileType(isJson ? "json" : "csv");
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || "";
      setRawText(text);
      processParsing(text, isJson ? "json" : "csv");
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleReadFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleReadFile(file);
  };

  const processParsing = (content: string, type: "csv" | "json") => {
    setIsProcessing(true);
    setPage(1);
    setTimeout(() => {
      const result =
        type === "csv"
          ? parseDramasFromCsv(content)
          : parseDramasFromJson(content);
      setParseResult(result);
      // Default: select everything unless it already exists in the catalog
      // (title-based auto-dedupe). Duplicates stay selectable on purpose.
      setSelectedDramaIds(
        result.dramas.filter((d) => !isDuplicate(d)).map((d) => d.id)
      );
      setIsProcessing(false);
    }, 150);
  };

  const handleManualParse = () => processParsing(rawText, fileType);

  const handleToggleDramaSelection = (id: string) => {
    setSelectedDramaIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (!parseResult) return;
    if (selectedDramaIds.length === parseResult.dramas.length) {
      setSelectedDramaIds([]);
    } else {
      setSelectedDramaIds(parseResult.dramas.map((d) => d.id));
    }
  };

  const handleCopyTemplate = (type: "csv" | "json") => {
    navigator.clipboard.writeText(
      type === "csv" ? CSV_DRAMA_TEMPLATE : JSON_DRAMA_TEMPLATE
    );
    setCopiedTemplate(type);
    setTimeout(() => setCopiedTemplate(null), 2500);
  };

  const handleExecuteImport = () => {
    if (!parseResult || selectedDramaIds.length === 0) return;
    const dramasToImport = parseResult.dramas.filter((d) =>
      selectedDramaIds.includes(d.id)
    );
    onImportDramas(dramasToImport, importMode);
    onClose();
  };

  const totalPages = parseResult
    ? Math.max(1, Math.ceil(parseResult.dramas.length / PAGE_SIZE))
    : 1;
  const pageDramas = parseResult
    ? parseResult.dramas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : [];
  const duplicateCount = parseResult
    ? parseResult.dramas.filter(isDuplicate).length
    : 0;

  // Guard must come after ALL hooks (rules of hooks)
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
      <Card className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden border-white/15 bg-ink-900 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-ink-800/60 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-500/30 bg-brand-600/20 text-brand-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-white sm:text-lg">
                Bulk Drama Catalog Import
                <Badge variant="indigo">CSV &amp; JSON</Badge>
              </h2>
              <p className="text-xs text-zinc-400">
                Upload or paste multiple series at once — duplicates are
                detected automatically by title.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <ScrollArea className="flex-1 p-5 sm:p-6">
          <div className="space-y-6">
            {/* Templates */}
            <Card className="border-indigo-500/30 bg-ink-800/60">
              <div className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="space-y-1">
                  <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-300">
                    <FileCode className="h-4 w-4 text-indigo-400" /> Standard
                    Bulk Templates
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Download a pre-formatted template with sample drama columns,
                    episodes, and stream links.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadCsvTemplate}
                    className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/20"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>CSV</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadJsonTemplate}
                    className="border-blue-500/40 text-blue-300 hover:bg-blue-600/20"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>JSON</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyTemplate("csv")}
                  >
                    {copiedTemplate === "csv" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedTemplate === "csv" ? "Copied!" : "Copy CSV"}</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Source tabs */}
            <SegmentedControl
              options={[
                { value: "file", label: "Upload CSV / JSON File", icon: <Upload className="h-3.5 w-3.5" /> },
                { value: "paste", label: "Direct Text Paste", icon: <FileText className="h-3.5 w-3.5" /> },
              ]}
              value={activeTab}
              onChange={setActiveTab}
            />

            {/* File dropzone */}
            {activeTab === "file" && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group cursor-pointer rounded-3xl border-2 border-dashed border-white/20 bg-ink-800/60 p-8 text-center transition-all hover:border-brand-500/50 hover:bg-ink-800 sm:p-10"
              >
                <input
                  ref={(el) => {
                    fileInputRef.current = el;
                  }}
                  type="file"
                  accept=".csv,.json,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-zinc-400 transition-colors group-hover:bg-brand-600/20 group-hover:text-brand-400">
                  <Upload className="h-8 w-8" />
                </div>
                <p className="mt-4 text-sm font-bold text-white">
                  {selectedFileName ? (
                    <span className="font-mono text-emerald-400">{selectedFileName}</span>
                  ) : (
                    "Click to browse or drag & drop CSV or JSON file here"
                  )}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Supports .csv (with headers &amp; pipe-separated video URLs) or
                  .json array of dramas
                </p>
              </div>
            )}

            {/* Paste mode */}
            {activeTab === "paste" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">
                    Paste Raw CSV or JSON Content:
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Format:</span>
                    <SegmentedControl
                      size="sm"
                      options={[
                        { value: "csv", label: "CSV" },
                        { value: "json", label: "JSON" },
                      ]}
                      value={fileType}
                      onChange={setFileType}
                    />
                  </div>
                </div>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={fileType === "csv" ? CSV_DRAMA_TEMPLATE : JSON_DRAMA_TEMPLATE}
                  rows={8}
                  className="custom-scrollbar w-full rounded-xl border border-white/15 bg-ink-800 p-4 font-mono text-xs text-white placeholder:text-zinc-600 focus:border-brand-500/70 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                />
                <Button
                  onClick={handleManualParse}
                  disabled={!rawText.trim()}
                  className="self-start"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Parse Content</span>
                </Button>
              </div>
            )}

            {/* Processing */}
            {isProcessing && (
              <div className="space-y-2 py-8 text-center">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-brand-500" />
                <p className="text-xs font-bold text-white">
                  Analyzing &amp; validating drama catalog...
                </p>
              </div>
            )}

            {/* Parse result */}
            {parseResult && (
              <div className="space-y-4 pt-2">
                {parseResult.errors.length > 0 && (
                  <div className="space-y-1 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-xs text-red-300">
                    <div className="flex items-center gap-2 font-bold text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Parsing Errors Encountered:</span>
                    </div>
                    <ul className="list-disc space-y-1 pl-5">
                      {parseResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {parseResult.warnings.length > 0 && (
                  <div className="space-y-1 rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 text-xs text-amber-300">
                    <div className="flex items-center gap-2 font-bold text-amber-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Warnings ({parseResult.warnings.length}):</span>
                    </div>
                    <ul className="custom-scrollbar list-disc max-h-24 space-y-1 overflow-y-auto pl-5 text-amber-300/90">
                      {parseResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {parseResult.dramas.length > 0 && (
                  <Card className="space-y-4 p-4 sm:p-5">
                    {/* Summary header */}
                    <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-center">
                      <div className="flex flex-wrap items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        <h4 className="text-sm font-bold text-white">
                          Parsed {parseResult.dramas.length} Drama Series
                        </h4>
                        <Badge variant="emerald">
                          {selectedDramaIds.length} selected
                        </Badge>
                        {hasExisting && duplicateCount > 0 && (
                          <Badge variant="destructive">
                            <GitMerge className="h-3 w-3" />
                            {duplicateCount} already in catalog — skipped by
                            default
                          </Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                        {selectedDramaIds.length === parseResult.dramas.length
                          ? "Deselect All"
                          : "Select All"}
                      </Button>
                    </div>

                    {/* Paginated list (fixes white-screen on large imports) */}
                    <ScrollArea className="max-h-72 space-y-2 pr-1">
                      {pageDramas.map((drama) => {
                        const isSelected = selectedDramaIds.includes(drama.id);
                        const dupe = isDuplicate(drama);
                        return (
                          <div
                            key={drama.id}
                            onClick={() => handleToggleDramaSelection(drama.id)}
                            className={cn(
                              "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-all",
                              isSelected
                                ? "border-emerald-500/40 bg-emerald-950/20"
                                : "border-white/5 bg-ink-800/60 opacity-70 hover:opacity-100",
                              dupe && !isSelected && "opacity-50"
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleDramaSelection(drama.id)}
                                className="h-4 w-4 shrink-0 rounded border-white/20 text-emerald-500 focus:ring-emerald-500"
                              />
                              <img
                                src={drama.posterUrl}
                                alt={drama.title}
                                className="h-14 w-10 shrink-0 rounded-lg border border-white/10 object-cover"
                                loading="lazy"
                              />
                              <div className="min-w-0">
                                <p className="flex items-center gap-1.5 truncate text-xs font-bold text-white">
                                  <span className="truncate">{drama.title}</span>
                                  {dupe && (
                                    <Badge variant="destructive">In catalog</Badge>
                                  )}
                                </p>
                                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-400">
                                  <Badge variant="secondary">{drama.category}</Badge>
                                  <span>{drama.episodes.length} Episodes</span>
                                  <span className="text-amber-400">
                                    ★ {drama.rating}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="block font-mono text-[10px] text-zinc-400">
                                {drama.viewsCount} views
                              </span>
                              <span className="text-[9px] font-semibold text-emerald-400">
                                Ready
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </ScrollArea>

                    {/* Pager */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-white/10 pt-3">
                        <span className="text-[11px] text-zinc-400">
                          Showing{" "}
                          <span className="font-bold text-zinc-200">
                            {(page - 1) * PAGE_SIZE + 1}–
                            {Math.min(page * PAGE_SIZE, parseResult.dramas.length)}
                          </span>{" "}
                          of {parseResult.dramas.length}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            aria-label="Previous page"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="min-w-14 text-center text-xs font-bold text-zinc-200">
                            {page} / {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={page === totalPages}
                            aria-label="Next page"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Import mode */}
                    <div className="flex flex-col justify-between gap-3 border-t border-white/10 pt-3 text-xs sm:flex-row sm:items-center">
                      <span className="font-bold text-zinc-300">
                        Import Strategy:
                      </span>
                      <div className="flex items-center gap-4">
                        <label className="flex cursor-pointer items-center gap-2 text-zinc-200">
                          <input
                            type="radio"
                            name="importMode"
                            value="append"
                            checked={importMode === "append"}
                            onChange={() => setImportMode("append")}
                            className="text-brand-600 focus:ring-brand-500"
                          />
                          <span>Append (Keep {existingDramasCount} existing)</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-red-300">
                          <input
                            type="radio"
                            name="importMode"
                            value="replace"
                            checked={importMode === "replace"}
                            onChange={() => setImportMode("replace")}
                            className="text-brand-600 focus:ring-brand-500"
                          />
                          <span>Replace Catalog</span>
                        </label>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-ink-800/60 p-4 sm:p-5">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleExecuteImport}
            disabled={!parseResult || selectedDramaIds.length === 0}
            size="lg"
          >
            <Plus className="h-4 w-4" />
            <span>Import {selectedDramaIds.length} Series into Catalog</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

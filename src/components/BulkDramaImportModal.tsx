import React, { useState, useRef } from "react";
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
  Film,
  Sparkles,
  RefreshCw,
  Eye,
  Trash2
} from "lucide-react";
import { Drama } from "../types";
import {
  parseDramasFromCsv,
  parseDramasFromJson,
  downloadCsvTemplate,
  downloadJsonTemplate,
  CSV_DRAMA_TEMPLATE,
  JSON_DRAMA_TEMPLATE,
  ParseResult
} from "../utils/dramaBulkParser";

interface BulkDramaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingDramasCount: number;
  onImportDramas: (importedDramas: Drama[], mode: "append" | "replace") => void;
}

export const BulkDramaImportModal: React.FC<BulkDramaImportModalProps> = ({
  isOpen,
  onClose,
  existingDramasCount,
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
  const [copiedTemplate, setCopiedTemplate] = useState<"csv" | "json" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

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

  const processParsing = (content: string, type: "csv" | "json") => {
    setIsProcessing(true);
    setTimeout(() => {
      let result: ParseResult;
      if (type === "csv") {
        result = parseDramasFromCsv(content);
      } else {
        result = parseDramasFromJson(content);
      }
      setParseResult(result);
      setSelectedDramaIds(result.dramas.map((d) => d.id));
      setIsProcessing(false);
    }, 150);
  };

  const handleManualParse = () => {
    processParsing(rawText, fileType);
  };

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
    const template = type === "csv" ? CSV_DRAMA_TEMPLATE : JSON_DRAMA_TEMPLATE;
    navigator.clipboard.writeText(template);
    setCopiedTemplate(type);
    setTimeout(() => setCopiedTemplate(null), 2500);
  };

  const handleExecuteImport = () => {
    if (!parseResult || selectedDramaIds.length === 0) return;
    const dramasToImport = parseResult.dramas.filter((d) => selectedDramaIds.includes(d.id));
    onImportDramas(dramasToImport, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#121212] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Bulk Drama Catalog Import
                <span className="text-[11px] font-bold bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                  CSV & JSON Parser
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Upload or paste multiple drama series entries at once to populate your catalog.
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {/* Top Row: Template Download & Format Guide */}
          <div className="bg-[#181822] border border-indigo-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-indigo-400" /> Standard Bulk Templates
              </h3>
              <p className="text-xs text-gray-300">
                Download a pre-formatted template with sample drama columns, episodes, and stream links.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={downloadCsvTemplate}
                className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV (.csv)</span>
              </button>
              <button
                onClick={downloadJsonTemplate}
                className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download JSON (.json)</span>
              </button>
              <button
                onClick={() => handleCopyTemplate("csv")}
                className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy sample CSV"
              >
                {copiedTemplate === "csv" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTemplate === "csv" ? "Copied!" : "Copy CSV"}</span>
              </button>
            </div>
          </div>

          {/* Tab Selector: Upload File vs Raw Text */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <button
              onClick={() => setActiveTab("file")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "file"
                  ? "bg-red-600 text-white shadow-md shadow-red-900/30"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload CSV / JSON File</span>
            </button>
            <button
              onClick={() => setActiveTab("paste")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "paste"
                  ? "bg-red-600 text-white shadow-md shadow-red-900/30"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Direct Text Paste</span>
            </button>
          </div>

          {/* Mode 1: File Upload Dropzone */}
          {activeTab === "file" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 hover:border-red-500/50 bg-[#161616] hover:bg-[#1a1a1a] rounded-3xl p-8 sm:p-10 text-center space-y-4 cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl bg-white/5 group-hover:bg-red-600/20 text-gray-400 group-hover:text-red-500 flex items-center justify-center mx-auto transition-colors">
                <Upload className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  {selectedFileName ? (
                    <span className="text-emerald-400 font-mono">{selectedFileName}</span>
                  ) : (
                    "Click to browse or drag & drop CSV or JSON file here"
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  Supports .csv (with headers & pipe-separated video URLs) or .json array of dramas
                </p>
              </div>
            </div>
          )}

          {/* Mode 2: Direct Raw Text Paste */}
          {activeTab === "paste" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-300">
                  Paste Raw CSV or JSON Content:
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Format:</span>
                  <button
                    type="button"
                    onClick={() => setFileType("csv")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      fileType === "csv" ? "bg-emerald-600 text-white" : "bg-white/10 text-gray-400"
                    }`}
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setFileType("json")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      fileType === "json" ? "bg-blue-600 text-white" : "bg-white/10 text-gray-400"
                    }`}
                  >
                    JSON
                  </button>
                </div>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={fileType === "csv" ? CSV_DRAMA_TEMPLATE : JSON_DRAMA_TEMPLATE}
                rows={8}
                className="w-full bg-[#161616] border border-white/15 rounded-2xl p-4 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-red-500 custom-scrollbar"
              />
              <button
                type="button"
                onClick={handleManualParse}
                disabled={!rawText.trim()}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Parse Content</span>
              </button>
            </div>
          )}

          {/* Parse Result Feedback & Live Dramas List */}
          {isProcessing && (
            <div className="py-8 text-center space-y-2">
              <RefreshCw className="w-8 h-8 text-red-500 animate-spin mx-auto" />
              <p className="text-xs font-bold text-white">Analyzing & validating drama catalog...</p>
            </div>
          )}

          {parseResult && (
            <div className="space-y-4 pt-2">
              {/* Errors Display */}
              {parseResult.errors.length > 0 && (
                <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-xs text-red-300 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Parsing Errors Encountered:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-red-300">
                    {parseResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings Display */}
              {parseResult.warnings.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Warnings ({parseResult.warnings.length}):</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-amber-300/90 max-h-24 overflow-y-auto custom-scrollbar">
                    {parseResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Parsed Dramas Table */}
              {parseResult.dramas.length > 0 && (
                <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white">
                        Parsed {parseResult.dramas.length} Drama Series
                      </h4>
                      <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {selectedDramaIds.length} selected for import
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs text-gray-300 hover:text-white font-medium underline cursor-pointer"
                    >
                      {selectedDramaIds.length === parseResult.dramas.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {parseResult.dramas.map((drama, idx) => {
                      const isSelected = selectedDramaIds.includes(drama.id);
                      return (
                        <div
                          key={drama.id}
                          onClick={() => handleToggleDramaSelection(drama.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-emerald-950/20 border-emerald-500/40"
                              : "bg-[#121212] border-white/5 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleDramaSelection(drama.id)}
                              className="rounded border-white/20 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                            />
                            <img
                              src={drama.posterUrl}
                              alt={drama.title}
                              className="w-10 h-14 rounded-lg object-cover border border-white/10 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {drama.title}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                                <span className="bg-white/10 px-1.5 py-0.5 rounded text-gray-300">
                                  {drama.category}
                                </span>
                                <span>{drama.episodes.length} Episodes</span>
                                <span className="text-amber-400">★ {drama.rating}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-mono text-gray-400 block">
                              {drama.viewsCount} views
                            </span>
                            <span className="text-[9px] text-emerald-400">Ready</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Import Mode Selector */}
                  <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <span className="text-gray-300 font-bold">Import Strategy:</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-gray-200">
                        <input
                          type="radio"
                          name="importMode"
                          value="append"
                          checked={importMode === "append"}
                          onChange={() => setImportMode("append")}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span>Append (Keep {existingDramasCount} existing)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-red-300">
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === "replace"}
                          onChange={() => setImportMode("replace")}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span>Replace Catalog</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#161616] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleExecuteImport}
            disabled={!parseResult || selectedDramaIds.length === 0}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-red-900/40 transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Import {selectedDramaIds.length} Series into Catalog</span>
          </button>
        </div>
      </div>
    </div>
  );
};

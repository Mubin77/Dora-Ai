import React, { useState, useEffect } from "react";
import { DoraMemoryItem, DoraEmotion } from "../types";
import { MemoryItem, MemoryCategory } from "../memory/types";
import { memoryManager } from "../memory/MemoryManager";
import {
  X,
  Sparkles,
  Heart,
  Brain,
  Trash2,
  Edit2,
  Plus,
  Search,
  Check,
  ToggleLeft,
  ToggleRight,
  Shield,
  Clock,
  Tag,
  AlertCircle,
  Download,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ConversationMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: DoraMemoryItem[];
  currentEmotion: DoraEmotion;
  onClearMemories?: () => void;
}

const CATEGORIES: Array<{ id: MemoryCategory | "all"; label: string }> = [
  { id: "all", label: "All Memories" },
  { id: "identity", label: "Identity" },
  { id: "preferences", label: "Preferences" },
  { id: "projects", label: "Projects" },
  { id: "goals", label: "Goals" },
  { id: "personality", label: "Personality" },
  { id: "habits", label: "Habits" },
  { id: "relationships", label: "Relationships" },
  { id: "life_events", label: "Life Events" },
];

export const ConversationMemoryModal: React.FC<ConversationMemoryModalProps> = ({
  isOpen,
  onClose,
  memories: sessionNotes,
  currentEmotion,
  onClearMemories,
}) => {
  const [activeTab, setActiveTab] = useState<"long_term" | "active_session">("long_term");
  const [isMemoryEnabled, setIsMemoryEnabled] = useState<boolean>(true);
  const [storedMemories, setStoredMemories] = useState<MemoryItem[]>([]);
  const [totalMemoryCount, setTotalMemoryCount] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState<string>("");
  const [editValue, setEditValue] = useState<string>("");
  const [editImportance, setEditImportance] = useState<number>(80);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<MemoryCategory>("preferences");
  const [newKey, setNewKey] = useState<string>("");
  const [newValue, setNewValue] = useState<string>("");
  const [newImportance, setNewImportance] = useState<number>(80);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);

  // Sync memory items with store
  const refreshMemories = () => {
    setIsMemoryEnabled(memoryManager.isEnabled());
    const total = memoryManager.getTotalCount();
    setTotalMemoryCount(total);
    const list = memoryManager.search({
      category: selectedCategory,
      searchQuery: searchQuery,
      sortBy: "importance",
    });
    setStoredMemories(list);
  };

  useEffect(() => {
    if (isOpen) {
      memoryManager.reload();
      refreshMemories();
      const unsubscribe = memoryManager.subscribe(() => {
        refreshMemories();
      });
      return () => unsubscribe();
    }
  }, [isOpen, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleToggleMemory = () => {
    const next = !isMemoryEnabled;
    setIsMemoryEnabled(next);
    memoryManager.setEnabled(next);
  };

  const handleSaveEdit = (id: string) => {
    if (!editValue.trim()) return;
    memoryManager.update(id, {
      key: editKey.trim() || undefined,
      value: editValue.trim(),
      importance: editImportance,
    });
    setEditingId(null);
    refreshMemories();
  };

  const handleDelete = (id: string) => {
    memoryManager.delete(id);
    refreshMemories();
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;
    memoryManager.remember(
      newCategory,
      newKey.trim(),
      newValue.trim(),
      newImportance,
      1.0
    );
    setIsAddingNew(false);
    setNewKey("");
    setNewValue("");
    setNewImportance(80);
    refreshMemories();
  };

  const handleExportJSON = () => {
    const all = memoryManager.getAll(true);
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dora-memories-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAllConfirm = () => {
    memoryManager.clearAll();
    setConfirmClearAll(false);
    refreshMemories();
  };

  return (
    <AnimatePresence>
      <div
        id="dora-memory-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-[#070C18]/95 border border-[#2F8CFF]/25 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_0_50px_rgba(22,119,255,0.15)] text-white/90 space-y-5 max-h-[92vh] flex flex-col custom-scrollbar overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#1677FF]/15 border border-[#2F8CFF]/30 text-[#2F8CFF] shadow-[0_0_12px_rgba(22,119,255,0.3)]">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold tracking-wide text-white uppercase">
                    Dora's Memory System
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1677FF]/20 border border-[#2F8CFF]/30 font-mono text-[#48A8FF]">
                    {storedMemories.length === totalMemoryCount
                      ? `${totalMemoryCount} Knowledge Points`
                      : `${storedMemories.length} of ${totalMemoryCount} Points`}
                  </span>
                </div>
                <p className="text-xs text-[#9AA4B5] font-normal">
                  Long-term personalization & active session context
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-2 p-1 bg-white/[0.03] border border-white/10 rounded-2xl shrink-0">
            <button
              onClick={() => setActiveTab("long_term")}
              className={`py-2 text-xs rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === "long_term"
                  ? "bg-[#1677FF] text-white shadow-md shadow-blue-950/40"
                  : "text-[#9AA4B5] hover:text-white hover:bg-white/5"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              Long-Term Memory ({totalMemoryCount})
            </button>
            <button
              onClick={() => setActiveTab("active_session")}
              className={`py-2 text-xs rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === "active_session"
                  ? "bg-[#1677FF] text-white shadow-md shadow-blue-950/40"
                  : "text-[#9AA4B5] hover:text-white hover:bg-white/5"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Session Context ({sessionNotes.length})
            </button>
          </div>

          {/* TAB 1: Long-Term Memory */}
          {activeTab === "long_term" && (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              {/* Memory Master Toggle & Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleToggleMemory}
                    className="flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white"
                  >
                    {isMemoryEnabled ? (
                      <ToggleRight className="w-6 h-6 text-[#2388FF]" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-white/40" />
                    )}
                    <span>{isMemoryEnabled ? "Memory Enabled" : "Memory Paused"}</span>
                  </button>
                  <span className="text-[11px] text-[#9AA4B5] hidden sm:inline">
                    {isMemoryEnabled
                      ? "(Dora learns from your voice naturally)"
                      : "(No new memories saved)"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsAddingNew((prev) => !prev)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#1677FF]/20 hover:bg-[#1677FF]/30 border border-[#2F8CFF]/30 text-white text-xs flex items-center gap-1 font-medium transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#2388FF]" />
                    <span>Add Fact</span>
                  </button>
                  <button
                    onClick={handleExportJSON}
                    title="Export memories as JSON"
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmClearAll(true)}
                    title="Clear all stored memories"
                    className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Add New Memory Form */}
              {isAddingNew && (
                <form
                  onSubmit={handleAddNew}
                  className="p-3.5 rounded-2xl bg-white/[0.04] border border-[#2F8CFF]/30 space-y-3 shrink-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-[#2388FF]" /> Add New Memory
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="text-white/40 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                      className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#2F8CFF]"
                    >
                      {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                        <option key={c.id} value={c.id} className="bg-neutral-900 text-white">
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Topic (e.g. Favorite Language)"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#2F8CFF]"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Detail (e.g. TypeScript and Python)"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#2F8CFF]"
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#9AA4B5]">Importance:</span>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={newImportance}
                        onChange={(e) => setNewImportance(parseInt(e.target.value))}
                        className="w-24 h-1 bg-white/10 rounded accent-[#2388FF]"
                      />
                      <span className="text-[10px] font-mono text-[#2388FF]">{newImportance}%</span>
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-[#1677FF] hover:bg-[#2F8CFF] text-white rounded-xl text-xs font-medium transition-all"
                    >
                      Save Memory
                    </button>
                  </div>
                </form>
              )}

              {/* Search & Category Filter */}
              <div className="space-y-2 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search memories (e.g. 'project', 'tea', 'name')..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-[#687386] focus:outline-none focus:border-[#2F8CFF]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg shrink-0 transition-all ${
                        selectedCategory === cat.id
                          ? "bg-[#1677FF]/20 border border-[#2F8CFF] text-white"
                          : "bg-white/[0.02] border border-white/5 text-[#9AA4B5] hover:border-white/15 hover:text-white"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stored Memory List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[160px]">
                {storedMemories.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                    <Brain className="w-8 h-8 mx-auto text-white/20 mb-2" />
                    <p className="text-xs text-white/60 font-medium">No stored memories found</p>
                    <p className="text-[11px] text-[#687386] mt-1 max-w-xs mx-auto">
                      Say <span className="text-[#2388FF]">"Remember that I love coding"</span> or click "Add Fact" above.
                    </p>
                  </div>
                ) : (
                  storedMemories.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.07] hover:border-[#2F8CFF]/40 transition-all group"
                    >
                      {editingId === item.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editKey}
                            onChange={(e) => setEditKey(e.target.value)}
                            className="w-full bg-black/40 border border-white/15 rounded-lg px-2 py-1 text-xs text-white"
                            placeholder="Key"
                          />
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full bg-black/40 border border-white/15 rounded-lg px-2 py-1 text-xs text-white resize-none h-14"
                            placeholder="Memory details"
                          />
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-[#9AA4B5]">Importance:</span>
                              <input
                                type="range"
                                min="10"
                                max="100"
                                value={editImportance}
                                onChange={(e) => setEditImportance(parseInt(e.target.value))}
                                className="w-20 h-1 accent-[#2388FF]"
                              />
                              <span className="text-[10px] font-mono text-[#2388FF]">{editImportance}%</span>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-2 py-0.5 rounded text-[11px] text-white/50 hover:text-white"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEdit(item.id)}
                                className="px-2.5 py-0.5 rounded bg-[#1677FF] text-white text-[11px] font-medium"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[#48A8FF] uppercase font-mono tracking-wider border border-white/5">
                                {item.category}
                              </span>
                              <span className="text-xs font-semibold text-white">{item.key}</span>
                              <span className="text-[10px] text-[#9AA4B5] font-mono">
                                • {item.importance}% imp
                              </span>
                            </div>
                            <p className="text-xs text-white/80 leading-relaxed font-light pl-0.5">
                              {item.value}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingId(item.id);
                                setEditKey(item.key);
                                setEditValue(item.value);
                                setEditImportance(item.importance);
                              }}
                              className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                              title="Edit memory"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                              title="Delete memory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Active Session Context */}
          {activeTab === "active_session" && (
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#2388FF]" />
                  <span className="text-xs text-white/90">Current Emotion State:</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#1677FF]/20 text-[#48A8FF] font-medium border border-[#2F8CFF]/30 capitalize">
                    {currentEmotion}
                  </span>
                </div>
                {onClearMemories && (
                  <button
                    onClick={onClearMemories}
                    className="text-xs text-[#9AA4B5] hover:text-red-400 transition-colors"
                  >
                    Clear Session
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[160px]">
                {sessionNotes.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                    <p className="text-xs text-white/60">No active session notes</p>
                  </div>
                ) : (
                  sessionNotes.map((mem) => (
                    <div
                      key={mem.id}
                      className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.07]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-white">{mem.topic}</span>
                        <span className="text-[10px] text-[#9AA4B5]">
                          {new Date(mem.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-white/70">{mem.detail}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Clear All Confirmation Dialog */}
          {confirmClearAll && (
            <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-200">Delete all stored memories permanently?</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmClearAll(false)}
                  className="px-2.5 py-1 rounded-lg text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAllConfirm}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}

          {/* Footer Privacy Note */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#9AA4B5] shrink-0">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#2388FF]" />
              Encrypted browser storage with user ownership
            </span>
            <span className="text-white/40">Say "Forget that" to remove facts instantly</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

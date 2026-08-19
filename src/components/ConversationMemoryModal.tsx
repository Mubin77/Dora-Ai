import React, { useState, useEffect, useMemo } from "react";
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
  Shield,
  Clock,
  Download,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  User,
  FolderKanban,
  Target,
  Zap,
  Users,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DoraSparkle } from "./DoraSparkle";

interface ConversationMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: DoraMemoryItem[];
  currentEmotion: DoraEmotion;
  onClearMemories?: () => void;
}

interface CategoryOption {
  id: MemoryCategory | "all";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryOption[] = [
  { id: "all", label: "All memories", icon: Brain },
  { id: "identity", label: "Identity", icon: User },
  { id: "preferences", label: "Preferences", icon: Heart },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "goals", label: "Goals", icon: Target },
  { id: "personality", label: "Personality", icon: Sparkles },
  { id: "habits", label: "Habits", icon: Zap },
  { id: "relationships", label: "Relationships", icon: Users },
  { id: "life_events", label: "Life events", icon: Calendar },
];

export const ConversationMemoryModal: React.FC<ConversationMemoryModalProps> = ({
  isOpen,
  onClose,
  memories: sessionNotes,
  currentEmotion,
}) => {
  const [activeTab, setActiveTab] = useState<"long_term" | "active_session">("long_term");
  const [isMemoryEnabled, setIsMemoryEnabled] = useState<boolean>(true);
  const [storedMemories, setStoredMemories] = useState<MemoryItem[]>([]);
  const [totalMemoryCount, setTotalMemoryCount] = useState<number>(0);
  const [allMemoriesList, setAllMemoriesList] = useState<MemoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal / sheet state
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [selectedDetailMemory, setSelectedDetailMemory] = useState<MemoryItem | null>(null);
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);

  // Form states for Add / Edit
  const [formCategory, setFormCategory] = useState<MemoryCategory>("preferences");
  const [formKey, setFormKey] = useState<string>("");
  const [formValue, setFormValue] = useState<string>("");
  const [formImportance, setFormImportance] = useState<number>(80);

  // Refresh data from MemoryManager
  const refreshMemories = () => {
    setIsMemoryEnabled(memoryManager.isEnabled());
    const total = memoryManager.getTotalCount();
    setTotalMemoryCount(total);
    const all = memoryManager.getAll(true);
    setAllMemoriesList(all);

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

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        if (isAddingNew) {
          setIsAddingNew(false);
        } else if (editingMemory) {
          setEditingMemory(null);
        } else if (selectedDetailMemory) {
          setSelectedDetailMemory(null);
        } else if (confirmClearAll) {
          setConfirmClearAll(false);
        } else if (confirmDeleteId) {
          setConfirmDeleteId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isAddingNew, editingMemory, selectedDetailMemory, confirmClearAll, confirmDeleteId, onClose]);

  // Category counts computation
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allMemoriesList.length };
    for (const mem of allMemoriesList) {
      counts[mem.category] = (counts[mem.category] || 0) + 1;
    }
    return counts;
  }, [allMemoriesList]);

  if (!isOpen) return null;

  // Actions
  const handleToggleMemory = () => {
    const next = !isMemoryEnabled;
    setIsMemoryEnabled(next);
    memoryManager.setEnabled(next);
  };

  const handleOpenAdd = () => {
    setFormCategory(selectedCategory === "all" ? "preferences" : selectedCategory);
    setFormKey("");
    setFormValue("");
    setFormImportance(80);
    setIsAddingNew(true);
  };

  const handleOpenEdit = (item: MemoryItem) => {
    setFormCategory(item.category);
    setFormKey(item.key);
    setFormValue(item.value);
    setFormImportance(item.importance || 80);
    setEditingMemory(item);
    setSelectedDetailMemory(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemory || !formValue.trim()) return;

    memoryManager.update(editingMemory.id, {
      category: formCategory,
      key: formKey.trim() || undefined,
      value: formValue.trim(),
      importance: formImportance,
    });

    setEditingMemory(null);
    refreshMemories();
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey.trim() || !formValue.trim()) return;

    memoryManager.remember(
      formCategory,
      formKey.trim(),
      formValue.trim(),
      formImportance,
      1.0
    );

    setIsAddingNew(false);
    setFormKey("");
    setFormValue("");
    setFormImportance(80);
    refreshMemories();
  };

  const handleDelete = (id: string) => {
    memoryManager.delete(id);
    setConfirmDeleteId(null);
    if (selectedDetailMemory?.id === id) {
      setSelectedDetailMemory(null);
    }
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
    setIsOverflowMenuOpen(false);
  };

  const handleClearAllConfirm = () => {
    memoryManager.clearAll();
    setConfirmClearAll(false);
    setIsOverflowMenuOpen(false);
    setSelectedDetailMemory(null);
    refreshMemories();
  };

  const formatTimestamp = (ts?: number) => {
    if (!ts) return "Recently";
    const date = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const getCategoryLabel = (cat: MemoryCategory) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    return found ? found.label : cat;
  };

  return (
    <AnimatePresence>
      <div
        id="dora-memory-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm text-[#E3E3E3] font-sans select-none"
      >
        {/* ================================================================ */}
        {/* MOBILE VIEW (< lg)                                               */}
        {/* ================================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.18 }}
          className="lg:hidden w-full h-full bg-[#000000] flex flex-col overflow-hidden"
        >
          {/* Mobile Top Bar */}
          <div className="px-4 py-3.5 border-b border-white/[0.04] flex items-center justify-between shrink-0 bg-[#000000]">
            <div className="flex items-center gap-2">
              <DoraSparkle size={18} />
              <span className="text-sm font-semibold text-white">Memory Store</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOverflowMenuOpen((prev) => !prev)}
                className="p-1.5 rounded-full text-white/50 hover:text-white transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-white/50 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Overflow Menu */}
          {isOverflowMenuOpen && (
            <div className="absolute right-4 top-12 z-30 w-52 rounded-2xl bg-[#05070B] border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.95)] p-1.5 space-y-0.5 animate-fade-in">
              <button
                type="button"
                onClick={handleExportJSON}
                className="w-full px-3 py-2.5 rounded-xl text-left text-xs text-white/80 hover:text-white hover:bg-white/[0.06] flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-white/60" />
                <span>Export memories (JSON)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOverflowMenuOpen(false);
                  setConfirmClearAll(true);
                }}
                className="w-full px-3 py-2.5 rounded-xl text-left text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear all memories</span>
              </button>
            </div>
          )}

          {/* Search & Filter Header */}
          <div className="p-4 space-y-3 border-b border-white/[0.04] bg-[#000000]">
            <div className="relative">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search remembered facts…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-[#1D72FE]/40 transition-all"
              />
            </div>

            {/* Categories Horizontal Scroller */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar -mx-4 px-4">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const count = categoryCounts[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#0C1938] text-[#38BDF8]"
                        : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="text-[10px] font-mono text-white/30">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Memories List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {storedMemories.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Brain className="w-6 h-6 text-white/20 mx-auto" />
                <p className="text-xs text-white/40">No saved memories found</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {storedMemories.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 px-1 flex items-start justify-between gap-3 text-left group"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-white/90 leading-relaxed break-words">
                        {item.value}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-white/40">
                        <span className="capitalize">{getCategoryLabel(item.category)}</span>
                        <span>•</span>
                        <span>{formatTimestamp(item.updatedAt || item.timestamp)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ================================================================ */}
        {/* DESKTOP VIEW (>= lg)                                             */}
        {/* ================================================================ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="hidden lg:flex w-full max-w-4xl h-[78vh] max-h-[680px] bg-[#05070B] rounded-3xl border border-white/[0.06] shadow-[0_24px_64px_rgba(0,0,0,0.95)] overflow-hidden"
        >
          {/* Left Navigation Sidebar */}
          <aside className="w-64 shrink-0 bg-[#000000] border-r border-white/[0.04] p-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2.5 px-2 pt-1">
                <DoraSparkle size={20} />
                <div>
                  <h2 className="text-base font-semibold text-white tracking-tight">Memory Store</h2>
                  <span className="text-[11px] text-white/40 font-mono">
                    {totalMemoryCount} facts remembered
                  </span>
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-0.5 pt-2">
                <span className="text-[11px] font-semibold tracking-wider text-white/35 uppercase px-3 block mb-1">
                  Categories
                </span>
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  const count = categoryCounts[cat.id] || 0;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                        isSelected
                          ? "bg-[#0C1938] text-[#38BDF8] font-medium"
                          : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{cat.label}</span>
                      </div>
                      <span className="text-xs font-mono text-white/30">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2 pt-3 border-t border-white/[0.04]">
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="text-xs text-white/50 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="text-xs text-white/40 hover:text-red-400 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear all</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Right Detail Pane */}
          <main className="flex-1 bg-[#05070B] flex flex-col overflow-hidden">
            {/* Top Bar */}
            <div className="px-7 py-3.5 border-b border-white/[0.04] flex items-center justify-between shrink-0">
              <div className="relative w-72">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search facts…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-[#1D72FE]/40 transition-all"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white text-xs font-medium transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Add memory</span>
                </button>

                <button
                  id="btn-close-memory-desktop"
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-7 overflow-y-auto custom-scrollbar">
              <div className="max-w-xl space-y-4">
                {storedMemories.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <Brain className="w-8 h-8 text-white/20 mx-auto" />
                    <p className="text-sm font-medium text-white/60">No memories found</p>
                    <p className="text-xs text-white/35">
                      Dora continuously updates this store from your conversations.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {storedMemories.map((item) => (
                      <div
                        key={item.id}
                        className="py-3 px-1 flex items-start justify-between gap-3 text-left group"
                      >
                        <div className="space-y-1 flex-1 min-w-0 pr-3">
                          <p className="text-sm text-white/90 leading-relaxed break-words">
                            {item.value}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-white/40">
                            <span className="capitalize text-white/60">
                              {getCategoryLabel(item.category)}
                            </span>
                            <span>•</span>
                            <span>{item.key}</span>
                            <span>•</span>
                            <span>{formatTimestamp(item.updatedAt || item.timestamp)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </motion.div>

        {/* Modal: Add or Edit Memory */}
        {(isAddingNew || editingMemory) && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md bg-[#05070B] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.95)] text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                <h3 className="text-base font-semibold text-white">
                  {editingMemory ? "Edit Memory" : "Add Memory"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingMemory(null);
                  }}
                  className="p-1.5 rounded-full text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={editingMemory ? handleSaveEdit : handleAddNew} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-white/50 block">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MemoryCategory)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#1D72FE]/60"
                  >
                    {CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-[#05070B] text-white">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-white/50 block">Topic / Key</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Favorite food, Job title"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#1D72FE]/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-white/50 block">Memory detail</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="What should Dora remember?"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#1D72FE]/60 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.04]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setEditingMemory(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/[0.05]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#1D72FE] hover:bg-[#1A64DE] text-white text-xs font-medium shadow-sm transition-all"
                  >
                    Save Memory
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal: Confirm Clear All */}
        {confirmClearAll && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-sm bg-[#05070B] border border-white/[0.08] rounded-3xl p-5 shadow-[0_24px_64px_rgba(0,0,0,0.95)] text-white space-y-3"
            >
              <h3 className="text-base font-semibold text-white">Clear All Memories?</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                This will permanently delete all stored facts. Dora will lose long-term context
                about your preferences.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearAllConfirm}
                  className="px-3.5 py-1.5 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 text-xs font-medium transition-all"
                >
                  Delete All
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Confirm Delete Single */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-sm bg-[#05070B] border border-white/[0.08] rounded-3xl p-5 shadow-[0_24px_64px_rgba(0,0,0,0.95)] text-white space-y-3"
            >
              <h3 className="text-base font-semibold text-white">Delete Fact?</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Are you sure you want to remove this fact from Dora's memory?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="px-3.5 py-1.5 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 text-xs font-medium transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

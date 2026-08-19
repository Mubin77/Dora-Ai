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
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  User,
  FolderKanban,
  Target,
  Zap,
  Users,
  Calendar,
  Layers,
  Sliders,
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
  onClearMemories,
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

  const getCategoryLabel = (cat: MemoryCategory | "all") => {
    return CATEGORIES.find((c) => c.id === cat)?.label || cat;
  };

  return (
    <AnimatePresence>
      <div
        id="dora-memory-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      >
        {/* ================================================================ */}
        {/* MOBILE FULL-SCREEN SETTINGS PAGE (< lg)                          */}
        {/* ================================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="lg:hidden w-full h-full bg-[#131314] flex flex-col overflow-hidden text-white"
        >
          {/* Mobile Top Header Bar */}
          <div className="px-4 py-3.5 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#131314]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1 text-sm text-white/80 hover:text-white -ml-1 p-1 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-white">Memory</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOverflowMenuOpen((prev) => !prev)}
                className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              <button
                id="btn-close-memory-mobile"
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile Overflow Menu Dropdown */}
          {isOverflowMenuOpen && (
            <div className="absolute right-4 top-14 z-30 w-52 rounded-2xl bg-[#1E1F22] border border-white/10 shadow-2xl p-1.5 space-y-1 animate-fade-in">
              <button
                type="button"
                onClick={handleExportJSON}
                className="w-full px-3 py-2 rounded-xl text-left text-xs text-white/80 hover:text-white hover:bg-white/5 flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-white/60" />
                <span>Export memories (JSON)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOverflowMenuOpen(false);
                  setConfirmClearAll(true);
                }}
                className="w-full px-3 py-2 rounded-xl text-left text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear all memories</span>
              </button>
            </div>
          )}

          {/* Mobile Tab Switcher */}
          <div className="px-4 pt-3 shrink-0">
            <div className="flex items-center p-1 rounded-2xl bg-[#1E1F22] border border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab("long_term")}
                className={`flex-1 py-1.5 text-xs rounded-xl font-medium transition-all text-center ${
                  activeTab === "long_term"
                    ? "bg-[#282A2F] text-white shadow-sm"
                    : "text-white/50 hover:text-white"
                }`}
              >
                Long-term ({totalMemoryCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("active_session")}
                className={`flex-1 py-1.5 text-xs rounded-xl font-medium transition-all text-center ${
                  activeTab === "active_session"
                    ? "bg-[#282A2F] text-white shadow-sm"
                    : "text-white/50 hover:text-white"
                }`}
              >
                Session ({sessionNotes.length})
              </button>
            </div>
          </div>

          {/* Mobile Main Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            {activeTab === "long_term" ? (
              <>
                {/* Section: Header Title */}
                <div>
                  <h2 className="text-xl font-normal text-white">Memory</h2>
                  <p className="text-xs text-white/50 mt-1">
                    Manage what Dora remembers about you across conversations.
                  </p>
                </div>

                {/* Section: Master Memory Toggle */}
                <div className="p-4 rounded-2xl bg-[#1E1F22] border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5 pr-3">
                    <span className="text-sm font-medium text-white block">Memory</span>
                    <span className="text-xs text-white/50 block">
                      Dora can remember useful information from your conversations.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleMemory}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                      isMemoryEnabled ? "bg-[#1D72FE]" : "bg-white/10"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        isMemoryEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Section: Search & Add Bar */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search memories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#1E1F22] border border-white/5 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-white/20 transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-white/80 block">Your memories</span>
                      <span className="text-[11px] text-white/40">
                        {storedMemories.length === 0
                          ? "No saved memories"
                          : `${storedMemories.length} ${
                              storedMemories.length === 1 ? "memory" : "memories"
                            }`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#38BDF8]" />
                      <span>Add memory</span>
                    </button>
                  </div>
                </div>

                {/* Section: Categories Selector */}
                <div className="space-y-2">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar -mx-4 px-4">
                    {CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      const count = categoryCounts[cat.id] || 0;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-white text-black font-semibold shadow-sm"
                              : "bg-[#1E1F22] text-white/60 hover:text-white border border-white/5"
                          }`}
                        >
                          <span>{cat.label}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              isSelected ? "bg-black/15 text-black" : "bg-white/5 text-white/40"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section: Memories List */}
                <div className="space-y-2">
                  {storedMemories.length === 0 ? (
                    <div className="py-12 px-4 text-center rounded-2xl bg-[#1E1F22]/50 border border-white/5 space-y-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/30">
                        <Brain className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm font-medium text-white/80 block">
                          No saved memories yet
                        </span>
                        <p className="text-xs text-white/40 max-w-xs mx-auto leading-relaxed">
                          Dora will remember useful details from your conversations.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-all inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span>Add memory</span>
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#1E1F22] border border-white/5 overflow-hidden divide-y divide-white/5">
                      {storedMemories.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedDetailMemory(item)}
                          className="p-4 hover:bg-[#282A2F] transition-colors cursor-pointer flex items-start justify-between gap-3 text-left"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <p className="text-sm text-white/95 leading-relaxed break-words">
                              {item.value}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap text-[11px] text-white/40">
                              <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/70 font-medium capitalize">
                                {getCategoryLabel(item.category)}
                              </span>
                              <span>•</span>
                              <span>{item.key}</span>
                              <span>•</span>
                              <span>{formatTimestamp(item.updatedAt || item.timestamp)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 pt-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(item);
                              }}
                              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(item.id);
                              }}
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
              </>
            ) : (
              /* Active Session View */
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-normal text-white">Active Session</h2>
                  <p className="text-xs text-white/50 mt-1">
                    Temporary conversational context held in memory during the current call.
                  </p>
                </div>

                {/* Emotion Badge */}
                <div className="p-4 rounded-2xl bg-[#1E1F22] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Heart className="w-4 h-4 text-[#38BDF8]" />
                    <div>
                      <span className="text-xs text-white/50 block">Current Emotion State</span>
                      <span className="text-sm font-medium text-white capitalize">
                        {currentEmotion}
                      </span>
                    </div>
                  </div>
                  {onClearMemories && (
                    <button
                      type="button"
                      onClick={onClearMemories}
                      className="text-xs text-white/50 hover:text-red-400 p-1"
                    >
                      Clear session
                    </button>
                  )}
                </div>

                {/* Session Notes List */}
                <div className="space-y-2">
                  {sessionNotes.length === 0 ? (
                    <div className="py-12 px-4 text-center rounded-2xl bg-[#1E1F22]/50 border border-white/5">
                      <p className="text-xs text-white/40">No active session notes</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#1E1F22] border border-white/5 overflow-hidden divide-y divide-white/5">
                      {sessionNotes.map((mem) => (
                        <div key={mem.id} className="p-4 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-white">{mem.topic}</span>
                            <span className="text-white/40 text-[11px]">
                              {new Date(mem.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-white/70 leading-relaxed">{mem.detail}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Privacy Footnote */}
            <div className="pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-white/40">
              <Shield className="w-4 h-4 text-[#38BDF8] shrink-0" />
              <span>Encrypted browser storage with user ownership.</span>
            </div>
          </div>
        </motion.div>

        {/* ================================================================ */}
        {/* DESKTOP RESPONSIVE SETTINGS-STYLE MODAL (>= lg)                   */}
        {/* ================================================================ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="hidden lg:flex w-full max-w-4xl h-[85vh] max-h-[760px] bg-[#131314] rounded-3xl border border-white/10 shadow-2xl overflow-hidden text-white"
        >
          {/* Left Navigation Sidebar */}
          <aside className="w-72 shrink-0 bg-[#18191C]/80 border-r border-white/5 p-5 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-2.5 px-2">
                <DoraSparkle size={24} />
                <div>
                  <h2 className="text-lg font-medium text-white tracking-tight">Memory</h2>
                  <span className="text-[11px] text-white/40 font-mono">
                    {totalMemoryCount} {totalMemoryCount === 1 ? "fact" : "facts"} saved
                  </span>
                </div>
              </div>

              {/* View Switcher: Long-term vs Active Session */}
              <div className="p-1 rounded-xl bg-[#1E1F22] border border-white/5 flex items-center">
                <button
                  type="button"
                  onClick={() => setActiveTab("long_term")}
                  className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-all text-center ${
                    activeTab === "long_term"
                      ? "bg-[#282A2F] text-white shadow-sm"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Long-term
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("active_session")}
                  className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-all text-center ${
                    activeTab === "active_session"
                      ? "bg-[#282A2F] text-white shadow-sm"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Session ({sessionNotes.length})
                </button>
              </div>

              {/* Categories Navigation (When long-term is active) */}
              {activeTab === "long_term" && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold tracking-wider text-white/40 uppercase px-3 block mb-1">
                    Categories
                  </span>
                  <nav className="space-y-0.5">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = selectedCategory === cat.id;
                      const count = categoryCounts[cat.id] || 0;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                            isSelected
                              ? "bg-[#1E1F22] text-white shadow-sm border border-white/5"
                              : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon
                              className={`w-3.5 h-3.5 ${
                                isSelected ? "text-[#38BDF8]" : "text-white/40"
                              }`}
                            />
                            <span>{cat.label}</span>
                          </div>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                              isSelected ? "bg-white/10 text-white" : "text-white/30"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              )}
            </div>

            {/* Bottom Actions & Privacy */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between px-2">
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

              <div className="px-2 py-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2 text-[11px] text-white/40">
                <Shield className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                <span>Encrypted browser storage</span>
              </div>
            </div>
          </aside>

          {/* Right Detail / Content Pane */}
          <main className="flex-1 bg-[#131314] flex flex-col overflow-hidden">
            {/* Top Bar with Breadcrumbs & Close Button */}
            <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="text-xs text-white/40 uppercase tracking-wider font-mono">
                Settings / Memory {selectedCategory !== "all" && ` / ${getCategoryLabel(selectedCategory)}`}
              </div>
              <button
                id="btn-close-memory-desktop"
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
              <div className="max-w-2xl space-y-6">
                {activeTab === "long_term" ? (
                  <>
                    {/* Header Title */}
                    <div>
                      <h3 className="text-xl font-normal text-white mb-1">Memory</h3>
                      <p className="text-sm text-white/50">
                        Manage what Dora remembers about you across voice and chat sessions.
                      </p>
                    </div>

                    {/* Master Memory Enabled Row */}
                    <div className="p-4 rounded-2xl bg-[#1E1F22] border border-white/5 flex items-center justify-between">
                      <div className="space-y-0.5 pr-4">
                        <span className="text-sm font-medium text-white block">Memory</span>
                        <span className="text-xs text-white/50 block">
                          Dora can remember useful information from your conversations.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleMemory}
                        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                          isMemoryEnabled ? "bg-[#1D72FE]" : "bg-white/10"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            isMemoryEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Search Bar & Add Button */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                          <input
                            type="text"
                            placeholder="Search memories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#1E1F22] border border-white/5 rounded-2xl pl-10 pr-9 py-2 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-white/20 transition-all"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleOpenAdd}
                          className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white flex items-center gap-1.5 transition-all shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#38BDF8]" />
                          <span>Add memory</span>
                        </button>
                      </div>

                      {/* Summary text */}
                      <div className="flex items-center justify-between text-xs text-white/40 px-1">
                        <span>
                          {selectedCategory === "all" ? "All memories" : getCategoryLabel(selectedCategory)}
                        </span>
                        <span>
                          {storedMemories.length === 0
                            ? "No saved memories"
                            : `${storedMemories.length} ${
                                storedMemories.length === 1 ? "memory" : "memories"
                              }`}
                        </span>
                      </div>
                    </div>

                    {/* Memories List */}
                    <div className="space-y-2">
                      {storedMemories.length === 0 ? (
                        <div className="py-16 px-6 text-center rounded-2xl bg-[#1E1F22]/40 border border-white/5 space-y-3">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/30">
                            <Brain className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium text-white/80">
                              No saved memories yet
                            </h4>
                            <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
                              Dora will remember useful details from your conversations.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenAdd}
                            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-all inline-flex items-center gap-1.5 mt-2"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#38BDF8]" />
                            <span>Add memory</span>
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-[#1E1F22] border border-white/5 overflow-hidden divide-y divide-white/5">
                          {storedMemories.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => setSelectedDetailMemory(item)}
                              className="p-4 hover:bg-[#282A2F] transition-colors cursor-pointer flex items-start justify-between gap-4 text-left group"
                            >
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <p className="text-sm text-white/95 leading-relaxed break-words font-normal">
                                  {item.value}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap text-[11px] text-white/40">
                                  <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/70 font-medium capitalize">
                                    {getCategoryLabel(item.category)}
                                  </span>
                                  <span>•</span>
                                  <span>{item.key}</span>
                                  <span>•</span>
                                  <span>{formatTimestamp(item.updatedAt || item.timestamp)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 pt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEdit(item);
                                  }}
                                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                                  title="Edit memory"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteId(item.id);
                                  }}
                                  className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                  title="Delete memory"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Desktop Active Session Tab */
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-normal text-white mb-1">Active Session Context</h3>
                      <p className="text-sm text-white/50">
                        Temporary context and notes extracted during the active conversation.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#1E1F22] border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Heart className="w-4 h-4 text-[#38BDF8]" />
                        <div>
                          <span className="text-xs text-white/50 block">Current Emotion State</span>
                          <span className="text-sm font-medium text-white capitalize">
                            {currentEmotion}
                          </span>
                        </div>
                      </div>
                      {onClearMemories && (
                        <button
                          type="button"
                          onClick={onClearMemories}
                          className="text-xs text-white/50 hover:text-red-400 transition-colors"
                        >
                          Clear session notes
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {sessionNotes.length === 0 ? (
                        <div className="py-16 px-6 text-center rounded-2xl bg-[#1E1F22]/40 border border-white/5">
                          <p className="text-xs text-white/40">No active session notes recorded yet</p>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-[#1E1F22] border border-white/5 overflow-hidden divide-y divide-white/5">
                          {sessionNotes.map((mem) => (
                            <div key={mem.id} className="p-4 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-white">{mem.topic}</span>
                                <span className="text-white/40 text-[11px]">
                                  {new Date(mem.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-white/70 leading-relaxed">{mem.detail}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </motion.div>

        {/* ================================================================ */}
        {/* ADD MEMORY MODAL / SHEET                                         */}
        {/* ================================================================ */}
        {isAddingNew && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[#18191C] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 text-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#38BDF8]" />
                  <h3 className="text-base font-medium text-white">Add memory</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddNew} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/60 font-medium">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MemoryCategory)}
                    className="w-full bg-[#1E1F22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/25"
                  >
                    {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                      <option key={c.id} value={c.id} className="bg-neutral-900 text-white">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-white/60 font-medium">Topic / Key</label>
                  <input
                    type="text"
                    placeholder="e.g. Favorite Language"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    className="w-full bg-[#1E1F22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-white/60 font-medium">Detail / Value</label>
                  <textarea
                    placeholder="e.g. TypeScript, Next.js, and Python"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    rows={3}
                    className="w-full bg-[#1E1F22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 resize-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Importance</span>
                    <span className="font-mono text-white/80">{formImportance}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={formImportance}
                    onChange={(e) => setFormImportance(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#1D72FE]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#1D72FE] hover:bg-[#1D72FE]/90 text-xs font-medium text-white transition-all shadow-sm"
                  >
                    Save memory
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* ================================================================ */}
        {/* EDIT MEMORY MODAL / SHEET                                        */}
        {/* ================================================================ */}
        {editingMemory && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[#18191C] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 text-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[#38BDF8]" />
                  <h3 className="text-base font-medium text-white">Edit memory</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMemory(null)}
                  className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/60 font-medium">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MemoryCategory)}
                    className="w-full bg-[#1E1F22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/25"
                  >
                    {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                      <option key={c.id} value={c.id} className="bg-neutral-900 text-white">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-white/60 font-medium">Topic / Key</label>
                  <input
                    type="text"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    className="w-full bg-[#1E1F22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-white/60 font-medium">Detail / Value</label>
                  <textarea
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    rows={3}
                    className="w-full bg-[#1E1F22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 resize-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Importance</span>
                    <span className="font-mono text-white/80">{formImportance}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={formImportance}
                    onChange={(e) => setFormImportance(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#1D72FE]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingMemory(null)}
                    className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#1D72FE] hover:bg-[#1D72FE]/90 text-xs font-medium text-white transition-all shadow-sm"
                  >
                    Save changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* ================================================================ */}
        {/* VIEW MEMORY DETAIL MODAL                                         */}
        {/* ================================================================ */}
        {selectedDetailMemory && !editingMemory && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[#18191C] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 text-white"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-mono text-white/40">
                  Memory Detail
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDetailMemory(null)}
                  className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#1E1F22] border border-white/5">
                  <p className="text-sm text-white leading-relaxed break-words font-normal">
                    {selectedDetailMemory.value}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-white/40 block mb-0.5">Category</span>
                    <span className="text-white capitalize font-medium">
                      {getCategoryLabel(selectedDetailMemory.category)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-white/40 block mb-0.5">Topic / Key</span>
                    <span className="text-white font-medium break-all">
                      {selectedDetailMemory.key}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-white/40 block mb-0.5">Importance</span>
                    <span className="text-white font-medium">
                      {selectedDetailMemory.importance || 80}%
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-white/40 block mb-0.5">Last Updated</span>
                    <span className="text-white font-medium">
                      {formatTimestamp(selectedDetailMemory.updatedAt || selectedDetailMemory.timestamp)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteId(selectedDetailMemory.id);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDetailMemory(null)}
                    className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/5"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedDetailMemory)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* ================================================================ */}
        {/* DELETE CONFIRMATION MODAL                                        */}
        {/* ================================================================ */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#18191C] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-white text-center"
            >
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-white">Delete this memory?</h4>
                <p className="text-xs text-white/50">
                  Dora will forget this detail and won't use it in future conversations.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-medium text-white transition-all shadow-sm"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ================================================================ */}
        {/* CLEAR ALL CONFIRMATION MODAL                                     */}
        {/* ================================================================ */}
        {confirmClearAll && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#18191C] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-white text-center"
            >
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-white">Clear all memories?</h4>
                <p className="text-xs text-white/50 leading-relaxed">
                  This will permanently delete all {totalMemoryCount} saved memories. This action cannot be undone.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearAllConfirm}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-medium text-white transition-all shadow-sm"
                >
                  Clear all
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

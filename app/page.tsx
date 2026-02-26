"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Category, ShoppingItem } from "@/lib/types";
import { speakHebrew, preloadVoices } from "@/lib/tts";
import InitialInput from "@/components/InitialInput";
import ShoppingList from "@/components/ShoppingList";
import CommandInput from "@/components/CommandInput";
import VoiceFAB, { VoiceFABRef } from "@/components/VoiceFAB";

type AppState = "initial" | "categorizing" | "shopping";

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  "פירות וירקות": { icon: "🥬", color: "#22c55e" },
  "בשר ודגים": { icon: "🥩", color: "#e07850" },
  "חלב וקירור": { icon: "🧀", color: "#3b82f6" },
  "קפואים": { icon: "🧊", color: "#06b6d4" },
  "יבש/מזווה": { icon: "🫙", color: "#f59e0b" },
  "לחם ומאפים": { icon: "🍞", color: "#d97706" },
  "פארם וניקיון": { icon: "🧴", color: "#8b5cf6" },
  "שתייה": { icon: "🥤", color: "#ec4899" },
  "אחר": { icon: "🛒", color: "#6b7280" },
};

const STORAGE_KEY = "smart-shopping-list";
let globalIdCounter = 1000;

// Change this version to aggressively force PWA cache clear on clients
const APP_VERSION = "v1.0.4";

function saveToStorage(categories: Category[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch { /* Storage full or unavailable */ }
}

function loadFromStorage(): Category[] | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch { /* Parse error */ }
  return null;
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* Ignore */ }
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("initial");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState<string>("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [offlineWarning, setOfflineWarning] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(true);
  const voiceFABRef = useRef<VoiceFABRef>(null);

  // Aggressive Cache Buster
  useEffect(() => {
    const currentVersion = localStorage.getItem("app-version");

    if (currentVersion !== APP_VERSION) {
      console.log(`Upgrading app from ${currentVersion} to ${APP_VERSION}...`);

      // Wipe all service worker caches
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }

      // Update the saved version
      localStorage.setItem("app-version", APP_VERSION);

      // If there's an active service worker, tell it to update, then force a hard reload
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => reg.update());
        }).finally(() => {
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    } else {
      setCheckingUpdate(false);
    }
  }, []);

  // Register service worker & listen for updates
  useEffect(() => {
    // Only register SW if we're not currently cache-busting
    if (checkingUpdate) return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        // Check for updates periodically
        registration.update();
      }).catch((err) => {
        console.error("SW registration failed:", err);
      });

      // Listen for SW update messages
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SW_UPDATED") {
          setUpdateAvailable(true);
        }
      });
    }

    preloadVoices();

    const handleOffline = () => setOfflineWarning(true);
    const handleOnline = () => setOfflineWarning(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    if (!navigator.onLine) setOfflineWarning(true);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [checkingUpdate]);

  // Load saved list on startup
  useEffect(() => {
    if (checkingUpdate) return;
    const saved = loadFromStorage();
    if (saved && saved.length > 0) {
      setCategories(saved);
      setAppState("shopping");
      const maxId = saved
        .flatMap((c) => c.items)
        .reduce((max, item) => {
          const num = parseInt(item.id.replace(/\D/g, ""), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);
      globalIdCounter = maxId + 100;
    }
  }, [checkingUpdate]);

  // Save to localStorage whenever categories change
  useEffect(() => {
    if (categories.length > 0) {
      saveToStorage(categories);
    }
  }, [categories]);

  useEffect(() => {
    if (assistantMessage) {
      const timer = setTimeout(() => setAssistantMessage(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [assistantMessage]);

  const handleCategorize = async (text: string) => {
    setAppState("categorizing");
    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to categorize");
      const data = await res.json();
      setCategories(data.categories);
      setAppState("shopping");
    } catch (error) {
      console.error("Categorize error:", error);
      setAppState("initial");
      alert("שגיאה בעיבוד הרשימה. בדקו את חיבור הרשת ומפתח ה-API.");
    }
  };

  const handleToggleItem = useCallback((itemId: string) => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        ),
      }))
    );
  }, []);

  const getAllItems = useCallback((): ShoppingItem[] => {
    return categories.flatMap((c) => c.items);
  }, [categories]);

  const addNewItems = useCallback(
    (newItems: { name: string; category: string }[]) => {
      setCategories((prev) => {
        const updated = prev.map((c) => ({ ...c, items: [...c.items] }));
        for (const newItem of newItems) {
          const catName = newItem.category || "אחר";
          const existingCat = updated.find((c) => c.name === catName);
          const item: ShoppingItem = {
            id: `item-new-${globalIdCounter++}`,
            name: newItem.name,
            category: catName,
            checked: false,
          };
          if (existingCat) {
            existingCat.items.push(item);
          } else {
            const meta = CATEGORY_META[catName] || CATEGORY_META["אחר"];
            updated.push({
              name: catName,
              icon: meta.icon,
              color: meta.color,
              items: [item],
            });
          }
        }
        return updated;
      });
    },
    []
  );

  const editItems = useCallback(
    (editedItems: { oldName: string; newName: string }[]) => {
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((item) => {
            const edit = editedItems.find(
              (e) =>
                item.name === e.oldName ||
                item.name.includes(e.oldName) ||
                e.oldName.includes(item.name)
            );
            return edit ? { ...item, name: edit.newName } : item;
          }),
        }))
      );
    },
    []
  );

  const removeItems = useCallback(
    (removedNames: string[]) => {
      setCategories((prev) => {
        const updated = prev.map((cat) => ({
          ...cat,
          items: cat.items.filter((item) => {
            const shouldRemove = removedNames.some(
              (name) =>
                item.name === name ||
                item.name.includes(name) ||
                name.includes(item.name)
            );
            return !shouldRemove;
          }),
        }));
        return updated.filter((cat) => cat.items.length > 0);
      });
    },
    []
  );

  const handleAssistantCommand = useCallback(
    async (text: string) => {
      if (text.length < 2) return;
      setIsProcessing(true);
      voiceFABRef.current?.pauseListening();

      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, items: getAllItems() }),
        });
        if (!res.ok) throw new Error("Assistant request failed");
        const data = await res.json();

        if (data.updatedItems?.length > 0) {
          setCategories((prev) =>
            prev.map((cat) => ({
              ...cat,
              items: cat.items.map((item) => {
                const shouldCheck = data.updatedItems.some(
                  (name: string) =>
                    item.name === name ||
                    item.name.includes(name) ||
                    name.includes(item.name)
                );
                return shouldCheck ? { ...item, checked: true } : item;
              }),
            }))
          );
        }

        if (data.uncheckedItems?.length > 0) {
          setCategories((prev) =>
            prev.map((cat) => ({
              ...cat,
              items: cat.items.map((item) => {
                const shouldUncheck = data.uncheckedItems.some(
                  (name: string) =>
                    item.name === name ||
                    item.name.includes(name) ||
                    name.includes(item.name)
                );
                return shouldUncheck ? { ...item, checked: false } : item;
              }),
            }))
          );
        }

        if (data.editedItems?.length > 0) editItems(data.editedItems);
        if (data.removedItems?.length > 0) removeItems(data.removedItems);
        if (data.newItems?.length > 0) addNewItems(data.newItems);

        if (data.voiceResponse) {
          setAssistantMessage(data.voiceResponse);
          setIsSpeaking(true);
          await speakHebrew(data.voiceResponse);
          setIsSpeaking(false);
        }
      } catch (error) {
        console.error("Assistant error:", error);
        setAssistantMessage("שגיאה בתקשורת עם העוזר. בדקו חיבור לרשת.");
      } finally {
        setIsProcessing(false);
        setTimeout(() => {
          voiceFABRef.current?.resumeListening();
        }, 800);
      }
    },
    [getAllItems, addNewItems, editItems, removeItems]
  );

  const handleResetRequest = () => setShowResetConfirm(true);
  const handleResetConfirm = () => {
    setCategories([]);
    setAppState("initial");
    setAssistantMessage("");
    setShowResetConfirm(false);
    clearStorage();
  };
  const handleResetCancel = () => setShowResetConfirm(false);

  const handleUpdateRefresh = () => {
    setUpdateAvailable(false);
    window.location.reload();
  };

  return (
    <main className="app-main" dir="rtl">
      {/* Update available banner */}
      {updateAvailable && (
        <div className="update-banner" onClick={handleUpdateRefresh}>
          🆕 גרסה חדשה זמינה! לחץ כאן לעדכון
        </div>
      )}

      {/* Offline warning banner */}
      {offlineWarning && (
        <div className="offline-banner">
          📡 אין חיבור לאינטרנט — הרשימה נשמרת מקומית, אבל פקודות קוליות ו-AI לא יעבדו
        </div>
      )}

      {appState === "initial" || appState === "categorizing" ? (
        <InitialInput
          onSubmit={handleCategorize}
          isLoading={appState === "categorizing"}
        />
      ) : (
        <>
          <ShoppingList
            categories={categories}
            onToggleItem={handleToggleItem}
            onReset={handleResetRequest}
          />

          {assistantMessage && (
            <div className="assistant-toast">
              <div className="assistant-toast-content">
                <span className="assistant-toast-icon">🤖</span>
                <p className="assistant-toast-text">{assistantMessage}</p>
              </div>
            </div>
          )}

          {showResetConfirm && (
            <div className="modal-overlay" onClick={handleResetCancel}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-icon">⚠️</div>
                <h3 className="modal-title">איפוס הרשימה</h3>
                <p className="modal-text">
                  האם אתה בטוח שברצונך לאפס את הרשימה?
                  <br />
                  כל הפריטים יימחקו לצמיתות.
                </p>
                <div className="modal-actions">
                  <button className="modal-btn-cancel" onClick={handleResetCancel}>
                    חזרה
                  </button>
                  <button className="modal-btn-confirm" onClick={handleResetConfirm}>
                    כן, אפס
                  </button>
                </div>
              </div>
            </div>
          )}

          <CommandInput
            onSend={handleAssistantCommand}
            isProcessing={isProcessing}
          />

          <VoiceFAB
            ref={voiceFABRef}
            onTranscript={handleAssistantCommand}
            isProcessing={isProcessing}
            isMuted={isSpeaking}
          />
        </>
      )}
    </main>
  );
}

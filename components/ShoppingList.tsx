"use client";

import { Category, ShoppingItem } from "@/lib/types";
import { useState } from "react";

interface ShoppingListProps {
    categories: Category[];
    onToggleItem: (itemId: string) => void;
    onReset: () => void;
}

export default function ShoppingList({ categories, onToggleItem, onReset }: ShoppingListProps) {
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

    const allItems = categories.flatMap((c) => c.items);
    const pendingItems = allItems.filter((i) => !i.checked);
    const completedItems = allItems.filter((i) => i.checked);
    const progress = allItems.length > 0 ? (completedItems.length / allItems.length) * 100 : 0;

    const toggleCategory = (name: string) => {
        setCollapsedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const pendingCategories = categories
        .map((cat) => ({
            ...cat,
            items: cat.items.filter((i) => !i.checked),
        }))
        .filter((cat) => cat.items.length > 0);

    return (
        <div className="shopping-list-container">
            {/* Progress Header */}
            <div className="shopping-list-progress-card">
                <div className="shopping-list-progress-header">
                    <div className="shopping-list-progress-info">
                        <h2 className="shopping-list-progress-title">🛒 רשימת הקניות</h2>
                        <span className="shopping-list-progress-count">
                            {completedItems.length}/{allItems.length} פריטים
                        </span>
                    </div>
                    <button onClick={onReset} className="shopping-list-reset-btn" title="רשימה חדשה">
                        🔄
                    </button>
                </div>
                <div className="shopping-list-progress-bar-track">
                    <div
                        className="shopping-list-progress-bar-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                {progress === 100 && (
                    <div className="shopping-list-complete-msg">
                        🎉 סיימתם את כל הקניות! כל הכבוד!
                    </div>
                )}
            </div>

            {/* Pending Categories */}
            {pendingCategories.map((cat) => (
                <CategorySection
                    key={cat.name}
                    category={cat}
                    isCollapsed={collapsedCategories.has(cat.name)}
                    onToggleCollapse={() => toggleCategory(cat.name)}
                    onToggleItem={onToggleItem}
                />
            ))}

            {/* Completed Section */}
            {completedItems.length > 0 && (
                <div className="shopping-list-completed-section">
                    <button
                        onClick={() => toggleCategory("__completed__")}
                        className="shopping-list-completed-header"
                    >
                        <span>✅ הושלמו ({completedItems.length})</span>
                        <span className={`shopping-list-collapse-icon ${collapsedCategories.has("__completed__") ? "collapsed" : ""}`}>
                            ▼
                        </span>
                    </button>
                    {!collapsedCategories.has("__completed__") && (
                        <div className="shopping-list-completed-items">
                            {completedItems.map((item) => (
                                <ItemRow key={item.id} item={item} onToggle={onToggleItem} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Bottom spacer for FAB */}
            <div className="shopping-list-bottom-spacer" />
        </div>
    );
}

function CategorySection({
    category,
    isCollapsed,
    onToggleCollapse,
    onToggleItem,
}: {
    category: Category;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onToggleItem: (id: string) => void;
}) {
    return (
        <div className="category-section" style={{ "--cat-color": category.color } as React.CSSProperties}>
            <button onClick={onToggleCollapse} className="category-header">
                <div className="category-header-info">
                    <span className="category-icon">{category.icon}</span>
                    <span className="category-name">{category.name}</span>
                    <span className="category-count">{category.items.length}</span>
                </div>
                <span className={`shopping-list-collapse-icon ${isCollapsed ? "collapsed" : ""}`}>▼</span>
            </button>
            {!isCollapsed && (
                <div className="category-items">
                    {category.items.map((item) => (
                        <ItemRow key={item.id} item={item} onToggle={onToggleItem} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ItemRow({
    item,
    onToggle,
}: {
    item: ShoppingItem;
    onToggle: (id: string) => void;
}) {
    return (
        <button
            onClick={() => onToggle(item.id)}
            className={`item-row ${item.checked ? "item-checked" : ""}`}
        >
            <div className={`item-checkbox ${item.checked ? "item-checkbox-checked" : ""}`}>
                {item.checked && (
                    <svg viewBox="0 0 24 24" className="item-checkmark">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
                    </svg>
                )}
            </div>
            <span className={`item-name ${item.checked ? "item-name-checked" : ""}`}>
                {item.name}
            </span>
        </button>
    );
}

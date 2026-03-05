"use client";

import { Category, ShoppingItem } from "@/lib/types";
import { useState } from "react";

interface ShoppingListProps {
    categories: Category[];
    onToggleItem: (itemId: string) => void;
    onEditItem: (itemId: string, newName: string) => void;
    onReset: () => void;
}

export default function ShoppingList({ categories, onToggleItem, onEditItem, onReset }: ShoppingListProps) {
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
                    onEditItem={onEditItem}
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
                                <ItemRow key={item.id} item={item} onToggle={onToggleItem} onEdit={onEditItem} />
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
    onEditItem,
}: {
    category: Category;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onToggleItem: (id: string) => void;
    onEditItem: (id: string, newName: string) => void;
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
                        <ItemRow key={item.id} item={item} onToggle={onToggleItem} onEdit={onEditItem} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ItemRow({
    item,
    onToggle,
    onEdit,
}: {
    item: ShoppingItem;
    onToggle: (id: string) => void;
    onEdit: (id: string, newName: string) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(item.name);

    const handleEditSave = () => {
        if (editName.trim() && editName.trim() !== item.name) {
            onEdit(item.id, editName.trim());
        } else {
            setEditName(item.name); // revert if empty
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleEditSave();
        } else if (e.key === "Escape") {
            setEditName(item.name);
            setIsEditing(false);
        }
    };

    return (
        <div className={`item-row ${item.checked ? "item-checked" : ""}`}>
            <button className="item-row-toggle-area" onClick={() => onToggle(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right', padding: '0' }}>
                <div className={`item-checkbox ${item.checked ? "item-checkbox-checked" : ""}`}>
                    {item.checked && (
                        <svg viewBox="0 0 24 24" className="item-checkmark">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
                        </svg>
                    )}
                </div>
                {isEditing ? (
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleEditSave}
                        onKeyDown={handleKeyDown}
                        className="item-edit-input"
                        autoFocus
                        onClick={(e) => e.stopPropagation()} // Prevent toggle when clicking input
                    />
                ) : (
                    <span className={`item-name ${item.checked ? "item-name-checked" : ""}`}>
                        {item.name}
                    </span>
                )}
            </button>
            {!isEditing && (
                <button
                    className="item-edit-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                    }}
                    title="ערוך פריט"
                >
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor" />
                    </svg>
                </button>
            )}
        </div>
    );
}

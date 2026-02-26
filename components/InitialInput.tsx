"use client";

import { useState } from "react";

interface InitialInputProps {
    onSubmit: (text: string) => void;
    isLoading: boolean;
}

export default function InitialInput({ onSubmit, isLoading }: InitialInputProps) {
    const [text, setText] = useState("");

    const handleSubmit = () => {
        if (text.trim()) {
            onSubmit(text.trim());
        }
    };

    return (
        <div className="initial-input-container">
            <div className="initial-input-card">
                {/* Header */}
                <div className="initial-input-header">
                    <div className="initial-input-icon-wrapper">
                        <span className="initial-input-icon">🛒</span>
                    </div>
                    <h1 className="initial-input-title">רשימת קניות חכמה</h1>
                    <p className="initial-input-subtitle">
                        הדביקו את רשימת הקניות שלכם ובואו נסדר אותה אוטומטית לפי מחלקות
                    </p>
                </div>

                {/* Textarea */}
                <div className="initial-input-textarea-wrapper">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={`לדוגמה:\nחלב, ביצים, לחם\nעגבניות, מלפפונים\nחזה עוף\nאורז, שמן זית\nאבקת כביסה`}
                        className="initial-input-textarea"
                        dir="rtl"
                        rows={8}
                        disabled={isLoading}
                    />
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={!text.trim() || isLoading}
                    className="initial-input-submit-btn"
                >
                    {isLoading ? (
                        <div className="initial-input-loading">
                            <div className="initial-input-spinner" />
                            <span>מסדר את הרשימה...</span>
                        </div>
                    ) : (
                        <div className="initial-input-btn-content">
                            <span>✨</span>
                            <span>סדר את הרשימה</span>
                        </div>
                    )}
                </button>

                {/* Hint */}
                <p className="initial-input-hint">
                    כתבו את הפריטים בכל פורמט שנוח לכם — אנחנו נסדר הכל
                </p>
            </div>
        </div>
    );
}

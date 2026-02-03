import { useState, useEffect } from "react";

export interface LibraryItem {
    id: string;
    diseaseName: string;
    diseaseNameHi: string;
    cropType: string;
    cropTypeHi: string;
    confidence: number;
    severity: "low" | "medium" | "high";
    timestamp: string; // ISO string for storage
    thumbnail: string;
    summary: string;
    summaryHi: string;
    description?: string;
    descriptionHi?: string;
    symptoms?: string[];
    symptomsHi?: string[];
    treatment?: string[];
    treatmentHi?: string[];
}

export function useLibrary() {
    const [items, setItems] = useState<LibraryItem[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem("agrotalk_library");
        if (saved) {
            try {
                setItems(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse library items", e);
                setItems([]);
            }
        }
    }, []);

    const saveToStorage = (newItems: LibraryItem[]) => {
        localStorage.setItem("agrotalk_library", JSON.stringify(newItems));
        setItems(newItems);
    };

    const addItem = (item: Omit<LibraryItem, "id" | "timestamp">) => {
        // Check for duplicates based on thumbnail
        const existingIndex = items.findIndex((i) => i.thumbnail === item.thumbnail);

        if (existingIndex !== -1) {
            // Move existing item to top and update timestamp
            const existingItem = items[existingIndex];
            const updatedItem: LibraryItem = {
                ...existingItem,
                timestamp: new Date().toISOString(),
            };
            const remainingItems = items.filter((_, idx) => idx !== existingIndex);
            const newItems = [updatedItem, ...remainingItems];
            saveToStorage(newItems);
            return { item: updatedItem, isDuplicate: true };
        }

        const newItem: LibraryItem = {
            ...item,
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toISOString(),
        };
        const newItems = [newItem, ...items];
        saveToStorage(newItems);
        return { item: newItem, isDuplicate: false };
    };

    const deleteItem = (id: string) => {
        const newItems = items.filter((i) => i.id !== id);
        saveToStorage(newItems);
    };

    const updateItem = (id: string, updates: Partial<LibraryItem>) => {
        const newItems = items.map((i) => (i.id === id ? { ...i, ...updates } : i));
        saveToStorage(newItems);
    };

    return {
        items,
        addItem,
        deleteItem,
        updateItem,
    };
}

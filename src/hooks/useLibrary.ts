import { useState, useEffect } from "react";
import { toast } from "sonner";

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

const BACKEND_URL = "http://localhost:3001";

export function useLibrary() {
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/library`);
            const data = await response.json();
            if (data.success) {
                // Prepend backend URL to thumbnails if they are relative paths
                const itemsWithFullUrls = data.data.map((item: LibraryItem) => ({
                    ...item,
                    thumbnail: item.thumbnail.startsWith('/') ? `${BACKEND_URL}${item.thumbnail}` : item.thumbnail
                }));
                setItems(itemsWithFullUrls);
            }
        } catch (e) {
            console.error("Failed to fetch library items", e);
            toast.error("Failed to load history from server");
        } finally {
            setIsLoading(false);
        }
    };

    const addItem = async (item: Omit<LibraryItem, "id" | "timestamp">) => {
        try {
            const response = await fetch(`${BACKEND_URL}/library`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            const data = await response.json();
            if (data.success) {
                const newItem = {
                    ...data.data,
                    thumbnail: data.data.thumbnail.startsWith('/') ? `${BACKEND_URL}${data.data.thumbnail}` : data.data.thumbnail
                };
                setItems(prev => [newItem, ...prev]);
                return { item: newItem, isDuplicate: false };
            }
        } catch (e) {
            console.error("Failed to add library item", e);
            toast.error("Failed to save to server");
        }
        return { item: null, isDuplicate: false };
    };

    const deleteItem = async (id: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/library/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                setItems(prev => prev.filter((i) => i.id !== id));
                return true;
            }
        } catch (e) {
            console.error("Failed to delete library item", e);
            toast.error("Failed to delete from server");
        }
        return false;
    };

    const updateItem = async (id: string, updates: Partial<LibraryItem>) => {
        try {
            const response = await fetch(`${BACKEND_URL}/library/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            const data = await response.json();
            if (data.success) {
                setItems(prev => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
                return true;
            }
        } catch (e) {
            console.error("Failed to update library item", e);
            toast.error("Failed to update server");
        }
        return false;
    };

    return {
        items,
        isLoading,
        addItem,
        deleteItem,
        updateItem,
        refresh: fetchItems
    };
}

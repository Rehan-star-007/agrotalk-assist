import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ChatItem {
    id: string;
    query: string;
    response: string;
    timestamp: string;
    type: 'voice' | 'text';
    weatherContext?: any;
}

export function useChat() {
    const [history, setHistory] = useState<ChatItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/chat`);
            const data = await response.json();
            if (data.success) {
                setHistory(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch chat history', error);
        } finally {
            setIsLoading(false);
        }
    };

    const clearHistory = async () => {
        try {
            await fetch(`${API_BASE_URL}/chat`, { method: 'DELETE' });
            setHistory([]);
        } catch (error) {
            console.error('Failed to clear chat history', error);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    return { history, isLoading, fetchHistory, clearHistory };
}

import { useState, useEffect, Dispatch, SetStateAction } from 'react';

function useLocalStorage<T>(
    key: string,
    defaultValue: T,
    saveSettings: boolean = false
): [T, Dispatch<SetStateAction<T>>] {
    const [value, setValue] = useState<T>(() => {
        try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
        } catch {
        return defaultValue;
        }
    });

    useEffect(() => {
        if (saveSettings || key === 'rememberSettings') {
            localStorage.setItem(key, JSON.stringify(value));
        }
    }, [value, key, saveSettings]);

    return [value, setValue];
} 

export default useLocalStorage;

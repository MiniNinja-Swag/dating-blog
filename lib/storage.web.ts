// Web-compatible storage using localStorage
export const storage = {
    getItem: async (key: string) => {
        try {
            return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
        } catch {
            return null;
        }
    },
    setItem: async (key: string, value: string) => {
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, value);
            }
        } catch {
            // ignore
        }
    },
    removeItem: async (key: string) => {
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
            }
        } catch {
            // ignore
        }
    },
};

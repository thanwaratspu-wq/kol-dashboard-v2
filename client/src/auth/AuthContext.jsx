import { createContext, useContext, useState, useEffect } from 'react';
import { api, getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // ตอนเปิดแอป: ถ้ามี token อยู่แล้ว ลองดึงข้อมูลผู้ใช้ปัจจุบัน
    useEffect(() => {
        async function loadUser() {
            if (!getToken()) { setLoading(false); return; }
            try {
                const res = await api('/auth/me');
                setUser(res.user);
            } catch {
                setToken(null); // token หมดอายุ/ไม่ถูกต้อง
            } finally {
                setLoading(false);
            }
        }
        loadUser();
    }, []);

    async function login(username, password) {
        const res = await api('/auth/login', { method: 'POST', body: { username, password } });
        setToken(res.token);
        setUser(res.user);
        return res.user;
    }

    function logout() {
        setToken(null);
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

// ป้องกันหน้าที่ต้องล็อกอินก่อน — ถ้ายังไม่ล็อกอิน เด้งไปหน้า Login
export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="page-loading">กำลังโหลด...</div>;
    }
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

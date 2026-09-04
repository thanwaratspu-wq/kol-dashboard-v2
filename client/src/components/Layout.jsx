import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import Icon from './Icon.jsx';
import ChangePasswordModal from './ChangePasswordModal.jsx';
import ChatDock from './ChatDock.jsx';

const MAIN_NAV = [
    { to: '/', label: 'ภาพรวม', icon: 'dashboard', end: true },
    { to: '/projects', label: 'Projects', icon: 'folder' },
    { to: '/ads', label: 'ADS', icon: 'target' },
    { to: '/budget', label: 'Report Campaign', icon: 'bars' },
    { to: '/kols', label: 'Influencer', icon: 'star' }
];

const ADMIN_NAV = [
    { to: '/payments', label: 'รอบทำจ่าย', icon: 'wallet' },
    { to: '/activity', label: 'ประวัติการแก้ไข', icon: 'history' },
    { to: '/users', label: 'ผู้ใช้งาน', icon: 'users' },
    { to: '/teams', label: 'ทีม', icon: 'team' }
];

export default function Layout() {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [showPw, setShowPw] = useState(false);

    function handleLogout() {
        logout();
        navigate('/login');
    }

    function renderItem(item) {
        return (
            <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
                <Icon name={item.icon} size={19} />
                {item.label}
            </NavLink>
        );
    }

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="brand">
                    <span className="brand-mark">K</span>
                    <span className="brand-text">KOL Dashboard</span>
                </div>
                <nav className="nav">
                    {MAIN_NAV.map(renderItem)}
                    {isAdmin && (
                        <>
                            <div className="nav-group-label">ผู้ดูแลระบบ</div>
                            {ADMIN_NAV.map(renderItem)}
                        </>
                    )}
                </nav>
                <div className="sidebar-footer">
                    <div className="user-box">
                        <div className="user-avatar">{(user?.full_name || user?.username || '?')[0]}</div>
                        <div className="user-meta">
                            <div className="user-name">{user?.full_name || user?.username}</div>
                            <div className="user-role">
                                {user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิกทีม'}
                                {user?.team_name ? ` · ${user.team_name}` : ''}
                            </div>
                        </div>
                    </div>
                    <button className="btn-changepw" onClick={() => setShowPw(true)}>
                        <Icon name="edit" size={15} /> เปลี่ยนรหัสผ่าน
                    </button>
                    <button className="btn-logout" onClick={handleLogout}>
                        <Icon name="logout" size={17} /> ออกจากระบบ
                    </button>
                </div>
            </aside>
            {showPw && <ChangePasswordModal onClose={() => setShowPw(false)} />}
            <main className="content">
                <Outlet />
            </main>
            {/* กล่องแชทลอย — อยู่ทุกหน้าฝั่งทีม เลือกห้องเอเจนซี่จากในกล่องได้เลย */}
            <ChatDock mode="list" />
        </div>
    );
}

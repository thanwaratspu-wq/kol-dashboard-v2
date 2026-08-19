const AV_COLORS = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];

// สีคงที่ต่อชื่อ (อิงผลรวม char code)
export function avatarColor(name) {
    const s = name || '?';
    let sum = 0;
    for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i);
    return AV_COLORS[sum % AV_COLORS.length];
}

// วงกลมโปรไฟล์ (รูป หรือ ตัวอักษรแรก)
export default function Avatar({ name, src, size = 40, icon }) {
    const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
    if (!src && !icon) style.background = avatarColor(name);
    return (
        <div className="avatar-circle" style={style}>
            {src ? <img src={src} alt="" /> : (icon || (name || '?')[0])}
        </div>
    );
}

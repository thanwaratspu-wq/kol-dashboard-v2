// กราฟแท่งเล็ก ๆ ในการ์ดสรุป — วาดจากข้อมูลจริง (label/value)
export default function MiniBars({ data = [], color = '#10b981' }) {
    const items = data.filter(d => d).slice(0, 6);
    const max = Math.max(1, ...items.map(d => d.value));

    if (items.length === 0) {
        return <div className="minibars empty-mini">—</div>;
    }

    return (
        <div className="minibars" role="img" aria-label="กราฟสรุป">
            {items.map((d, i) => (
                <div className="minibar-col" key={i} title={`${d.label}: ${d.value}`}>
                    <div className="minibar-track">
                        <div
                            className="minibar-fill"
                            style={{ height: `${Math.round((d.value / max) * 100)}%`, background: color }}
                        />
                    </div>
                    <span className="minibar-label">{String(d.label).slice(0, 3)}</span>
                </div>
            ))}
        </div>
    );
}

import Icon from './Icon.jsx';
import MiniBars from './MiniBars.jsx';

export default function StatCard({ icon, label, value, chartData, chartColor }) {
    return (
        <div className="stat-card">
            <div className="stat-card-head">
                <div className="stat-icon"><Icon name={icon} size={24} /></div>
                <div className="stat-body">
                    <div className="stat-value">{value}</div>
                    <div className="stat-label">{label}</div>
                </div>
            </div>
            <MiniBars data={chartData} color={chartColor} />
        </div>
    );
}

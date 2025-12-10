import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const dataSOS = [
    { name: 'Mon', alerts: 4 },
    { name: 'Tue', alerts: 3 },
    { name: 'Wed', alerts: 2 },
    { name: 'Thu', alerts: 6 },
    { name: 'Fri', alerts: 8 },
    { name: 'Sat', alerts: 5 },
    { name: 'Sun', alerts: 4 },
];

const dataIncidents = [
    { name: 'Harassment', value: 400 },
    { name: 'Stalking', value: 300 },
    { name: 'Unsafe Area', value: 300 },
    { name: 'Suspicious', value: 200 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AnalyticsCharts() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SOS Trends */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Weekly SOS Trends</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataSOS}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="alerts" fill="#ef4444" name="SOS Alerts" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Incident Categories */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Incident Categories</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={dataIncidents}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {dataIncidents.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

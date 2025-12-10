import { Link } from 'react-router-dom';

export default function Landing() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">VNIT Girls' Safety App</h1>
            <p className="text-lg text-slate-600 mb-8 text-center max-w-md">
                A secure safety & wellness system for the students of VNIT.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                <Link to="/login?role=student" className="px-6 py-4 bg-white border-2 border-indigo-600 text-indigo-700 rounded-xl hover:bg-indigo-50 transition flex flex-col items-center gap-2">
                    <span className="font-bold text-lg">Student Login</span>
                    <span className="text-xs text-slate-500">Access your dashboard</span>
                </Link>
                <Link to="/login?role=warden" className="px-6 py-4 bg-white border-2 border-emerald-600 text-emerald-700 rounded-xl hover:bg-emerald-50 transition flex flex-col items-center gap-2">
                    <span className="font-bold text-lg">Warden Login</span>
                    <span className="text-xs text-slate-500">Manage hostel & students</span>
                </Link>
                <Link to="/login?role=security" className="px-6 py-4 bg-white border-2 border-amber-600 text-amber-700 rounded-xl hover:bg-amber-50 transition flex flex-col items-center gap-2">
                    <span className="font-bold text-lg">Security Login</span>
                    <span className="text-xs text-slate-500">Patrols & Incident logs</span>
                </Link>
                <Link to="/login?role=admin" className="px-6 py-4 bg-white border-2 border-slate-600 text-slate-700 rounded-xl hover:bg-slate-50 transition flex flex-col items-center gap-2">
                    <span className="font-bold text-lg">Admin Login</span>
                    <span className="text-xs text-slate-500">System control panel</span>
                </Link>
            </div>
        </div>
    );
}

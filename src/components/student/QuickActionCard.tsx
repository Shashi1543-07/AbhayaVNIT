import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

interface QuickActionCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    to: string;
    color?: string;
}

export default function QuickActionCard({ title, description, icon: Icon, to, color = 'indigo' }: QuickActionCardProps) {
    return (
        <Link
            to={to}
            className="group bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all duration-200 flex items-center justify-between"
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-${color}-50 text-${color}-600 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{title}</h3>
                    <p className="text-xs text-slate-500">{description}</p>
                </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
        </Link>
    );
}

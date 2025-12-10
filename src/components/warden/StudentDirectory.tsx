import { useEffect, useState } from 'react';
import { userService, type StudentProfile } from '../../services/userService';
import { Search, Phone, Mail, MapPin } from 'lucide-react';

interface StudentDirectoryProps {
    hostelId: string;
}

export default function StudentDirectory({ hostelId }: StudentDirectoryProps) {
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            const data = await userService.getStudentsByHostel(hostelId);
            setStudents(data);
            setLoading(false);
        };
        fetchStudents();
    }, [hostelId]);

    const filteredStudents = students.filter(student =>
        student.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.roomNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-surface rounded-xl shadow-sm border border-surface overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <h2 className="font-bold text-primary">Student Directory</h2>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search name or room..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Room</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4">Emergency Contact</th>
                            <th className="p-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading directory...</td></tr>
                        ) : filteredStudents.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No students found.</td></tr>
                        ) : (
                            filteredStudents.map(student => (
                                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                            {student.displayName[0]}
                                        </div>
                                        {student.displayName}
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-slate-400" /> {student.roomNo || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-1 text-xs">
                                                <Phone className="w-3 h-3 text-slate-400" /> {student.phone || 'N/A'}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs">
                                                <Mail className="w-3 h-3 text-slate-400" /> {student.email}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {student.emergencyContact || 'Not set'}
                                    </td>
                                    <td className="p-4">
                                        <button className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">
                                            View Profile
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

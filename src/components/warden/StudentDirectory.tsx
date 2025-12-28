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
        (student.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (student.roomNo?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="glass-card-soft bg-white/20 backdrop-blur-xl rounded-3xl shadow-soft border border-white/40 overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-white/20 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gradient-to-br from-white/30 to-white/10">
                <h2 className="text-lg font-bold text-slate-800">Student Directory</h2>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search name or room..."
                        className="w-full pl-10 pr-4 py-2 bg-white/40 border border-white/50 backdrop-blur-md rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 outline-none placeholder-slate-500 text-slate-800"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/30 text-slate-700 font-bold border-b border-white/20 sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                            <th className="p-4 whitespace-nowrap">Name</th>
                            <th className="p-4 whitespace-nowrap">Room</th>
                            <th className="p-4 whitespace-nowrap">Contact Info</th>
                            <th className="p-4 whitespace-nowrap">Emergency Contact</th>
                            <th className="p-4 whitespace-nowrap">Course/Year</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {loading ? (
                            <tr><td colSpan={5} className="p-12 text-center text-slate-600 font-medium">Loading directory...</td></tr>
                        ) : filteredStudents.length === 0 ? (
                            <tr><td colSpan={5} className="p-12 text-center text-slate-600 font-medium">No students found for this hostel.</td></tr>
                        ) : (
                            filteredStudents.map(student => (
                                <tr key={student.id} className="hover:bg-white/40 transition-all duration-300">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF99AC] to-[#C084FC] flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                                            {student.displayName?.[0] || '?'}
                                        </div>
                                        <span className="font-bold text-slate-800 truncate max-w-[150px]" title={student.displayName}>{student.displayName}</span>
                                    </td>
                                    <td className="p-4 text-slate-700 whitespace-nowrap font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <div className="p-1.5 rounded-lg bg-indigo-100/50 text-indigo-600">
                                                <MapPin className="w-3.5 h-3.5" />
                                            </div>
                                            {student.roomNo || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-700">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="flex items-center gap-1.5 text-xs font-medium">
                                                <Phone className="w-3.5 h-3.5 text-slate-500" /> {student.phone || 'N/A'}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-xs truncate max-w-[180px] font-medium" title={student.email}>
                                                <Mail className="w-3.5 h-3.5 text-slate-500" /> {student.email}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-indigo-700 whitespace-nowrap font-bold text-xs bg-indigo-50/20">
                                        {student.emergencyContact || 'Not set'}
                                    </td>
                                    <td className="p-4 text-slate-600 text-xs italic font-medium">
                                        {student.course && student.year ? `${student.course} (${student.year})` : student.course || student.year || 'N/A'}
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



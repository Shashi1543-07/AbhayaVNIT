import { useEffect, useState } from 'react';
import { userService, type StudentProfile } from '../../services/userService';
import { Search, Phone, Mail, MapPin, User, GraduationCap, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface StudentDirectoryProps {
    hostelId: string;
}

export default function StudentDirectory({ hostelId }: StudentDirectoryProps) {
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            try {
                const data = await userService.getStudentsByHostel(hostelId);
                setStudents(data);
            } catch (error) {
                console.error('Error fetching students:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, [hostelId]);

    const filteredStudents = students.filter(student =>
        (student.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (student.roomNo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (student.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                    type="text"
                    placeholder="Search by name, room, or email..."
                    className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-zinc-600 font-medium focus:outline-none focus:border-[#D4AF37]/50 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between px-1">
                <p className="text-xs text-zinc-500 font-medium">
                    {loading ? 'Loading...' : `${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''} found`}
                </p>
                {hostelId && (
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                        Hostel {hostelId}
                    </span>
                )}
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <RefreshCw className="w-8 h-8 text-[#D4AF37] animate-spin mb-3" />
                        <p className="text-sm text-zinc-500">Loading directory...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <User className="w-8 h-8 text-zinc-600" />
                        </div>
                        <p className="text-sm text-zinc-400 font-medium">No students found</p>
                        <p className="text-xs text-zinc-600 mt-1">Try adjusting your search</p>
                    </div>
                ) : (
                    filteredStudents.map((student, index) => (
                        <motion.div
                            key={student.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="glass rounded-2xl p-4 border border-white/10 hover:border-[#D4AF37]/30 transition-all"
                        >
                            <div className="flex items-start gap-3">
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center text-[#D4AF37] font-bold text-lg border border-[#D4AF37]/20 shrink-0">
                                    {student.displayName?.[0]?.toUpperCase() || '?'}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <h3 className="font-semibold text-white text-sm truncate">
                                            {student.displayName || 'Unknown'}
                                        </h3>
                                        {student.roomNo && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/10 text-zinc-400 flex items-center gap-1 shrink-0">
                                                <MapPin className="w-2.5 h-2.5" />
                                                {student.roomNo}
                                            </span>
                                        )}
                                    </div>

                                    {/* Contact Info */}
                                    <div className="space-y-1">
                                        {student.email && (
                                            <a
                                                href={`mailto:${student.email}`}
                                                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#D4AF37] transition-colors"
                                            >
                                                <Mail className="w-3 h-3" />
                                                <span className="truncate">{student.email}</span>
                                            </a>
                                        )}
                                        {student.phone && (
                                            <a
                                                href={`tel:${student.phone}`}
                                                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#D4AF37] transition-colors"
                                            >
                                                <Phone className="w-3 h-3" />
                                                <span>{student.phone}</span>
                                            </a>
                                        )}
                                    </div>

                                    {/* Additional Info Row */}
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        {(student.course || student.year) && (
                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 flex items-center gap-1">
                                                <GraduationCap className="w-2.5 h-2.5" />
                                                {student.course && student.year
                                                    ? `${student.course} (${student.year})`
                                                    : student.course || student.year}
                                            </span>
                                        )}
                                        {student.emergencyContact ? (
                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                                                <Phone className="w-2.5 h-2.5" />
                                                {student.emergencyContact}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-red-500/10 text-red-400 flex items-center gap-1">
                                                <AlertCircle className="w-2.5 h-2.5" />
                                                No emergency contact
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}

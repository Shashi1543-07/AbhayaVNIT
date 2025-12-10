import { useState, useRef } from 'react';
import { Mic, Send, AlertTriangle, HeartPulse, ShieldAlert, MapPin, HelpCircle, Car, Edit3 } from 'lucide-react';
import { sosService } from '../../services/sosService';

interface SOSPostTriggerModalProps {
    sosId: string;
    onClose: () => void;
}

const EMERGENCY_TYPES = [
    { id: 'harassment', label: 'Harassment', icon: ShieldAlert, color: 'bg-red-100 text-red-700 border-red-200' },
    { id: 'medical', label: 'Medical', icon: HeartPulse, color: 'bg-rose-100 text-rose-700 border-rose-200' },
    { id: 'threat', label: 'Threat', icon: AlertTriangle, color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { id: 'unsafe_area', label: 'Unsafe Area', icon: MapPin, color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { id: 'lost', label: 'Lost', icon: HelpCircle, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'accident', label: 'Accident', icon: Car, color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { id: 'other', label: 'Other', icon: Edit3, color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

export default function SOSPostTriggerModal({ sosId, onClose }: SOSPostTriggerModalProps) {
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');

    const handleTypeSelect = (typeId: string) => {
        setSelectedType(typeId);
        // Auto-submit if just type is selected? No, let them add details.
    };

    const recognitionRef = useRef<any>(null);

    const handleMicToggle = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            // Store the initial description before this recording session
            const initialDescription = description;

            recognition.onresult = (event: any) => {
                let currentSessionTranscript = '';

                // Iterate through all results of this session
                for (let i = 0; i < event.results.length; ++i) {
                    currentSessionTranscript += event.results[i][0].transcript;
                }

                setVoiceTranscript(currentSessionTranscript);

                // Update description: Initial text + space + current session text
                const separator = initialDescription && !initialDescription.endsWith(' ') ? ' ' : '';
                setDescription(initialDescription + separator + currentSessionTranscript);
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                stopRecording();
            };

            recognition.onend = () => {
                setIsRecording(false);
            };

            recognition.start();
            recognitionRef.current = recognition;
            setIsRecording(true);
        } else {
            alert("Speech recognition not supported in this browser.");
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsRecording(false);
    };

    const handleSubmit = async () => {
        if (!selectedType && !description) return;

        setIsSubmitting(true);
        try {
            await sosService.updateSOSDetails(sosId, {
                emergencyType: selectedType || 'Unspecified',
                description: description,
                voiceTranscript: voiceTranscript
            });
            onClose();
        } catch (error) {
            console.error("Failed to update SOS details:", error);
            alert("Failed to send details. Security is still notified.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
                {/* Header */}
                <div className="bg-red-600 p-4 text-white text-center">
                    <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                        <AlertTriangle className="w-6 h-6" />
                        SOS SENT
                    </h2>
                    <p className="text-red-100 text-sm mt-1">Help is on the way. What is the emergency?</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Emergency Types Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        {EMERGENCY_TYPES.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => handleTypeSelect(type.id)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all
                                    ${selectedType === type.id
                                        ? 'border-red-600 bg-red-50 scale-105 shadow-md'
                                        : 'border-transparent bg-slate-50 hover:bg-slate-100 text-slate-600'}
                                `}
                            >
                                <type.icon className={`w-8 h-8 mb-2 ${selectedType === type.id ? 'text-red-600' : 'text-slate-400'}`} />
                                <span className={`text-xs font-bold ${selectedType === type.id ? 'text-red-700' : 'text-slate-500'}`}>
                                    {type.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Input Area */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700">Additional Details (Optional)</label>

                        <div className="relative">
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Type here or hold mic to speak..."
                                className="w-full p-4 pr-12 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 min-h-[100px] resize-none text-slate-800 placeholder:text-slate-400"
                            />

                            {/* Mic Button */}
                            <button
                                onClick={handleMicToggle}
                                className={`absolute bottom-3 right-3 p-2 rounded-full transition-all
                                    ${isRecording ? 'bg-red-600 text-white animate-pulse scale-110' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}
                                `}
                                title={isRecording ? "Stop Recording" : "Start Recording"}
                            >
                                <Mic className="w-5 h-5" />
                            </button>
                        </div>
                        {isRecording && <p className="text-xs text-red-600 font-medium animate-pulse text-center">Listening...</p>}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                            Skip
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || (!selectedType && !description)}
                            className={`flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg
                                ${(!selectedType && !description) ? 'bg-slate-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
                            `}
                        >
                            {isSubmitting ? 'Sending...' : (
                                <>
                                    Send Details <Send className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

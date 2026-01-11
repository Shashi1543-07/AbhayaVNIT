import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { mapService, type LocationData, type LocationStatus } from '../../services/mapService';
import { useEffect, useState } from 'react';


// Setup default icon
// Default Icon removed

// Custom Icons
const ActiveSOSIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #ef4444; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.4); animation: pulse 1.5s infinite;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const SafeWalkIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #10b981; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [15, 15],
    iconAnchor: [7.5, 7.5]
});

const StaleIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #94a3b8; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

interface MapMarkerProps {
    location: LocationData;
    type: 'SOS' | 'SAFEWALK';
    userName: string;
    description?: string;
    onClick?: () => void;
}

export default function MapMarker({ location, type, userName, description, onClick }: MapMarkerProps) {
    const [status, setStatus] = useState<LocationStatus>('active');

    useEffect(() => {
        // Initial check
        setStatus(mapService.calculateLocationStatus(location.lastUpdated));

        // Periodic check to update status even if location doesn't change
        const interval = setInterval(() => {
            setStatus(mapService.calculateLocationStatus(location.lastUpdated));
        }, 5000);

        return () => clearInterval(interval);
    }, [location.lastUpdated]);

    const getIcon = () => {
        if (status === 'stale' || status === 'offline') return StaleIcon;
        return type === 'SOS' ? ActiveSOSIcon : SafeWalkIcon;
    };

    return (
        <Marker
            position={[location.latitude, location.longitude]}
            icon={getIcon()}
            eventHandlers={onClick ? { click: onClick } : undefined}
        >
            <Popup className="rounded-xl overflow-hidden p-0">
                <div className="p-3 min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${type === 'SOS' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                            {type}
                        </span>
                        <span className={`text-[10px] font-bold ${status === 'active' ? 'text-green-500' : 'text-slate-400'
                            }`}>
                            {status === 'active' ? '● LIVE' : `${status.toUpperCase()}`}
                        </span>
                    </div>

                    <h3 className="font-bold text-slate-800 text-sm">{userName}</h3>
                    {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}

                    <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-400">
                        <span>Updated:</span>
                        <span>{new Date(location.lastUpdated).toLocaleTimeString()}</span>
                    </div>
                </div>
            </Popup>
        </Marker>
    );
}

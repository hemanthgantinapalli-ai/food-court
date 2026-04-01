import React, { useState } from 'react';
import { Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Navigation } from 'lucide-react';

const mapContainerStyle = {
    width: '100%',
    height: '100%'
};

const center = {
    lat: 16.2387636, // Default center (Tenali)
    lng: 80.6368367
};

const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
};

const FitBoundsOnRiders = ({ riders }) => {
    const map = useMap();

    React.useEffect(() => {
        if (!map || riders.length === 0) return;
        const bounds = new window.google.maps.LatLngBounds();
        riders.forEach(r => {
            if (r.location?.lat) bounds.extend({ lat: r.location.lat, lng: r.location.lng });
        });
        map.fitBounds(bounds);
    }, [map, riders]);

    return null;
};

export default function FleetMap({ riders, isGoogleReady }) {
    const [selectedRider, setSelectedRider] = useState(null);

    if (!isGoogleReady) {
        return (
            <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center rounded-[3rem]">
                <div className="text-center">
                    <Navigation className="mx-auto text-slate-300 mb-4 animate-spin" size={48} />
                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Initialising Fleet View...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={mapContainerStyle}>
            <Map
                defaultZoom={12}
                defaultCenter={center}
                options={mapOptions}
                mapId="DEMO_MAP_ID"
                gestureHandling={'greedy'}
            >
                <FitBoundsOnRiders riders={riders} />

                {riders.map((rider) => (
                    rider.location?.lat && (
                        <AdvancedMarker
                            key={rider._id || rider.userId}
                            position={{ lat: rider.location.lat, lng: rider.location.lng }}
                            onClick={() => setSelectedRider(rider)}
                        >
                            <div style={{ transform: `rotate(${rider.heading || 0}deg)`, transition: 'transform 0.4s ease-out' }}>
                                <img
                                    src="https://cdn-icons-png.flaticon.com/512/3063/3063822.png"
                                    alt="Rider"
                                    style={{ width: '40px', height: '40px' }}
                                />
                            </div>
                        </AdvancedMarker>
                    )
                ))}

                {selectedRider && (
                    <InfoWindow
                        position={{ lat: selectedRider.location.lat, lng: selectedRider.location.lng }}
                        onCloseClick={() => setSelectedRider(null)}
                    >
                        <div className="p-2 min-w-[200px]">
                            <div className="flex items-center gap-3 mb-2 pb-2 border-b border-slate-100">
                                <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white text-xl">
                                    🚴
                                </div>
                                <div>
                                    <p className="font-black text-slate-900">{selectedRider.name}</p>
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${selectedRider.speed > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {selectedRider.speed > 0 ? 'In Motion' : 'Stationary'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="font-bold text-slate-400 uppercase">Speed</span>
                                    <span className="font-black text-slate-900">{Math.round(selectedRider.speed || 0)} KM/H</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="font-bold text-slate-400 uppercase">Status</span>
                                    <span className="font-black text-emerald-600">ONLINE</span>
                                </div>
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </Map>
        </div>
    );
}

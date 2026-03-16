import { useEffect, useState } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

/**
 * Directions Component
 * 
 * A native wrapper for google.maps.DirectionsRenderer to be used within
 * @vis.gl/react-google-maps <Map> components.
 */
export default function Directions({ directions, polylineOptions }) {
    const map = useMap();
    const [renderer, setRenderer] = useState(null);

    useEffect(() => {
        if (!map) return;
        
        const dr = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: polylineOptions || {
                strokeColor: '#f97316',
                strokeWeight: 5,
                strokeOpacity: 0.7,
            },
        });
        
        dr.setMap(map);
        setRenderer(dr);

        return () => {
            dr.setMap(null);
        };
    }, [map, polylineOptions]);

    useEffect(() => {
        if (!renderer || !directions) return;
        renderer.setDirections(directions);
    }, [renderer, directions]);

    return null;
}

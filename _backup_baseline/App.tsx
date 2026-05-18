import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Info, Car, BatteryCharging, AlertTriangle, MessageSquare, Search } from 'lucide-react';
import unfulfilledData from './data/unfulfilled_data.json';

// Types
interface Facility {
  id: number;
  name: string;
  address: string;
  remarks: string;
  parking_unfulfilled: boolean;
  charger_unfulfilled: boolean;
  lat: number | null;
  lng: number | null;
}

// Initial Data parsing
const initialData = unfulfilledData as Facility[];
const GWANGSAN_OFFICE_CENTER: [number, number] = [35.139647, 126.793644]; // 광산구청 좌표
const firstValid = initialData.find(f => f.lat && f.lng) || null;

// Custom Icons
const createCustomIcon = (isParking: boolean, isCharger: boolean) => {
  let color = '#ef4444'; // default red
  if (isParking && !isCharger) color = '#f97316'; // orange for parking only
  if (!isParking && isCharger) color = '#eab308'; // yellow for charger only
  if (isParking && isCharger) color = '#dc2626'; // dark red for both

  const svgPin = `
    <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.4));">
      <path d="M20 0C8.95431 0 0 8.95431 0 20C0 31.0457 20 50 20 50C20 50 40 31.0457 40 20C40 8.95431 31.0457 0 20 0Z" fill="${color}" fill-opacity="1"/>
      <circle cx="20" cy="20" r="8" fill="white" fill-opacity="1"/>
    </svg>
  `;

  return L.divIcon({
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; width: 40px;">
        <div style="width: 40px; height: 50px;">
          ${svgPin}
        </div>
      </div>
    `,
    className: 'custom-survey-marker',
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -45],
  });
};

function MapController({ facility, markerRefs }: { facility: Facility | null, markerRefs: React.MutableRefObject<{ [key: number]: L.Marker }> }) {
  const map = useMap();
  
  // Fix for gray map issue
  useEffect(() => {
    // A simple timeout to invalidate size after layout is complete
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  // Center map and open popup when facility changes
  useEffect(() => {
    if (facility && facility.lat && facility.lng) {
      map.flyTo([facility.lat, facility.lng], 16, { animate: true, duration: 0.5 });
      const timer = setTimeout(() => {
        const marker = markerRefs.current[facility.id];
        if (marker) {
          marker.openPopup();
        }
      }, 600); // Open popup after flyTo finishes
      return () => clearTimeout(timer);
    }
  }, [facility, map, markerRefs]);

  return null;
}

function App() {
  const [facilities] = useState<Facility[]>(initialData);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const markerRefs = useRef<{ [key: number]: L.Marker }>({});

  const initialCenter = GWANGSAN_OFFICE_CENTER;

  const handleFacilityClick = (facility: Facility) => {
    setSelectedFacility(facility);
  };

  const filteredFacilities = facilities.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen w-full font-sans bg-gray-50 text-gray-900 overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm z-10 px-5 py-4 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-lg shadow-md shadow-red-200">
            <AlertTriangle className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900 leading-tight">미이행 시설 현장조사</h1>
            <p className="text-xs text-gray-500 font-medium">총 {facilities.length}개 지점 확인 필요</p>
          </div>
        </div>
      </header>

      {/* Main Content Area: Map (Top) and List (Bottom) */}
      <div className="flex-1 flex flex-col md:flex-row relative min-h-0 overflow-hidden">
        
        {/* Map Area */}
        <main className="flex-1 relative z-0 min-h-0">
          <div className="absolute inset-0">
            <MapContainer center={initialCenter} zoom={13} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
              <MapController facility={selectedFacility} markerRefs={markerRefs} />
            
            <TileLayer
              attribution='&copy; <a href="https://vworld.kr/">VWorld</a>'
              url="https://xdworld.vworld.kr/2d/Base/service/{z}/{x}/{y}.png"
            />
            
            {filteredFacilities.map(facility => {
              if (!facility.lat || !facility.lng) return null;
              
              return (
                <Marker 
                  key={facility.id} 
                  position={[Number(facility.lat), Number(facility.lng)]} 
                  icon={createCustomIcon(facility.parking_unfulfilled, facility.charger_unfulfilled)}
                  ref={(ref) => {
                    if (ref) markerRefs.current[facility.id] = ref;
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedFacility(facility);
                    }
                  }}
                >
                  <Popup className="custom-popup" autoPan={true}>
                    <div className="p-3 min-w-[240px]">
                      <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-2">
                        <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-1 rounded-md">ID: {facility.id}</span>
                        <span className="text-[10px] font-black px-2 py-1 rounded-md bg-red-50 text-red-600 border border-red-100">
                          미이행 현장
                        </span>
                      </div>
                      <h3 className="font-bold text-base mb-1 text-gray-900 leading-snug">{facility.name}</h3>
                      <p className="text-xs text-gray-500 mb-4">{facility.address}</p>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                           <div className={`p-1.5 rounded-full ${facility.parking_unfulfilled ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                              <Car size={14} />
                           </div>
                           <span className={`text-xs font-bold ${facility.parking_unfulfilled ? 'text-orange-700' : 'text-gray-400'}`}>
                              주차면수: {facility.parking_unfulfilled ? '미이행' : '이행'}
                           </span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className={`p-1.5 rounded-full ${facility.charger_unfulfilled ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                              <BatteryCharging size={14} />
                           </div>
                           <span className={`text-xs font-bold ${facility.charger_unfulfilled ? 'text-yellow-700' : 'text-gray-400'}`}>
                              충전시설: {facility.charger_unfulfilled ? '미이행' : '이행'}
                           </span>
                        </div>
                      </div>
                      
                      {facility.remarks && (
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <div className="flex items-start gap-2 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100/50">
                            <MessageSquare size={14} className="text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-gray-700 font-medium leading-relaxed">{facility.remarks}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            </MapContainer>
          </div>
        </main>

        {/* List Area */}
        <aside className="flex-1 h-2/5 md:h-full md:w-96 md:max-w-md bg-white border-t md:border-t-0 md:border-l border-gray-200 flex flex-col z-10 shadow-2xl md:shadow-none overflow-hidden">
          <div className="p-4 bg-white border-b border-gray-100 shrink-0 flex flex-col gap-3">
             <h2 className="text-sm font-black text-gray-800 flex items-center gap-2">
               <Info size={16} className="text-blue-500" />
               목록 및 비고 확인
             </h2>
             <div className="relative">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="시설명 또는 주소 검색" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-all"
               />
             </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50">
            {filteredFacilities.map(facility => {
              const isSelected = selectedFacility?.id === facility.id;
              
              return (
                <button
                  key={facility.id}
                  onClick={() => handleFacilityClick(facility)}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 border ${
                    isSelected 
                      ? 'bg-white border-red-300 shadow-md ring-2 ring-red-100 scale-[1.02]' 
                      : 'bg-white border-gray-200 shadow-sm hover:border-red-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-bold text-sm ${isSelected ? 'text-red-600' : 'text-gray-900'}`}>
                      {facility.name}
                    </h3>
                    <span className="text-[10px] text-gray-400 font-medium">#{facility.id}</span>
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-3 truncate">{facility.address}</p>
                  
                  <div className="flex gap-2 mb-3">
                    {facility.parking_unfulfilled && (
                      <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded text-[10px] font-bold">
                        <Car size={10} /> 주차면수 미이행
                      </span>
                    )}
                    {facility.charger_unfulfilled && (
                      <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded text-[10px] font-bold">
                        <BatteryCharging size={10} /> 충전시설 미이행
                      </span>
                    )}
                  </div>

                  {facility.remarks && isSelected && (
                    <div className="mt-3 pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="bg-blue-50 text-blue-900 text-xs p-3 rounded-lg border border-blue-100 flex gap-2 items-start">
                        <MessageSquare size={14} className="shrink-0 mt-0.5 text-blue-500" />
                        <span className="leading-relaxed font-medium">{facility.remarks}</span>
                      </div>
                    </div>
                  )}
                  {facility.remarks && !isSelected && (
                     <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1.5 font-medium">
                        <MessageSquare size={12} /> 비고 있음 (클릭하여 확인)
                     </div>
                  )}
                </button>
              );
            })}
            
            {filteredFacilities.length === 0 && (
               <div className="text-center py-10 text-gray-400 text-sm font-medium">
                  데이터가 없습니다.
               </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;

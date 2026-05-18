const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
const CACHE_FILE = 'coordinates_cache.json';

// Startup Environment Check
console.log('--- 시스템 시작 환경 체크 ---');
console.log('PORT:', PORT);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '설정됨' : '미설정 (확인 필요)');
console.log('KAKAO_REST_API_KEY:', process.env.KAKAO_REST_API_KEY ? '설정됨' : '미설정 (확인 필요)');
console.log('VWORLD_API_KEY:', process.env.VWORLD_API_KEY ? '설정됨' : '미설정 (확인 필요)');
console.log('---------------------------');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_KEY || 'placeholder'
);

// Health check endpoint for Render
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        env: {
            hasSupabase: !!process.env.SUPABASE_URL,
            hasKakao: !!process.env.KAKAO_REST_API_KEY,
            hasVworld: !!process.env.VWORLD_API_KEY
        }
    });
});

// Load or initialize coordinate cache
let coordCache = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        coordCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } catch (e) {
        console.error("Error loading cache:", e);
    }
}

function saveCache() {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(coordCache, null, 2), 'utf-8');
}

async function getCoordinates(address) {
    if (!address) return null;
    if (coordCache[address]) return coordCache[address];

    try {
        const response = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
            params: { query: address },
            headers: { Authorization: `KakaoAK ${KAKAO_KEY}` }
        });

        if (response.data.documents && response.data.documents.length > 0) {
            const { x, y } = response.data.documents[0];
            const coords = { lat: parseFloat(y), lng: parseFloat(x) };
            coordCache[address] = coords;
            saveCache();
            return coords;
        }
    } catch (e) {
        console.error(`Error geocoding ${address}:`, e.message);
    }
    return null;
}

app.get('/api/config', (req, res) => {
    res.json({
        vworldKey: process.env.VWORLD_API_KEY
    });
});

app.get('/api/surveys', async (req, res) => {
    try {
        let { data, error } = await supabase
            .from('surveys')
            .select('*')
            .order('연번', { ascending: true });

        // If Supabase is empty or has an error, fallback to local JSON
        if (error || !data || data.length === 0) {
            console.log("Supabase empty or error, falling back to local survey_data.json");
            if (fs.existsSync('survey_data.json')) {
                const localData = JSON.parse(fs.readFileSync('survey_data.json', 'utf-8'));
                data = localData.data || localData;
            } else {
                data = [];
            }
        }

        if (data && data.length > 0) {
            console.log(`Processing ${data.length} surveys...`);
        }

        const surveysWithCoords = await Promise.all(data.map(async (row) => {
            const getVal = (prefixes) => {
                for (const p of prefixes) {
                    const key = Object.keys(row).find(k => k.toLowerCase().includes(p.toLowerCase()));
                    if (key) return row[key];
                }
                return null;
            };

            const address = row['지번주소'] || row['도로명주소'] || getVal(['주소', 'address']);
            const coords = await getCoordinates(address);
            
            return {
                id: row['연번'] || row['id'] || row['ID'] || 0,
                status: row['실태조사 완료여부'] || row['완료여부'] || getVal(['완료', 'status']) || '대기',
                name: row['시설명'] || row['명칭'] || getVal(['시설', 'name']) || '알 수 없음',
                address: address || '주소 없음',
                surveyor: row['조사자'] || row['조사자5'] || getVal(['조사', 'surveyor']) || '미지정',
                lat: coords ? coords.lat : null,
                lng: coords ? coords.lng : null
            };
        }));

        const validCoordsCount = surveysWithCoords.filter(s => s.lat).length;
        console.log(`Loaded ${surveysWithCoords.length} surveys. Valid coords: ${validCoordsCount}`);
        
        res.json(surveysWithCoords);
    } catch (e) {
        console.error("Fetch error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/surveys/:id/complete', async (req, res) => {
    const id = parseInt(req.params.id);
    const today = new Date().toISOString().split('T')[0];
    
    try {
        // Update status in Supabase table
        const { data, error } = await supabase
            .from('surveys')
            .update({ 
                '실태조사 완료여부': '완료',
                '조사일자': today 
            })
            .eq('연번', id); // Assumes '연번' is the unique identifier

        if (error) throw error;

        console.log(`Successfully updated ID ${id} in database.`);
        res.json({ success: true, id, status: '완료' });
    } catch (e) {
        console.error("Update error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// Serve frontend build in production
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(distPath, 'index.html'));
        }
    });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} with Supabase integration.`);
});

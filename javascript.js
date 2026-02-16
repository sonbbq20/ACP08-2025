// Global State: ราคาน้ำมัน (อัพเดทจาก API)
let oilPrices = {
    gasohol95: 36.50, gasohol91: 36.10, e20: 34.40, e85: 32.00,
    diesel: 30.50, diesel_premium: 43.50, electricity: 4.50
};

document.addEventListener('DOMContentLoaded', () => {
    fetchOilPrices(); // ดึงราคาน้ำมันและวันที่
    
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchCar();
        });
        searchBtn.addEventListener('click', searchCar);
    }
});

// ==========================================
// 1. ระบบค้นหารถ (เชื่อมต่อ Python Flask)
// ==========================================
async function searchCar() {
    const input = document.getElementById('searchInput').value.trim();
    const resultDiv = document.getElementById('result');

    if (!input) { alert("กรุณาพิมพ์ชื่อรถ"); return; }

    resultDiv.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #4a9eff;">🔄 กำลังค้นหาข้อมูลจาก Python Server...</div>';

    try {
        // --- จุดที่แก้ไข: เปลี่ยน URL ไปหา Python ---
        const response = await fetch(`http://127.0.0.1:5000/api/search?search=${encodeURIComponent(input)}`);
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const cars = await response.json();

        if (cars.length > 0) {
            displayResults(cars);
        } else {
            resultDiv.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <h2 style="color: #ff6b6b;">❌ ไม่พบข้อมูลในระบบ</h2>
                    <p style="color: #94a3b8;">ลองค้นหา: Tesla, Toyota, Honda, BYD</p>
                </div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        resultDiv.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ff6b6b;">⚠️ เชื่อมต่อ Python Server ไม่สำเร็จ<br><small>อย่าลืมรันคำสั่ง 'python app.py' ใน Terminal</small></div>`;
    }
}

function displayResults(cars) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    cars.forEach(car => {
        let fuelPrice = oilPrices.gasohol95;
        let fuelName = 'เบนซิน';
        let unit = 'ลิตร';
        
        if (car.fuel === 'ev') {
            fuelPrice = oilPrices.electricity;
            fuelName = 'ไฟฟ้า (EV)';
            unit = 'kWh';
        } else if (car.fuel === 'diesel') {
            fuelPrice = oilPrices.diesel;
            fuelName = 'ดีเซล';
        } else if (car.fuel === 'hybrid') {
            fuelName = 'ไฮบริด';
            fuelPrice = oilPrices.gasohol95;
        } else if (car.fuel === 'gas91') {
            fuelName = 'แก๊สโซฮอล์ 91';
            fuelPrice = oilPrices.gasohol91;
        }

        const costPerKm = (fuelPrice / car.efficiency).toFixed(2);
        const maxRange = (car.tank_size * car.efficiency).toFixed(0);
        const priceStr = car.price.toLocaleString();
        
        const imgUrl = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(car.make + ' ' + car.model + ' 2024 side view')}&w=500&h=300&c=7&rs=1&p=0`;

        const card = document.createElement('div');
        card.className = 'car-card';
        card.innerHTML = `
            <div class="car-img-wrapper">
                <img src="${imgUrl}" onerror="this.src='https://placehold.co/600x400?text=${car.make}'">
                <div style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.8);color:#fff;padding:4px 8px;border-radius:4px;font-size:0.8rem;">
                    ฿${priceStr}
                </div>
            </div>
            <div class="car-content">
                <div class="car-title">
                    <h3>${car.make} ${car.model}</h3>
                    <span class="car-year" style="font-size:0.8rem;color:#4a9eff;">${car.type}</span>
                </div>
                <div class="fuel-cost-box">
                    <span class="cost-label">ต้นทุนเชื้อเพลิง</span>
                    <span class="cost-value">${costPerKm}</span> <span class="cost-unit">บาท/กม.</span>
                </div>
                <div class="specs-grid" style="grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem;">
                    <div>⛽ ${fuelName}</div>
                    <div>⚡ ${car.efficiency} กม./${unit}</div>
                    <div>🐎 ${car.hp} แรงม้า</div>
                    <div>🚀 0-100: ${car.acc_0_100} วิ</div>
                    <div style="grid-column:1/-1; border-top:1px solid rgba(255,255,255,0.1); padding-top:5px; margin-top:5px; color:#00d2d3;">
                        วิ่งไกลสุด: ~${maxRange} กม./ถัง(ชาร์จ)
                    </div>
                </div>
            </div>
        `;
        resultDiv.appendChild(card);
    });
}

// ==========================================
// 2. ระบบราคาน้ำมัน & วันที่ (Oil API) - มี Fallback
// ==========================================
async function fetchOilPrices() {
    const dateEl = document.getElementById('oilUpdateDate');
    
    // หลาย API sources สำหรับ fallback
    const apiSources = [
        // Source 1: API เดิมผ่าน AllOrigins proxy
        async () => {
            const proxy = 'https://api.allorigins.win/raw?url=';
            const url = 'https://api.chnwt.dev/thai-oil-api/latest';
            const res = await fetch(proxy + encodeURIComponent(url));
            if (!res.ok) throw new Error('HTTP error ' + res.status);
            return await res.json();
        },
        // Source 2: เรียกตรงโดยไม่ผ่าน proxy
        async () => {
            const res = await fetch('https://api.chnwt.dev/thai-oil-api/latest');
            if (!res.ok) throw new Error('HTTP error ' + res.status);
            return await res.json();
        },
        // Source 3: ใช้ proxy อื่น (corsproxy.io)
        async () => {
            const proxy = 'https://corsproxy.io/?';
            const url = 'https://api.chnwt.dev/thai-oil-api/latest';
            const res = await fetch(proxy + encodeURIComponent(url));
            if (!res.ok) throw new Error('HTTP error ' + res.status);
            return await res.json();
        }
    ];

    // ลองแต่ละ source จนกว่าจะสำเร็จ
    for (let i = 0; i < apiSources.length; i++) {
        try {
            console.log(`🔄 กำลังลอง API source ${i + 1}/${apiSources.length}...`);
            const data = await Promise.race([
                apiSources[i](),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
            ]);
            
            if (data?.response?.stations?.ptt) {
                const ptt = data.response.stations.ptt;
                const p = (v) => v ? parseFloat(v.price || v) : 0;
                
                // อัพเดทราคา
                let updated = false;
                if (ptt.gasohol_95) { oilPrices.gasohol95 = p(ptt.gasohol_95); updated = true; }
                if (ptt.gasohol_91) { oilPrices.gasohol91 = p(ptt.gasohol_91); updated = true; }
                if (ptt.gasohol_e20) { oilPrices.e20 = p(ptt.gasohol_e20); updated = true; }
                if (ptt.gasohol_e85) { oilPrices.e85 = p(ptt.gasohol_e85); updated = true; }
                if (ptt.diesel_b7) { oilPrices.diesel = p(ptt.diesel_b7); updated = true; }
                
                if (updated) {
                    console.log(`✅ ดึงราคาน้ำมันสำเร็จจาก source ${i + 1}`);
                    
                    // อัพเดทหน้าราคาน้ำมัน
                    const oilGrid = document.getElementById('oil-grid');
                    if (oilGrid) renderOilPage();
                    
                    // อัพเดทวันที่
                    if (dateEl) {
                        let dateStr = data.response.date;
                        if (!dateStr) {
                            dateStr = new Date().toLocaleDateString('th-TH', {
                                year: 'numeric', month: 'long', day: 'numeric'
                            });
                        }
                        dateEl.innerHTML = `อัพเดทล่าสุด: <span style="color:#4ade80">${dateStr}</span>`;
                    }
                    return; // สำเร็จแล้ว ออกจากฟังก์ชัน
                }
            }
        } catch (e) {
            console.warn(`❌ API source ${i + 1} ล้มเหลว:`, e.message);
            // ลอง source ถัดไป
        }
    }
    
    // ถ้าทุก source ล้มเหลว - ใช้ราคาสำรอง (อัพเดทล่าสุด 16 ก.พ. 2026)
    console.error("⚠️ ทุก API หยุดทำงาน - ใช้ราคาสำรอง");
    
    oilPrices = {
        gasohol95: 37.24, gasohol91: 36.89, e20: 35.15, e85: 32.74,
        diesel: 30.94, diesel_premium: 44.20, electricity: 4.50
    };
    
    const oilGrid = document.getElementById('oil-grid');
    if (oilGrid) renderOilPage();
    
    if (dateEl) {
        const today = new Date().toLocaleDateString('th-TH', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        dateEl.innerHTML = `อัพเดทล่าสุด: ${today} <span style="color:#fbbf24;">⚠️ (ราคาอ้างอิง - API ขัดข้อง)</span>`;
    }
}

function renderOilPage() {
    const grid = document.getElementById('oil-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const oils = [
        { n: 'แก๊สโซฮอล์ 95', p: oilPrices.gasohol95, c: '#f59e0b' },
        { n: 'แก๊สโซฮอล์ 91', p: oilPrices.gasohol91, c: '#10b981' },
        { n: 'แก๊สโซฮอล์ E20', p: oilPrices.e20, c: '#0ea5e9' },
        { n: 'แก๊สโซฮอล์ E85', p: oilPrices.e85, c: '#8b5cf6' },
        { n: 'ดีเซล B7', p: oilPrices.diesel, c: '#6366f1' },
        { n: 'ไฟฟ้า (EV เฉลี่ย)', p: oilPrices.electricity, c: '#00d2d3', u: 'บาท/หน่วย' }
    ];

    oils.forEach(o => {
        grid.innerHTML += `
            <div class="oil-card" style="--color-bar: ${o.c}">
                <div class="oil-name">${o.n}</div>
                <div class="oil-price">${o.p.toFixed(2)}</div>
                <div class="oil-unit">${o.u || 'บาท/ลิตร'}</div>
            </div>`;
    });
}

function quickSearch(term) {
    document.getElementById('searchInput').value = term;
    searchCar();
}
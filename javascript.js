// Global State: ราคาน้ำมัน
let oilPrices = {
    gasohol95: 36.50, gasohol91: 36.10, e20: 34.40, e85: 32.00,
    diesel: 30.50, diesel_premium: 43.50, electricity: 4.50
};

document.addEventListener('DOMContentLoaded', () => {
    fetchOilPrices();
    
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchCar();
        });
        searchBtn.addEventListener('click', searchCar);
    }
});

function quickSearch(term) {
    const input = document.getElementById('searchInput');
    if(input) { input.value = term; searchCar(); }
}

// ==========================================
// 1. ระบบค้นหารถ (เชื่อมต่อ Python Database)
// ==========================================
async function searchCar() {
    const input = document.getElementById('searchInput').value.trim();
    const resultDiv = document.getElementById('result');

    if (!input) { alert("กรุณาพิมพ์ชื่อรถ"); return; }

    resultDiv.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #4a9eff;">🔄 กำลังค้นหาข้อมูลจากฐานข้อมูล...</div>';

    try {
        // วิ่งไปดึงข้อมูลจาก Python Server
        const response = await fetch(`http://127.0.0.1:5000/api/search?search=${encodeURIComponent(input)}`);
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const cars = await response.json();

        if (cars.length > 0) {
            displayResults(cars);
        } else {
            resultDiv.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <h2 style="color: #ff6b6b;">❌ ไม่พบรถรุ่นนี้ในระบบ</h2>
                    <p style="color: #94a3b8;">ลองค้นหา: Tesla, Toyota, Honda, BYD</p>
                </div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        resultDiv.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ff6b6b;">⚠️ ไม่สามารถเชื่อมต่อฐานข้อมูลได้<br><small>กรุณาตรวจสอบว่ารัน 'python app.py' แล้วหรือยัง</small></div>`;
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
        } else if (car.fuel === 'gas95') {
            fuelName = 'แก๊สโซฮอล์ 95';
            fuelPrice = oilPrices.gasohol95;
        }

        const costPerKm = (fuelPrice / car.efficiency).toFixed(2);
        const maxRange = (car.tank_size * car.efficiency).toFixed(0);
        const priceStr = car.price.toLocaleString();
        
        const imgQuery = `${car.brand} ${car.model} 2024 side view`;
        const imgUrl = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(imgQuery)}&w=500&h=300&c=7&rs=1&p=0`;

        const card = document.createElement('div');
        card.className = 'car-card';
        card.innerHTML = `
            <div class="car-img-wrapper">
                <img src="${imgUrl}" onerror="this.src='https://placehold.co/600x400?text=${car.brand}'">
                <div style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.8);color:#fff;padding:4px 8px;border-radius:4px;font-size:0.8rem;">
                    ฿${priceStr}
                </div>
            </div>
            <div class="car-content">
                <div class="car-title">
                    <h3>${car.brand} ${car.model}</h3>
                    <span class="car-year" style="font-size:0.8rem;color:#4a9eff;">${car.type || 'N/A'}</span>
                </div>
                <div class="fuel-cost-box">
                    <span class="cost-label">ต้นทุนเชื้อเพลิงเฉลี่ย</span>
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
// 2. ระบบราคาน้ำมัน (Oil API)
// ==========================================
async function fetchOilPrices() {
    try {
        const proxy = 'https://api.allorigins.win/raw?url=';
        const url = 'https://api.chnwt.dev/thai-oil-api/latest';
        const res = await fetch(proxy + encodeURIComponent(url));
        const data = await res.json();
        
        if (data?.response?.stations?.ptt) {
            const ptt = data.response.stations.ptt;
            const p = (v) => v ? parseFloat(v.price || v) : 0;
            
            if (ptt.gasohol_95) oilPrices.gasohol95 = p(ptt.gasohol_95);
            if (ptt.gasohol_91) oilPrices.gasohol91 = p(ptt.gasohol_91);
            if (ptt.gasohol_e20) oilPrices.e20 = p(ptt.gasohol_e20);
            if (ptt.diesel_b7) oilPrices.diesel = p(ptt.diesel_b7);
            
            const oilGrid = document.getElementById('oil-grid');
            if (oilGrid) {
                renderOilPage();
                const dateEl = document.getElementById('oilUpdateDate');
                if (dateEl) {
                    let dateStr = data.response.date || new Date().toLocaleDateString('th-TH');
                    dateEl.innerHTML = `อัพเดทล่าสุด: <span style="color:#4ade80">${dateStr}</span> (อ้างอิง PTT)`;
                }
            }
        }
    } catch (e) { console.warn("Oil API Error", e); }
}

function renderOilPage() {
    const grid = document.getElementById('oil-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const oils = [
        { n: 'แก๊สโซฮอล์ 95', p: oilPrices.gasohol95, c: '#f59e0b' },
        { n: 'แก๊สโซฮอล์ 91', p: oilPrices.gasohol91, c: '#10b981' },
        { n: 'แก๊สโซฮอล์ E20', p: oilPrices.e20, c: '#0ea5e9' },
        { n: 'ดีเซล B7', p: oilPrices.diesel, c: '#6366f1' },
        { n: 'ไฟฟ้า (EV)', p: oilPrices.electricity, c: '#00d2d3', u: 'บาท/หน่วย' }
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
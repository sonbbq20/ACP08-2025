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
// 1. ระบบค้นหารถ (เชื่อมต่อ PHP MySQL)
// ==========================================
async function searchCar() {
    const input = document.getElementById('searchInput').value.trim();
    const resultDiv = document.getElementById('result');

    if (!input) { alert("กรุณาพิมพ์ชื่อรถ"); return; }

    resultDiv.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #4a9eff;">🔄 กำลังค้นหาข้อมูลจากฐานข้อมูล...</div>';

    try {
        // เรียกไฟล์ PHP (ต้องรันผ่าน Localhost)
        const response = await fetch(`api.php?search=${encodeURIComponent(input)}`);
        
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
        resultDiv.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ff6b6b;">⚠️ เชื่อมต่อ Database ไม่สำเร็จ<br><small>กรุณาตรวจสอบว่าเปิด XAMPP (Apache/MySQL) แล้วหรือยัง</small></div>`;
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
// 2. ระบบราคาน้ำมัน & วันที่ (Oil API)
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
            if (ptt.gassohol_e85) oilPrices.e85 = p(ptt.gassohol_e85);
            if (ptt.diesel_b7) oilPrices.diesel = p(ptt.diesel_b7);
            
            // ตรวจสอบว่าอยู่หน้า Oil หรือไม่
            const oilGrid = document.getElementById('oil-grid');
            if (oilGrid) {
                renderOilPage();
                
                // --- ส่วนอัพเดทวันที่ ---
                const dateEl = document.getElementById('oilUpdateDate');
                if (dateEl) {
                    // ใช้วันที่จาก API ถ้ามี หรือใช้วันที่ปัจจุบัน
                    let dateStr = data.response.date; 
                    
                    if (!dateStr) {
                        // ถ้า API ไม่ส่งวันที่มา ให้ใช้วันที่ปัจจุบันแบบไทย
                        const today = new Date();
                        dateStr = today.toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        });
                    }
                    
                    dateEl.innerHTML = `อัพเดทล่าสุด: <span style="color:#4ade80">${dateStr}</span>`;
                }
            }
        }
    } catch (e) { 
        console.warn("Oil API Error", e);
        // กรณี Error ให้แสดงวันที่ปัจจุบันแต่แจ้งว่าระบบขัดข้อง
        const dateEl = document.getElementById('oilUpdateDate');
        if (dateEl) {
            const today = new Date().toLocaleDateString('th-TH');
            dateEl.innerHTML = `อัพเดทล่าสุด: ${today} <span style="color:#ff6b6b">(ราคาอ้างอิง - ระบบขัดข้อง)</span>`;
        }
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
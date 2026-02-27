// ==========================================
// 1. ตั้งค่าราคากลาง 
// ==========================================
let oilPrices = {
  gasohol95: 30.85,
  gasohol91: 30.48,
  e20: 29.14,
  e85: 27.5,
  diesel: 29.94,
  premium_diesel: 41.5,
  electricity: 4.5,
};

document.addEventListener("DOMContentLoaded", () => {
  // 1. เทคนิคสำคัญ: สั่งโชว์ข้อมูลทันที! ไม่ต้องรอ API
  renderOilPage();

  // 2. แล้วค่อยแอบไปดึงข้อมูลจริงมาอัพเดททีหลัง (Background Update)
  fetchOilPrices();

  // ตั้งค่าปุ่มค้นหา
  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) {
    document.getElementById("searchInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") searchCar();
    });
    searchBtn.addEventListener("click", searchCar);
  }
});

function quickSearch(term) {
  const input = document.getElementById("searchInput");
  if (input) {
    input.value = term;
    searchCar();
  }
}

// ==========================================
// 2. ระบบค้นหารถ (เชื่อมต่อ Python)
// ==========================================
async function searchCar() {
  const input = document.getElementById("searchInput").value.trim();
  const resultDiv = document.getElementById("result");

  if (!input) {
    alert("กรุณาพิมพ์ชื่อรถ");
    return;
  }

  resultDiv.innerHTML =
    '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #4a9eff;">🔄 กำลังค้นหาข้อมูล...</div>';

  try {
    // เชื่อมต่อ Python Server
    const response = await fetch(
      `http://127.0.0.1:5000/api/search?search=${encodeURIComponent(input)}`,
    );

    if (!response.ok) throw new Error("Network response was not ok");

    const cars = await response.json();

    if (cars.length > 0) {
      displayResults(cars);
    } else {
      resultDiv.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <h2 style="color: #ff6b6b;">❌ ไม่พบรถรุ่นนี้</h2>
                    <p style="color: #94a3b8;">ลองค้นหา: Tesla, Toyota, Honda</p>
                </div>`;
    }
  } catch (error) {
    console.error("Error:", error);
    resultDiv.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ff6b6b;">⚠️ เชื่อมต่อฐานข้อมูลไม่ได้<br><small>อย่าลืมรัน 'python app.py'</small></div>`;
  }
}

function displayResults(cars) {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "";

  cars.forEach((car) => {
    let fuelPrice = oilPrices.gasohol95;
    let fuelName = "เบนซิน";
    let unit = "ลิตร";

    if (car.fuel === "ev") {
      fuelPrice = oilPrices.electricity;
      fuelName = "ไฟฟ้า (EV)";
      unit = "kWh";
    } else if (car.fuel === "diesel") {
      fuelPrice = oilPrices.diesel;
      fuelName = "ดีเซล";
    } else if (car.fuel === "hybrid") {
      fuelName = "ไฮบริด";
      fuelPrice = oilPrices.gasohol95;
    } else if (car.fuel === "gas91") {
      fuelName = "แก๊สโซฮอล์ 91";
      fuelPrice = oilPrices.gasohol91;
    }

    // คำนวณความคุ้มค่า
    const costPerKm = (fuelPrice / car.efficiency).toFixed(2);
    const maxRange = (car.tank_size * car.efficiency).toFixed(0);
    const priceStr = car.price.toLocaleString();

    // Logic เลือกรูปภาพ
    let imgUrl = "";
    if (car.image_url && car.image_url.trim() !== "") {
      imgUrl = car.image_url;
    } else {
      const imgQuery = `${car.brand} ${car.model} 2024 side view`;
      imgUrl = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(imgQuery)}&w=500&h=300&c=7&rs=1&p=0`;
    }

    const card = document.createElement("div");
    card.className = "car-card";
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
                    <span class="car-year" style="font-size:0.8rem;color:#4a9eff;">${car.type || "N/A"}</span>
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
                </div>
            </div>
        `;
    resultDiv.appendChild(card);
  });
}

// ==========================================
// 3. ระบบดึงราคาน้ำมัน 
// ==========================================
async function fetchOilPrices() {
  const dateEl = document.getElementById("oilUpdateDate");

  // โชว์ว่ากำลังเช็คข้อมูล แต่ตัวเลขราคาขึ้นโชว์ไปแล้ว
  if (dateEl)
    dateEl.innerHTML = `สถานะ: <span style="color:#facc15">กำลังเช็คราคาล่าสุด...</span>`;

  const url = "https://api.chnwt.dev/thai-oil-api/latest";

  const proxies = [
    (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    (u) => `https://proxy.cors.sh/${u}`,
  ];

  // แปลง response จาก allorigins ที่ wrap ใน { contents: "..." }
  const parseResponse = async (res, isAllOrigins) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (isAllOrigins) {
      const wrapper = await res.json();
      return JSON.parse(wrapper.contents);
    }
    return await res.json();
  };

  // ลองทีละ proxy จนกว่าจะสำเร็จ
  const tryFetch = async (buildUrl, isAllOrigins = false) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(buildUrl(url), { signal: controller.signal });
      clearTimeout(timeoutId);
      return await parseResponse(res, isAllOrigins);
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  let data = null;
  for (let i = 0; i < proxies.length; i++) {
    try {
      const isAllOrigins = i === 0; // allorigins ต้อง parse contents
      data = await tryFetch(proxies[i], isAllOrigins);
      break;
    } catch (err) {
      console.warn(`Proxy ${i + 1} failed:`, err.message);
    }
  }

  if (data?.response?.stations?.ptt) {
    try {
      const ptt = data.response.stations.ptt;
      const p = (v) => (v ? parseFloat(v.price || v) : 0);

      if (ptt.gasohol_95) oilPrices.gasohol95 = p(ptt.gasohol_95);
      if (ptt.gasohol_91) oilPrices.gasohol91 = p(ptt.gasohol_91);
      if (ptt.gasohol_e20) oilPrices.e20 = p(ptt.gasohol_e20);
      if (ptt.diesel_b7) oilPrices.diesel = p(ptt.diesel_b7);
      if (ptt.gasohol_e85) oilPrices.e85 = p(ptt.gasohol_e85);
      if (ptt.premium_diesel) oilPrices.premium_diesel = p(ptt.premium_diesel);
      if (ptt.electricity) oilPrices.electricity = p(ptt.electricity);

      renderOilPage();

      if (dateEl) {
        let dateStr = data.response.date || new Date().toLocaleDateString("th-TH");
        dateEl.innerHTML = `อัพเดทล่าสุด: <span style="color:#4ade80">${dateStr}</span>`;
      }
    } catch (e) {
      console.warn("Parse error:", e);
      setOfflineDateLabel(dateEl);
    }
  } else {
    // ดึงไม่ได้ทุก proxy → ใช้ราคา offline เงียบๆ ไม่ขึ้น error
    setOfflineDateLabel(dateEl);
  }
}

function setOfflineDateLabel(dateEl) {
  if (dateEl) {
    const today = new Date().toLocaleDateString("th-TH");
    dateEl.innerHTML = `อัพเดทล่าสุด: ${today} <span style="color:#94a3b8">(ราคาอ้างอิง)</span>`;
  }
}

function renderOilPage() {
  const grid = document.getElementById("oil-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const oils = [
    { n: "แก๊สโซฮอล์ 95", p: oilPrices.gasohol95, c: "#f59e0b" },
    { n: "แก๊สโซฮอล์ 91", p: oilPrices.gasohol91, c: "#10b981" },
    { n: "แก๊สโซฮอล์ E20", p: oilPrices.e20, c: "#0ea5e9" },
    { n: "ดีเซล B7", p: oilPrices.diesel, c: "#484be9" },
    { n: "ดีเซล Premium", p: oilPrices.premium_diesel, c: "#8b5cf6" },
    { n: "แก๊สโซฮอล์ E85", p: oilPrices.e85, c: "#ec4899" },
    { n: "ไฟฟ้า (EV)", p: oilPrices.electricity, c: "#00d2d3", u: "บาท/หน่วย" },
  ];

  oils.forEach((o) => {
    grid.innerHTML += `
            <div class="oil-card" style="--color-bar: ${o.c}">
                <div class="oil-name">${o.n}</div>
                <div class="oil-price">${o.p.toFixed(2)}</div>
                <div class="oil-unit">${o.u || "บาท/ลิตร"}</div>
            </div>`;
  });
}
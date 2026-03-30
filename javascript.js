// ==========================================
// 1. ตั้งค่าราคากลาง
// ==========================================
let oilPrices = {
  gasohol95: 30.85,
  gasoline95: 34.94,
  gasohol91: 30.48,
  e20: 29.14,
  e85: 27.5,
  diesel: 41.5,
  premium_diesel: 29.94,
  premium_gasohol_95: 35.29,
  ngv: 15.0,
  electricity: 4.5,
};

document.addEventListener("DOMContentLoaded", () => {
  // 1. เทคนิคสำคัญ: สั่งโชว์ข้อมูลทันที! ไม่ต้องรอ API
  renderOilPage();

  // Load popular cars if on index page
  if (document.getElementById("popularCarsSection")) {
    loadPopularCars();
  }

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
  // render profile UI
  try { renderUserProfile(); } catch (e) { /* ignore */ }
});

function quickSearch(term) {
  const input = document.getElementById("searchInput");
  if (input) {
    input.value = term;
    searchCar();
  }
}

async function searchCar() {
  const input = document.getElementById("searchInput").value.trim();
  const resultDiv = document.getElementById("result");
  const popularSection = document.getElementById("popularCarsSection");
  const searchTitle = document.getElementById("searchResultsTitle");

  if (!input) {
    alert("กรุณาพิมพ์ชื่อรถ");
    return;
  }

  // Hide popular cars and show search heading
  if (popularSection) popularSection.style.display = "none";
  if (searchTitle) searchTitle.style.display = "block";

  resultDiv.innerHTML =
    '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #4a9eff;">🔄 กำลังค้นหาข้อมูลจาก Supabase...</div>';

  // 1. นำ URL และ Key จากขั้นตอนที่ 4 มาใส่ตรงนี้
  const SUPABASE_URL = "https://fyaqsdqvircjanlasxov.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5YXFzZHF2aXJjamFubGFzeG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjUwMzcsImV4cCI6MjA4ODk0MTAzN30.pO9fF_ouzuOj5CbYhPZmCXMoVZFohFsk9cWj4Ur4dtQ";

  // 2. สร้าง URL สำหรับค้นหา (ilike คือการค้นหาแบบไม่สนพิมพ์เล็ก/ใหญ่ เหมือนคำสั่ง LIKE ใน SQL)
  const queryUrl = `${SUPABASE_URL}/rest/v1/cars?select=*&or=(brand.ilike.%25${input}%25,model.ilike.%25${input}%25)`;

  try {
    // 3. ยิงคำขอไปที่ Supabase โดยตรง (ไม่ต้องผ่าน Python)
    const response = await fetch(queryUrl, {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Network response was not ok");

    // ข้อมูลรถที่ได้กลับมา จะหน้าตาเหมือนตอนเขียน Python ทุกประการ!
    const cars = await response.json();

    if (cars.length > 0) {
      // ระบบแสดงผลจะใช้โค้ดเดิมของคุณได้เลย ไม่ต้องแก้อะไร!
      // หมายเหตุ: ตรงตัวแปร car.type อาจจะต้องแก้เป็น car.car_type ตามฐานข้อมูล
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
    resultDiv.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ff6b6b;">⚠️ ไม่สามารถเชื่อมต่อฐานข้อมูลได้</div>`;
  }
}

async function loadPopularCars() {
  const SUPABASE_URL = "https://fyaqsdqvircjanlasxov.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5YXFzZHF2aXJjamFubGFzeG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjUwMzcsImV4cCI6MjA4ODk0MTAzN30.pO9fF_ouzuOj5CbYhPZmCXMoVZFohFsk9cWj4Ur4dtQ";

  // ดึงข้อมูลรถที่ยอดนิยม 
  // แนะนำใช้รุ่นที่ระบุเจาะจงหรือสุ่มมาในหมวดต่างๆ
  // เช่น Honda, Toyota จะเป็นสันดาป, BYD เป็น EV, etc.
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/cars?select=*`, {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const allCars = await response.json();
      
      // กรองรถแต่ละประเภท (EV, Hybrid, ICE/Gasoline) เอามาโชว์หมวดละไม่เกิน 3-4 คัน
      // sort helper: prefer numeric fields `sale` or `Sale`
      const sortBySaleDesc = (arr) => (arr || []).sort((a, b) => ((b.sale || b.Sale || 0) - (a.sale || a.Sale || 0)));
      const evCars = sortBySaleDesc(allCars.filter(c => c.fuel === 'ev')).slice(0, 3);
      const hybridCars = sortBySaleDesc(allCars.filter(c => c.fuel === 'hybrid')).slice(0, 3);
      // สมมติว่ารถที่เหลือที่ไม่ใช่ ev, hybrid, diesel คือสันดาปเบนซิน
      const gasolineCars = sortBySaleDesc(allCars.filter(c => c.fuel !== 'ev' && c.fuel !== 'hybrid' && c.fuel !== 'diesel')).slice(0, 3);

      displayPopularSection(gasolineCars, "popularGasoline");
      displayPopularSection(hybridCars, "popularHybrid");
      displayPopularSection(evCars, "popularEV");
    }
  } catch (error) {
    console.error("Error loading popular cars:", error);
  }
}

function displayPopularSection(cars, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  if (!cars || cars.length === 0) {
    container.innerHTML = `<div style="padding: 20px; color: #94a3b8;">ยังไม่มีข้อมูลในหมวดหมู่นี้</div>`;
    return;
  }

  cars.forEach(car => {
    // ใช้ logic เหมือน displayResults
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

    const costPerKm = (fuelPrice / car.efficiency).toFixed(2);
    const priceStr = car.price ? car.price.toLocaleString() : "N/A";

    // Sale / ยอดขาย (support both `sale` and `Sale` keys)
    const saleVal = (typeof car.sale !== 'undefined') ? car.Sale : (typeof car.Sale !== 'undefined' ? car.Sale : 0);
    const saleStr = (saleVal === null || saleVal === undefined || saleVal === '') ? 'N/A' : (typeof saleVal === 'number' ? saleVal.toLocaleString() : saleVal);

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
                    <span class="car-year" style="font-size:0.8rem;color:#4a9eff;">${car.car_type || "N/A"}</span>
                </div>
                <div class="sale-box">ยอดขาย: ${saleStr}</div>
                <div class="fuel-cost-box">
                  <span class="cost-label">ต้นทุนเชื้อเพลิง</span>
                  <span class="cost-value">${costPerKm}</span> <span class="cost-unit">บาท/กม.</span>
                </div>
                <div class="specs-grid" style="grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem;">
                    <div>⛽ ${fuelName}</div>
                    <div>⚡ ${car.efficiency} กม./${unit}</div>
                    <div>🐎 ${car.hp || '-'} แรงม้า</div>
                    <div>🚀 0-100: ${car.acc_0_100 || '-'} วิ</div>
                </div>
            </div>
        `;
    container.appendChild(card);
  });
}

function displayResults(cars) {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "";

  const currentUser = getCurrentUser();
  const userEmail = currentUser ? currentUser.email : null;

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
    const priceStr = car.price ? car.price.toLocaleString() : "N/A";

    // Logic เลือกรูปภาพ
    let imgUrl = "";
    if (car.image_url && car.image_url.trim() !== "") {
      imgUrl = car.image_url;
    } else {
      const imgQuery = `${car.brand} ${car.model} 2024 side view`;
      imgUrl = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(imgQuery)}&w=500&h=300&c=7&rs=1&p=0`;
    }

    // Unique id for storing favorites
    const carId = car.id || `${(car.brand||'').replace(/\s+/g,'_')}_${(car.model||'').replace(/\s+/g,'_')}`;

    // Check favorite (favorites stored as array of objects {id, brand, model, ...})
    const favs = userEmail ? getFavoritesForUser(userEmail) : [];
    const isFav = favs.some(f => f.id === carId);

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
                    <span class="car-year" style="font-size:0.8rem;color:#4a9eff;">${car.car_type || "N/A"}</span>
                </div>
                <div class="fuel-cost-box">
                    <span class="cost-label">ต้นทุนเชื้อเพลิง</span>
                    <span class="cost-value">${costPerKm}</span> <span class="cost-unit">บาท/กม.</span>
                </div>
                <div class="specs-grid" style="grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem;">
                    <div>⛽ ${fuelName}</div>
                    <div>⚡ ${car.efficiency} กม./${unit}</div>
                    <div>🐎 ${car.hp} แรงม้า</div>
                    <div>🚀 0-100: ${car.acc_0_100} วินาที</div>
                </div>
                <div style="margin-top:12px; display:flex; justify-content:flex-end; align-items:center; gap:4px;">
                  ${ userEmail ? `<button class=\"fav-btn\" data-carid=\"${carId}\" aria-label=\"Save to favorites\" style=\"background:transparent;border:none;cursor:pointer;font-size:2.5rem;color:${isFav? '#ffd166':'#94a3b8'}\">${isFav? '★':'☆'}</button>` : '' }
                </div>
            </div>
        `;

    // favorite click handler
    setTimeout(() => {
      const btn = card.querySelector('.fav-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!userEmail) { alert('กรุณาเข้าสู่ระบบเพื่อบันทึกรายการโปรด'); return; }
          const id = btn.getAttribute('data-carid');
          const now = getFavoritesForUser(userEmail);
          const idx = now.findIndex(x => x.id === id);
          if (idx === -1) {
            // save minimal car object
            const obj = { id: id, brand: car.brand, model: car.model, price: car.price, efficiency: car.efficiency, fuel: car.fuel, image_url: car.image_url, hp: car.hp, acc_0_100: car.acc_0_100, car_type: car.car_type };
            now.push(obj);
            btn.textContent='★'; btn.style.color='#ffd166';
          } else {
            now.splice(idx,1);
            btn.textContent='☆'; btn.style.color='#94a3b8';
          }
          saveFavoritesForUser(userEmail, now);
        });
      }
    },0);

    resultDiv.appendChild(card);
  });
}

// Favorites helpers (persisted per user)
function getFavoritesKey(email){ return `cw_favs_${email}`; }
function getFavoritesForUser(email){ try{ const r=localStorage.getItem(getFavoritesKey(email)); return r?JSON.parse(r):[] }catch(e){return[]} }
function saveFavoritesForUser(email,favs){ try{ localStorage.setItem(getFavoritesKey(email), JSON.stringify(favs)); }catch(e){console.error(e);} }

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
      if (ptt.gasoline_95) oilPrices.gasoline95 = p(ptt.gasoline_95);
      if (ptt.gasohol_91) oilPrices.gasohol91 = p(ptt.gasohol_91);
      if (ptt.gasohol_e20) oilPrices.e20 = p(ptt.gasohol_e20);
      if (ptt.diesel_b7) oilPrices.diesel = p(ptt.diesel_b7);
      if (ptt.gasohol_e85) oilPrices.e85 = p(ptt.gasohol_e85);
      if (ptt.premium_diesel) oilPrices.premium_diesel = p(ptt.premium_diesel);
      if (ptt.premium_gasohol_95)
        oilPrices.premium_gasohol_95 = p(ptt.premium_gasohol_95);
      if (ptt.ngv) oilPrices.ngv = p(ptt.ngv);
      if (ptt.electricity) oilPrices.electricity = p(ptt.electricity);

      renderOilPage();

      if (dateEl) {
        let dateStr =
          data.response.date || new Date().toLocaleDateString("th-TH");
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
    { n: "เบนซิน 95", p: oilPrices.gasoline95, c: "#ef4444" },
    { n: "แก๊สโซฮอล์ 91", p: oilPrices.gasohol91, c: "#10b981" },
    { n: "แก๊สโซฮอล์ E20", p: oilPrices.e20, c: "#0ea5e9" },
    { n: "ดีเซล B7", p: oilPrices.premium_diesel, c: "#484be9" },
    { n: "แก๊สโซฮอล์ E85", p: oilPrices.e85, c: "#ec4899" },
    { n: "ดีเซล Premium", p: oilPrices.diesel, c: "#8b5cf6" },
    { n: "NGV", p: oilPrices.ngv, c: "#7a7a7a" },
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

// ==========================================
// 4. Simple client-side auth (localStorage)
// ==========================================

function getUsers() {
  try {
    const raw = localStorage.getItem("cw_users");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem("cw_users", JSON.stringify(users));
}

function registerUser(e) {
  e.preventDefault();
  const name = (document.getElementById("reg-name") || {}).value || "";
  const email = (document.getElementById("reg-email") || {}).value || "";
  const pw = (document.getElementById("reg-password") || {}).value || "";
  const pw2 = (document.getElementById("reg-password-confirm") || {}).value || "";

  if (!email || !pw || !name) return alert("กรุณากรอกข้อมูลให้ครบ");
  if (pw !== pw2) return alert("รหัสผ่านไม่ตรงกัน");

  const users = getUsers();
  const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) return alert("มีอีเมลนี้ในระบบแล้ว โปรดล็อกอินหรือลองอีเมลอื่น");

  users.push({ name: name.trim(), email: email.trim().toLowerCase(), password: pw });
  saveUsers(users);
  alert("สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ");
  window.location.href = "login.html";
}

function loginUser(e) {
  e.preventDefault();
  const email = (document.getElementById("login-email") || {}).value || "";
  const pw = (document.getElementById("login-password") || {}).value || "";
  const remember = document.getElementById("remember") && document.getElementById("remember").checked;

  if (!email || !pw) return alert("กรุณากรอกอีเมลและรหัสผ่าน");

  const users = getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === pw);
  if (!user) return alert("อีเมลหรือรหัสผ่านไม่ถูกต้อง");

  // Save simple session
  localStorage.setItem("cw_currentUser", JSON.stringify({ name: user.name, email: user.email }));
  if (remember) localStorage.setItem("cw_remember", "1");
  else localStorage.removeItem("cw_remember");

  // Redirect to homepage
  window.location.href = "index.html";
}

// Mobile menu controls
function toggleMobileMenu() {
  const overlay = document.querySelector('.mobile-menu-overlay');
  const menu = document.querySelector('.mobile-menu');
  if (!overlay || !menu) return;
  const open = menu.classList.toggle('open');
  overlay.classList.toggle('open', open);
}

function closeMobileMenu() {
  const overlay = document.querySelector('.mobile-menu-overlay');
  const menu = document.querySelector('.mobile-menu');
  if (!overlay || !menu) return;
  menu.classList.remove('open');
  overlay.classList.remove('open');
}

// Close menu when pressing Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMobileMenu();
});

// User profile helpers
function getCurrentUser() {
  try { const raw = localStorage.getItem('cw_currentUser'); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}

function renderUserProfile() {
  const user = getCurrentUser();
  const area = document.getElementById('userArea');
  const mobileFooter = document.querySelector('.mobile-menu-footer');
  const mobileInfo = document.getElementById('mobileUserInfo');
  if (area) {
    if (user) {
      area.innerHTML = `
        <button class="user-btn" onclick="window.location.href='index.html'">
          <div class="user-avatar">${(user.name||user.email||'U').charAt(0).toUpperCase()}</div>
          <span class="user-name">${user.name}</span>
        </button>
        <a href="#" onclick="logout();return false;" class="btn-ghost">Logout</a>`;
    } else {
      area.innerHTML = `<a href="login.html" class="btn-ghost">Sign in</a>`;
    }
  }
  if (mobileInfo) {
    if (user) mobileInfo.innerHTML = `Signed in as <strong>${user.name}</strong> • <a href='#' onclick='logout();return false;'>Logout</a>`;
    else mobileInfo.innerHTML = ``; // Hide redundant sign in below
  } else if (mobileFooter && user) {
    // create mobileUserInfo if missing
    const div = document.createElement('div');
    div.id = 'mobileUserInfo';
    div.style.fontSize = '0.95rem';
    div.style.color = 'var(--text-secondary)';
    div.innerHTML = `Signed in as <strong>${user.name}</strong> • <a href='#' onclick='logout();return false;'>Logout</a>`;
    mobileFooter.prepend(div);
  }

  // Dynamically inject mobile header button if missing
  let headerUser = document.getElementById('mobileHeaderUser');
  if (!headerUser) {
    const mobileHeader = document.querySelector('.mobile-menu-header');
    if (mobileHeader) {
      headerUser = document.createElement('div');
      headerUser.id = 'mobileHeaderUser';
      headerUser.style.marginLeft = 'auto';
      headerUser.style.marginRight = '15px';
      
      const closeBtn = mobileHeader.querySelector('.mobile-menu-close');
      if (closeBtn) {
        mobileHeader.insertBefore(headerUser, closeBtn);
      } else {
        mobileHeader.appendChild(headerUser);
      }
    }
  }

  if (headerUser) {
    if (user) {
      headerUser.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <button onclick="window.location.href='index.html'" style="background:transparent; border:none; padding:0; cursor:pointer;" aria-label="Profile">
            <div class="user-avatar" style="width:28px; height:28px; font-size:0.85rem;">${(user.name||user.email||'U').charAt(0).toUpperCase()}</div>
          </button>
          <button onclick="logout();return false;" style="background:rgba(255,107,107,0.1); color:#ff6b6b; border: 1px solid rgba(255,107,107,0.3); padding:4px 10px; border-radius:20px; font-size:0.8rem; font-weight:500; cursor:pointer;">
            Logout
          </button>
        </div>
      `;
    } else {
      headerUser.innerHTML = `
        <a href="login.html" style="background-color: var(--primary); color: white; padding: 6px 14px; border-radius: 20px; text-decoration: none; font-size: 0.9rem; font-weight: 500; display: inline-block;">
        Login
        </a>
      `;
    }
  }
}

function logout() {
  localStorage.removeItem('cw_currentUser');
  localStorage.removeItem('cw_remember');
  closeMobileMenu();
  renderUserProfile();
  window.location.href = 'login.html';
}

 document.addEventListener('DOMContentLoaded', ()=>{
      renderUserProfile();
      const user = getCurrentUser();
      const container = document.getElementById('favoritesContainer');
      container.innerHTML = '';
      if(!user){
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#fff;padding:30px;">กรุณาเข้าสู่ระบบเพื่อดูรายการโปรด</div>';
        return;
      }
      const favs = getFavoritesForUser(user.email) || [];
      if(favs.length===0){
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#fff;padding:30px;">ยังไม่มีรายการโปรด</div>';
        return;
      }
      favs.forEach(car=>{
        // normalize image URL: accept only non-empty, non-'null', non-'undefined' strings
        let img = '';
        if (car.image_url && typeof car.image_url === 'string') {
          const s = car.image_url.trim();
          if (s !== '' && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'undefined') img = s;
        }
        if (!img) {
          const imgQuery = `${car.brand} ${car.model} 2024 side view`;
          img = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(imgQuery)}&w=500&h=300&c=7&rs=1&p=0`;
        }
        const priceStr = car.price? car.price.toLocaleString():'N/A';
        const costPerKm = ( (car.fuel==='ev'? (oilPrices.electricity||4.5) : (oilPrices.gasohol95||30.85) ) / (car.efficiency||1) ).toFixed(2);
        const card = document.createElement('div'); card.className='car-card';
        card.innerHTML = `
          <div class="car-img-wrapper"><img src="${img}" onerror="this.src='https://placehold.co/600x400?text=${car.brand}'"><div style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.8);color:#fff;padding:4px 8px;border-radius:4px;font-size:0.8rem;">฿${priceStr}</div></div>
          <div class="car-content"><div class="car-title"><h3>${car.brand} ${car.model}</h3><span class="car-year" style="font-size:0.8rem;color:#4a9eff;">${car.car_type||'N/A'}</span></div>
          <div class="fuel-cost-box"><span class="cost-label">ต้นทุนเชื้อเพลิง</span><span class="cost-value">${costPerKm}</span> <span class="cost-unit">บาท/กม.</span></div>
          <div style="display:flex;justify-content:flex-end;margin-top:12px;"><button class="fav-remove" data-carid="${car.id}" style="background:#ff6b6b;border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer;">ลบจากรายการโปรด</button></div></div>
        `;
        container.appendChild(card);
        card.querySelector('.fav-remove').addEventListener('click', ()=>{
          const now = getFavoritesForUser(user.email);
          const idx = now.findIndex(x=>x.id===car.id);
          if(idx!==-1){ now.splice(idx,1); saveFavoritesForUser(user.email, now); card.remove(); }
          if(container.children.length===0) container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#fff;padding:30px;">ยังไม่มีรายการโปรด</div>';
        });
      });
    });

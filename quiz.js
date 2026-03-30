function calculateQuiz() {
  let scores = {
    eco: 0,
    performance: 0,
    safety: 0,
    comfort: 0,
    technology: 0,
    family: 0,
    suv: 0,
    city: 0,
  };

  const radios = document.querySelectorAll("input[type=radio]:checked");

  if (radios.length < 10) {
    alert("กรุณาตอบคำถามให้ครบ");
    return;
  }

  radios.forEach((r) => {
    scores[r.value]++;
  });

  let sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  let top3 = sorted.slice(0, 3);

  const featureText = {
    eco: "รถ Hybrid หรือ EV ประหยัดพลังงาน",
    performance: "รถสมรรถนะสูง ขับสนุก",
    safety: "รถที่มีระบบความปลอดภัยสูง",
    comfort: "รถที่ขับนุ่ม นั่งสบาย",
    technology: "รถที่มีเทคโนโลยีทันสมัย",
    family: "รถครอบครัวขนาดใหญ่",
    suv: "รถ SUV ลุยได้ทุกสภาพถนน",
    city: "รถขนาดเล็กเหมาะกับการขับในเมือง",
  };

  let result = "<h2>รถที่เหมาะกับคุณ</h2><ul>";

  top3.forEach((f) => {
    result += "<p>" + featureText[f[0]] + "</p>";
  });

  result += "</ul>";

  document.getElementById("quizResult").innerHTML = result;
  // Get budget
  const budget = document.getElementById("budgetSelect").value || 99999999;
  
// Fetch and display recommended cars based on top traits (Top 2 traits passed)
fetchRecommendedCars(top3, budget);
  document.getElementById("quizPage").classList.add("hidden");
  document.getElementById("resultPage").classList.remove("hidden");
}

function goBack() {
  document.getElementById("resultPage").classList.add("hidden");
  document.getElementById("quizPage").classList.remove("hidden");

  const radios = document.querySelectorAll("input[type=radio]");
  radios.forEach(r => r.checked = false);

  document.getElementById("quizResult").innerHTML = "";

  // Smooth scroll
  window.scrollTo({ top: 0, behavior: "smooth" });
  }

function goMain() {
  document.getElementById("quizPage").classList.add("hidden");
  document.getElementById("mainPage").classList.remove("hidden");
}

async function fetchRecommendedCars(topTraits, budget = 99999999) {
  const SUPABASE_URL = "https://fyaqsdqvircjanlasxov.supabase.co";
  const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5YXFzZHF2aXJjamFubGFzeG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjUwMzcsImV4cCI6MjA4ODk0MTAzN30.pO9fF_ouzuOj5CbYhPZmCXMoVZFohFsk9cWj4Ur4dtQ";

  // Build a query based on the top 2 traits
  const trait1 = topTraits[0][0];
  const trait2 = topTraits.length > 1 ? topTraits[1][0] : null;

  const getQueryPart = (t) => {
    switch (t) {
      case "eco": return { q: "fuel=in.(ev,hybrid,phev)", type: "fuel" };
      case "performance": return { q: "hp=gt.240", type: "perf" };
      // Safety: Price > 2M and specific safe brands or generally just brands
      case "safety": return { q: "brand=in.(Volvo,Mercedes-Benz,BMW,Audi)", type: "brand" };
      case "comfort": return { q: "car_type=in.(Sedan,SUV)", type: "body" };
      case "technology": return { q: "fuel=eq.ev", type: "fuel" };
      case "family": return { q: "car_type=in.(SUV,MPV,PPV)", type: "body" };
      case "suv": return { q: "car_type=in.(SUV,PPV)", type: "body" };
      case "city": return { q: "car_type=in.(Hatchback,Eco Car,Sedan)", type: "body" };
      default: return null;
    }
  };

  const p1 = getQueryPart(trait1);
  const p2 = trait2 ? getQueryPart(trait2) : null;

  let queryParts = [];
  
  // Add Budget Filter
  queryParts.push(`price=lte.${budget}`);

  if (p1) queryParts.push(p1.q);
  
  // Combine logic:
  // If types are different, we can usually combine (e.g. Body + Fuel).
  // If types are same, we usually skip p2 to avoid over-constraint or conflict, 
  // UNLESS it logic specific (like 2 attr). But here specific types (body, fuel) conflict if same.
  if (p2 && p1 && p1.type !== p2.type) {
     queryParts.push(p2.q);
  }

  // Fallback
  if (queryParts.length === 0) queryParts.push("limit=4");

  // Add ordering
  if(trait1 === 'performance') queryParts.push("order=hp.desc");
  else if(trait1 === 'eco') queryParts.push("order=efficiency.desc");
  else if(trait1 === 'price') queryParts.push("order=price.asc");
  else queryParts.push("order=price.desc"); // Default sort by price descending to show best cars in budget
  
  // Always limit
  if(!queryParts.some(p => p.includes("limit"))) queryParts.push("limit=4");

  const finalQuery = queryParts.join("&");
  console.log("Query:", finalQuery);

  const url = `${SUPABASE_URL}/rest/v1/cars?select=*&${finalQuery}`;

  const resultPage = document.getElementById("resultPage");
  // Expand page width to accommodate grid
  resultPage.style.maxWidth = "1200px";

  let container = document.getElementById("recommendedContainer");
  if (!container) {
    // Should exist from HTML, but fallback just in case
    container = document.createElement("div");
    container.id = "recommendedContainer";
    document.getElementById("resultPage").insertBefore(
      container,
      document.querySelector("#resultPage .calc-btn")
    );
  }
  
  // Reset container classes and content
  container.className = "result-grid";
  container.style.marginTop = "30px";
  container.style.width = "100%";
  
  container.innerHTML =
    '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #fff;">กำลังค้นหารถที่เหมาะกับคุณ...</div>';

  try {
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const cars = await response.json();

    if (cars.length === 0) {
      const fallbackUrl = `${SUPABASE_URL}/rest/v1/cars?select=*&limit=4`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });
      const fallbackCars = await fallbackRes.json();
      displayRecommendedCars(fallbackCars);
    } else {
      displayRecommendedCars(cars);
    }
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<div style="color: red; text-align: center;">ไม่สามารถโหลดข้อมูลรถได้</div>';
  }
}

function displayRecommendedCars(cars) {
    const container = document.getElementById("recommendedContainer");
    container.innerHTML = "";
  
    const prices =
    typeof oilPrices !== "undefined"
      ? oilPrices
      : {
          gasohol95: 39.0,
          diesel: 32.0,
          electricity: 4.5,
          gasohol91: 38.0,
        };

  cars.forEach((car) => {
    let fuelPrice = prices.gasohol95;
    let fuelName = "เบนซิน";
    let unit = "ลิตร";

    if (car.fuel === "ev") {
      fuelPrice = prices.electricity;
      fuelName = "ไฟฟ้า (EV)";
      unit = "kWh";
    } else if (car.fuel === "diesel") {
      fuelPrice = prices.diesel;
      fuelName = "ดีเซล";
    } else if (car.fuel === "hybrid") {
      fuelName = "ไฮบริด";
      fuelPrice = prices.gasohol95;
    } else if (car.fuel === "gas91") {
      fuelName = "แก๊สโซฮอล์ 91";
      fuelPrice = prices.gasohol91;
    }

    const costPerKm = (fuelPrice / car.efficiency).toFixed(2);
    const priceStr = car.price ? car.price.toLocaleString() : "N/A";

    let imgUrl = "";
    if (car.image_url && car.image_url.trim() !== "") {
      imgUrl = car.image_url;
    } else {
      const imgQuery = `${car.brand} ${car.model} 2024 side view`;
      imgUrl = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(
        imgQuery
      )}&w=500&h=300&c=7&rs=1&p=0`;
    }

    const card = document.createElement("div");
    card.className = "car-card";
    // Unique id
    const carId = car.id || `${(car.brand||'').replace(/\s+/g,'_')}_${(car.model||'').replace(/\s+/g,'_')}`;
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const userEmail = currentUser ? currentUser.email : null;
    const favs = userEmail ? (typeof getFavoritesForUser === 'function' ? getFavoritesForUser(userEmail) : []) : [];
    const isFav = favs.includes(carId);

    card.innerHTML = `
        <div class="car-img-wrapper">
          <img src="${imgUrl}" onerror="this.src='https://placehold.co/600x400?text=${car.brand}'" alt="${car.brand} ${car.model}">
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
            <div>⏱️ 0-100: ${car.acc_0_100} วินาที</div>
          </div>
          <div style="margin-top:12px; display:flex; justify-content:flex-end; align-items:center; gap:8px;">
            ${ userEmail ? `<button class=\"fav-btn\" data-carid=\"${carId}\" aria-label=\"Save to favorites\" style=\"background:transparent;border:none;cursor:pointer;font-size:1.4rem;color:${isFav? '#ffd166':'#94a3b8'}\">${isFav? '★':'☆'}</button>` : '' }
          </div>
        </div>
      `;

    setTimeout(()=>{
      const btn = card.querySelector('.fav-btn');
      if(btn){
      btn.addEventListener('click',(e)=>{
        e.stopPropagation();
        if(!userEmail){ alert('กรุณาเข้าสู่ระบบเพื่อบันทึกรายการโปรด'); return; }
        const id = btn.getAttribute('data-carid');
        const now = getFavoritesForUser(userEmail);
        const idx = now.findIndex(x => x.id === id);
        if(idx===-1){
          const obj = { id: id, brand: car.brand, model: car.model, price: car.price, efficiency: car.efficiency, fuel: car.fuel, image_url: car.image_url, hp: car.hp, acc_0_100: car.acc_0_100, car_type: car.car_type };
          now.push(obj);
          btn.textContent='★'; btn.style.color='#ffd166';
        } else { now.splice(idx,1); btn.textContent='☆'; btn.style.color='#94a3b8'; }
        saveFavoritesForUser(userEmail, now);
      });
      }
    },0);
    container.appendChild(card);
  });
}

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

  const requiredQuestions = [
    "use",
    "distance",
    "purpose",
    "style",
    "passengers",
    "tech",
    "cost",
    "ev",
    "personality",
    "design",
  ];

  const questionWeights = {
    use: 1,
    distance: 2,
    purpose: 2,
    style: 2,
    passengers: 2,
    tech: 2,
    cost: 3,
    ev: 4,
    personality: 1,
    design: 1,
  };

  const selections = {};
  for (const q of requiredQuestions) {
    const selected = document.querySelector(`input[name="${q}"]:checked`);
    if (!selected) {
      alert("กรุณาตอบคำถามให้ครบ");
      return;
    }
    selections[q] = selected;
  }

  requiredQuestions.forEach((q) => {
    const trait = selections[q].value;
    if (!Object.prototype.hasOwnProperty.call(scores, trait)) return;
    scores[trait] += questionWeights[q] || 1;
  });

  let sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  let top3 = sorted.slice(0, 3);

  // Get budget
  const budget = Number(document.getElementById("budgetSelect").value || 99999999);
  const preferences = buildQuizPreferences(selections, budget, scores);
  const resultHighlights = buildResultHighlights(top3, preferences);

  let result = "<h2>รถที่เหมาะกับคุณ</h2><ul>";
  resultHighlights.forEach((text) => {
    result += `<p>${text}</p>`;
  });
  result += "</ul>";

  document.getElementById("quizResult").innerHTML = result;

  // Fetch and display recommended cars with hard constraints from explicit answers.
  fetchRecommendedCars(top3, budget, preferences);
  document.getElementById("quizPage").classList.add("hidden");
  document.getElementById("resultPage").classList.remove("hidden");
}

function goBack() {
  document.getElementById("resultPage").classList.add("hidden");
  document.getElementById("quizPage").classList.remove("hidden");

  const radios = document.querySelectorAll("input[type=radio]");
  radios.forEach(r => r.checked = false);

  document.getElementById("quizResult").innerHTML = "";
  const recommendation = document.getElementById("recommendedContainer");
  if (recommendation) recommendation.innerHTML = "";

  // Smooth scroll
  window.scrollTo({ top: 0, behavior: "smooth" });
  }

function goMain() {
  document.getElementById("quizPage").classList.add("hidden");
  document.getElementById("mainPage").classList.remove("hidden");
}

async function fetchRecommendedCars(topTraits, budget = 99999999, preferencesInput = null) {
  const preferences = preferencesInput || {
    evMode: "open_ev",
    budget: Number(budget) || 99999999,
    traitScores: Object.fromEntries(topTraits || []),
  };

  const safeBudget = Math.max(Number(budget) || 99999999, 0);
  const queryParts = [`price=lte.${safeBudget}`];
  if (preferences.evMode === "avoid_ev") {
    queryParts.push("fuel=neq.ev");
  }
  queryParts.push("limit=150");

  const finalQuery = queryParts.join("&");
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

    let cars = await response.json();

    if (!cars || cars.length === 0) {
      const relaxedBudget = Math.round(safeBudget * 1.2);
      const fallbackQueryParts = [`price=lte.${Math.max(relaxedBudget, safeBudget)}`];
      if (preferences.evMode === "avoid_ev") {
        fallbackQueryParts.push("fuel=neq.ev");
      }
      fallbackQueryParts.push("limit=150");

      const fallbackUrl = `${SUPABASE_URL}/rest/v1/cars?select=*&${fallbackQueryParts.join("&")}`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });
      cars = await fallbackRes.json();
    }

    if (preferences.evMode === "avoid_ev") {
      cars = (cars || []).filter((car) => String(car.fuel || "").toLowerCase() !== "ev");
    }

    if (!cars || cars.length === 0) {
      container.innerHTML =
        '<div style="grid-column: 1/-1; text-align: center; color: #facc15;">ยังไม่พบรถที่ตรงเงื่อนไข ลองเพิ่มงบประมาณหรือปรับคำตอบบางข้อ</div>';
      return;
    }

    const rankedCars = rankCarsByQuizAccuracy(cars, preferences);
    const finalCars = pickFinalRecommendations(rankedCars, preferences, 4);
    displayRecommendedCars(finalCars);

    if (preferences.evMode === "avoid_ev") {
      const hasEV = finalCars.some((car) => String(car.fuel || "").toLowerCase() === "ev");
      if (hasEV) {
        console.warn("EV filtering warning: found EV in top result despite avoid_ev mode");
      }
    }
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<div style="color: red; text-align: center;">ไม่สามารถโหลดข้อมูลรถได้</div>';
  }
}

function buildQuizPreferences(selections, budget, traitScores) {
  const evOptions = Array.from(document.querySelectorAll('input[name="ev"]'));
  const selectedEv = selections.ev;
  const evIndex = evOptions.findIndex((node) => node === selectedEv);

  let evMode = "open_ev";
  if (evIndex === 2 || selectedEv.value === "performance") evMode = "avoid_ev";
  else if (evIndex === 0) evMode = "prefer_ev";

  return {
    evMode,
    budget: Number(budget) || 99999999,
    annualDistance: Number(selections.distance.getAttribute("value1")) || 0,
    usePattern: selections.use.value,
    purpose: selections.purpose.value,
    drivingStyle: selections.style.value,
    passengers: selections.passengers.value,
    costPriority: selections.cost.value,
    techInterest: selections.tech.value,
    personality: selections.personality.value,
    design: selections.design.value,
    traitScores: traitScores || {},
  };
}

function getTraitWeight(preferences, trait) {
  return Number((preferences.traitScores || {})[trait] || 0);
}

function getTraitMessage(trait, preferences) {
  const traitText = {
    eco:
      preferences.evMode === "avoid_ev"
        ? "รถประหยัดพลังงานที่ไม่ใช่ EV (เน้นน้ำมัน/ไฮบริด)"
        : preferences.evMode === "prefer_ev"
          ? "รถ EV หรือ Hybrid ประหยัดพลังงาน"
          : "รถประหยัดพลังงานทั้งน้ำมัน Hybrid และ EV",
    performance: "รถสมรรถนะสูง ขับสนุก",
    safety: "รถที่มีระบบความปลอดภัยสูง",
    comfort: "รถที่ขับนุ่ม นั่งสบาย",
    technology:
      preferences.evMode === "avoid_ev"
        ? "รถเทคโนโลยีทันสมัย (ไม่เน้น EV ตามคำตอบของคุณ)"
        : "รถที่มีเทคโนโลยีทันสมัย",
    family: "รถครอบครัวขนาดใหญ่ รองรับผู้โดยสารได้ดี",
    suv: "รถ SUV ลุยได้ทุกสภาพถนน",
    city: "รถขนาดเล็กเหมาะกับการขับในเมือง",
  };
  return traitText[trait] || "รถที่ตรงกับไลฟ์สไตล์การใช้งานของคุณ";
}

function buildResultHighlights(top3, preferences) {
  const highlights = [];
  const added = new Set();

  const pushUnique = (text) => {
    if (!text || added.has(text)) return;
    highlights.push(text);
    added.add(text);
  };

  const fuelIntentText =
    preferences.evMode === "avoid_ev"
      ? "ระบบเน้นรถน้ำมันและไฮบริดตามคำตอบว่าไม่สนใจรถ EV"
      : preferences.evMode === "prefer_ev"
        ? "ระบบเน้นรถไฟฟ้าและไฮบริดตามความสนใจด้าน EV"
        : "ระบบเลือกเชื้อเพลิงให้ยืดหยุ่นตามรูปแบบการใช้งาน";
  pushUnique(fuelIntentText);

  const purposeText = {
    city: "เหมาะกับการใช้งานในเมืองและเดินทางประจำวัน",
    performance: "เหมาะกับการขับที่ต้องการสมรรถนะและการเร่งตอบสนองดี",
    suv: "เหมาะกับการเดินทางท่องเที่ยวและเส้นทางหลากหลาย",
    family: "เหมาะกับการใช้งานครอบครัวและผู้โดยสารหลายคน",
  };
  pushUnique(purposeText[preferences.purpose]);

  let drivingCostText = "";
  if (preferences.costPriority === "eco") {
    drivingCostText = "ให้ความสำคัญต้นทุนระยะยาวและความประหยัดเชื้อเพลิง";
  } else if (preferences.drivingStyle === "performance") {
    drivingCostText = "เน้นอัตราเร่งและฟีลการขับที่สนุกมากขึ้น";
  } else if (preferences.drivingStyle === "safety") {
    drivingCostText = "เน้นความปลอดภัยและความมั่นใจในการขับขี่";
  } else {
    drivingCostText = "เน้นความสมดุลระหว่างการใช้งานจริงและความสะดวกสบาย";
  }
  pushUnique(drivingCostText);

  // Fill any missing lines from top traits so summary still reflects scoring.
  (top3 || []).forEach((item) => {
    const trait = Array.isArray(item) ? item[0] : null;
    if (!trait) return;
    pushUnique(getTraitMessage(trait, preferences));
  });

  return highlights.slice(0, 3);
}

function hasAnyKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function rankCarsByQuizAccuracy(cars, preferences) {
  const seenModels = new Set();

  const ranked = (cars || [])
    .map((car) => ({
      car,
      score: scoreCarByPreferences(car, preferences),
    }))
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.car)
    .filter((car) => {
      const key = `${car.brand || ""}-${car.model || ""}`.toLowerCase();
      if (seenModels.has(key)) return false;
      seenModels.add(key);
      return true;
    });

  return ranked;
}

function getFuelGroup(car) {
  const fuel = String(car?.fuel || "").toLowerCase();
  if (fuel === "ev") return "ev";
  if (fuel === "hybrid" || fuel === "phev") return "hybrid";
  return "combustion";
}

function pickFinalRecommendations(rankedCars, preferences, limit = 4) {
  const ranked = Array.isArray(rankedCars) ? rankedCars : [];
  if (ranked.length <= limit) return ranked;

  const selected = [];
  const selectedKey = new Set();
  const groupBuckets = {
    ev: [],
    hybrid: [],
    combustion: [],
  };

  ranked.forEach((car) => {
    groupBuckets[getFuelGroup(car)].push(car);
  });

  const pushCar = (car) => {
    const key = `${(car.brand || "").toLowerCase()}-${(car.model || "").toLowerCase()}`;
    if (selectedKey.has(key)) return;
    selected.push(car);
    selectedKey.add(key);
  };

  // Respect EV preference mode while avoiding one-fuel dominance.
  const priorityByMode =
    preferences.evMode === "prefer_ev"
      ? ["ev", "hybrid", "combustion"]
      : preferences.evMode === "avoid_ev"
        ? ["hybrid", "combustion"]
        : ["hybrid", "combustion", "ev"];

  // First pass: one item from each priority group.
  priorityByMode.forEach((group) => {
    const candidate = groupBuckets[group][0];
    if (candidate) pushCar(candidate);
  });

  // Second pass: round-robin by group until reaching limit.
  let cursor = 1;
  while (selected.length < limit) {
    let addedThisRound = false;
    priorityByMode.forEach((group) => {
      if (selected.length >= limit) return;
      const candidate = groupBuckets[group][cursor];
      if (candidate) {
        pushCar(candidate);
        addedThisRound = true;
      }
    });
    if (!addedThisRound) break;
    cursor += 1;
  }

  // Final fill: keep score order for any remaining slots.
  if (selected.length < limit) {
    ranked.forEach((car) => {
      if (selected.length >= limit) return;
      pushCar(car);
    });
  }

  return selected.slice(0, limit);
}

function scoreCarByPreferences(car, preferences) {
  const fuel = String(car.fuel || "").toLowerCase();
  const carType = String(car.car_type || "").toLowerCase();
  const brand = String(car.brand || "").toLowerCase();
  const hp = Number(car.hp) || 0;
  const efficiency = Number(car.efficiency) || 0;
  const price = Number(car.price) || 0;
  const acc = Number(car.acc_0_100) || 12;
  const sale = Number(car.sale || car.Sale || 0) || 0;

  const isEV = fuel === "ev";
  const isHybridLike = fuel === "hybrid" || fuel === "phev";
  const isSUV = hasAnyKeyword(carType, ["suv", "crossover"]);
  const isFamilyBody = isSUV || hasAnyKeyword(carType, ["mpv", "van", "pickup"]);
  const isCityBody = hasAnyKeyword(carType, ["hatchback", "sedan", "compact", "city"]);
  const isComfortBody = isFamilyBody || hasAnyKeyword(carType, ["sedan", "wagon"]);

  if (preferences.evMode === "avoid_ev" && isEV) {
    return -1000000;
  }

  const safeBrands = ["volvo", "mercedes", "mercedes-benz", "bmw", "audi", "subaru", "toyota", "honda"];
  const techBrands = ["tesla", "byd", "bmw", "mercedes", "audi", "nissan", "hyundai"];

  let score = 0;

  const addTrait = (trait, metric) => {
    score += getTraitWeight(preferences, trait) * metric;
  };

  addTrait("eco", Math.min(efficiency / 18, 2.4) + (isEV ? 1.2 : isHybridLike ? 0.8 : 0.2));
  addTrait("performance", Math.min(hp / 120, 2.8) + Math.max(0, (12 - acc) / 5));
  addTrait("safety", (safeBrands.includes(brand) ? 1.8 : 0.5) + (isFamilyBody ? 0.6 : 0.2));
  addTrait("comfort", (isComfortBody ? 1.4 : 0.4));
  addTrait("technology", (techBrands.includes(brand) ? 1.3 : 0.3) + (isEV ? 1.2 : isHybridLike ? 0.8 : 0.1));
  addTrait("family", isFamilyBody ? 1.7 : 0.1);
  addTrait("suv", isSUV ? 1.8 : 0.1);
  addTrait("city", (isCityBody ? 1.5 : 0.3) + Math.min(efficiency / 22, 1.2));

  if (preferences.evMode === "prefer_ev") {
    score += isEV ? 6 : isHybridLike ? 3 : -1.5;
  } else if (preferences.evMode === "open_ev") {
    score += isEV ? 1.8 : isHybridLike ? 1 : 0;
  }

  if (preferences.costPriority === "eco") {
    const budget = Math.max(Number(preferences.budget) || 0, 1);
    const priceFit = price > 0 ? Math.max(0, 1 - price / budget) : 0.2;
    score += priceFit * 8;
    score += Math.min(efficiency / 10, 2.8);
  } else if (preferences.costPriority === "comfort") {
    score += Math.min(efficiency / 16, 1.4);
  } else {
    score += Math.min(hp / 90, 3);
  }

  if (preferences.annualDistance >= 20000) {
    score += Math.min(efficiency / 12, 3.2);
    if (isEV || isHybridLike) score += 1.2;
  } else if (preferences.annualDistance <= 15000 && isCityBody) {
    score += 1.2;
  }

  if (preferences.purpose === "family") score += isFamilyBody ? 3 : -0.8;
  if (preferences.purpose === "suv") score += isSUV ? 3 : -0.6;
  if (preferences.purpose === "city") score += isCityBody ? 2.2 : 0;
  if (preferences.purpose === "performance") score += Math.min(hp / 110, 2.5);

  if (preferences.passengers === "family") score += isFamilyBody ? 2.5 : -0.8;
  if (preferences.passengers === "comfort") score += isComfortBody ? 1.5 : 0.2;
  if (preferences.passengers === "city") score += isCityBody ? 2 : 0.2;

  if (preferences.drivingStyle === "performance") score += Math.min(hp / 100, 3.2);
  if (preferences.drivingStyle === "comfort") score += isComfortBody ? 2 : 0.4;
  if (preferences.drivingStyle === "safety") score += safeBrands.includes(brand) ? 2.2 : 0.6;
  if (preferences.drivingStyle === "eco") score += Math.min(efficiency / 14, 2.6);

  if (preferences.techInterest === "technology") score += isEV || isHybridLike ? 1.6 : 0.3;
  if (preferences.techInterest === "comfort") score += isComfortBody ? 0.8 : 0.2;

  if (preferences.personality === "technology") score += isEV || isHybridLike ? 1.3 : 0.2;
  if (preferences.personality === "performance") score += Math.min(hp / 140, 1.8);
  if (preferences.personality === "comfort") score += isComfortBody ? 1.1 : 0.2;
  if (preferences.personality === "eco") score += Math.min(efficiency / 18, 1.5);

  if (preferences.design === "suv") score += isSUV ? 1.4 : 0.1;
  if (preferences.design === "performance") score += Math.min(hp / 150, 1.4);
  if (preferences.design === "technology") score += isEV || isHybridLike ? 1.2 : 0.1;
  if (preferences.design === "comfort") score += isComfortBody ? 1 : 0.2;

  if (preferences.usePattern === "city") score += isCityBody ? 1.4 : 0;
  if (preferences.usePattern === "comfort") score += isComfortBody ? 1 : 0;

  // Light popularity bias for tie-break consistency.
  score += Math.min(sale / 25000, 1.5);

  return score;
}

function displayRecommendedCars(cars) {
  const container = document.getElementById("recommendedContainer");
  container.innerHTML = "";

  // ==========================
  // 📏 ระยะทางต่อปี (value1)
  // ==========================
  const selected = document.querySelector('input[name="distance"]:checked');
  const value1 = selected ? Number(selected.getAttribute("value1")) : 0;

  // ==========================
  // ⛽ ราคาน้ำมัน (realtime fallback)
  // ==========================
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

    // ==========================
    // 🔥 FUEL TYPE MAPPING
    // ==========================
    if (car.fuel === "ev") {
      fuelPrice = prices.electricity;
      fuelName = "ไฟฟ้า (EV)";
      unit = "kWh";
    } else if (car.fuel === "diesel") {
      fuelPrice = prices.diesel;
      fuelName = "ดีเซล";
    } else if (car.fuel === "hybrid") {
      fuelName = "ไฮบริด (Gasohol 95)";
      fuelPrice = prices.gasohol95;
    } else if (car.fuel === "gas91") {
      fuelName = "แก๊สโซฮอล์ 91";
      fuelPrice = prices.gasohol91;
    }

    // กัน error
    if (!car.efficiency || car.efficiency <= 0) return;

    // ==========================
    // 💰 CALCULATION
    // ==========================
    const costPerKm = fuelPrice / car.efficiency;

    // ⭐ คำนวณค่าน้ำมันต่อปี
    const yearlyCost = value1 * fuelPrice / car.efficiency;

    // ⭐ คำนวณต่อเดือน (เพิ่มความโปร)
    const monthlyCost = yearlyCost / 12;

    // format
    const costPerKmDisplay = costPerKm.toFixed(2);
    const yearlyCostDisplay = Math.round(yearlyCost).toLocaleString();
    const monthlyCostDisplay = Math.round(monthlyCost).toLocaleString();

    const priceStr = car.price ? car.price.toLocaleString() : "N/A";

    // ==========================
    // 🖼️ IMAGE
    // ==========================
    let imgUrl = "";
    if (car.image_url && car.image_url.trim() !== "") {
      imgUrl = car.image_url;
    } else {
      const imgQuery = `${car.brand} ${car.model} 2024 side view`;
      imgUrl = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(
        imgQuery
      )}&w=500&h=300`;
    }

    // ==========================
    // ❤️ FAVORITE LOGIC
    // ==========================
    const carId =
      car.id ||
      `${(car.brand || "").replace(/\s+/g, "_")}_${(car.model || "").replace(
        /\s+/g,
        "_"
      )}`;

    const currentUser =
      typeof getCurrentUser === "function" ? getCurrentUser() : null;

    const userEmail = currentUser ? currentUser.email : null;

    const favs = userEmail
      ? typeof getFavoritesForUser === "function"
        ? getFavoritesForUser(userEmail)
        : []
      : [];

    // Normalize favorites to an array of ids for checking
    const favIds = (favs || []).map((f) => (typeof f === "string" ? f : f && f.id ? f.id : null)).filter(Boolean);
    const isFav = favIds.includes(carId);

    // ==========================
    // 🎨 UI
    // ==========================
    const card = document.createElement("div");
    card.className = "car-card";

    card.innerHTML = `
      <div class="car-img-wrapper">
        <img src="${imgUrl}" 
             onerror="this.src='https://placehold.co/600x400?text=${car.brand}'">
        <div style="position:absolute;top:10px;right:10px;
             background:rgba(0,0,0,0.8);color:#fff;
             padding:4px 8px;border-radius:4px;font-size:0.8rem;">
          ฿${priceStr}
        </div>
      </div>

      <div class="car-content">
        <div class="car-title">
          <h3>${car.brand} ${car.model}</h3>
          <span style="font-size:0.8rem;color:#4a9eff;">
            ${car.car_type || "N/A"}
          </span>
        </div>

        <div class="fuel-cost-box">
          <span class="cost-label">ต้นทุนเชื้อเพลิง</span>
          <span class="cost-value">${costPerKmDisplay}</span>
          <span class="cost-unit">บาท/กม.</span>
        </div>

        <div class="specs-grid" style="grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem;">
          <div>⛽ ${fuelName}</div>
          <div>⚡ ${car.efficiency} กม./${unit}</div>
          <div>🐎 ${car.hp} แรงม้า</div>
          <div>⏱️ 0-100: ${car.acc_0_100} วินาที</div>

          <!-- 🔥 ค่าน้ำมัน -->
          <div style="grid-column:1/-1;color:#4a9eff;font-weight:bold;">
            ต่อปี ≈ ${yearlyCostDisplay} บาท
          </div>

          <div style="grid-column:1/-1;color:#22c55e;">
            ต่อเดือน ≈ ${monthlyCostDisplay} บาท
          </div>
        </div>

        <div style="margin-top:12px; display:flex; justify-content:flex-end;">
          ${
            userEmail
              ? `<button class="fav-btn" data-carid="${carId}"
                 style="background:none;border:none;cursor:pointer;
                 font-size:2.5rem;color:${isFav ? "#ffd166" : "#94a3b8"}">
                 ${isFav ? "★" : "☆"}
               </button>`
              : ""
          }
        </div>
      </div>
    `;

    // ==========================
    // ❤️ FAVORITE CLICK
    // ==========================
    setTimeout(() => {
      const btn = card.querySelector(".fav-btn");
      if (btn) {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();

          if (!userEmail) {
            alert("กรุณาเข้าสู่ระบบ");
            return;
          }

          const id = btn.getAttribute("data-carid");
          let now = getFavoritesForUser(userEmail) || [];

          // find index supporting both string ids and object entries
          const idx = now.findIndex((x) => {
            if (!x) return false;
            if (typeof x === "string") return x === id;
            return x.id === id;
          });

          if (idx === -1) {
            // add object (keep shape consistent with other pages)
            now.push({ id, brand: car.brand, model: car.model, price: car.price, efficiency: car.efficiency, fuel: car.fuel, image_url: car.image_url, hp: car.hp, acc_0_100: car.acc_0_100, car_type: car.car_type });
            btn.textContent = "★";
            btn.style.color = "#ffd166";
          } else {
            now.splice(idx, 1);
            btn.textContent = "☆";
            btn.style.color = "#94a3b8";
          }

          saveFavoritesForUser(userEmail, now);
        });
      }
    }, 0);

    container.appendChild(card);
  });
}
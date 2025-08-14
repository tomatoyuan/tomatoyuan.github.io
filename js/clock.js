// 语言配置：中文（中国专用）和英文（其他国家）
const langConfig = {
  "zh-CN": {
    week: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
    am: "上午",
    pm: "下午",
    unknownCity: "未知城市",
    unknownWeather: "未知天气"
  },
  "en-US": {
    week: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
    am: "AM",
    pm: "PM",
    unknownCity: "Unknown City",
    unknownWeather: "Unknown Weather"
  }
};

// 封装电子钟核心渲染函数
function clockUpdateTime(e, city, lang) {
  const currentLang = langConfig[lang] || langConfig["en-US"];
  let a = "#000";
  switch (e.now.icon) {
    case "100": a = "#fdcc45"; break;
    case "101": a = "#fe6976"; break;
    case "102": case "103": a = "#fe7f5b"; break;
    case "104": case "150": case "151": case "152": case "153": case "154": 
    case "800": case "801": case "802": case "803": case "804": case "805": case "806": case "807": a = "#2152d1"; break;
    case "300": case "301": case "305": case "306": case "307": case "308": case "309": case "310": case "311": case "312": case "313": case "314": case "315": case "316": case "317": case "318": case "350": case "351": case "399": a = "#49b1f5"; break;
    case "302": case "303": case "304": a = "#fdcc46"; break;
    case "400": case "401": case "402": case "403": case "404": case "405": case "406": case "407": case "408": case "409": case "410": case "456": case "457": case "499": a = "#a3c2dc"; break;
    case "500": case "501": case "502": case "503": case "504": case "507": case "508": case "509": case "510": case "511": case "512": case "513": case "514": case "515": a = "#97acba"; break;
    case "900": case "999": a = "red"; break;
    case "901": a = "#179fff"; break;
  }

  // 确保容器存在（适配Pjax切换后容器可能被重建的情况）
  let t = document.getElementById("hexo_electric_clock");
  if (!t) {
    t = document.createElement("div");
    t.id = "hexo_electric_clock";
    const container = document.querySelector(".sticky_layout"); // 主题挂载容器
    if (container) container.appendChild(t);
    else document.body.appendChild(t);
  }

  clock_box_html = `
    <div class="clock-row">
      <span id="card-clock-clockdate" class="card-clock-clockdate"></span>
      <span class="card-clock-weather"><i class="qi-${e.now.icon}-fill" style="color: ${a}"></i> ${e.now.text || currentLang.unknownWeather} <span>${e.now.temp}</span> ℃</span>
      <span class="card-clock-humidity">💧 ${e.now.humidity}%</span>
    </div>
    <div class="clock-row">
      <span id="card-clock-time" class="card-clock-time"></span>
    </div>
    <div class="clock-row">
      <span class="card-clock-windDir"> <i class="qi-gale"></i> ${e.now.windDir || "-"}</span>
      <span class="card-clock-location">${city || currentLang.unknownCity}</span>
      <span id="card-clock-dackorlight" class="card-clock-dackorlight"></span>
    </div>
  `;

  // 清理旧的加载动画和定时器
  const n = document.getElementById("card-clock-loading");
  if (n) n.remove();
  if (window.clockInterval) clearInterval(window.clockInterval);

  // 更新DOM
  t.innerHTML = clock_box_html;

  // 时间更新函数
  function updateTime() {
    const now = new Date();
    const timeStr = `${pad(now.getHours(), 2)}:${pad(now.getMinutes(), 2)}:${pad(now.getSeconds(), 2)}`;
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1, 2)}-${pad(now.getDate(), 2)} ${currentLang.week[now.getDay()]}`;
    const period = now.getHours() >= 12 ? currentLang.pm : currentLang.am;

    // 容错处理：防止DOM元素不存在导致的错误
    const timeEl = document.getElementById("card-clock-time");
    const dateEl = document.getElementById("card-clock-clockdate");
    const periodEl = document.getElementById("card-clock-dackorlight");
    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
    if (periodEl) periodEl.textContent = period;
  }

  // 数字补零工具
  function pad(num, len) {
    return num.toString().padStart(len, "0");
  }

  // 启动定时器并立即执行一次
  window.clockInterval = setInterval(updateTime, 1000);
  updateTime();
}

// 封装初始化逻辑（核心：可重复调用）
function initElectricClock() {
  // 基础配置
  const defaultRectangle = window.clock_default_rectangle_enable === "true";
  const defaultLocation = window.clock_rectangle || "112.982279,28.19409";
  const defaultCityZh = "长沙市";
  const defaultCityEn = "Changsha";
  const qweatherKey = window.qweather_key;

  // 步骤1：获取国家代码（判断语言）
  const initialIpApi = "http://ip-api.com/json/";
  fetch(initialIpApi)
    .then(response => response.ok ? response.json() : Promise.reject("IP接口失败"))
    .then(initialData => {
      if (initialData.status !== "success") throw new Error("IP定位失败");
      
      const countryCode = initialData.countryCode;
      const { ipApi, lang } = countryCode === "CN" 
        ? { ipApi: "http://ip-api.com/json/?lang=zh-CN", lang: "zh-CN" }
        : { ipApi: "http://ip-api.com/json/?lang=en", lang: "en-US" };

      // 步骤2：获取城市和经纬度
      return fetch(ipApi)
        .then(response => response.ok ? response.json() : Promise.reject("细分IP接口失败"))
        .then(detailedData => {
          if (detailedData.status !== "success") throw new Error("细分定位失败");
          
          const city = detailedData.city || (countryCode === "CN" ? defaultCityZh : defaultCityEn);
          const lon = detailedData.lon;
          const lat = detailedData.lat;
          if (!lon || !lat) throw new Error("经纬度缺失");

          // 步骤3：获取天气（固定中文）
          fetch(`https://devapi.qweather.com/v7/weather/now?location=${lon},${lat}&key=${qweatherKey}&lang=zh`)
            .then(response => response.ok ? response.json() : Promise.reject("天气接口失败"))
            .then(weatherData => clockUpdateTime(weatherData, city, lang))
            .catch(() => clockUpdateTime({ now: {} }, city, lang));
        });
    })
    .catch(error => {
      console.error("初始化失败：", error);
      const [lon, lat] = defaultLocation.split(',').map(Number);
      clockUpdateTime({ now: {} }, defaultCityZh, "zh-CN");
    });
}

// 关键：适配Pjax和常规页面加载
function setupClock() {
  // 页面首次加载时初始化
  if (document.readyState === "complete") {
    initElectricClock();
  } else {
    window.addEventListener("load", initElectricClock);
  }

  // 监听Pjax跳转完成事件（Butterfly主题核心适配）
  document.addEventListener("pjax:complete", initElectricClock);

  // 监听浏览器前进/后退按钮
  window.addEventListener("popstate", initElectricClock);

  // 监听页面可见性变化（切回标签页时刷新）
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") initElectricClock();
  });
}

// 启动配置
setupClock();

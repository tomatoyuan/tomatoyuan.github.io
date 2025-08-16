// 语言配置：中文（中国专用）和英文（其他国家）
const langConfig = {
  "zh-CN": {
    week: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
    am: "上午",
    pm: "下午",
    unknownCity: "哈尔滨",
    unknownWeather: "晴天"
  },
  "en-US": {
    week: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
    am: "AM",
    pm: "PM",
    unknownCity: "Harbin",
    unknownWeather: "Sunny"
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

  // 确保容器存在
  let t = document.getElementById("hexo_electric_clock");
  if (!t) {
    t = document.createElement("div");
    t.id = "hexo_electric_clock";
    const container = document.querySelector(".sticky_layout");
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

  // 清理旧实例
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

    const timeEl = document.getElementById("card-clock-time");
    const dateEl = document.getElementById("card-clock-clockdate");
    const periodEl = document.getElementById("card-clock-dackorlight");
    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
    if (periodEl) periodEl.textContent = period;
  }

  function pad(num, len) {
    return num.toString().padStart(len, "0");
  }

  window.clockInterval = setInterval(updateTime, 1000);
  updateTime();
}

// 高德逆地理编码API：将经纬度转换为中文城市名
function getChineseCityByLocation(lon, lat, gaodeKey) {
  // 高德逆地理编码API endpoint (HTTPS)
  const apiUrl = `https://restapi.amap.com/v3/geocode/regeo?location=${lon},${lat}&key=${gaodeKey}&extensions=base`;
  
  return fetch(apiUrl)
    .then(response => response.ok ? response.json() : Promise.reject("高德API请求失败"))
    .then(data => {
      if (data.status !== "1") {
        throw new Error(`高德API错误: ${data.info || "未知错误"}`);
      }
      
      // 解析返回结果，提取城市名（优先取市级别，没有则取省或区）
      const addressComponent = data.regeocode.addressComponent;
      let city = addressComponent.city;
      
      // 特殊处理：部分城市（如北京、上海）在高德返回中city字段为空，需用province
      if (!city || city === "") {
        city = addressComponent.province;
      }
      
      // 若仍无结果，使用区县级名称
      if (!city || city === "") {
        city = addressComponent.district;
      }
      
      return city || "未知城市";
    });
}

// 初始化逻辑
function initElectricClock() {
  // 基础配置
  const defaultRectangle = window.clock_default_rectangle_enable === "true";
  const defaultLocation = window.clock_rectangle || "45.6774716,126.3829968";
  const defaultCityZh = "哈尔滨";
  const defaultCityEn = "Harbin";
  const qweatherKey = window.qweather_key;
  const gaodeKey = window.gaud_map_key; // 从配置中获取高德Key

  // 步骤1：使用ipapi.co获取经纬度和国家代码（HTTPS兼容）
  const ipApi = "https://ipapi.co/json/";
  fetch(ipApi)
    .then(response => response.ok ? response.json() : Promise.reject("IP接口请求失败"))
    .then(ipData => {
      console.log("IP数据:", ipData);
      const countryCode = ipData.country_code; // 国家代码（CN/US等）
      const lang = countryCode === "CN" ? "zh-CN" : "en-US";
      const lon = ipData.longitude;
      const lat = ipData.latitude;
      
      if (!lon || !lat) throw new Error("经纬度缺失");

      // 步骤2：中国地区使用高德API转换为中文城市名，其他地区直接使用英文城市
      if (countryCode === "CN" && gaodeKey) {
        // 调用高德API获取中文城市名
        return getChineseCityByLocation(lon, lat, gaodeKey)
          .then(chineseCity => {
            return { city: chineseCity, lon, lat, lang };
          })
          .catch(error => {
            console.warn("高德API转换失败，使用默认中文城市:", error);
            return { city: defaultCityZh, lon, lat, lang };
          });
      } else {
        // 非中国地区直接使用英文城市名
        const city = ipData.city || defaultCityEn;
        return { city, lon, lat, lang };
      }
    })
    .then(({ city, lon, lat, lang }) => {
      // 步骤3：获取天气（固定中文）
      fetch(`https://devapi.qweather.com/v7/weather/now?location=${lon},${lat}&key=${qweatherKey}&lang=zh`)
        .then(response => response.ok ? response.json() : Promise.reject("天气接口失败"))
        .then(weatherData => clockUpdateTime(weatherData, city, lang))
        .catch(() => clockUpdateTime({ now: {} }, city, lang));
    })
    .catch(error => {
      console.error("初始化失败:", error);
      const [lon, lat] = defaultLocation.split(',').map(Number);
      clockUpdateTime({ now: {} }, defaultCityZh, "zh-CN");
    });
}

// 适配Pjax和页面事件
function setupClock() {
  // 页面加载完成后初始化
  if (document.readyState === "complete") {
    initElectricClock();
  } else {
    window.addEventListener("load", initElectricClock);
  }

  // Pjax跳转完成后重新初始化
  document.addEventListener("pjax:complete", initElectricClock);
  // 浏览器前进/后退事件
  window.addEventListener("popstate", initElectricClock);
  // 页面切回可见时刷新
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") initElectricClock();
  });
}

// 启动
setupClock();

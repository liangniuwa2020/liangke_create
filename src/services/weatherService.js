// 墨迹天气纯净版 - 天气数据服务 (Open-Meteo & Air Quality)

// 常用默认热门城市
export const DEFAULT_CITIES = [
  { id: 'beijing', name: '北京', admin1: '北京市', country: '中国', latitude: 39.9042, longitude: 116.4074 },
  { id: 'shanghai', name: '上海', admin1: '上海市', country: '中国', latitude: 31.2304, longitude: 121.4737 },
  { id: 'guangzhou', name: '广州', admin1: '广东省', country: '中国', latitude: 23.1291, longitude: 113.2644 },
  { id: 'shenzhen', name: '深圳', admin1: '广东省', country: '中国', latitude: 22.5431, longitude: 114.0579 },
  { id: 'hangzhou', name: '杭州', admin1: '浙江省', country: '中国', latitude: 30.2741, longitude: 120.1551 },
  { id: 'chengdu', name: '成都', admin1: '四川省', country: '中国', latitude: 30.5728, longitude: 104.0668 },
  { id: 'wuhan', name: '武汉', admin1: '湖北省', country: '中国', latitude: 30.5928, longitude: 114.3055 },
  { id: 'xian', name: '西安', admin1: '陕西省', country: '中国', latitude: 34.3416, longitude: 108.9398 },
  { id: 'chongqing', name: '重庆', admin1: '重庆市', country: '中国', latitude: 29.5630, longitude: 106.5516 },
  { id: 'nanjing', name: '南京', admin1: '江苏省', country: '中国', latitude: 32.0603, longitude: 118.7969 },
];

// WMO 天气代码映射字典
export const WMO_CODE_MAP = {
  0: { label: '晴', icon: 'sunny', nightIcon: 'moon', type: 'sunny' },
  1: { label: '大部晴朗', icon: 'partly-sunny', nightIcon: 'cloudy-night', type: 'sunny' },
  2: { label: '多云', icon: 'cloudy', nightIcon: 'cloudy-night', type: 'cloudy' },
  3: { label: '阴', icon: 'cloud', nightIcon: 'cloud', type: 'overcast' },
  45: { label: '雾', icon: 'water', nightIcon: 'water', type: 'fog' },
  48: { label: '冻雾', icon: 'snow', nightIcon: 'snow', type: 'fog' },
  51: { label: '轻微毛毛雨', icon: 'rainy', nightIcon: 'rainy', type: 'rain' },
  53: { label: '中度毛毛雨', icon: 'rainy', nightIcon: 'rainy', type: 'rain' },
  55: { label: '浓密毛毛雨', icon: 'rainy', nightIcon: 'rainy', type: 'rain' },
  56: { label: '轻微冻雨', icon: 'snow', nightIcon: 'snow', type: 'rain' },
  57: { label: '浓密冻雨', icon: 'snow', nightIcon: 'snow', type: 'rain' },
  61: { label: '小雨', icon: 'rainy', nightIcon: 'rainy', type: 'rain' },
  63: { label: '中雨', icon: 'rainy', nightIcon: 'rainy', type: 'rain' },
  65: { label: '大雨', icon: 'thunderstorm', nightIcon: 'thunderstorm', type: 'rain' },
  66: { label: '冻雨', icon: 'snow', nightIcon: 'snow', type: 'rain' },
  67: { label: '强冻雨', icon: 'snow', nightIcon: 'snow', type: 'rain' },
  71: { label: '小雪', icon: 'snow', nightIcon: 'snow', type: 'snow' },
  73: { label: '中雪', icon: 'snow', nightIcon: 'snow', type: 'snow' },
  75: { label: '大雪', icon: 'snow', nightIcon: 'snow', type: 'snow' },
  77: { label: '雪粒', icon: 'snow', nightIcon: 'snow', type: 'snow' },
  80: { label: '小阵雨', icon: 'rainy', nightIcon: 'rainy', type: 'rain' },
  81: { label: '阵雨', icon: 'rainy', nightIcon: 'rainy', type: 'rain' },
  82: { label: '强阵雨', icon: 'thunderstorm', nightIcon: 'thunderstorm', type: 'rain' },
  85: { label: '小阵雪', icon: 'snow', nightIcon: 'snow', type: 'snow' },
  86: { label: '大阵雪', icon: 'snow', nightIcon: 'snow', type: 'snow' },
  95: { label: '雷阵雨', icon: 'thunderstorm', nightIcon: 'thunderstorm', type: 'thunder' },
  96: { label: '雷雨伴有冰雹', icon: 'thunderstorm', nightIcon: 'thunderstorm', type: 'thunder' },
  99: { label: '强雷暴伴有冰雹', icon: 'thunderstorm', nightIcon: 'thunderstorm', type: 'thunder' },
};

// 获取天气信息配置
export function getWeatherInfo(code, isDay = 1) {
  const defaultInfo = { label: '晴', icon: 'sunny', nightIcon: 'moon', type: 'sunny' };
  const info = WMO_CODE_MAP[code] || defaultInfo;
  return {
    label: info.label,
    icon: isDay ? info.icon : info.nightIcon,
    type: info.type,
    isDay: Boolean(isDay),
  };
}

// 蒲福风级转换
export function getWindScale(speedKmh) {
  const mps = speedKmh / 3.6;
  if (mps < 0.3) return { level: 0, text: '无风' };
  if (mps < 1.6) return { level: 1, text: '软风' };
  if (mps < 3.4) return { level: 2, text: '轻风' };
  if (mps < 5.5) return { level: 3, text: '微风' };
  if (mps < 8.0) return { level: 4, text: '和风' };
  if (mps < 10.8) return { level: 5, text: '清风' };
  if (mps < 13.9) return { level: 6, text: '强风' };
  if (mps < 17.2) return { level: 7, text: '疾风' };
  if (mps < 20.8) return { level: 8, text: '大风' };
  if (mps < 24.5) return { level: 9, text: '烈风' };
  return { level: 10, text: '狂风' };
}

// 风向角度转换
export function getWindDirection(deg) {
  const directions = ['北风', '东北偏北', '东北风', '东北偏东', '东风', '东南偏东', '东南风', '东南偏南', '南风', '西南偏南', '西南风', '西南偏西', '西风', '西北偏西', '西北风', '西北偏北'];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

// 空气质量等级评估 (US AQI / 国标对应)
export function getAqiLevel(aqi) {
  if (aqi <= 50) {
    return { level: '优', color: '#27ae60', bgColor: 'rgba(39, 174, 96, 0.2)', desc: '空气质量令人满意，基本无空气污染，可正常进行户外活动。' };
  } else if (aqi <= 100) {
    return { level: '良', color: '#f1c40f', bgColor: 'rgba(241, 196, 15, 0.2)', desc: '空气质量可接受，极少数异常敏感人群应减少户外活动。' };
  } else if (aqi <= 150) {
    return { level: '轻度污染', color: '#e67e22', bgColor: 'rgba(230, 126, 34, 0.2)', desc: '易感人群症状有轻度加剧，儿童及老人应适当减少长时间户外运动。' };
  } else if (aqi <= 200) {
    return { level: '中度污染', color: '#e74c3c', bgColor: 'rgba(231, 76, 60, 0.2)', desc: '进一步加剧易感人群症状，建议佩戴防霾口罩外出。' };
  } else if (aqi <= 300) {
    return { level: '重度污染', color: '#9b59b6', bgColor: 'rgba(155, 89, 182, 0.2)', desc: '心脏病和肺病患者症状显著加剧，应尽量留在室内。' };
  } else {
    return { level: '严重污染', color: '#7f1d1d', bgColor: 'rgba(127, 29, 29, 0.2)', desc: '健康人群耐受力降低，强烈建议停留在室内，紧闭门窗。' };
  }
}

// 计算墨迹经典生活指数 (根据当前气温、降雨概率、湿度、风速、紫外线综合计算)
export function calculateLivingIndices(temp, humidity, windKmh, uvIndex = 0, rainProb = 0) {
  // 1. 穿衣指数
  let dressing = { name: '穿衣', icon: 'shirt-outline', level: '', tip: '' };
  if (temp >= 28) {
    dressing.level = '炎热';
    dressing.tip = '建议穿短衫、短裤、薄T恤等轻凉夏装。';
  } else if (temp >= 22) {
    dressing.level = '舒适';
    dressing.tip = '建议穿单层棉麻面料短套装、T恤衫、薄牛仔衫裤。';
  } else if (temp >= 16) {
    dressing.level = '温凉';
    dressing.tip = '建议穿套装、夹克衫、风衣、薄毛衣等春秋过渡装。';
  } else if (temp >= 10) {
    dressing.level = '较冷';
    dressing.tip = '建议穿风衣、大衣、夹大衣、毛衣加外套等保暖衣物。';
  } else if (temp >= 0) {
    dressing.level = '寒冷';
    dressing.tip = '建议穿棉衣、冬大衣、皮夹克、厚毛衣，注意头部保暖。';
  } else {
    dressing.level = '极寒';
    dressing.tip = '建议穿厚羽绒服、皮草重装防寒，戴好手套围巾。';
  }

  // 2. 紫外线指数
  let uv = { name: '紫外线', icon: 'sunny-outline', level: '', tip: '' };
  if (uvIndex < 3) {
    uv.level = '最弱';
    uv.tip = '辐射强度弱，外出无需特别涂抹防晒用品。';
  } else if (uvIndex < 6) {
    uv.level = '中等';
    uv.tip = '外出可涂抹 SPF15 以上防晒霜，戴遮阳帽或太阳镜。';
  } else if (uvIndex < 8) {
    uv.level = '强';
    uv.tip = '外出需涂抹 SPF25+ 防晒霜，尽量在遮阴处行走。';
  } else {
    uv.level = '极强';
    uv.tip = '尽可能避免在 10:00-16:00 暴露在阳光下，加强全面防晒。';
  }

  // 3. 感冒指数
  let flu = { name: '感冒', icon: 'medkit-outline', level: '', tip: '' };
  if (temp > 20 && humidity > 40 && humidity < 70) {
    flu.level = '少发';
    flu.tip = '天气条件良好，各类人群均不易患感冒。';
  } else if (temp < 10 || humidity < 30) {
    flu.level = '易发';
    flu.tip = '早晚温差大或空气干燥，注意增添衣物预防感冒。';
  } else {
    flu.level = '极易发';
    flu.tip = '气温骤降或风力强劲，体质较弱者极易受凉，外出注意防风。';
  }

  // 4. 洗车指数
  let carWash = { name: '洗车', icon: 'car-sport-outline', level: '', tip: '' };
  if (rainProb >= 40) {
    carWash.level = '不宜';
    carWash.tip = '近期有降水预报，洗车后容易被雨水冲脏。';
  } else if (windKmh > 25) {
    carWash.level = '较不宜';
    carWash.tip = '风力较大，道路扬尘多，洗车后易再次积尘。';
  } else {
    carWash.level = '适宜';
    carWash.tip = '天气晴朗无雨，风力平稳，适宜洗车。';
  }

  // 5. 运动指数
  let sport = { name: '运动', icon: 'bicycle-outline', level: '', tip: '' };
  if (rainProb >= 50 || temp > 35 || temp < -5) {
    sport.level = '不适宜';
    sport.tip = '受天气影响，建议留在室内进行力量或瑜伽锻炼。';
  } else if (temp >= 15 && temp <= 26 && humidity <= 75) {
    sport.level = '极佳';
    sport.tip = '户外温度适宜，非常适合慢跑、骑行、羽毛球等运动。';
  } else {
    sport.level = '较适宜';
    sport.tip = '可以进行适度户外活动，运动前注意做好热身。';
  }

  // 6. 雨伞指数
  let umbrella = { name: '雨伞', icon: 'umbrella-outline', level: '', tip: '' };
  if (rainProb >= 60) {
    umbrella.level = '带伞';
    umbrella.tip = '有降雨风险，出门务必随身携带雨伞。';
  } else if (rainProb >= 25) {
    umbrella.level = '建议带伞';
    umbrella.tip = '可能有局地阵雨，建议包内常备一把折叠伞。';
  } else {
    umbrella.level = '无需带伞';
    umbrella.tip = '天气晴朗无降水，可以安心轻装出门。';
  }

  // 7. 晾晒指数
  let dry = { name: '晾晒', icon: 'sparkles-outline', level: '', tip: '' };
  if (rainProb >= 40 || humidity > 80) {
    dry.level = '不宜';
    dry.tip = '湿度大或有雨，衣物不易干燥，建议室内烘干。';
  } else if (humidity < 60 && temp > 15) {
    dry.level = '极佳';
    dry.tip = '阳光充沛、空气干燥通风，十分适宜大件衣被晾晒。';
  } else {
    dry.level = '较适宜';
    dry.tip = '可进行基本晾晒，收衣请在傍晚前进行。';
  }

  // 8. 舒适度指数
  let comfort = { name: '舒适度', icon: 'happy-outline', level: '', tip: '' };
  if (temp >= 18 && temp <= 25 && humidity >= 40 && humidity <= 65) {
    comfort.level = '舒适';
    comfort.tip = '温度湿度恰到好处，人体感觉极其舒适。';
  } else if (temp > 28) {
    comfort.level = '偏热闷热';
    comfort.tip = '注意适当开空调或风扇，补充充足水分。';
  } else if (temp < 10) {
    comfort.level = '阴冷偏凉';
    comfort.tip = '体感温度低，注意适度保温防寒。';
  } else {
    comfort.level = '较舒适';
    comfort.tip = '总体体感平和，状态良好。';
  }

  return [dressing, uv, flu, carWash, sport, umbrella, dry, comfort];
}

// 获取未来两小时墨迹特色分钟级短时降水描述
export function getShortTermRainForecast(hourlyRain, currentCode) {
  const isCurrentlyRaining = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(currentCode);
  if (isCurrentlyRaining) {
    return {
      hasRain: true,
      summary: '当前正在降雨，出门请带好雨具，注意路面湿滑',
      badge: '雨天提醒',
      color: '#3498db',
    };
  }
  
  // 检查前两小时是否有雨
  const next2Hours = hourlyRain ? hourlyRain.slice(0, 3) : [];
  const willRain = next2Hours.some(prob => prob >= 40);
  if (willRain) {
    return {
      hasRain: true,
      summary: '未来两小时内可能有阵雨，建议出门携带雨具',
      badge: '降水预警',
      color: '#e67e22',
    };
  }

  return {
    hasRain: false,
    summary: '未来两小时无降雨，蓝天开朗，适合出行',
    badge: '天气晴好',
    color: '#2ecc71',
  };
}

// 统一请求实时全量天气数据 (Forecast + Air Quality)
export async function fetchCompleteWeather(latitude, longitude) {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,pressure_msl,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max&timezone=auto`;
  
  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=auto`;

  try {
    const [weatherRes, aqiRes] = await Promise.all([
      fetch(weatherUrl).then(r => r.json()),
      fetch(aqiUrl).then(r => r.json()).catch(() => null), // 允许 AQI 降级
    ]);

    if (!weatherRes || !weatherRes.current) {
      throw new Error('获取天气数据失败，请重试');
    }

    const current = weatherRes.current;
    const hourly = weatherRes.hourly || {};
    const daily = weatherRes.daily || {};
    const aqiData = aqiRes && aqiRes.current ? aqiRes.current : null;

    // 当前时间定位到 hourly
    const currentHourStr = current.time ? current.time.slice(0, 13) : '';
    let startHourIndex = 0;
    if (hourly.time) {
      const idx = hourly.time.findIndex(t => t.startsWith(currentHourStr));
      if (idx !== -1) startHourIndex = idx;
    }

    // 处理 24 小时逐小时数据
    const hourlyList = [];
    const maxHourlyItems = 24;
    for (let i = startHourIndex; i < Math.min(startHourIndex + maxHourlyItems, (hourly.time || []).length); i++) {
      const timeStr = hourly.time[i];
      const hour = new Date(timeStr).getHours();
      const code = hourly.weather_code[i];
      const isDayHour = hour >= 6 && hour < 19 ? 1 : 0;
      const weather = getWeatherInfo(code, isDayHour);
      hourlyList.push({
        timeStr,
        displayTime: i === startHourIndex ? '现在' : `${String(hour).padStart(2, '0')}:00`,
        temp: Math.round(hourly.temperature_2m[i]),
        apparentTemp: Math.round(hourly.apparent_temperature[i]),
        rainProb: hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0,
        weather,
        windSpeed: Math.round(hourly.wind_speed_10m[i]),
        pressure: Math.round(hourly.pressure_msl[i]),
      });
    }

    // 处理 7-15 天预报
    const dailyList = [];
    const dailyDays = (daily.time || []).length;
    for (let i = 0; i < dailyDays; i++) {
      const dateStr = daily.time[i];
      const date = new Date(dateStr);
      let dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
      if (i === 0) dayName = '今天';
      if (i === 1) dayName = '明天';
      if (i === 2) dayName = '后天';

      const code = daily.weather_code[i];
      const weather = getWeatherInfo(code, 1);
      dailyList.push({
        dateStr,
        dayName,
        monthDay: `${date.getMonth() + 1}/${date.getDate()}`,
        maxTemp: Math.round(daily.temperature_2m_max[i]),
        minTemp: Math.round(daily.temperature_2m_min[i]),
        weather,
        rainProb: daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0,
        uvMax: daily.uv_index_max ? Math.round(daily.uv_index_max[i]) : 0,
        sunrise: daily.sunrise ? daily.sunrise[i].slice(11, 16) : '06:00',
        sunset: daily.sunset ? daily.sunset[i].slice(11, 16) : '18:30',
      });
    }

    // 当前天气解析
    const currentWeatherInfo = getWeatherInfo(current.weather_code, current.is_day);
    const windScale = getWindScale(current.wind_speed_10m);
    const windDirection = getWindDirection(current.wind_direction_10m);

    // 空气质量信息
    const aqiVal = aqiData ? Math.round(aqiData.us_aqi || 45) : 42;
    const aqiLevel = getAqiLevel(aqiVal);
    const aqiDetails = {
      aqi: aqiVal,
      level: aqiLevel.level,
      color: aqiLevel.color,
      bgColor: aqiLevel.bgColor,
      desc: aqiLevel.desc,
      pm25: aqiData ? Math.round(aqiData.pm2_5 || 25) : 25,
      pm10: aqiData ? Math.round(aqiData.pm10 || 45) : 45,
      o3: aqiData ? Math.round(aqiData.ozone || 30) : 30,
      no2: aqiData ? Math.round(aqiData.nitrogen_dioxide || 20) : 20,
      so2: aqiData ? Math.round(aqiData.sulphur_dioxide || 8) : 8,
      co: aqiData ? Math.round(aqiData.carbon_monoxide || 500) : 500,
    };

    // 今日紫外线和降雨概率
    const todayUv = daily.uv_index_max ? daily.uv_index_max[0] : 4;
    const todayRainProb = hourlyList.length > 0 ? hourlyList[0].rainProb : 10;

    // 生活指数
    const livingIndices = calculateLivingIndices(
      current.temperature_2m,
      current.relative_humidity_2m,
      current.wind_speed_10m,
      todayUv,
      todayRainProb
    );

    // 短时降雨预测
    const shortTermRain = getShortTermRainForecast(
      hourlyList.map(h => h.rainProb),
      current.weather_code
    );

    return {
      current: {
        temp: Math.round(current.temperature_2m),
        apparentTemp: Math.round(current.apparent_temperature),
        humidity: Math.round(current.relative_humidity_2m),
        precipitation: current.precipitation || 0,
        pressure: Math.round(current.pressure_msl || 1013),
        windSpeed: Math.round(current.wind_speed_10m),
        windScale,
        windDirection,
        weather: currentWeatherInfo,
        isDay: Boolean(current.is_day),
        updateTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      },
      today: {
        maxTemp: dailyList.length > 0 ? dailyList[0].maxTemp : Math.round(current.temperature_2m + 4),
        minTemp: dailyList.length > 0 ? dailyList[0].minTemp : Math.round(current.temperature_2m - 4),
        sunrise: dailyList.length > 0 ? dailyList[0].sunrise : '06:00',
        sunset: dailyList.length > 0 ? dailyList[0].sunset : '18:30',
        uvIndex: Math.round(todayUv),
      },
      hourly: hourlyList,
      daily: dailyList,
      aqi: aqiDetails,
      livingIndices,
      shortTermRain,
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
}

// 城市地理编码搜索 (支持中文名称与拼音，Open-Meteo Geocoding)
export async function searchCities(keyword) {
  if (!keyword || keyword.trim().length === 0) return [];
  const cleanKeyword = keyword.trim();
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanKeyword)}&count=10&language=zh&format=json`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data || !data.results) return [];

    return data.results.map(item => ({
      id: `${item.id}`,
      name: item.name,
      admin1: item.admin1 || item.admin2 || '',
      country: item.country || '',
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone,
    }));
  } catch (err) {
    console.error('City search failed:', err);
    return [];
  }
}

// 墨迹天气纯净版 - 高精度 GPS / 网络自动定位与逆地理编码服务
import { NativeModules, Platform, PermissionsAndroid } from 'react-native';

const DEFAULT_NANCHANG = {
  id: 'nanchang_gps',
  name: '南昌市',
  city: '南昌',
  district: '',
  street: '',
  admin1: '江西省',
  country: '中国',
  latitude: 28.6829,
  longitude: 115.8906,
  isGps: true,
};

/**
 * 请求 Android 系统定位权限 (ACCESS_FINE_LOCATION)
 */
export async function requestLocationPermission() {
  if (Platform.OS !== 'android') return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: '墨迹天气定位权限申请',
        message: '墨迹天气需要获取您的 GPS 位置，以便为您呈现当前街道和精确气象预报。',
        buttonNeutral: '稍后询问',
        buttonNegative: '拒绝',
        buttonPositive: '允许定位',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Location permission request error:', err);
    return false;
  }
}

/**
 * 逆地理编码（通过经纬度查询高精度街道、区县与城市名称）
 */
async function reverseGeocodeOSM(latitude, longitude) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=zh-CN,zh`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MojiWeatherPure/1.1.4',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const city = addr.city || addr.town || addr.county || '南昌';
        const district = addr.suburb || addr.city_district || addr.district || '';
        const street = addr.road || addr.neighbourhood || addr.pedestrian || '';

        let displayName = city.replace('市', '');
        if (district && street) {
          displayName = `${displayName}·${district} ${street}`;
        } else if (district) {
          displayName = `${displayName}·${district}`;
        } else if (street) {
          displayName = `${displayName}·${street}`;
        }

        return {
          city: city.replace('市', ''),
          district,
          street,
          province: addr.province || addr.state || '江西省',
          displayName,
        };
      }
    }
  } catch (e) {
    console.warn('Reverse geocode failed:', e);
  }
  return null;
}

/**
 * IP 网络高精度兜底定位
 */
async function getIPLocationFallback() {
  const ipApis = [
    'https://api.ip.sb/geoip',
    'http://ip-api.com/json/?lang=zh-CN',
    'https://ipapi.co/json/',
  ];

  for (const api of ipApis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(api, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const lat = data.latitude || data.lat;
        const lon = data.longitude || data.lon;
        const city = data.city || '南昌';
        const region = data.region || data.region_name || '江西省';

        if (lat && lon) {
          // 尝试逆地理编码精确到街道
          const geo = await reverseGeocodeOSM(lat, lon);
          return {
            id: `loc_ip_${Date.now()}`,
            name: geo?.displayName || `${city}市`,
            city: geo?.city || city,
            district: geo?.district || '',
            street: geo?.street || '',
            admin1: geo?.province || region,
            country: '中国',
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            isGps: false,
          };
        }
      }
    } catch (e) {
      // try next
    }
  }

  return DEFAULT_NANCHANG;
}

/**
 * 获取当前高精度自动定位（原生 GPS -> 逆地理街道 -> IP 兜底）
 */
export async function getAutoCurrentLocation() {
  // 1. Android 原生 LocationModule 优先 (GPS / 基站网络高精度定位)
  if (NativeModules.LocationModule && NativeModules.LocationModule.getCurrentLocation) {
    try {
      // 检查或申请定位权限
      await requestLocationPermission();

      const locResult = await NativeModules.LocationModule.getCurrentLocation();
      if (locResult && locResult.hasPermission && locResult.latitude && locResult.longitude) {
        const lat = locResult.latitude;
        const lon = locResult.longitude;
        let displayName = locResult.displayName || locResult.name;
        let finalDistrict = locResult.district || '';
        let finalStreet = locResult.street || '';
        let finalProvince = locResult.province || '';
        let finalCity = locResult.city || '';

        // 如果原生 Geocoder 未获取到街道信息，使用在线接口二次增强精度
        if (!finalStreet || !finalDistrict || !finalCity) {
          const enhanced = await reverseGeocodeOSM(lat, lon);
          if (enhanced) {
            if (enhanced.displayName && (!displayName || !displayName.includes('·'))) {
              displayName = enhanced.displayName;
            }
            if (!finalCity) finalCity = enhanced.city;
            if (!finalDistrict) finalDistrict = enhanced.district;
            if (!finalStreet) finalStreet = enhanced.street;
            if (!finalProvince) finalProvince = enhanced.province;
          }
        }

        const cityLabel = finalCity || '南昌';

        return {
          id: `loc_gps_${Date.now()}`,
          name: displayName || `${cityLabel}市`,
          city: cityLabel,
          district: finalDistrict,
          street: finalStreet,
          admin1: finalProvince,
          country: '中国',
          latitude: lat,
          longitude: lon,
          isGps: true,
          accuracy: locResult.accuracy,
        };
      }
    } catch (e) {
      console.warn('Native GPS Location failed, falling back to IP/Browser:', e);
    }
  }

  // 2. Web / 浏览器平台 HTML5 Geolocation API
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 4000,
          maximumAge: 60000,
        });
      });

      if (pos && pos.coords) {
        const { latitude, longitude } = pos.coords;
        const geo = await reverseGeocodeOSM(latitude, longitude);
        return {
          id: `loc_h5_${Date.now()}`,
          name: geo?.displayName || '当前定位',
          city: geo?.city || '南昌',
          district: geo?.district || '',
          street: geo?.street || '',
          admin1: geo?.province || '江西省',
          country: '中国',
          latitude,
          longitude,
          isGps: true,
        };
      }
    } catch (e) {
      // fallback
    }
  }

  // 3. 网络 IP 高精度兜底定位
  return await getIPLocationFallback();
}

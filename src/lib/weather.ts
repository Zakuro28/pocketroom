import { useCallback, useEffect, useState } from 'react'

// Live weather from Open-Meteo (free, no key). The place is saved on this device only.
export type Place = { lat: number; lon: number; name: string }
export type Kind = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm'
export type Weather = { kind: Kind; isDay: boolean; temp: number }

const KEY = 'pocketroom:place'
const ASKED = 'pocketroom:place-asked'

const loadPlace = (): Place | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null') as Place | null
  } catch {
    return null
  }
}

function kindOf(code: number): Kind {
  if (code <= 1) return 'clear'
  if (code <= 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'storm'
  return 'rain'
}

export async function searchCity(q: string): Promise<Place[]> {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5`)
  const j = (await r.json()) as { results?: { latitude: number; longitude: number; name: string; country?: string; admin1?: string }[] }
  return (j.results ?? []).map((x) => ({ lat: x.latitude, lon: x.longitude, name: [x.name, x.admin1, x.country].filter(Boolean).join(', ') }))
}

async function fetchWeather(p: Place): Promise<Weather> {
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=weather_code,is_day,temperature_2m&timezone=auto`)
  const j = (await r.json()) as { current: { weather_code: number; is_day: number; temperature_2m: number } }
  return { kind: kindOf(j.current.weather_code), isDay: j.current.is_day === 1, temp: Math.round(j.current.temperature_2m) }
}

/** The player's place and its weather, refreshed every 15 minutes. Without a place, the sky just follows the clock. */
export function useWeather() {
  const [place, setPlaceState] = useState<Place | null>(loadPlace)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [asked, setAsked] = useState(() => {
    try {
      return localStorage.getItem(ASKED) === '1' || loadPlace() !== null
    } catch {
      return true
    }
  })

  const setPlace = useCallback((p: Place | null) => {
    setPlaceState(p)
    try {
      if (p) localStorage.setItem(KEY, JSON.stringify(p))
      localStorage.setItem(ASKED, '1')
    } catch {
      // Not remembered; it will ask again next time
    }
    setAsked(true)
  }, [])

  const useMyLocation = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        if (!navigator.geolocation) return resolve(false)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setPlace({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: 'Your location' })
            resolve(true)
          },
          () => resolve(false),
          { timeout: 10000, maximumAge: 3600_000 },
        )
      }),
    [setPlace],
  )

  useEffect(() => {
    if (!place) return
    let live = true
    const get = () => fetchWeather(place).then((w) => live && setWeather(w), () => {})
    void get()
    const id = setInterval(get, 15 * 60_000)
    return () => {
      live = false
      clearInterval(id)
    }
  }, [place])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(ASKED, '1')
    } catch {
      // ignore
    }
    setAsked(true)
  }, [])

  return { place, weather: place ? weather : null, asked, setPlace, useMyLocation, dismiss }
}

/** Sky colors for the weather and time of day: top and bottom of the background, and what shows through the windows */
export function skyColors(w: Weather | null, hour: number) {
  const night = w ? !w.isDay : hour < 6 || hour >= 19
  const golden = !night && (hour < 8 || hour >= 17)
  const kind = w?.kind ?? 'clear'
  if (night) {
    if (kind === 'clear') return { top: '#18204a', bottom: '#4a3f7a', window: '#2a3170' }
    return { top: '#20242f', bottom: '#454a5c', window: '#353a4a' }
  }
  if (kind === 'storm') return { top: '#5b6475', bottom: '#9aa3b2', window: '#7d8697' }
  if (kind === 'rain') return { top: '#8797ab', bottom: '#cdd6e0', window: '#a9b6c6' }
  if (kind === 'snow') return { top: '#c9d6e6', bottom: '#f2f6fb', window: '#e2ebf5' }
  if (kind === 'fog') return { top: '#c7ccd2', bottom: '#eceef0', window: '#dfe2e6' }
  if (kind === 'cloudy') return golden ? { top: '#c9a99a', bottom: '#f1dcc9', window: '#e7c9b4' } : { top: '#a9bfd3', bottom: '#e6eef5', window: '#cbdbe8' }
  return golden ? { top: '#ff9f80', bottom: '#ffe1b3', window: '#ffc59a' } : { top: '#7cc6f2', bottom: '#e3f4ff', window: '#a9dcf8' }
}

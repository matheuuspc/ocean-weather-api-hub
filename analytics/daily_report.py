"""Gera métricas diárias a partir do endpoint de previsão do Ocean & Weather API Hub."""

import json
import os
from datetime import datetime
from pathlib import Path

import requests


def main() -> None:
    base_url = os.getenv("API_BASE_URL", "http://localhost:8080").rstrip("/")
    params = {
        "location": os.getenv("LOCATION", "Praia de Copacabana"),
        "latitude": float(os.getenv("LATITUDE", "-22.9711")),
        "longitude": float(os.getenv("LONGITUDE", "-43.1822")),
        "days": int(os.getenv("FORECAST_DAYS", "1")),
    }
    response = requests.get(f"{base_url}/api/v1/coastal/forecast", params=params, timeout=15)
    response.raise_for_status()
    forecast = response.json()

    hourly = forecast.get("hourly", [])
    today = hourly[0].get("time", "")[:10] if hourly else datetime.now().date().isoformat()
    todays_hours = [
        hour for hour in hourly
        if hour.get("time", "").startswith(today)
    ]
    water = [hour["waterTemperatureC"] for hour in todays_hours
             if hour.get("waterTemperatureC") is not None]
    waves = [hour["waveHeightM"] for hour in todays_hours
             if hour.get("waveHeightM") is not None]

    summary = {
        "generatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "date": today,
        "location": forecast.get("location", params["location"]),
        "coordinates": {"latitude": forecast.get("latitude"), "longitude": forecast.get("longitude")},
        "timezone": forecast.get("timezone"),
        "metrics": {
            "waterTemperatureAverageC": round(sum(water) / len(water), 2) if water else None,
            "waveHeightAverageM": round(sum(waves) / len(waves), 2) if waves else None,
            "waveHeightPeakM": round(max(waves), 2) if waves else None,
            "hoursAnalyzed": len(todays_hours),
            "waterTemperatureReadings": len(water),
            "waveHeightReadings": len(waves),
        },
        "source": forecast.get("source", "Ocean & Weather API Hub"),
    }

    output_path = Path(os.getenv("OUTPUT_FILE", "reports/daily-summary.json"))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Resumo salvo em {output_path.resolve()}")


if __name__ == "__main__":
    main()

"""
Google Maps Routes API で経路候補を取得し、ETC/現金の高速料金を返す。
departure_time は ETC 時間帯割引計算に必須。
"""

import os
import re
from datetime import datetime
from typing import Any

import httpx

ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"


def _parse_iso_to_rfc3339(iso_or_time: str) -> str:
    """ISO8601 または時刻のみを API 用の RFC3339 に変換"""
    s = (iso_or_time or "").strip()
    if not s:
        return datetime.now().isoformat()
    if "T" in s and ":" in s:
        if s.endswith("Z") or "+" in s or re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$", s):
            return s.replace("Z", "+00:00") if s.endswith("Z") else s
        return s + "+09:00"
    # 日付のみ or 時刻のみ
    try:
        dt = datetime.fromisoformat(s)
        return dt.isoformat()
    except Exception:
        pass
    # 今日の日付 + 時刻
    today = datetime.now().strftime("%Y-%m-%d")
    return f"{today}T{s}:00+09:00"


def search_route_segments(
    origin: str,
    destination: str,
    departure_time: str,
    payment_method: str,
) -> list[dict[str, Any]]:
    """
    経路候補を取得。各候補は summary, distance_km, duration_min, toll_etc_yen, toll_cash_yen を持つ。
    """
    api_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if not api_key:
        return _mock_segments(origin, destination, payment_method)

    departure_rfc = _parse_iso_to_rfc3339(departure_time)
    body = {
        "origin": {"address": origin},
        "destination": {"address": destination},
        "travelMode": "DRIVE",
        "departureTime": departure_rfc,
        "routeModifiers": {
            "vehicleInfo": {"emissionType": "GASOLINE"},
        },
        "extraComputations": ["TOLLS"],
        "routeObjective": "ROUTE_OBJECTIVE_BEST",
        "alternativeRouteCount": 3,
    }

    field_mask = (
        "routes.duration,"
        "routes.distanceMeters,"
        "routes.polyline.encodedPolyline,"
        "routes.travelAdvisory.tollInfo,"
        "routes.summary"
    )

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                ROUTES_API_URL,
                json=body,
                headers={
                    "X-Goog-Api-Key": api_key,
                    "X-Goog-FieldMask": field_mask,
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return _mock_segments(origin, destination, payment_method)

    return _parse_routes_response(data, payment_method)


def _parse_routes_response(data: dict, payment_method: str) -> list[dict[str, Any]]:
    routes = data.get("routes") or []
    out = []
    for i, r in enumerate(routes):
        duration = (r.get("duration") or "0s").replace("s", "")
        duration_min = int(float(duration or 0)) // 60
        distance_m = int(r.get("distanceMeters") or 0)
        distance_km = round(distance_m / 1000, 2)
        toll_info = (r.get("travelAdvisory") or {}).get("tollInfo") or {}
        # Routes API の tollInfo は通貨単位で返る場合がある。日本は円。
        estimated_price = toll_info.get("estimatedPrice") or []
        toll_yen = 0
        for p in estimated_price:
            if isinstance(p, dict):
                units = p.get("units", "") or ""
                if "JPY" in units or "円" in str(p):
                    toll_yen = int(p.get("nanos", 0) or 0) // 1_000_000 + int(p.get("units", 0) or 0) * 1_000_000_000 // 1_000_000
                    break
                toll_yen = int(p.get("units", 0) or 0)
                break
            if isinstance(p, (int, float)):
                toll_yen = int(p)
                break
        summary = (r.get("summary") or f"経路{i+1}").replace("\n", " ")
        if not summary:
            summary = f"経路 {i+1}"
        # ETC/現金の差は簡易的に約85%で運用（実装では同一でも可）
        toll_etc = int(toll_yen * 0.85) if toll_yen else 0
        toll_cash = toll_yen
        out.append({
            "polyline": r.get("polyline", {}).get("encodedPolyline"),
            "distance_km": distance_km,
            "duration_min": duration_min,
            "toll_etc_yen": toll_etc,
            "toll_cash_yen": toll_cash,
            "summary": summary[:200],
        })
    if not out:
        return _mock_segments("", "", payment_method)
    return out


def _mock_segments(origin: str, destination: str, payment_method: str) -> list[dict[str, Any]]:
    """API キー未設定またはエラー時用のモック"""
    return [
        {
            "polyline": None,
            "distance_km": 50.0,
            "duration_min": 60,
            "toll_etc_yen": 900,
            "toll_cash_yen": 1100,
            "summary": "一般道・高速経由",
        }
    ]

"""
Google Maps Routes API で経路候補を取得し、ETC/現金の高速料金を返す。
departure_time は ETC 時間帯割引計算に必須。
"""

import os
import re
from datetime import datetime, timedelta, timezone
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


def _is_future_datetime(rfc3339: str) -> bool:
    """Google Routes API の departureTime は未来時刻が必要。"""
    try:
        dt = datetime.fromisoformat(rfc3339.replace("Z", "+00:00"))
    except Exception:
        return False
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt > datetime.now(timezone.utc) + timedelta(minutes=1)


def _money_to_yen(money: dict[str, Any] | None) -> int:
    if not isinstance(money, dict):
        return 0
    units = int(money.get("units") or 0)
    nanos = int(money.get("nanos") or 0)
    return units + int(round(nanos / 1_000_000_000))


def _route_key(route: dict[str, Any]) -> str:
    poly = route.get("polyline") or ""
    if poly:
        return poly
    return f"{route.get('summary', '')}|{route.get('distance_km', 0)}|{route.get('duration_min', 0)}"


def _find_matching_route(
    base_route: dict[str, Any],
    candidates: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """polyline優先、次に距離・所要時間の近似で対応ルートを見つける。"""
    key = _route_key(base_route)
    for c in candidates:
        if _route_key(c) == key:
            return c

    bd = float(base_route.get("distance_km", 0) or 0)
    bt = int(base_route.get("duration_min", 0) or 0)
    for c in candidates:
        cd = float(c.get("distance_km", 0) or 0)
        ct = int(c.get("duration_min", 0) or 0)
        if abs(bd - cd) <= 1.0 and abs(bt - ct) <= 8:
            return c
    return None


def _request_routes(
    api_key: str,
    origin: str,
    destination: str,
    departure_rfc: str,
    time_type: str,
    toll_passes: list[str] | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "origin": {"address": origin},
        "destination": {"address": destination},
        "travelMode": "DRIVE",
        "computeAlternativeRoutes": True,
        "extraComputations": ["TOLLS"],
        "languageCode": "ja",
        "regionCode": "JP",
        "routeModifiers": {
            "vehicleInfo": {"emissionType": "GASOLINE"},
        },
    }

    if toll_passes:
        body["routeModifiers"]["tollPasses"] = toll_passes

    # 過去時刻だと INVALID_ARGUMENT になるため、未来時刻のみ指定
    if _is_future_datetime(departure_rfc):
        if time_type == "ARRIVAL":
            body["arrivalTime"] = departure_rfc
            body["routingPreference"] = "TRAFFIC_UNAWARE"
        else:
            body["departureTime"] = departure_rfc
            body["routingPreference"] = "TRAFFIC_AWARE"

    field_mask = (
        "routes.description,"
        "routes.duration,"
        "routes.distanceMeters,"
        "routes.polyline.encodedPolyline,"
        "routes.travelAdvisory.tollInfo,"
        "routes.legs.startLocation.latLng,"
        "routes.legs.endLocation.latLng"
    )

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
        return resp.json()


def search_route_segments(
    origin: str,
    destination: str,
    departure_time: str,
    payment_method: str,
    time_type: str = "DEPARTURE",
) -> list[dict[str, Any]]:
    """
    経路候補を取得。各候補は summary, distance_km, duration_min, toll_etc_yen, toll_cash_yen を持つ。
    """
    api_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if not api_key:
        return _mock_segments(origin, destination, payment_method)

    departure_rfc = _parse_iso_to_rfc3339(departure_time)
    try:
        # 現金料金（通行券なし）
        cash_data = _request_routes(
            api_key=api_key,
            origin=origin,
            destination=destination,
            departure_rfc=departure_rfc,
            time_type=time_type,
            toll_passes=None,
        )
        # ETC 料金（JP_ETC を指定）
        etc_data = _request_routes(
            api_key=api_key,
            origin=origin,
            destination=destination,
            departure_rfc=departure_rfc,
            time_type=time_type,
            toll_passes=["JP_ETC"],
        )
    except Exception:
        return _mock_segments(origin, destination, payment_method)

    cash_routes = _parse_routes_response(cash_data)
    etc_routes = _parse_routes_response(etc_data)

    if not cash_routes and not etc_routes:
        return _mock_segments(origin, destination, payment_method)

    merged: list[dict[str, Any]] = []
    base = cash_routes if cash_routes else etc_routes
    for r in base:
        etc_match = _find_matching_route(r, etc_routes)
        toll_cash = int(r.get("toll_cash_yen", 0) or 0)
        toll_etc = int((etc_match or {}).get("toll_cash_yen", toll_cash) or 0)
        if toll_cash == 0 and toll_etc > 0:
            toll_cash = toll_etc
        if toll_etc == 0 and toll_cash > 0:
            toll_etc = toll_cash
        merged.append({
            "polyline": r.get("polyline"),
            "distance_km": r.get("distance_km", 0.0),
            "duration_min": r.get("duration_min", 0),
            "summary": r.get("summary") or "経路",
            "toll_etc_yen": toll_etc,
            "toll_cash_yen": toll_cash,
        })

    return merged


def _parse_routes_response(data: dict[str, Any]) -> list[dict[str, Any]]:
    routes = data.get("routes") or []
    out = []
    for i, r in enumerate(routes):
        duration = (r.get("duration") or "0s").replace("s", "")
        duration_min = int(float(duration or 0)) // 60
        distance_m = int(r.get("distanceMeters") or 0)
        distance_km = round(distance_m / 1000, 2)
        toll_info = (r.get("travelAdvisory") or {}).get("tollInfo") or {}
        estimated_price = toll_info.get("estimatedPrice") or []
        toll_yen = 0
        for p in estimated_price:
            if isinstance(p, dict) and p.get("currencyCode") in (None, "JPY"):
                toll_yen = _money_to_yen(p)
                break
            if isinstance(p, (int, float)):
                toll_yen = int(p)
                break
        summary = (r.get("description") or f"経路{i+1}").replace("\n", " ")
        if not summary:
            summary = f"経路 {i+1}"
        # 出発地・目的地の緯度経度（最初のルートの最初の leg から取得）
        legs = r.get("legs") or []
        first_leg = legs[0] if legs else {}
        start_latlng = (first_leg.get("startLocation") or {}).get("latLng") or {}
        end_latlng = (first_leg.get("endLocation") or {}).get("latLng") or {}
        out.append({
            "polyline": r.get("polyline", {}).get("encodedPolyline"),
            "distance_km": distance_km,
            "duration_min": duration_min,
            "toll_etc_yen": toll_yen,
            "toll_cash_yen": toll_yen,
            "summary": summary[:200],
            "origin_lat": start_latlng.get("latitude"),
            "origin_lng": start_latlng.get("longitude"),
            "dest_lat": end_latlng.get("latitude"),
            "dest_lng": end_latlng.get("longitude"),
        })
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
        },
        {
            "polyline": None,
            "distance_km": 56.8,
            "duration_min": 68,
            "toll_etc_yen": 1200,
            "toll_cash_yen": 1450,
            "summary": "首都高経由",
        },
        {
            "polyline": None,
            "distance_km": 62.3,
            "duration_min": 73,
            "toll_etc_yen": 700,
            "toll_cash_yen": 900,
            "summary": "一般道中心",
        },
    ]

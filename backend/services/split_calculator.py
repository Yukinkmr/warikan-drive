"""
割り勘計算ロジック
W = driver_weight + 1.0 * (people - 1)
driver_yen = round(total_yen * driver_weight / W)
passenger_yen = round(total_yen * 1.0 / W)
"""

from decimal import Decimal


def calculate_split(
    *,
    distance_km: float,
    toll_yen: int,
    fuel_efficiency: float,
    gas_price: int,
    extra_yen: int,
    people: int,
    driver_weight: float,
) -> dict:
    fuel_liters = distance_km / fuel_efficiency
    fuel_yen = round(fuel_liters * gas_price)
    total_yen = toll_yen + fuel_yen + extra_yen

    if people <= 1:
        driver_yen = total_yen
        passenger_yen = 0
    else:
        w = driver_weight + 1.0 * (people - 1)
        driver_yen = round(total_yen * driver_weight / w)
        passenger_yen = round(total_yen * 1.0 / w)

    return {
        "total_yen": total_yen,
        "toll_yen": toll_yen,
        "fuel_yen": fuel_yen,
        "extra_yen": extra_yen,
        "distance_km": distance_km,
        "driver_yen": driver_yen,
        "passenger_yen": passenger_yen,
    }

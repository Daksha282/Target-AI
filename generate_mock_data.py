"""
Mock data generator for Target-AI Inventory Intelligence Dashboard.
Deterministic (seeded) so output is reproducible.
Produces: stores.json, skus.json, inventory.json, salesHistory.json

Story SKUs (behave consistently across all stores):
  SKU-1001  owned, 21-day lead, onHand below reorder point  -> LOW-STOCK
  SKU-1002  slow mover, huge on-hand                         -> EXCESS
  SKU-1003  3-week gap in recent sales history               -> DATA-QUALITY / LOW CONFIDENCE
  others    comfortable cover                                -> HEALTHY baseline
"""
import json, random, math
from datetime import date, timedelta

random.seed(42)

# Anchor "today" to a fixed recent date so the trailing-window logic is reproducible.
# NOTE for the engine: use max(date) in salesHistory as "today", not the real clock.
TODAY = date(2026, 6, 15)
DAYS = 90
start = TODAY - timedelta(days=DAYS - 1)

stores = [
    {"storeId": "T-1442", "name": "Minneapolis Nicollet", "region": "Midwest"},
    {"storeId": "T-2185", "name": "Dallas Knox St",       "region": "South"},
    {"storeId": "T-3320", "name": "Los Angeles La Brea",  "region": "West"},
]
store_mult = {"T-1442": 1.00, "T-2185": 0.85, "T-3320": 1.20}

# baseDaily = mean units/day at a 1.0-multiplier store
skus = [
    {"skuId": "SKU-1001", "name": "Up&Up Cotton Rounds 100ct", "category": "Health & Beauty", "brandType": "owned",    "leadTimeDays": 21, "baseDaily": 6,  "story": "low_stock"},
    {"skuId": "SKU-1002", "name": "Threshold 3-Wick Candle",   "category": "Home",            "brandType": "owned",    "leadTimeDays": 18, "baseDaily": 2,  "story": "excess"},
    {"skuId": "SKU-1003", "name": "Good & Gather Trail Mix",    "category": "Grocery",         "brandType": "owned",    "leadTimeDays": 10, "baseDaily": 14, "story": "gap"},
    {"skuId": "SKU-1004", "name": "Tide Liquid Detergent 92oz", "category": "Household",       "brandType": "national", "leadTimeDays": 7,  "baseDaily": 9,  "story": "healthy"},
    {"skuId": "SKU-1005", "name": "Cat & Jack Kids Tee",        "category": "Apparel",         "brandType": "owned",    "leadTimeDays": 25, "baseDaily": 5,  "story": "healthy"},
    {"skuId": "SKU-1006", "name": "Market Pantry Whole Milk",   "category": "Grocery",         "brandType": "national", "leadTimeDays": 3,  "baseDaily": 30, "story": "healthy"},
    {"skuId": "SKU-1007", "name": "Heyday USB-C Cable 6ft",     "category": "Electronics",     "brandType": "owned",    "leadTimeDays": 14, "baseDaily": 4,  "story": "healthy"},
    {"skuId": "SKU-1008", "name": "Brightroom Storage Bin 12gal","category": "Home",           "brandType": "owned",    "leadTimeDays": 16, "baseDaily": 3,  "story": "mild_excess"},
    {"skuId": "SKU-1009", "name": "Coca-Cola 12pk Cans",        "category": "Grocery",         "brandType": "national", "leadTimeDays": 5,  "baseDaily": 22, "story": "healthy"},
    {"skuId": "SKU-1010", "name": "Goodfellow Crew Socks 6pk",  "category": "Apparel",         "brandType": "owned",    "leadTimeDays": 20, "baseDaily": 7,  "story": "healthy"},
]

# weekday demand shape (Mon=0 .. Sun=6): retail lifts Fri/Sat/Sun
weekday_mult = [0.9, 0.85, 0.9, 1.0, 1.2, 1.45, 1.25]

def daily_units(base, mult, d):
    m = base * mult * weekday_mult[d.weekday()]
    # gaussian noise around the mean, clamped at 0
    val = random.gauss(m, max(1.0, m * 0.25))
    return max(0, round(val))

sales = []
inventory = []

for sku in skus:
    for s in stores:
        mult = store_mult[s["storeId"]]
        avg = sku["baseDaily"] * mult  # approximate true mean daily demand

        # ---- sales history ----
        series = []
        for i in range(DAYS):
            d = start + timedelta(days=i)
            # gap SKU: drop an 18-day block inside the trailing 28 (days 25..8 ago)
            if sku["story"] == "gap":
                days_ago = (TODAY - d).days
                if 8 <= days_ago <= 25:
                    continue
            series.append({
                "storeId": s["storeId"], "skuId": sku["skuId"],
                "date": d.isoformat(), "unitsSold": daily_units(sku["baseDaily"], mult, d),
            })
        sales.extend(series)

        # ---- inventory row ----
        safety = max(1, round(avg * 3))
        reorder_point = round(avg * sku["leadTimeDays"] + safety)

        if sku["story"] == "low_stock":
            on_hand = round(reorder_point * 0.45)      # clearly below reorder point
            on_order = 0                                # nothing inbound -> big reorder qty
        elif sku["story"] == "excess":
            on_hand = round(avg * 90)                   # ~90 days cover
            on_order = 0
        elif sku["story"] == "mild_excess":
            on_hand = round(avg * 66)                   # ~66 days cover
            on_order = 0
        elif sku["story"] == "gap":
            on_hand = round(reorder_point * 1.4)
            on_order = round(avg * 5)
        else:  # healthy
            on_hand = round(reorder_point * 1.8)
            on_order = round(avg * 4)

        inventory.append({
            "storeId": s["storeId"], "skuId": sku["skuId"],
            "onHand": int(on_hand), "onOrder": int(on_order),
            "reorderPoint": int(reorder_point), "safetyStock": int(safety),
        })

# strip helper fields from skus before writing
skus_out = [{k: v for k, v in s.items() if k not in ("baseDaily", "story")} for s in skus]

out = {
    "stores.json": stores,
    "skus.json": skus_out,
    "inventory.json": inventory,
    "salesHistory.json": sales,
}
for fname, data in out.items():
    with open(f"/home/claude/data/{fname}", "w") as f:
        json.dump(data, f, indent=2)

print(f"stores: {len(stores)} | skus: {len(skus_out)} | inventory rows: {len(inventory)} | sales records: {len(sales)}")
gap_rows = [r for r in sales if r['skuId'] == 'SKU-1003' and r['storeId'] == 'T-1442']
print(f"gap-SKU sales days present at T-1442 (of 90): {len(gap_rows)}")

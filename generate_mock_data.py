"""
Mock data generator v2 — Target-AI Inventory Intelligence Dashboard.
Deterministic (seeded). Adds demand TRENDS + wider days-of-supply spread so
per-store and per-SKU curves differ visibly. Four story SKUs still land.

Story SKUs:
  SKU-1001 owned, 21d lead, onHand < reorder point          -> LOW-STOCK (rising demand)
  SKU-1002 slow mover, falling demand, huge on-hand          -> EXCESS
  SKU-1003 strong then 18-day gap in recent sales            -> DATA-QUALITY / LOW CONFIDENCE
  rest     varied trends + varied cover                       -> HEALTHY (but not samey)
"""
import json, random, math
from datetime import date, timedelta

random.seed(42)

TODAY = date(2026, 6, 15)
DAYS = 90
start = TODAY - timedelta(days=DAYS - 1)

stores = [
    {"storeId": "T-1442", "name": "Minneapolis Nicollet", "region": "Midwest"},
    {"storeId": "T-2185", "name": "Dallas Knox St",       "region": "South"},
    {"storeId": "T-3320", "name": "Los Angeles La Brea",  "region": "West"},
]
# wider, less uniform store demand multipliers
store_mult = {"T-1442": 1.00, "T-2185": 0.72, "T-3320": 1.35}

# trend archetypes shape the 90-day demand curve (and therefore the forecast)
def trend_factor(i, kind):
    t = i / (DAYS - 1)  # 0..1 across the window
    if kind == "rising":   return 0.65 + 0.75 * t
    if kind == "falling":  return 1.35 - 0.75 * t
    if kind == "seasonal": return 1.0 + 0.28 * math.sin(2 * math.pi * i / 30)
    if kind == "spiky":    return 1.0
    return 1.0  # flat

def noise_cv(kind):
    return {"spiky": 0.55, "seasonal": 0.20, "rising": 0.18,
            "falling": 0.18, "flat": 0.15}.get(kind, 0.2)

weekday_mult = [0.9, 0.85, 0.9, 1.0, 1.2, 1.45, 1.25]  # Mon..Sun

# baseDaily, leadTime, story, trend, targetDoS (for healthy: drives onHand spread)
skus = [
    {"skuId":"SKU-1001","name":"Up&Up Cotton Rounds 100ct","category":"Health & Beauty","brandType":"owned",   "leadTimeDays":21,"baseDaily":6, "story":"low_stock","trend":"rising"},
    {"skuId":"SKU-1002","name":"Threshold 3-Wick Candle",   "category":"Home",         "brandType":"owned",   "leadTimeDays":18,"baseDaily":3, "story":"excess",   "trend":"falling"},
    {"skuId":"SKU-1003","name":"Good & Gather Trail Mix",    "category":"Grocery",      "brandType":"owned",   "leadTimeDays":10,"baseDaily":14,"story":"gap",      "trend":"falling"},
    {"skuId":"SKU-1004","name":"Tide Liquid Detergent 92oz", "category":"Household",    "brandType":"national","leadTimeDays":7, "baseDaily":9, "story":"healthy",  "trend":"flat",     "targetDoS":22},
    {"skuId":"SKU-1005","name":"Cat & Jack Kids Tee",        "category":"Apparel",      "brandType":"owned",   "leadTimeDays":25,"baseDaily":5, "story":"healthy",  "trend":"seasonal", "targetDoS":40},
    {"skuId":"SKU-1006","name":"Market Pantry Whole Milk",   "category":"Grocery",      "brandType":"national","leadTimeDays":3, "baseDaily":30,"story":"healthy",  "trend":"flat",     "targetDoS":11},
    {"skuId":"SKU-1007","name":"Heyday USB-C Cable 6ft",     "category":"Electronics",  "brandType":"owned",   "leadTimeDays":14,"baseDaily":4, "story":"healthy",  "trend":"rising",   "targetDoS":33},
    {"skuId":"SKU-1008","name":"Brightroom Storage Bin 12gal","category":"Home",        "brandType":"owned",   "leadTimeDays":16,"baseDaily":3, "story":"healthy",  "trend":"falling",  "targetDoS":52},
    {"skuId":"SKU-1009","name":"Coca-Cola 12pk Cans",        "category":"Grocery",      "brandType":"national","leadTimeDays":5, "baseDaily":22,"story":"healthy",  "trend":"spiky",    "targetDoS":14},
    {"skuId":"SKU-1010","name":"Goodfellow Crew Socks 6pk",  "category":"Apparel",      "brandType":"owned",   "leadTimeDays":20,"baseDaily":7, "story":"healthy",  "trend":"rising",   "targetDoS":30},
]

def daily_units(base, mult, kind, d, i):
    m = base * mult * weekday_mult[d.weekday()] * trend_factor(i, kind)
    if kind == "spiky" and d.weekday() in (4, 5):  # promo pop Fri/Sat
        m *= 1.8
    val = random.gauss(m, max(1.0, m * noise_cv(kind)))
    return max(0, round(val))

sales, inventory = [], []

for sku in skus:
    kind = sku["trend"]
    for s in stores:
        # per-SKU-per-store jitter so two stores never look identical
        jitter = random.uniform(0.9, 1.12)
        mult = store_mult[s["storeId"]] * jitter
        avg_end = sku["baseDaily"] * mult * trend_factor(DAYS - 1, kind)  # recent demand est

        # sales series
        series = []
        for i in range(DAYS):
            d = start + timedelta(days=i)
            if sku["story"] == "gap":
                days_ago = (TODAY - d).days
                if 8 <= days_ago <= 25:   # 18-day recent gap
                    continue
            series.append({"storeId": s["storeId"], "skuId": sku["skuId"],
                           "date": d.isoformat(),
                           "unitsSold": daily_units(sku["baseDaily"], mult, kind, d, i)})
        sales.extend(series)

        # inventory row
        safety = max(1, round(avg_end * 3))
        reorder_point = round(avg_end * sku["leadTimeDays"] + safety)

        if sku["story"] == "low_stock":
            on_hand, on_order = round(reorder_point * 0.45), 0
        elif sku["story"] == "excess":
            on_hand, on_order = round(avg_end * 88), 0
        elif sku["story"] == "gap":
            on_hand, on_order = round(reorder_point * 1.4), round(avg_end * 5)
        else:  # healthy — onHand set from a per-SKU target days-of-supply for spread
            target = sku.get("targetDoS", 30) * random.uniform(0.9, 1.1)
            on_hand = max(reorder_point + 1, round(target * avg_end))
            on_order = round(avg_end * random.uniform(2, 6))

        inventory.append({"storeId": s["storeId"], "skuId": sku["skuId"],
                          "onHand": int(on_hand), "onOrder": int(on_order),
                          "reorderPoint": int(reorder_point), "safetyStock": int(safety)})

skus_out = [{k: v for k, v in s.items() if k not in ("baseDaily","story","trend","targetDoS")} for s in skus]

import os
os.makedirs("/home/claude/data", exist_ok=True)
for fname, data in {"stores.json":stores,"skus.json":skus_out,
                    "inventory.json":inventory,"salesHistory.json":sales}.items():
    with open(f"/home/claude/data/{fname}","w") as f:
        json.dump(data, f, indent=2)

print(f"stores {len(stores)} | skus {len(skus_out)} | inv {len(inventory)} | sales {len(sales)}")

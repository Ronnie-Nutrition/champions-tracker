#!/usr/bin/env python3
"""Read-only: dump auth ids + overlapping daily rows for Richard's two accounts."""
import json, os, urllib.request

URL = "https://zngglancrunqtslwdooy.supabase.co"
KEY = None
with open(os.path.join(os.path.dirname(__file__), "..", ".env.local")) as f:
    for line in f:
        if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
            KEY = line.split("=", 1)[1].strip()

def rest(path):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)

ORIG = "69e5b998-71bb-4750-bd70-59ce2002318d"   # info@richmondnutritiontx.com
DUP  = "cf97302b-e295-4e8b-910e-38216f46bc43"   # rsatterf87@gmail.com

print("=== auth_user_id for each owner ===")
for label, oid in (("ORIGINAL", ORIG), ("DUPLICATE", DUP)):
    o = rest(f"owners?id=eq.{oid}&select=id,email,auth_user_id")[0]
    print(f"{label}: owner={o['id']} email={o['email']} auth_user_id={o['auth_user_id']}")

print("\n=== overlapping/edge daily_logs (Jun 20-22) ===")
fields = "owner_id,log_date,consumptions,consumption_sales,retail_sales,new_customers,deliveries,social_posts"
for label, oid in (("ORIGINAL", ORIG), ("DUPLICATE", DUP)):
    rows = rest(f"daily_logs?owner_id=eq.{oid}&log_date=gte.2026-06-20&select={fields}&order=log_date")
    print(f"\n--- {label} ({oid}) ---")
    for r in rows:
        print(json.dumps({k: r[k] for k in ("log_date","consumptions","consumption_sales","retail_sales","new_customers","deliveries","social_posts")}))

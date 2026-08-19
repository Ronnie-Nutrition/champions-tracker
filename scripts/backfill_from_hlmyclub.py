#!/usr/bin/env python3
"""
Rebuild daily_logs for Ronnie's club from the HLMyClub POS exports in ~/Downloads.

Bucket rules were CALIBRATED against Ronnie's own hand-logged June rows (2026-06-01..06-24):
    consumptions       count of POS 'Club Visit/Sale' receipts        -> matched  +0%
    consumption_sales  sum of Receipt Total on those                  -> runs    -10% vs hand
    retail_sales       sum of 'Retail Sale', POS source only          -> matched  -3%
    new_customers      Customer Report 'First Visit' == that day      -> runs    +22% vs hand
                       ...so the backfill defaults to ZERO for this field (Ronnie's call 2026-08-18);
                       pass --new-customers derived to use it anyway.
    deliveries         NOT in the POS data -- left at 0
    social_posts       NOT in the POS data -- left at 0

Receipts are deduped by Receipt Number across overlapping exports, newest file winning,
so a receipt that was Pending in an early export picks up its later Accepted status.
Void is excluded; Pending is INCLUDED (excluding it lost 5% of consumptions vs hand).

PARTIAL DAYS: an export pulled mid-shift only contains the receipts rung up so far.
The 2026-08-17 export was taken at 17:46 and held 5 of a normal Monday's 20-32
consumptions. Such a day is still written (a real-but-low row beats a hole, which
would zero the owner's streak), but it MUST be corrected once the next full export
lands:  --refresh --from 2026-08-17 --to 2026-08-17 --send

Read-only by default. Pass --send to write.
"""
import argparse, collections, csv, datetime, glob, json, os, urllib.request, urllib.error
import openpyxl

OWNER = "eddc8e47-aef7-4e01-b6c2-c9b3d2e63c30"          # 'Ronnie and Ysela'
URL   = "https://zngglancrunqtslwdooy.supabase.co"
ENV   = os.path.join(os.path.dirname(__file__), "..", ".env.local")
DL    = os.path.expanduser("~/Downloads")

def key():
    with open(ENV) as f:
        for line in f:
            if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("SUPABASE_SERVICE_ROLE_KEY not found in .env.local")

def rest(path, method="GET", body=None, extra=None):
    hdr = {"apikey": key(), "Authorization": f"Bearer {key()}", "Content-Type": "application/json"}
    hdr.update(extra or {})
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{URL}/rest/v1/{path}", data=data, headers=hdr, method=method)
    with urllib.request.urlopen(req) as r:
        raw = r.read()
        return json.loads(raw) if raw else []

def parse_date(d):
    if isinstance(d, datetime.datetime): return d.date()
    for f in ("%m/%d/%Y", "%m/%d/%y"):
        try: return datetime.datetime.strptime(str(d).strip(), f).date()
        except ValueError: pass

def money(v):
    try: return float(str(v or 0).replace("$", "").replace(",", "").strip())
    except ValueError: return 0.0

def load_receipts():
    """Dedupe by Receipt Number across every export; newest export wins."""
    seen = {}
    files = sorted(glob.glob(os.path.join(DL, "Receipts*.xlsx")), key=os.path.getmtime)
    for p in files:
        rows = list(openpyxl.load_workbook(p, read_only=True).worksheets[0].iter_rows(values_only=True))
        ix = {h: i for i, h in enumerate(rows[0])}
        for r in rows[1:]:
            if not r or not r[ix["Receipt Number"]]: continue
            d = parse_date(r[ix["Date Created"]])
            if not d: continue
            seen[r[ix["Receipt Number"]]] = dict(
                date=d, status=r[ix["Status"]], type=r[ix["Receipt Type"]],
                src=r[ix["Receipt Source"]], total=money(r[ix["Receipt Total"]]),
                volume=float(r[ix["Original Volume"]] or 0))
    return seen, files

def load_first_visits():
    fv = {}
    for p in sorted(glob.glob(os.path.join(DL, "Customer Report*.csv")), key=os.path.getmtime):
        with open(p, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                n, d = row.get("Customer Name", "").strip(), row.get("First Visit", "").strip()
                if not n or not d: continue
                try: dt = datetime.datetime.strptime(d, "%m/%d/%Y").date()
                except ValueError: continue
                if n not in fv or dt < fv[n]: fv[n] = dt
    return collections.Counter(fv.values())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--send", action="store_true", help="actually write to daily_logs")
    ap.add_argument("--refresh", action="store_true",
                    help="OVERWRITE days that already have a row, instead of skipping them. "
                         "Use this to correct a day that was first written from a truncated "
                         "export (see the partial-day note in the module docstring). It will "
                         "clobber hand-entered deliveries/social_posts/new_customers for those "
                         "days, so always pass an explicit narrow --from/--to.")
    ap.add_argument("--volume-only", action="store_true",
                    help="only PATCH daily_volume onto rows that already exist "
                         "(use after migration 004; the normal path skips existing rows)")
    ap.add_argument("--from", dest="start", default="2026-06-23")
    ap.add_argument("--to",   dest="end",   default=None, help="default: last day with receipts")
    ap.add_argument("--new-customers", choices=["zero", "derived"], default="zero",
                    help="zero (default): leave new_customers at 0 for Ysela to fill going forward. "
                         "derived: use Customer Report First Visit, which ran +22%% vs Ronnie's hand count.")
    args = ap.parse_args()

    if args.refresh and not args.end:
        raise SystemExit("--refresh requires an explicit --to, so it cannot silently "
                         "overwrite days you have already hand-corrected.")

    receipts, files = load_receipts()
    newc = load_first_visits()
    print(f"{len(receipts)} unique receipts across {len(files)} exports")

    agg = collections.defaultdict(lambda: dict(consumptions=0, consumption_sales=0.0,
                                               retail_sales=0.0, volume=0.0))
    for v in receipts.values():
        if v["status"] == "Void" or v["src"] != "POS": continue
        a = agg[v["date"]]
        a["volume"] += v["volume"]
        if v["type"] == "Club Visit/Sale":
            a["consumptions"] += 1; a["consumption_sales"] += v["total"]
        elif v["type"] == "Retail Sale":
            a["retail_sales"] += v["total"]

    start = datetime.date.fromisoformat(args.start)
    end   = datetime.date.fromisoformat(args.end) if args.end else max(agg)
    existing = {r["log_date"] for r in
                rest(f"daily_logs?owner_id=eq.{OWNER}&select=log_date")}

    if args.volume_only:
        # daily_volume is a separate pass because the normal path deliberately
        # never touches a day that is already logged -- that is what protects
        # hand-entered history. Here we only ever set the one new column.
        targets = []
        d = start
        while d <= end:
            if d.isoformat() in existing and d in agg:
                targets.append((d.isoformat(), round(agg[d]["volume"], 2)))
            d += datetime.timedelta(days=1)
        print(f"{len(targets)} existing rows to stamp with daily_volume")
        total = sum(v for _, v in targets)
        for iso, vol in targets:
            print(f"  {iso}  {vol:8.1f} VP")
        print(f"\nTOTAL {total:,.1f} VP")
        if not args.send:
            print("\nDRY RUN -- nothing written. Re-run with --send to write.")
            return
        for iso, vol in targets:
            rest(f"daily_logs?owner_id=eq.{OWNER}&log_date=eq.{iso}", "PATCH",
                 {"daily_volume": vol}, {"Prefer": "return=minimal"})
        print(f"\nstamped {len(targets)} rows with daily_volume")
        return

    rows, skipped = [], []
    d = start
    while d <= end:
        iso = d.isoformat()
        if iso in existing and not args.refresh:
            skipped.append(iso)
        elif d in agg:
            a = agg[d]
            rows.append(dict(owner_id=OWNER, log_date=iso,
                             consumptions=a["consumptions"],
                             consumption_sales=round(a["consumption_sales"]),
                             retail_sales=round(a["retail_sales"]),
                             new_customers=newc.get(d, 0) if args.new_customers == "derived" else 0,
                             deliveries=0, social_posts=0))
        d += datetime.timedelta(days=1)

    print(f"{len(rows)} days to write, {len(skipped)} already logged (left untouched)")
    print(f"\n{'date':12} {'dow':4} {'cons':>5} {'cons$':>7} {'ret$':>6} {'new':>4} {'volume':>8}")
    for r in rows:
        dt = datetime.date.fromisoformat(r["log_date"])
        print(f"{r['log_date']:12} {dt.strftime('%a'):4} {r['consumptions']:5} "
              f"{r['consumption_sales']:7} {r['retail_sales']:6} {r['new_customers']:4} "
              f"{agg[dt]['volume']:8.1f}")
    t = lambda k: sum(r[k] for r in rows)
    print(f"\nTOTAL consumptions {t('consumptions')} | consumption_sales ${t('consumption_sales'):,} | "
          f"retail_sales ${t('retail_sales'):,} | new_customers {t('new_customers')} | "
          f"volume {sum(agg[datetime.date.fromisoformat(r['log_date'])]['volume'] for r in rows):,.1f} VP")

    if not args.send:
        print("\nDRY RUN -- nothing written. Re-run with --send to write.")
        return
    if rows:
        rest("daily_logs?on_conflict=owner_id,log_date", "POST", rows,
             {"Prefer": "resolution=merge-duplicates,return=minimal"})
        print(f"\nwrote {len(rows)} rows")

if __name__ == "__main__":
    main()

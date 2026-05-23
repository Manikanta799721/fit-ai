from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent

SEARCHABLE_COLUMNS = [
    "masterCategory",
    "subCategory",
    "articleType",
    "productDisplayName",
    "brand",
    "style",
    "vibe",
    "occasion",
    "trend",
    "usage",
]

ESSENTIAL_COLUMNS = [
    "id",
    "gender",
    "masterCategory",
    "subCategory",
    "articleType",
    "baseColour",
    "season",
    "productDisplayName",
]

OPTIONAL_COLUMNS = ["brand", "style", "vibe", "occasion", "trend", "usage", "image_url"]

TRENDING_TERMS = {"trending", "trend", "popular", "new", "latest"}

FALLBACK_IMAGES = {
    "accessories": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1000&auto=format&fit=crop",
    "bags": "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=1000&auto=format&fit=crop",
    "dress": "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=1000&auto=format&fit=crop",
    "dresses": "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=1000&auto=format&fit=crop",
    "shoes": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop",
    "topwear": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1000&auto=format&fit=crop",
}

DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop"


def normalize(value):
    return str(value or "").strip().lower()


def load_catalog():
    styles = pd.read_csv(BASE_DIR / "styles.csv", sep="\t")

    curated_path = BASE_DIR / "fashion_catalog.csv"
    if curated_path.exists():
        curated = pd.read_csv(curated_path, sep="\t")
        styles = pd.concat([curated, styles], ignore_index=True, sort=False)

    for column in OPTIONAL_COLUMNS:
        if column not in styles.columns:
            styles[column] = ""

    return (
        styles.dropna(subset=ESSENTIAL_COLUMNS)
        .drop_duplicates(subset=["id"])
        .reset_index(drop=True)
    )


def filter_values(catalog):
    return {
        "genders": sorted(catalog["gender"].dropna().unique().tolist()),
        "colours": sorted(catalog["baseColour"].dropna().unique().tolist()),
        "seasons": sorted(catalog["season"].dropna().unique().tolist()),
        "categories": sorted(catalog["subCategory"].dropna().unique().tolist()),
    }


def matches_category(catalog, category):
    category = normalize(category)
    return (
        catalog["subCategory"].astype(str).str.lower().str.contains(category, na=False)
        | catalog["articleType"].astype(str).str.lower().str.contains(category, na=False)
        | catalog["masterCategory"].astype(str).str.lower().str.contains(category, na=False)
    )


def matches_search(catalog, search):
    words = [word for word in normalize(search).split() if word]

    if not words:
        return pd.Series(False, index=catalog.index)

    word_matches = []

    for word in words:
        column_matches = [
            catalog[column].astype(str).str.lower().str.contains(word, na=False)
            for column in SEARCHABLE_COLUMNS
            if column in catalog.columns
        ]
        word_matches.append(pd.concat(column_matches, axis=1).any(axis=1))

    return pd.concat(word_matches, axis=1).any(axis=1)


def score_catalog(catalog, filters):
    scored = catalog.copy()
    score = pd.Series(0, index=scored.index, dtype="int64")
    breakdown = {
        "profileFit": pd.Series(0, index=scored.index, dtype="int64"),
        "styleSignal": pd.Series(0, index=scored.index, dtype="int64"),
        "trendSignal": pd.Series(0, index=scored.index, dtype="int64"),
    }

    gender = filters["gender"]
    colour = filters["colour"]
    season = filters["season"]
    category = filters["category"]
    search = filters["search"]

    if gender:
        gender_match = scored["gender"].astype(str).str.lower() == gender
        score += gender_match.astype(int) * 22
        breakdown["profileFit"] += gender_match.astype(int) * 28

    if colour:
        colour_match = scored["baseColour"].astype(str).str.lower() == colour
        score += colour_match.astype(int) * 18
        breakdown["profileFit"] += colour_match.astype(int) * 24

    if season:
        season_match = scored["season"].astype(str).str.lower() == season
        score += season_match.astype(int) * 14
        breakdown["profileFit"] += season_match.astype(int) * 18

    if category:
        category_match = matches_category(scored, category)
        score += category_match.astype(int) * 26
        breakdown["styleSignal"] += category_match.astype(int) * 38

    if search and search not in TRENDING_TERMS:
        search_match = matches_search(scored, search)
        score += search_match.astype(int) * 20
        breakdown["styleSignal"] += search_match.astype(int) * 28
    elif search:
        recent = scored["year"].fillna(0).astype(str).str.extract(r"(\d+)")[0].fillna(0).astype(int)
        year_boost = (recent >= recent.quantile(0.7)).astype(int)
        score += 10 + year_boost * 8
        breakdown["trendSignal"] += 32 + year_boost * 20

    brand_boost = scored["brand"].astype(str).str.lower().ne("generic").astype(int) * 4
    curated_boost = scored["image_url"].astype(str).str.startswith("https://").astype(int) * 8
    score += brand_boost + curated_boost
    breakdown["trendSignal"] += brand_boost * 6 + curated_boost * 10

    scored["_score"] = score
    scored["_profileFit"] = breakdown["profileFit"].clip(0, 100)
    scored["_styleSignal"] = breakdown["styleSignal"].clip(0, 100)
    scored["_trendSignal"] = breakdown["trendSignal"].clip(0, 100)

    return scored


def apply_exact_filters(catalog, filters):
    filtered = catalog.copy()

    if filters["gender"]:
        filtered = filtered[filtered["gender"].astype(str).str.lower() == filters["gender"]]

    if filters["colour"]:
        filtered = filtered[filtered["baseColour"].astype(str).str.lower() == filters["colour"]]

    if filters["season"]:
        filtered = filtered[filtered["season"].astype(str).str.lower() == filters["season"]]

    if filters["category"]:
        filtered = filtered[matches_category(filtered, filters["category"])]

    if filters["search"] and filters["search"] not in TRENDING_TERMS:
        filtered = filtered[matches_search(filtered, filters["search"])]

    return filtered


def product_image(row):
    image_url = str(row.get("image_url", "")).strip()

    if image_url and image_url.lower() != "nan":
        return image_url

    image_path = BASE_DIR / "images" / f"{row['id']}.jpg"
    if image_path.exists():
        return f"http://127.0.0.1:8000/images/{row['id']}.jpg"

    sub_category = normalize(row.get("subCategory", ""))
    article_type = normalize(row.get("articleType", ""))

    return (
        FALLBACK_IMAGES.get(sub_category)
        or FALLBACK_IMAGES.get(article_type)
        or DEFAULT_PRODUCT_IMAGE
    )


def confidence_label(match):
    if match >= 92:
        return "Excellent match"
    if match >= 84:
        return "Strong match"
    if match >= 74:
        return "Good alternative"
    return "Style discovery"


def ai_reason(row, filters, exact_match):
    signals = []

    if filters["category"] and matches_category(pd.DataFrame([row]), filters["category"]).iloc[0]:
        signals.append(f"{row['subCategory']} category")

    if filters["colour"] and normalize(row["baseColour"]) == filters["colour"]:
        signals.append(f"{row['baseColour']} colour")

    if filters["season"] and normalize(row["season"]) == filters["season"]:
        signals.append(f"{row['season']} season")

    if filters["search"] and filters["search"] not in TRENDING_TERMS and matches_search(pd.DataFrame([row]), filters["search"]).iloc[0]:
        signals.append("your search vibe")

    if not signals:
        signals.append(f"{row.get('style', 'curated')} styling")

    prefix = "Matched" if exact_match else "Closest pick"
    return f"{prefix} for {', '.join(signals[:3])} with a {row.get('vibe', 'fresh')} mood."


def serialize_product(row, filters, exact_ids):
    raw_score = int(row.get("_score", 0))
    match = max(68, min(99, 66 + raw_score // 2))
    exact_match = int(row["id"]) in exact_ids

    return {
        "id": int(row["id"]),
        "image": product_image(row),
        "productDisplayName": row["productDisplayName"],
        "masterCategory": row["masterCategory"],
        "subCategory": row["subCategory"],
        "articleType": row["articleType"],
        "baseColour": row["baseColour"],
        "season": row["season"],
        "gender": row["gender"],
        "brand": row.get("brand", "Generic") or "Generic",
        "style": row.get("style", "Curated") or "Curated",
        "vibe": row.get("vibe", "Fresh") or "Fresh",
        "trend": row.get("trend", "Trending") or "Trending",
        "occasion": row.get("occasion", "Daily") or "Daily",
        "match": match,
        "confidence": confidence_label(match),
        "isExactMatch": exact_match,
        "aiReason": ai_reason(row, filters, exact_match),
        "scoreBreakdown": {
            "profileFit": int(row.get("_profileFit", 0)),
            "styleSignal": int(row.get("_styleSignal", 0)),
            "trendSignal": int(row.get("_trendSignal", 0)),
        },
    }


def recommend_products(catalog, gender="", colour="", season="", category="", search="", limit=20):
    filters = {
        "gender": normalize(gender),
        "colour": normalize(colour),
        "season": normalize(season),
        "category": normalize(category),
        "search": normalize(search),
    }

    scored = score_catalog(catalog, filters)
    exact = apply_exact_filters(scored, filters)

    if filters["search"] in TRENDING_TERMS:
        exact = scored[scored["_score"] > 0]

    exact_ids = set(exact["id"].astype(int).tolist())
    exact = exact.sort_values(["_score", "id"], ascending=[False, False])

    if len(exact) < limit:
        fallback = scored[~scored["id"].isin(exact["id"])]
        fallback = fallback[fallback["_score"] > 0].sort_values(["_score", "id"], ascending=[False, False])
        exact = pd.concat([exact, fallback], ignore_index=True)

    if exact.empty:
        exact = scored.sort_values(["_score", "id"], ascending=[False, False])

    return [
        serialize_product(row, filters, exact_ids)
        for _, row in exact.head(limit).iterrows()
    ]

# 1985 Hits Map

Small learning project: 1985 US pop hits mapped by where the artists were born (and died, if applicable).

## Layout
- `index.html`, `style.css`, `app.js` — static page, no build step (Leaflet loaded from CDN)
- `data/songs.json` — one entry per song; add entries here to extend the map

## Run
`python3 -m http.server 8000` then open http://localhost:8000

## Conventions
- Plain JS, no frameworks or npm packages.
- `death` is `null` for living artists. Coordinates are `[lat, lng]`.
- Song/artist facts were drafted by Claude: verify before treating as correct.

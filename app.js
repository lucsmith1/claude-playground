const map = L.map('map').setView([30, -20], 2);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors', maxZoom: 18
}).addTo(map);

const list = document.getElementById('list');
const checkbox = document.getElementById('deceasedOnly');
const markers = L.layerGroup().addTo(map);
let songs = [];

const previewCache = new Map();

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Look up a 30-second preview via the iTunes Search API (no key needed).
function fetchPreview(s) {
  if (!previewCache.has(s.song)) {
    const names = s.artist.split(/ feat\. | & /);
    const term = encodeURIComponent(`${s.song} ${s.artist.replace(' feat.', '')}`);
    previewCache.set(s.song, fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=10`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        const norm = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');
        const wanted = names.map(norm);
        const matches = data.results.filter(t => t.previewUrl && wanted.some(n => norm(t.artistName).includes(n)));
        return matches.find(t => !/\blive\b/i.test(`${t.trackName} ${t.collectionName}`)) || matches[0] || null;
      })
      .catch(() => {
        previewCache.delete(s.song); // don't cache failures; retry on next open
        return null;
      }));
  }
  return previewCache.get(s.song);
}

function popupContent(s) {
  const death = s.death ? `<br>Died: ${esc(s.death.place)} (${esc(s.death.year)})` : '';
  const el = document.createElement('div');
  el.innerHTML = `<strong>${esc(s.song)}</strong><br>${esc(s.artist)}<br>Peak: #${esc(s.peak)}<br>Born: ${esc(s.birth.place)}${death}
    <div class="preview">Loading preview…</div>`;
  return el;
}

function loadPreview(s, popupEl) {
  const box = popupEl.querySelector('.preview');
  fetchPreview(s).then(track => {
    if (!track) { box.textContent = 'No preview available'; return; }
    box.innerHTML = `<img src="${esc(track.artworkUrl100)}" alt="" width="60" height="60">
      <audio controls src="${esc(track.previewUrl)}"></audio>
      <div class="preview-note">${esc(track.trackName)} · ${esc(track.artistName)}</div>`;
  });
}

function render() {
  markers.clearLayers();
  list.innerHTML = '';
  songs.forEach((s, i) => {
    if (checkbox.checked && !s.death) return;
    const num = i + 1;
    const marker = L.marker(s.birth.coords, {
      icon: L.divIcon({
        className: '',
        html: `<div class="pin ${s.death ? 'deceased' : ''}">${num}</div>`,
        iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -18]
      })
    }).bindPopup(popupContent(s), { minWidth: 240 }).addTo(markers);
    marker.on('popupopen', e => loadPreview(s, e.popup.getContent()));

    const li = document.createElement('li');
    li.innerHTML = `<span class="num">${num}</span>
      <div><div class="song">${esc(s.song)}</div>
      <div class="artist">${esc(s.artist)} · ${esc(s.birth.place)}</div></div>
      <span class="peak">#${esc(s.peak)}</span>`;
    li.addEventListener('click', () => {
      map.setView(s.birth.coords, 5);
      marker.openPopup();
    });
    list.appendChild(li);
  });
}

checkbox.addEventListener('change', render);
fetch('data/songs.json').then(r => r.json()).then(data => { songs = data; render(); });

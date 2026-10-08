const map = L.map('map').setView([30, -20], 2);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors', maxZoom: 18
}).addTo(map);

const list = document.getElementById('list');
const checkbox = document.getElementById('deceasedOnly');
const markers = L.layerGroup().addTo(map);
let songs = [];

const previewCache = new Map();

// Look up a 30-second preview via the iTunes Search API (no key needed).
function fetchPreview(s) {
  if (!previewCache.has(s.song)) {
    const names = s.artist.split(/ feat\. | & /);
    const term = encodeURIComponent(`${s.song} ${s.artist.replace(' feat.', '')}`);
    previewCache.set(s.song, fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=10`)
      .then(r => r.json())
      .then(data => {
        const norm = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');
        const wanted = names.map(norm);
        const matches = data.results.filter(t => t.previewUrl && wanted.some(n => norm(t.artistName).includes(n)));
        return matches.find(t => !/\blive\b/i.test(`${t.trackName} ${t.collectionName}`)) || matches[0] || null;
      })
      .catch(() => null));
  }
  return previewCache.get(s.song);
}

function popupContent(s) {
  const death = s.death ? `<br>Died: ${s.death.place} (${s.death.year})` : '';
  const el = document.createElement('div');
  el.innerHTML = `<strong>${s.song}</strong><br>${s.artist}<br>Peak: #${s.peak}<br>Born: ${s.birth.place}${death}
    <div class="preview">Loading preview…</div>`;
  return el;
}

function loadPreview(s, popupEl) {
  const box = popupEl.querySelector('.preview');
  fetchPreview(s).then(track => {
    if (!track) { box.textContent = 'No preview available'; return; }
    box.innerHTML = `<img src="${track.artworkUrl100}" alt="" width="60" height="60">
      <audio controls src="${track.previewUrl}"></audio>
      <div class="preview-note">${track.trackName} · ${track.artistName}</div>`;
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
      <div><div class="song">${s.song}</div>
      <div class="artist">${s.artist} · ${s.birth.place}</div></div>
      <span class="peak">#${s.peak}</span>`;
    li.addEventListener('click', () => {
      map.setView(s.birth.coords, 5);
      marker.openPopup();
    });
    list.appendChild(li);
  });
}

checkbox.addEventListener('change', render);
fetch('data/songs.json').then(r => r.json()).then(data => { songs = data; render(); });

/* Interactive maps, fully self-hosted: OpenStreetMap data (ODbL) as plain vector tiles of the
   Athens area (unpacked from a Protomaps extract), rendered with MapLibre GL (BSD-3). No request leaves this website, so no third
   party receives visitor data and no consent banner is needed.
   The drawn SVG map stays visible until the live map has loaded; if anything fails it simply stays. */
import { Map as MLMap, Marker, Popup, NavigationControl, AttributionControl } from './lib/maplibre-gl.mjs';

const BASE = new URL('./', import.meta.url).href;
const BOUNDS = [[23.58, 37.80], [23.84, 38.03]];
const ATTRIBUTION = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> · <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a>';

function loadCss(href) {
  if (document.querySelector('link[data-nf-map]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = href; l.dataset.nfMap = '1';
  document.head.appendChild(l);
}

function warmFlavor() {
  const f = Object.assign({}, window.basemaps.namedFlavor('light'));
  Object.assign(f, {
    background: '#F4EFE6', earth: '#F4EFE6', water: '#D9E2E0', buildings: '#E8E0D2',
    park_a: '#E5E7D8', park_b: '#DCE2CC', wood_a: '#E2E6D4', wood_b: '#D9DFC9',
    scrub_a: '#E6E8DA', scrub_b: '#DDE2CF', zoo: '#E3E6D6', green: '#DCE2CC',
    sand: '#EFE7D6', beach: '#EFE5CF', pedestrian: '#EEE8DC', industrial: '#ECE6DB',
    hospital: '#EFE6E1', school: '#EEE6DA', aerodrome: '#ECE8E0', runway: '#E4DED2'
  });
  return f;
}

function style() {
  return {
    version: 8,
    glyphs: BASE + 'fonts/{fontstack}/{range}.pbf',
    sprite: BASE + 'sprites/light',
    sources: {
      protomaps: { type: 'vector', tiles: [BASE + 'tiles/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 14,
        bounds: [23.58, 37.80, 23.84, 38.03], attribution: ATTRIBUTION }
    },
    layers: window.basemaps.layers('protomaps', warmFlavor(), { lang: 'en' })
  };
}

let dataPromise = null;
function places() {
  if (!dataPromise) dataPromise = fetch(BASE + 'places.json', { cache: 'no-cache' }).then(r => r.json());
  return dataPromise;
}

function markerEl(place, active) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'nf-marker' + (place.exact ? ' is-exact' : ' is-approx') + (active ? ' is-active' : '') +
    (place.status === 'sold' ? ' is-sold' : '');
  el.setAttribute('aria-label', place.name + (place.exact ? '' : ', approximate location'));
  return el;
}

function popupHtml(p) {
  const status = p.status === 'sold' ? 'Sold' : p.price;
  const where = p.exact ? p.location : p.location + ' · approximate area';
  return '<a class="nf-pop" href="' + p.url + '"><strong>' + p.name + '</strong><span>' + where + '</span><em>' + status + '</em></a>';
}

function build(holder) {
  if (holder.dataset.live) return;
  holder.dataset.live = 'loading';
  const canvas = holder.querySelector('.pmap-canvas');
  const slug = holder.getAttribute('data-property');
  const mode = slug ? 'detail' : (holder.closest('#jMapPanel') ? 'listing' : 'home');

  places().then(data => {
    const box = document.createElement('div');
    box.className = 'nf-map';
    holder.appendChild(box);

    const own = slug ? data.places.find(p => p.slug === slug) : null;
    const startRegion = holder.getAttribute('data-region') || 'kato-glyfada';
    const centre = own ? [own.lng, own.lat] : [data.regions[startRegion].lng, data.regions[startRegion].lat];

    const map = new MLMap({
      container: box, style: style(), center: centre,
      zoom: mode === 'detail' ? (own && own.exact ? 15 : 13.6) : (mode === 'listing' ? 11.2 : 12.6),
      minZoom: 10.5, maxZoom: 17, maxBounds: [[23.50, 37.74], [23.92, 38.09]],
      attributionControl: false, cooperativeGestures: true, dragRotate: false, pitchWithRotate: false
    });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new AttributionControl({ compact: false }), 'bottom-right');

    map.on('load', () => {
      holder.dataset.live = '1';
      holder.classList.add('is-live');
      if (canvas) canvas.setAttribute('aria-hidden', 'true');

      const shown = mode === 'detail' ? [own].filter(Boolean)
        : mode === 'home' ? data.places.filter(p => p.status === 'available')
        : data.places;

      if (mode === 'detail' && own && !own.exact) {
        map.addSource('area', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Point', coordinates: [own.lng, own.lat] } } });
        map.addLayer({ id: 'area', type: 'circle', source: 'area', paint: {
          'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 11, 12, 17, 780],
          'circle-color': '#A9853B', 'circle-opacity': 0.14, 'circle-stroke-color': '#A9853B', 'circle-stroke-width': 1.2, 'circle-stroke-opacity': 0.6
        } });
        return;
      }
      shown.forEach(p => {
        const m = new Marker({ element: markerEl(p, mode === 'detail') }).setLngLat([p.lng, p.lat]);
        if (mode !== 'detail') m.setPopup(new Popup({ offset: 14, closeButton: false }).setHTML(popupHtml(p)));
        m.addTo(map);
      });
    });
    map.on('error', e => {
      if (holder.dataset.live !== '1') {   // never got to show the live map: keep the drawn map
        holder.dataset.live = '';
        map.remove(); box.remove();
      }
      if (window.console) console.warn('Map:', e && e.error ? e.error.message : e);
    });

    if (mode === 'home') {
      holder.addEventListener('nf:region', ev => {
        const r = data.regions[ev.detail];
        if (r) map.flyTo({ center: [r.lng, r.lat], zoom: 12.6, speed: 0.8 });
      });
    }
    if (mode === 'listing') {
      new ResizeObserver(() => map.resize()).observe(box);
    }
  }).catch(() => { holder.dataset.live = ''; });
}

let started = false;
function start() {
  if (started) return;
  if (!window.basemaps) {        // helper script not executed yet: check again shortly
    if ((start.tries = (start.tries || 0) + 1) < 200) setTimeout(start, 25);
    return;
  }
  started = true;
  loadCss(BASE + 'lib/maplibre-gl.css');
  document.addEventListener('nf:map-visible', ev => build(ev.target));
  const holders = Array.from(document.querySelectorAll('.pmap'));
  // build each map once it is (nearly) on screen; plain scroll checks work in every browser state
  let queued = false;
  const check = () => {
    queued = false;
    holders.forEach(h => {
      if (h.dataset.live || h.offsetParent === null) return;
      const r = h.getBoundingClientRect();
      if (r.top < innerHeight + 400 && r.bottom > -400) build(h);
    });
  };
  const queue = () => { if (!queued) { queued = true; setTimeout(check, 120); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  check();
  setTimeout(check, 800);
}

start();

const byId = id => document.getElementById(id);
const controls = ['title', 'lat', 'lon', 'utc', 'date', 'hour', 'shadow', 'trees', 'access', 'north'];
const colors = ['#e49d72', '#a0b6a3', '#d9bb77', '#9eafd0'];
const defaults = [
  { x: -24, y: -10, w: 25, d: 19, h: 10 },
  { x: 4, y: -20, w: 18, d: 22, h: 16 },
  { x: 6, y: 6, w: 23, d: 13, h: 6 }
];
const bounds = { x: [-34, 30], y: [-32, 28], w: [2, 34], d: [2, 30], h: [1, 34] };
const names = { x: 'Este (m)', y: 'Sur (m)', w: 'Ancho (m)', d: 'Fondo (m)', h: 'Altura (m)' };
const storageKey = 'bimloading-diagrams-v1';
const trees = [[-32, -19], [-32, 5], [-29, 17], [32, -19], [32, 9], [25, 27], [-10, 26]];
let volumes = defaults.map(volume => ({ ...volume }));
let selected = 0;
let view = 'iso';

function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved) return;
    const valid = volume => Object.entries(bounds).every(([key, [min, max]]) =>
      Number.isFinite(volume?.[key]) && volume[key] >= min && volume[key] <= max);
    if (Array.isArray(saved.volumes) && saved.volumes.length >= 1 &&
        saved.volumes.length <= 8 && saved.volumes.every(valid)) volumes = saved.volumes;
    for (const id of controls) {
      const input = byId(id);
      const value = saved.settings?.[id];
      if (input.type === 'checkbox' && typeof value === 'boolean') input.checked = value;
      if (input.type !== 'checkbox' && typeof value === 'string') input.value = value;
    }
  } catch { /* The editor also runs when storage is unavailable. */ }
}

function save() {
  const settings = Object.fromEntries(controls.map(id => {
    const input = byId(id);
    return [id, input.type === 'checkbox' ? input.checked : input.value];
  }));
  try {
    localStorage.setItem(storageKey, JSON.stringify({ volumes, settings }));
  } catch { /* Keep the current session editable. */ }
}

const rad = degrees => degrees * Math.PI / 180;
const deg = radians => radians * 180 / Math.PI;

function solar(date, hour, lat, lon, utc) {
  const year = date.getUTCFullYear();
  const start = new Date(date);
  start.setUTCMonth(0, 1);
  const next = new Date(start);
  next.setUTCFullYear(year + 1);
  const angle = 2 * Math.PI * ((date - start) + (hour - 12) * 3600000) / (next - start);
  const equation = 229.18 * (0.000075 + 0.001868 * Math.cos(angle) - 0.032077 * Math.sin(angle)
    - 0.014615 * Math.cos(2 * angle) - 0.040849 * Math.sin(2 * angle));
  const dec = 0.006918 - 0.399912 * Math.cos(angle) + 0.070257 * Math.sin(angle)
    - 0.006758 * Math.cos(2 * angle) + 0.000907 * Math.sin(2 * angle)
    - 0.002697 * Math.cos(3 * angle) + 0.00148 * Math.sin(3 * angle);
  const H = rad((hour * 60 + equation + 4 * lon - 60 * utc) / 4 - 180);
  const L = rad(lat);
  const east = -Math.cos(dec) * Math.sin(H);
  const north = Math.sin(dec) * Math.cos(L) - Math.cos(dec) * Math.cos(H) * Math.sin(L);
  const up = Math.sin(dec) * Math.sin(L) + Math.cos(dec) * Math.cos(H) * Math.cos(L);
  return { east, north, up, elevation: deg(Math.asin(Math.max(-1, Math.min(1, up)))),
    azimuth: (deg(Math.atan2(east, north)) + 360) % 360 };
}

function project([x, y, z = 0]) {
  return view === 'plan' ? [450 + x * 5.2, 302 + y * 5.2]
    : [450 + (x - y) * 4.05, 352 + (x + y) * 1.95 - z * 3.4];
}

function polygon(points, fill, stroke = 'none', extra = '') {
  return `<polygon points="${points.map(point => project(point).join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
}

function box({ x, y, w, d }, z = 0) {
  return [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]];
}

function label(x, y, text, extra = '') {
  return `<text x="${x}" y="${y}" ${extra}>${text}</text>`;
}

function escapeXml(value) {
  return value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
}

function line(a, b, stroke, extra = '') {
  const [[x1, y1], [x2, y2]] = [project(a), project(b)];
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" ${extra}/>`;
}

function draw(sun, time) {
  const ground = box({ x: -38, y: -36, w: 78, d: 70 });
  const scene = [polygon(ground, '#eeeee1', '#9da99a')];
  for (let x = -30; x <= 40; x += 10) scene.push(line([x, -36], [x, 34], '#d4d9cb'));
  for (let y = -30; y <= 30; y += 10) scene.push(line([-38, y], [40, y], '#d4d9cb'));

  if (sun && sun.up > 0.001 && byId('shadow').checked) {
    const shadows = volumes.map(volume => {
      const base = box(volume);
      const offset = [-sun.east * volume.h / sun.up, sun.north * volume.h / sun.up];
      const shifted = base.map(([x, y]) => [x + offset[0], y + offset[1]]);
      return polygon(shifted, '#435952') + base.map((point, index) => {
        const next = (index + 1) % 4;
        return polygon([point, base[next], shifted[next], shifted[index]], '#435952');
      }).join('');
    });
    scene.push(`<defs><clipPath id="site">${polygon(ground, '#fff')}</clipPath></defs><g opacity=".24" clip-path="url(#site)">${shadows.join('')}</g>`);
  }

  if (byId('access').checked) {
    const [x, y] = project([0, 18]);
    scene.push(line([0, 32], [0, 18], '#127660', 'stroke-width="3" stroke-dasharray="5 3"'));
    scene.push(`<circle cx="${x}" cy="${y}" r="5" fill="#127660"/>`);
  }

  const objects = volumes.map((volume, index) => ({ volume, index, depth: volume.x + volume.y + (volume.w + volume.d) / 2 }));
  if (byId('trees').checked) {
    trees.forEach(([x, y]) => objects.push({ tree: [x, y], depth: x + y }));
  }
  objects.sort((a, b) => a.depth - b.depth);
  for (const object of objects) {
    if (object.tree) {
      const [x, y] = project([...object.tree, view === 'iso' ? 1.8 : 0]);
      scene.push(`<circle cx="${x}" cy="${y}" r="8" fill="#6c9c78" stroke="#385f48"/>`);
      continue;
    }
    const { volume, index } = object;
    const top = box(volume, volume.h);
    const base = box(volume);
    const stroke = index === selected ? '#223f35' : '#596259';
    if (view === 'iso') {
      scene.push(polygon([base[1], base[2], top[2], top[1]], '#a97c64', stroke));
      scene.push(polygon([base[2], base[3], top[3], top[2]], '#c7a78f', stroke));
    }
    scene.push(polygon(top, colors[index % colors.length], stroke, index === selected ? 'stroke-width="2"' : ''));
    const center = project([volume.x + volume.w / 2, volume.y + volume.d / 2, volume.h]);
    scene.push(label(center[0], center[1] + 4, `V${index + 1}`, 'text-anchor="middle" font-size="11" font-weight="bold"'));
  }
  if (byId('north').checked) {
    const rotation = view === 'iso' ? 64.3 : 0;
    scene.push(`<g transform="translate(816 145)"><path transform="rotate(${rotation})" d="M0 -17 L8 8 L0 3 L-8 8 Z" fill="#006d58"/><text text-anchor="middle" y="-25" font-size="13">N</text></g>`);
  }
  byId('sheet').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="590" viewBox="0 0 900 590" role="img" aria-label="Diagrama arquitectónico" font-family="system-ui,sans-serif" fill="#24352f">
    <rect width="900" height="590" fill="#faf9f3"/>
    <line x1="34" y1="105" x2="866" y2="105" stroke="#aab8ad"/>
    ${label(34, 39, view === 'plan' ? 'PLANTA CONCEPTUAL' : 'AXONOMETRÍA DE CONJUNTO', 'font-size="12" letter-spacing="2"')}
    ${label(34, 82, escapeXml(byId('title').value || 'Proyecto'), 'font-size="25" font-weight="650"')}
    ${scene.join('')}
    <line x1="34" y1="523" x2="866" y2="523" stroke="#aab8ad"/>
    ${label(34, 551, 'BIMLoading · Estudio conceptual', 'font-size="13"')}
    ${label(866, 551, sun ? `${byId('date').value}  ·  ${time}  ·  Sol ${sun.elevation.toFixed(1)}°` : 'Datos solares pendientes', 'text-anchor="end" font-size="13"')}
    </svg>`;
}

function update() {
  const hour = Number(byId('hour').value);
  const time = [Math.floor(hour), (hour % 1) * 60].map(value => String(value).padStart(2, '0')).join(':');
  byId('hourText').textContent = time;
  const lat = byId('lat').valueAsNumber;
  const lon = byId('lon').valueAsNumber;
  const utc = byId('utc').valueAsNumber;
  const date = byId('date').valueAsDate;
  const locationValid = ['lat', 'lon'].every(id => byId(id).value && byId(id).validity.valid);
  const sun = locationValid && Number.isFinite(utc) && byId('utc').validity.valid && date
    ? solar(date, hour, lat, lon, utc) : null;
  byId('sheet').hidden = view === 'map';
  byId('map').hidden = view !== 'map' || !locationValid;
  byId('svg').disabled = byId('png').disabled = view === 'map';
  if (view === 'map') {
    byId('status').textContent = locationValid ? 'Contexto cartográfico · © OpenStreetMap contributors' : 'Introduce coordenadas válidas para consultar el mapa.';
    if (locationValid) {
      const bbox = [Math.max(-180, lon - .007), lat - .005, Math.min(180, lon + .007), lat + .005];
      const params = new URLSearchParams({ bbox: bbox.join(','), layer: 'mapnik', marker: [lat, lon].join(',') });
      const url = `https://www.openstreetmap.org/export/embed.html?${params}`;
      if (byId('map').src !== url) byId('map').src = url;
    }
  } else {
    byId('status').textContent = sun
      ? `Azimut ${sun.azimuth.toFixed(1)}° · Elevación ${sun.elevation.toFixed(1)}°${sun.up <= 0 ? ' · Sol bajo el horizonte' : ''}`
      : 'Revisa la fecha, las coordenadas y el desfase UTC.';
    draw(sun, time);
  }
  save();
}

function editVolumes() {
  byId('volumes').replaceChildren(...volumes.map((_, index) => {
    const button = document.createElement('button');
    button.textContent = `V${index + 1} · Volumen ${index + 1}`;
    button.setAttribute('aria-pressed', String(selected === index));
    button.onclick = () => { selected = index; editVolumes(); update(); byId('volumes').children[index].focus(); };
    return button;
  }));
  byId('dimensions').replaceChildren(...Object.entries(bounds).map(([key, [min, max]]) => {
    const label = document.createElement('label');
    label.textContent = names[key];
    const input = document.createElement('input');
    input.type = 'number';
    input.min = min;
    input.max = max;
    input.value = volumes[selected][key];
    input.addEventListener('input', () => {
      if (input.value && input.validity.valid) {
        volumes[selected][key] = input.valueAsNumber;
        update();
      }
    });
    input.addEventListener('blur', () => { input.value = volumes[selected][key]; });
    label.append(input);
    return label;
  }));
  byId('add').disabled = volumes.length >= 8;
  byId('remove').disabled = volumes.length <= 1;
}

function download(blob, extension) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `diagrama-${view}.${extension}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1500);
}

function svgBlob() {
  const svg = byId('sheet').querySelector('svg');
  return new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
}

byId('svg').onclick = () => download(svgBlob(), 'svg');
byId('png').onclick = async () => {
  const url = URL.createObjectURL(svgBlob());
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1800;
    canvas.height = 1180;
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG unavailable');
    download(blob, 'png');
  } catch {
    byId('status').textContent = 'No se pudo exportar el PNG. Vuelve a intentarlo.';
  } finally {
    URL.revokeObjectURL(url);
  }
};
byId('add').onclick = () => {
  volumes.push({ x: -5, y: 3, w: 12, d: 9, h: 8 });
  selected = volumes.length - 1;
  editVolumes();
  update();
};
byId('remove').onclick = () => {
  volumes.splice(selected, 1);
  selected = Math.max(0, selected - 1);
  editVolumes();
  update();
};
document.querySelectorAll('[data-view]').forEach(button => {
  button.onclick = () => {
    view = button.dataset.view;
    document.querySelectorAll('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    update();
  };
});
controls.forEach(id => byId(id).addEventListener(['lat', 'lon'].includes(id) ? 'change' : 'input', update));
restore();
editVolumes();
update();

/* Wizualizacja - Siedlisko Palenica, Ustroń. Ceny i zajęte terminy są przykładowe, formularz niczego nie wysyła. */
const B = document.body.dataset.base || '';
const PAGE = document.body.dataset.page || '';
const $ = id => document.getElementById(id);
const UNITS = window.UNITS || [];

/* Zajęte noce - przykładowe (na prawdziwej stronie z kalendarza iCal Booking.com / Airbnb) */
const BUSY = {
  dolny: [['2026-12-23','2026-12-27'],['2026-12-30','2027-01-03'],['2027-01-29','2027-02-07'],['2027-02-12','2027-02-14'],['2027-04-30','2027-05-03'],['2027-06-25','2027-07-04'],['2027-07-16','2027-07-25'],['2027-08-06','2027-08-15']],
  gorny: [['2026-12-30','2027-01-02'],['2027-01-15','2027-01-17'],['2027-02-05','2027-02-14'],['2027-03-12','2027-03-14'],['2027-05-01','2027-05-04'],['2027-07-02','2027-07-11'],['2027-07-23','2027-08-01'],['2027-08-20','2027-08-27']],
};
BUSY.cale = [...BUSY.dolny, ...BUSY.gorny];
const FROM = new Date(2026,11,1), TO = new Date(2027,10,30), MIN_NIGHTS = 2;
const MONTHS = ['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];
const MONTHS_GEN = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];

const d0 = s => { const [y,m,d] = String(s).split('-').map(Number); return new Date(y,m-1,d); };
const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const addDays = (d,n) => new Date(d.getFullYear(), d.getMonth(), d.getDate()+n);
const nights = (a,b) => Math.round((b-a)/864e5);
const fmt = d => `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
const zl = n => n.toLocaleString('pl-PL') + ' zł';
const nTxt = n => n === 1 ? 'noc' : ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100) ? 'noce' : 'nocy');
const osTxt = g => g === 1 ? 'osoba' : (g < 5 ? 'osoby' : 'osób');
const valid = d => d instanceof Date && !isNaN(d);
const unit = id => UNITS.find(u => u.id === id);
const busyNight = (id, d) => BUSY[id].some(([a,b]) => d >= d0(a) && d < d0(b));
const inRange = d => d >= FROM && d <= TO;
function free(id, a, b){ for(let d = new Date(a); d < b; d = addDays(d,1)){ if(!inRange(d) || busyNight(id,d)) return false; } return true; }

let cur = 'dolny', mIdx = 0, selIn = null, selOut = null;   // mIdx = numer miesiąca od grudnia 2026
const monthOf = i => { const d = new Date(2026, 11 + i, 1); return [d.getFullYear(), d.getMonth()]; };
const idxOf = d => (d.getFullYear() - 2026) * 12 + d.getMonth() - 11;

/* ===== wyniki wyszukiwania ===== */
function renderResults(a, b, g){
  const box = $('results'); if(!box) return;
  const n = nights(a,b);
  $('resultsHead').textContent = `${fmt(a)} - ${fmt(b)} · ${n} ${nTxt(n)} · ${g} ${osTxt(g)}`;
  box.innerHTML = UNITS.map(u => {
    const fits = g <= u.max, ok = fits && free(u.id,a,b) && n >= MIN_NIGHTS;
    const why = !fits ? 'Za mało miejsc' : (n < MIN_NIGHTS ? `Minimum ${MIN_NIGHTS} noce` : 'Zajęty w tym terminie');
    const side = ok
      ? `<span class="avail free">Wolny w tym terminie</span><div class="price"><b>${zl(n*u.price)}</b><br>za ${n} ${nTxt(n)}, ${u.price} zł / noc</div><button class="btn btn-rust" type="button" data-pick="${u.id}">Wybieram</button>`
      : `<span class="avail taken">${why}</span><button class="btn btn-line" type="button" data-cal="${u.id}">Pokaż wolne dni</button>`;
    return `<article class="result ${ok ? '' : 'taken'}">
      <div class="rp">${u.pic}</div>
      <div><span class="kicker">${u.kicker}</span><h3>${u.name}</h3><ul>${u.feat.map(f => `<li>${f}</li>`).join('')}</ul></div>
      <div class="r-side">${side}</div></article>`;
  }).join('');
  box.querySelectorAll('[data-pick]').forEach(btn => btn.onclick = () => { cur = btn.dataset.pick; selIn = a; selOut = b; mIdx = clampM(idxOf(a)); renderTabs(); renderCal(); $('kalendarz').scrollIntoView({behavior:'smooth'}); });
  box.querySelectorAll('[data-cal]').forEach(btn => btn.onclick = () => { cur = btn.dataset.cal; selIn = null; selOut = null; renderTabs(); renderCal(); $('kalendarz').scrollIntoView({behavior:'smooth'}); });
}
const clampM = i => Math.min(Math.max(i,0),10);

/* ===== kalendarz ===== */
function renderTabs(){
  const t = $('tabs'); if(!t) return;
  t.innerHTML = UNITS.map(u => `<button type="button" class="tab ${u.id===cur?'on':''}" data-tab="${u.id}">${u.tab}</button>`).join('');
  t.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { cur = b.dataset.tab; if(selIn && selOut && !free(cur,selIn,selOut)) selOut = null; renderTabs(); renderCal(); });
}
function monthHTML(y,m){
  const first = new Date(y,m,1), days = new Date(y,m+1,0).getDate(), offset = (first.getDay()+6)%7, price = unit(cur).price;
  let h = `<div class="month"><h4>${MONTHS[m]} ${y}</h4><div class="grid">`;
  ['pn','wt','śr','cz','pt','so','nd'].forEach(x => h += `<div class="dow">${x}</div>`);
  for(let i=0;i<offset;i++) h += `<div class="day empty"></div>`;
  for(let d=1; d<=days; d++){
    const dt = new Date(y,m,d);
    let cls = 'day', dis = false, lab = '';
    const canOut = selIn && !selOut && dt > selIn && free(cur, selIn, dt);
    if(!inRange(dt)){ cls += ' off'; dis = true; }
    else if(busyNight(cur,dt) && !canOut){ cls += ' busy'; dis = true; }
    else if(key(dt) !== key(TO)){ lab = `<small>${price}</small>`; }
    if(selIn && key(dt)===key(selIn)) cls += ' start';
    if(selOut && key(dt)===key(selOut)) cls += ' end';
    if(selIn && selOut && dt > selIn && dt < selOut) cls += ' in-range';
    h += `<button type="button" class="${cls}" ${dis?'disabled':''} data-d="${key(dt)}" aria-label="${fmt(dt)}">${d}${lab}</button>`;
  }
  return h + `</div></div>`;
}
function renderCal(){
  if(!$('months')) return;
  const [y1,m1] = monthOf(mIdx), [y2,m2] = monthOf(mIdx+1);
  $('months').innerHTML = monthHTML(y1,m1) + monthHTML(y2,m2);
  $('calTitle').textContent = `${MONTHS[m1]} ${y1}`;
  $('prev').disabled = mIdx <= 0; $('next').disabled = mIdx >= 10;
  document.querySelectorAll('#months .day[data-d]').forEach(b => b.addEventListener('click', () => clickDay(d0(b.dataset.d))));
  renderSummary();
}
function clickDay(d){
  if(!selIn || selOut || d <= selIn){ selIn = d; selOut = null; }
  else if(free(cur, selIn, d)){ selOut = d; }
  else { selIn = d; selOut = null; }
  renderCal();
}
function renderSummary(){
  const u = unit(cur);
  $('sumUnit').textContent = `${u.name} (do ${u.max} os.)`;
  $('sumIn').textContent = selIn ? fmt(selIn) : 'wybierz w kalendarzu';
  $('sumOut').textContent = selOut ? fmt(selOut) : (selIn ? 'kliknij dzień wyjazdu' : '-');
  const n = selIn && selOut ? nights(selIn, selOut) : 0;
  $('sumNights').textContent = n ? `${n} ${nTxt(n)}` : '-';
  $('sumTotal').textContent = n ? zl(n*u.price) : '-';
  const ok = n >= MIN_NIGHTS;
  $('bookBtn').disabled = !ok;
  $('sumHint').textContent = n && !ok ? `Minimalny pobyt: ${MIN_NIGHTS} noce.` : '';
}

if(PAGE === 'rezerwacja'){
  const P = new URLSearchParams(location.search);
  let a = d0(P.get('in') || '2027-02-19'), b = d0(P.get('out') || '2027-02-22'), g = +(P.get('g') || 4);
  if(!valid(a) || !valid(b) || !(b > a) || !inRange(a)){ a = d0('2027-02-19'); b = d0('2027-02-22'); }
  if(!(g >= 1 && g <= 14)) g = 4;
  $('sIn').value = key(a); $('sOut').value = key(b); $('sGuests').value = String(g);
  renderResults(a,b,g);
  const wanted = unit(P.get('apartament'));
  if(wanted){ cur = wanted.id; if(free(cur,a,b) && g <= wanted.max){ selIn = a; selOut = b; } }
  else { const f = UNITS.find(u => free(u.id,a,b) && g <= u.max); if(f){ cur = f.id; selIn = a; selOut = b; } }
  mIdx = clampM(idxOf(a)); renderTabs(); renderCal();
  if(wanted) setTimeout(() => $('kalendarz').scrollIntoView(), 60);
  $('prev').onclick = () => { mIdx--; renderCal(); };
  $('next').onclick = () => { mIdx++; renderCal(); };
  $('searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const na = d0($('sIn').value), nb = d0($('sOut').value), ng = +$('sGuests').value;
    if(!valid(na) || !valid(nb) || !(nb > na)){ alert('Data wyjazdu musi być po dacie przyjazdu.'); return; }
    if(!inRange(na) || !inRange(addDays(nb,-1))){ alert('W wizualizacji kalendarz obejmuje grudzień 2026 - listopad 2027.'); return; }
    history.replaceState(null, '', `?in=${key(na)}&out=${key(nb)}&g=${ng}`);
    renderResults(na,nb,ng);
    const f = UNITS.find(u => free(u.id,na,nb) && ng <= u.max);
    if(f){ cur = f.id; selIn = na; selOut = nb; } else { selIn = null; selOut = null; }
    mIdx = clampM(idxOf(na)); renderTabs(); renderCal();
    $('resultsHead').scrollIntoView({behavior:'smooth'});
  });
  const modal = $('modal');
  $('bookBtn').onclick = () => {
    const u = unit(cur), n = nights(selIn,selOut);
    $('mSummary').innerHTML = `<b>${u.name}</b> (do ${u.max} os.)<br>${fmt(selIn)} - ${fmt(selOut)} · ${n} ${nTxt(n)}<br>Razem: <b>${zl(n*u.price)}</b>`;
    $('mForm').style.display = ''; $('mOk').style.display = 'none';
    modal.classList.add('on');
  };
  $('mClose').onclick = () => modal.classList.remove('on');
  modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('on'); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') modal.classList.remove('on'); });
  $('bookForm').addEventListener('submit', e => { e.preventDefault(); $('mForm').style.display = 'none'; $('mOk').style.display = 'block'; });
}

/* ===== formularz na stronie głównej - przejście do terminów ===== */
const quick = $('quickSearch');
if(quick){
  quick.addEventListener('submit', e => {
    const na = d0(quick.in.value), nb = d0(quick.out.value);
    if(!valid(na) || !valid(nb) || !(nb > na)){ e.preventDefault(); alert('Data wyjazdu musi być po dacie przyjazdu.'); }
  });
}

/* ===== galeria z powiększeniem ===== */
const gal = $('gallery');
if(gal){
  const items = [...gal.querySelectorAll('button')].filter(b => b.querySelector('img'));
  const lb = $('lb'), lbImg = $('lbImg'); let i0 = 0;
  const show = i => { i0 = (i + items.length) % items.length; const im = items[i0].querySelector('img'); lbImg.src = im.dataset.full || im.src; lbImg.alt = im.alt; lb.classList.add('on'); };
  items.forEach((b,i) => b.onclick = () => show(i));
  $('lbPrev').onclick = () => show(i0-1);
  $('lbNext').onclick = () => show(i0+1);
  $('lbClose').onclick = () => lb.classList.remove('on');
  lb.addEventListener('click', e => { if(e.target === lb) lb.classList.remove('on'); });
  document.addEventListener('keydown', e => {
    if(!lb.classList.contains('on')) return;
    if(e.key === 'Escape') lb.classList.remove('on');
    if(e.key === 'ArrowRight') show(i0+1);
    if(e.key === 'ArrowLeft') show(i0-1);
  });
}

/* ===== formularz kontaktowy - wizualizacja ===== */
document.querySelectorAll('form[data-demo]').forEach(f => f.addEventListener('submit', e => {
  e.preventDefault();
  f.innerHTML = '<div class="ok-msg" style="display:block"><div class="ico">✓</div><h3>Dziękujemy!</h3><p class="muted">W wizualizacji nic nie zostało wysłane. Na prawdziwej stronie wiadomość trafi na maila właściciela.</p></div>';
}));

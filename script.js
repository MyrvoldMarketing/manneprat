/* =====================================================
   Manneprat-testen – quiz logic with adaptive problem flow
   ===================================================== */

const OPTIONS = [
  { value: 1, label: 'Stemmer ikke i det hele tatt' },
  { value: 2, label: 'Stemmer i liten grad' },
  { value: 3, label: 'Stemmer delvis' },
  { value: 4, label: 'Stemmer i stor grad' },
  { value: 5, label: 'Stemmer helt' },
];

const DIMS = {
  reg: 'Emosjonell regulering',
  id:  'Selv-identitet',
  gr:  'Grenser',
  sf:  'Selvfølelse',
  ret: 'Retning',
};

// Core question bank (universal, covers all 5 dims)
const CORE = [
  { dim: 'reg', text: 'Jeg eksploderer i sinne over småting – og angrer etterpå.', reverse: true },
  { dim: 'reg', text: 'Jeg klarer å kjenne på sorg eller smerte uten å flykte fra den.', reverse: false },
  { dim: 'reg', text: 'Jeg bruker alkohol, trening, jobb, porno eller scrolling for å slippe å kjenne etter.', reverse: true },
  { dim: 'reg', text: 'Jeg merker hva jeg føler i kroppen før jeg reagerer utad.', reverse: false },

  { dim: 'id', text: 'Jeg vet hvem jeg er – uavhengig av rollene jeg har.', reverse: false },
  { dim: 'id', text: 'Jeg har mistet kontakt med det som pleide å gi meg mening.', reverse: true },
  { dim: 'id', text: 'Jeg kjenner meg tom eller rastløs når jeg er alene med meg selv.', reverse: true },
  { dim: 'id', text: 'Jeg har klare verdier som styrer de store valgene mine.', reverse: false },

  { dim: 'gr', text: 'Jeg sier ja når jeg egentlig mener nei – for å unngå konflikt.', reverse: true },
  { dim: 'gr', text: 'Jeg kan sette en grense uten å bli aggressiv eller føle skyld.', reverse: false },
  { dim: 'gr', text: 'Jeg strekker meg for langt for å bli likt eller godkjent.', reverse: true },

  { dim: 'sf', text: 'Jeg tror dypt sett at jeg fortjener å bli elsket slik jeg er.', reverse: false },
  { dim: 'sf', text: 'Jeg snakker hardere til meg selv enn jeg ville snakket til en venn.', reverse: true },
  { dim: 'sf', text: 'Jeg sammenligner meg konstant med andre menn.', reverse: true },

  { dim: 'ret', text: 'Jeg har en tydelig retning jeg beveger meg mot de neste 12 månedene.', reverse: false },
  { dim: 'ret', text: 'Jeg vet hvilken mann jeg vil være – ikke bare hva jeg vil unngå.', reverse: false },
  { dim: 'ret', text: 'Jeg våkner med energi og hensikt de fleste morgener.', reverse: false },
];

// Problem-specific "deep-dive" questions appended early in the flow
const PROBLEM_QUESTIONS = {
  brudd: [
    { dim: 'id', text: 'Jeg vet ikke hvem jeg er uten henne.', reverse: true },
    { dim: 'sf', text: 'En del av meg tror hun gikk fordi jeg ikke var nok.', reverse: true },
    { dim: 'reg', text: 'Jeg sjekker mobilen/sosiale medier for å se hva hun gjør.', reverse: true },
  ],
  sinne: [
    { dim: 'reg', text: 'Lunta mi er kortere enn jeg vil innrømme.', reverse: true },
    { dim: 'reg', text: 'Jeg skremmer meg selv med hvor hardt jeg kan reagere.', reverse: true },
    { dim: 'gr', text: 'Jeg holder inne til det koker over.', reverse: true },
  ],
  tomhet: [
    { dim: 'id', text: 'Jeg gleder meg ikke til noe – det bare går.', reverse: true },
    { dim: 'ret', text: 'Jeg vet ikke lenger hva jeg egentlig vil.', reverse: true },
    { dim: 'reg', text: 'Jeg holder meg konstant opptatt så jeg slipper å kjenne.', reverse: true },
  ],
  stress: [
    { dim: 'sf', text: 'Verdien min henger i om jeg presterer.', reverse: true },
    { dim: 'reg', text: 'Jeg klarer ikke slappe av uten å føle dårlig samvittighet.', reverse: true },
    { dim: 'gr', text: 'Jeg tar på meg mer enn jeg har kapasitet til.', reverse: true },
  ],
  grenser: [
    { dim: 'gr', text: 'Jeg gjør ting jeg ikke vil for å unngå å skuffe andre.', reverse: true },
    { dim: 'sf', text: 'Jeg trenger at folk liker meg for å føle meg ok.', reverse: true },
    { dim: 'reg', text: 'Når jeg endelig sier fra, kommer det ut som sinne.', reverse: true },
  ],
  identitet: [
    { dim: 'id', text: 'Jeg spiller en rolle – få ser hvem jeg egentlig er.', reverse: true },
    { dim: 'ret', text: 'Jeg drar på rutinen, men vet ikke hvor jeg skal.', reverse: true },
    { dim: 'sf', text: 'Jeg føler meg ofte som en bedrager.', reverse: true },
  ],
};

const PROBLEM_META = {
  brudd:     { label: 'Brudd / skilsmisse',    short: 'bruddet' },
  sinne:     { label: 'Sinne / kort lunte',    short: 'sinnet' },
  tomhet:    { label: 'Tomhet / mangel på mening', short: 'tomheten' },
  stress:    { label: 'Stress / prestasjonspress', short: 'presset' },
  grenser:   { label: 'Pleasing / grenseløshet',   short: 'pleasingen' },
  identitet: { label: 'Identitet',             short: 'identitetskrisen' },
};

const state = {
  problem: null,
  questions: [],
  current: 0,
  answers: [],
};

// ===== DOM =====
const screens = document.querySelectorAll('.quiz__screen');
const qIndex = document.getElementById('qIndex');
const qTotal = document.getElementById('qTotal');
const qText = document.getElementById('qText');
const qDim = document.getElementById('qDimension');
const qOptions = document.getElementById('qOptions');
const progressBar = document.getElementById('progressBar');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');

function showScreen(name) {
  screens.forEach(s => s.hidden = s.dataset.screen !== name);
  document.getElementById('test').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== Problem selector =====
document.getElementById('problemSelect').addEventListener('click', (e) => {
  const btn = e.target.closest('.problem-select__btn');
  if (!btn) return;
  state.problem = btn.dataset.problem;

  // Build question list: problem-specific first, then core, deduped
  state.questions = [...PROBLEM_QUESTIONS[state.problem], ...CORE];
  state.current = 0;
  state.answers = new Array(state.questions.length).fill(null);
  qTotal.textContent = state.questions.length;

  renderQuestion();
  showScreen('questions');
});

// ===== Question rendering =====
function renderQuestion() {
  const i = state.current;
  const q = state.questions[i];
  qIndex.textContent = i + 1;
  qText.textContent = q.text;
  qDim.textContent = DIMS[q.dim];
  progressBar.style.width = `${(i / state.questions.length) * 100}%`;

  qOptions.innerHTML = '';
  OPTIONS.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quiz__option';
    btn.dataset.value = opt.value;
    btn.innerHTML = `<span class="dot-mark"></span><span>${opt.label}</span>`;
    if (state.answers[i] === opt.value) btn.classList.add('is-selected');
    btn.addEventListener('click', () => {
      state.answers[i] = opt.value;
      qOptions.querySelectorAll('.quiz__option').forEach(el => el.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      nextBtn.disabled = false;
      setTimeout(goNext, 220);
    });
    qOptions.appendChild(btn);
  });

  nextBtn.disabled = state.answers[i] == null;
  prevBtn.disabled = i === 0;
}

function goNext() {
  if (state.current < state.questions.length - 1) {
    state.current++;
    renderQuestion();
  } else {
    progressBar.style.width = '100%';
    showScreen('email');
  }
}
function goPrev() {
  if (state.current > 0) {
    state.current--;
    renderQuestion();
  }
}
nextBtn.addEventListener('click', goNext);
prevBtn.addEventListener('click', goPrev);

// ===== Email form =====
document.getElementById('emailForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('fornavn').value.trim();
  const email = document.getElementById('epost').value.trim();
  const consent = document.getElementById('consent').checked;
  if (!name || !email || !consent) return;

  const result = computeResult();

  // Lokal backup (hvis nettverk feiler)
  try {
    const leads = JSON.parse(localStorage.getItem('mp_leads') || '[]');
    leads.push({ name, email, problem: state.problem, ts: new Date().toISOString(), score: result.total, dims: result.dims });
    localStorage.setItem('mp_leads', JSON.stringify(leads));
  } catch (_) {}

  // Send til MailerLite via subscribe.php
  try {
    await fetch('subscribe.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        problem: state.problem,
        score: result.total,
        dims: result.dims,
      }),
    });
  } catch (_) {
    // Stille feil — brukeren får uansett rapporten sin.
  }

  document.getElementById('sentToEmail').textContent = email;
  renderResults(result, name);
  showScreen('results');
});

// ===== Scoring =====
function computeResult() {
  const sums = { reg: [], id: [], gr: [], sf: [], ret: [] };
  state.questions.forEach((q, i) => {
    const raw = state.answers[i] || 3;
    const normalized = q.reverse ? (5 - raw) : (raw - 1);
    sums[q.dim].push((normalized / 4) * 100);
  });
  const dims = {};
  Object.keys(sums).forEach(k => {
    const arr = sums[k];
    dims[k] = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 50;
  });
  const total = Math.round(Object.values(dims).reduce((a, b) => a + b, 0) / 5);
  return { total, dims };
}

// ===== Result copy =====
function tier(total, problem) {
  const short = PROBLEM_META[problem]?.short || 'problemet';
  if (total <= 35) return {
    label: 'Dyp krise – du trenger støtte nå',
    headline: `Du står midt i stormen.`,
    intro: `Svarene dine er tydelige: ${short} har tatt mer plass enn du klarer å bære alene. Det er ikke svakhet – det er et signal.`,
  };
  if (total <= 55) return {
    label: 'På bunnen – reisen starter her',
    headline: `Du ser problemet. Nå kommer arbeidet.`,
    intro: `Du har kontakt med at noe ikke stemmer. Det er faktisk det viktigste steget. Nå handler det om verktøy og struktur.`,
  };
  if (total <= 75) return {
    label: 'I bevegelse – du bygger fundamentet',
    headline: `Du har gjort mye av jobben alt.`,
    intro: `Det er områder der du kollapser under trykk – men basen er der. Det er i finpussen neste nivå ligger.`,
  };
  return {
    label: 'Sterk – forsterk det du har',
    headline: `Du står støtt.`,
    intro: `Du har tydelig gjort arbeid. Jobben nå er å ikke gli tilbake når livet slår hardt neste gang.`,
  };
}

const DIM_TEXTS = {
  reg: {
    low:  'Du reagerer før du rekker å tenke. Kroppen tar rattet. Her kjenner du raskest forskjell med riktige verktøy.',
    mid:  'Du kjenner etter – men gamle mønstre tar over i varmen. Neste steg: være med følelsen, ikke styrt av den.',
    high: 'God kontakt med følelsene dine. Tren på det når det koker – der bygges mestring.',
  },
  id: {
    low:  'Du er usikker på hvem du er utenfor rollene dine. Det er her mange menn kollapser – og her gjenoppbyggingen må starte.',
    mid:  'Du har biter av deg selv – men ikke en hel mann. Samle delene, også de du skammer deg over.',
    high: 'Solid selvforståelse. Hold den levende, ikke rigid.',
  },
  gr: {
    low:  'Du har overlevd ved å tilpasse deg. Det koster respekt – din egen først. Grenser er ikke vegger, det er tydelighet.',
    mid:  'Du svinger mellom å holde inne og eksplodere. Det rolige "nei" er der du skal lande.',
    high: 'Du kombinerer tydelighet og varme. Sjelden ferdighet. Bruk den.',
  },
  sf: {
    low:  'En stor del av deg tror du ikke er nok. Den delen tar valgene dine. Dette er kjerneområdet.',
    mid:  'Grunnleggende verdi finnes, men den vakler ved avvisning. Målet: selvfølelse uavhengig av resultat.',
    high: 'Indre trygghet som ikke lever på andres godkjenning. Bygg videre.',
  },
  ret: {
    low:  'Du lever i overlevelsesmodus. Uten retning fyller savnet hodet. Bevegelse gir helbredelse.',
    mid:  'Du har ideer, men mangler strukturen som holder. Konkretisér.',
    high: 'En retning som trekker deg fremover. Sørg for at den er din.',
  },
};

function dimText(key, score) {
  if (score <= 40) return DIM_TEXTS[key].low;
  if (score <= 70) return DIM_TEXTS[key].mid;
  return DIM_TEXTS[key].high;
}

const STEP_BANK = {
  reg: 'Neste gang du kjenner sinne eller panikk: stopp, pust ut i 6 sekunder, spør deg selv: "Hvilken del av meg reagerer nå – og hvor gammel føles den?" Nysgjerrighet endrer alt.',
  id: 'Skriv ned 5 ting du brant for før. Plukk én. Gjør noe konkret innen 48 timer. Uansett hvor lite.',
  gr: 'Finn én ting denne uka du pleier å si ja til uten å ville. Si nei. Rolig. Kort. Uten unnskyldning. Legg merke til hva som skjer i kroppen.',
  sf: 'Skriv ned den hardeste setningen du sier til deg selv. Les den høyt. Ville du sagt det til en venn? Hvorfor da til deg selv?',
  ret: 'Beskriv mannen du vil være om 12 måneder i 3 konkrete setninger. Ikke "lykkelig" – hva han faktisk gjør. Heng det opp.',
};

function personalSteps(dims) {
  const sorted = Object.entries(dims).sort((a, b) => a[1] - b[1]);
  const weakest = sorted.slice(0, 2).map(e => e[0]);
  const steps = weakest.map(k => STEP_BANK[k]);
  steps.push('Book en gratis 20-min samtale med Fredrik. De fleste menn sier de skulle ha gjort det for måneder siden.');
  return steps;
}

// ===== Render results =====
function renderResults(result, name) {
  const t = tier(result.total, state.problem);
  document.getElementById('resultHeadline').textContent = `${name}, ${t.headline.toLowerCase()}`;
  document.getElementById('resultIntro').textContent = t.intro;
  document.getElementById('resultTier').textContent = t.label;

  const big = document.getElementById('bigRing');
  const C = 2 * Math.PI * 70;
  big.style.strokeDasharray = C;
  big.style.strokeDashoffset = C;
  requestAnimationFrame(() => {
    big.style.strokeDashoffset = C - (C * (result.total / 100));
  });

  animateNumber(document.getElementById('bigScore'), 0, result.total, 1100);

  const dimsEl = document.getElementById('resultDims');
  dimsEl.innerHTML = '';
  Object.entries(result.dims).forEach(([k, v]) => {
    const row = document.createElement('div');
    row.className = 'dim-row';
    row.innerHTML = `
      <div class="dim-row__head">
        <span class="dim-row__name">${DIMS[k]}</span>
        <span class="dim-row__score">${v}/100</span>
      </div>
      <div class="dim-row__bar"><div class="dim-row__fill" style="width:0%"></div></div>
      <p class="dim-row__text">${dimText(k, v)}</p>
    `;
    dimsEl.appendChild(row);
    requestAnimationFrame(() => {
      row.querySelector('.dim-row__fill').style.width = `${v}%`;
    });
  });

  const stepsEl = document.getElementById('resultSteps');
  stepsEl.innerHTML = '';
  personalSteps(result.dims).forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    stepsEl.appendChild(li);
  });
}

function animateNumber(el, from, to, duration) {
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ===== Footer year =====
document.getElementById('yr').textContent = new Date().getFullYear();

// ===== Smooth scroll =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

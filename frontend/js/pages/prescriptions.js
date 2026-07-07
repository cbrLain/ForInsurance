/* js/pages/prescriptions.js */
let prescPage = 1;
let consultPage = 1;

/* ══ PRESCRIPTIONS MÉDICAMENTS ══════════════════════════════ */
async function loadPrescriptionsMed(q = '', pg) {
  if (pg !== undefined) prescPage = pg;
  setLoader('tbody-presc', 5);
  try {
    const params = { type: 'medicaments', page: prescPage, limit: 20 };
    if (q) params.q = q;
    const res = await Api.getPrescriptions(params);
    renderPrescriptionsMed(res.data);
    renderPagination('pag-presc', res, p => { prescPage = p; loadPrescriptionsMed(q); });
  } catch(e) { toast(e.message, 'error'); }
}

function renderPrescriptionsMed(rows) {
  const tb = document.getElementById('tbody-presc');
  if (!rows.length) { tb.innerHTML = emptyRow(5, 'Aucune prescription médicamenteuse'); return; }
  tb.innerHTML = rows.map(p => `
    <tr>
      <td><code style="font-size:.8rem;color:var(--text-muted)">#${p.id}</code></td>
      <td>${p.assure_nom}<br><small style="color:var(--text-muted)">${p.numero_ss}</small></td>
      <td>${(p.medicaments||[]).map(m =>
        `<span class="badge b-light" style="margin:2px">${m.nom_medicament}</span>`
      ).join('')}</td>
      <td>${fmtDate(p.date_prescription)}</td>
      <td><div class="t-actions">
        <button class="btn btn-sm btn-secondary" onclick="viewPrescription(${p.id})"><i class="fas fa-eye"></i> Voir</button>
      </div></td>
    </tr>
  `).join('');
}

/* ── Helper : créer un SearchSelect pour un assuré ──────── */
function _createAssureSearch(inputId, hiddenId, resultsId) {
  return SearchSelect.create({
    input: document.getElementById(inputId),
    hidden: document.getElementById(hiddenId),
    results: document.getElementById(resultsId),
    minLength: 2,
    search: async (q) => {
      const res = await Api.getAssures(q);
      return (res.data || []).map(a => ({
        id: a.id,
        nom: a.nom,
        prenom: a.prenom,
        label: `${a.nom} ${a.prenom} — ${a.numero_ss}`,
        numero_ss: a.numero_ss
      }));
    },
    render: (a) => `<strong>${a.nom} ${a.prenom}</strong><br><small>${a.numero_ss}</small>`,
  });
}

/* ── Helper : créer un SearchSelect pour feuilles ──────── */
function _createFeuilleSearch(inputId, hiddenId, resultsId, assureHiddenId) {
  return SearchSelect.create({
    input: document.getElementById(inputId),
    hidden: document.getElementById(hiddenId),
    results: document.getElementById(resultsId),
    minLength: 1,
    search: async (q) => {
      const assureId = document.getElementById(assureHiddenId)?.value;
      const res = await Api.searchFeuilles(q, assureId);
      return (res || []).map(f => ({
        id: f.id,
        label: `${f.reference} — ${f.assure_nom}`,
        reference: f.reference,
        nom: f.reference,
        detail: f.assure_nom,
        statut: f.statut,
        value: f.id
      }));
    },
    render: (f) => `<strong>${f.reference}</strong> — ${f.detail} <span class="badge" style="float:right;font-size:.7rem">${f.statut}</span>`,
  });
}

/* ── Helper : créer un SearchSelect pour médicaments ───── */
function _createMedSearch(inputEl) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ss-wrapper';
  wrapper.style.flex = '1';
  inputEl.parentNode.insertBefore(wrapper, inputEl);
  wrapper.appendChild(inputEl);

  const results = document.createElement('div');
  results.className = 'ss-results';
  wrapper.appendChild(results);

  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.className = 'mr-med-id';
  wrapper.appendChild(hidden);

  return SearchSelect.create({
    input: inputEl,
    hidden,
    results,
    minLength: 1,
    search: async (q) => {
      try {
        const data = await Api.searchMedicaments(q);
        return (data || []).map(m => ({
          id: m.nom,
          nom: m.nom,
          label: m.nom,
          dosage: m.dosage,
          value: m.nom
        }));
      } catch {
        return [];
      }
    },
    render: (m) => `<strong>${m.nom}</strong>${m.dosage ? '<br><small>'+m.dosage+'</small>' : ''}`,
  });
}

/* ── Modale ajouter prescription médicaments ─────────────── */
function showAddPrescription() {
  Modal.wide('Prescrire des médicaments', `
    <div class="form-group">
      <label>Assuré *</label>
      <div class="ss-wrapper">
        <input id="pm-search" placeholder="Tapez le nom, prénom ou N° SS…"/>
        <div id="pm-results" class="ss-results"></div>
      </div>
      <input type="hidden" id="pm-assure-id"/>
    </div>
    <div class="form-group">
      <label>Feuille de maladie *</label>
      <input id="pm-feuille-q" placeholder="Référence, patient…" autocomplete="off"/>
      <div id="pm-feuille-results" class="ss-results"></div>
      <input type="hidden" id="pm-feuille-id"/>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Date de prescription</label><input id="pm-date" type="date" value="${new Date().toISOString().split('T')[0]}"/></div>
    </div>
    <div class="form-group"><label>Notes</label><textarea id="pm-notes" rows="2" placeholder="Observations…"></textarea></div>

    <div style="margin-top:14px">
      <label style="font-size:.8rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px">MÉDICAMENTS PRESCRITS *</label>
      <div id="med-rows" class="med-rows"></div>
      <button class="btn-add-row" onclick="addMedRow()"><i class="fas fa-plus"></i> Ajouter un médicament</button>
    </div>
    <div id="pm-err" class="alert alert-error hidden" style="margin-top:10px"></div>
  `, `
    <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    <button class="btn btn-primary" onclick="submitPrescriptionMed()"><i class="fas fa-prescription-bottle-alt"></i> Enregistrer la prescription</button>
  `);

  window._pmAssureSearch = _createAssureSearch('pm-search', 'pm-assure-id', 'pm-results');
  window._pmFeuilleSearch = _createFeuilleSearch('pm-feuille-q', 'pm-feuille-id', 'pm-feuille-results', 'pm-assure-id');
  addMedRow(); // une ligne par défaut
}

let medRowCount = 0;
function addMedRow() {
  medRowCount++;
  const id = medRowCount;
  const container = document.getElementById('med-rows');
  const div = document.createElement('div');
  div.className = 'med-row';
  div.id = `med-row-${id}`;
  div.innerHTML = `
    <button class="btn-rm" onclick="document.getElementById('med-row-${id}').remove()"><i class="fas fa-times"></i></button>
    <div class="form-row">
      <div class="form-group" style="flex:2"><label>Nom du médicament *</label><input class="mr-nom" placeholder="Paracétamol 1g"/></div>
      <div class="form-group" style="flex:1"><label>Dosage</label><input class="mr-dos" placeholder="3x/jour"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Durée</label><input class="mr-dur" placeholder="7 jours"/></div>
      <div class="form-group"><label>Instructions</label><input class="mr-ins" placeholder="Après les repas"/></div>
    </div>
  `;
  container.appendChild(div);

  // Appliquer SearchSelect sur le champ médicament
  const nomInput = div.querySelector('.mr-nom');
  _createMedSearch(nomInput);
}

/* ── Recherche feuille (pour rétrocompatibilité) ────────── */
const _prescTimers = {};

function rechercherFeuille(q, prefix) {
  const container = document.getElementById(`${prefix}-feuille-results`);
  const hidden    = document.getElementById(`${prefix}-feuille-id`);
  if (!q || q.length < 2) { container.innerHTML = ''; container.style.display = 'none'; hidden.value = ''; return; }
  if (_prescTimers[`${prefix}-f`]) clearTimeout(_prescTimers[`${prefix}-f`]);
  _prescTimers[`${prefix}-f`] = setTimeout(async () => {
    try {
      const rows = await Api.searchFeuilles(q);
      if (!rows.length) {
        container.innerHTML = '<div class="ss-item ss-disabled">Aucune feuille trouvée</div>';
        container.style.display = 'block';
        hidden.value = '';
        return;
      }
      container.innerHTML = rows.map(f =>
        `<div class="ss-item" data-id="${f.id}" data-prefix="${prefix}" onclick="selectionnerFeuille(this,'${prefix}')">
          <strong>${f.reference}</strong> — ${f.assure_nom}
          <span class="badge" style="float:right;font-size:.7rem">${f.statut}</span>
        </div>`
      ).join('');
      container.style.display = 'block';
    } catch { container.innerHTML = ''; container.style.display = 'none'; }
  }, 300);
}

function selectionnerFeuille(el, prefix) {
  const ref = el.querySelector('strong')?.textContent || el.textContent.trim().split('—')[0].trim();
  document.getElementById(`${prefix}-feuille-q`).value = ref;
  document.getElementById(`${prefix}-feuille-id`).value = el.dataset.id;
  document.getElementById(`${prefix}-feuille-results`).innerHTML = '';
  document.getElementById(`${prefix}-feuille-results`).style.display = 'none';
}

async function submitPrescriptionMed() {
  const err = document.getElementById('pm-err');
  err.classList.add('hidden');
  const assure_id = document.getElementById('pm-assure-id').value;
  if (!assure_id) { err.textContent = 'Sélectionnez un assuré.'; err.classList.remove('hidden'); return; }
  const feuille_id = document.getElementById('pm-feuille-id').value;
  if (!feuille_id) { err.textContent = 'Sélectionnez une feuille de maladie.'; err.classList.remove('hidden'); return; }

  // Collecter les lignes médicaments
  const rows = document.querySelectorAll('.med-row');
  const medicaments = [];
  for (const row of rows) {
    const nom = row.querySelector('.mr-nom')?.value.trim();
    if (!nom) continue;
    medicaments.push({
      nom_medicament: nom,
      dosage:         row.querySelector('.mr-dos')?.value.trim() || null,
      duree:          row.querySelector('.mr-dur')?.value.trim() || null,
      instructions:   row.querySelector('.mr-ins')?.value.trim() || null,
    });
  }
  if (!medicaments.length) { err.textContent = 'Ajoutez au moins un médicament.'; err.classList.remove('hidden'); return; }

  const data = {
    assure_id:        parseInt(assure_id),
    feuille_id:       parseInt(feuille_id),
    date_prescription: document.getElementById('pm-date').value,
    notes:            document.getElementById('pm-notes').value.trim() || null,
    medicaments,
  };
  try {
    await Api.addPrescriptionMed(data);
    Modal.close(); toast('Prescription médicaments enregistrée !', 'success');
    loadPrescriptionsMed();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

async function viewPrescription(id) {
  try {
    const p = (await Api.getPrescriptions({ type: 'medicaments' })).data;
    const presc = p.find(x => x.id === id);
    if (!presc) { toast('Prescription introuvable.', 'error'); return; }
    Modal.wide(`Prescription #${id} : ${presc.assure_nom}`, `
      <div class="det-grid">
        <div class="det-item"><div class="det-lbl">Patient</div><div class="det-val">${presc.assure_nom}</div></div>
        <div class="det-item"><div class="det-lbl">N° SS</div><div class="det-val" style="color:var(--text-muted)">${presc.numero_ss}</div></div>
        <div class="det-item"><div class="det-lbl">Médecin</div><div class="det-val">Dr. ${presc.medecin_nom}</div></div>
        <div class="det-item"><div class="det-lbl">Date</div><div class="det-val">${fmtDate(presc.date_prescription)}</div></div>
      </div>
      ${presc.notes ? `<div class="alert alert-info" style="margin:10px 0"><i class="fas fa-info-circle"></i> ${presc.notes}</div>` : ''}
      <div style="margin-top:10px">
        <div style="font-size:.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Médicaments prescrits</div>
        ${(presc.medicaments||[]).map(m => `
          <div class="med-row" style="margin-bottom:6px">
            <div style="font-weight:700;color:var(--text);margin-bottom:3px">${m.nom_medicament}</div>
            <div style="font-size:.8rem;color:var(--text-muted)">
              ${m.dosage ? `Dosage : ${m.dosage}` : ''} ${m.duree ? `· Durée : ${m.duree}` : ''} ${m.instructions ? `· ${m.instructions}` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

document.getElementById('btn-add-presc').onclick = showAddPrescription;
document.getElementById('q-presc').addEventListener('input', e => {
  clearTimeout(window._qpr);
  const v = e.target.value;
  prescPage = 1;
  if (!v) { loadPrescriptionsMed(''); return; }
  window._qpr = setTimeout(() => loadPrescriptionsMed(v), 300);
});

/* ══ CONSULTATIONS SPÉCIALISTE ══════════════════════════════ */
async function loadConsultationsSpec(q = '', pg) {
  if (pg !== undefined) consultPage = pg;
  setLoader('tbody-consult', 6);
  try {
    const params = { type: 'consultation_specialiste', page: consultPage, limit: 20 };
    if (q) params.q = q;
    const res = await Api.getPrescriptions(params);
    renderConsultationsSpec(res.data);
    renderPagination('pag-consult', res, p => { consultPage = p; loadConsultationsSpec(q); });
  } catch(e) { toast(e.message, 'error'); }
}

function renderConsultationsSpec(rows) {
  const tb = document.getElementById('tbody-consult');
  if (!rows.length) { tb.innerHTML = emptyRow(6, 'Aucune prescription de consultation'); return; }
  tb.innerHTML = rows.map(p => {
    const c = p.consultation || {};
    return `
      <tr>
        <td><code style="font-size:.8rem;color:var(--text-muted)">#${p.id}</code></td>
        <td>${p.assure_nom}<br><small style="color:var(--text-muted)">${p.numero_ss}</small></td>
        <td><span class="badge b-light">${c.specialite_requise || ''}</span></td>
        <td>${c.urgence === 'urgente'
          ? '<span class="badge b-danger"><i class="fas fa-exclamation-triangle"></i> Urgente</span>'
          : '<span class="badge b-light">Normale</span>'}</td>
        <td>${fmtDate(p.date_prescription)}</td>
        <td><div class="t-actions">
          <button class="btn btn-sm btn-secondary" onclick="viewConsultation(${p.id})"><i class="fas fa-eye"></i> Voir</button>
        </div></td>
      </tr>
    `;
  }).join('');
}

function showAddConsultation() {
  Modal.wide('Prescrire une consultation chez un spécialiste', `
    <div class="form-group">
      <label>Assuré *</label>
      <div class="ss-wrapper">
        <input id="cs-search" placeholder="Tapez le nom, prénom ou N° SS…"/>
        <div id="cs-results" class="ss-results"></div>
      </div>
      <input type="hidden" id="cs-assure-id"/>
    </div>
    <div class="form-group">
      <label>Feuille de maladie *</label>
      <input id="cs-feuille-q" placeholder="Référence, patient…" autocomplete="off"/>
      <div id="cs-feuille-results" class="ss-results"></div>
      <input type="hidden" id="cs-feuille-id"/>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Spécialité requise *</label>
        <input id="cs-spec" placeholder="Cardiologie, Neurologie…" list="spec-list"/>
        <datalist id="spec-list">
          <option value="Cardiologie">
          <option value="Neurologie">
          <option value="Dermatologie">
          <option value="Pédiatrie">
          <option value="Ophtalmologie">
          <option value="ORL">
          <option value="Rhumatologie">
          <option value="Endocrinologie">
          <option value="Pneumologie">
          <option value="Gynécologie">
          <option value="Urologie">
          <option value="Gastroentérologie">
          <option value="Psychiatrie">
          <option value="Radiologie">
        </datalist>
      </div>
      <div class="form-group">
        <label>Urgence</label>
        <select id="cs-urgence">
          <option value="normale">Normale</option>
          <option value="urgente">Urgente</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Spécialiste désigné (optionnel)</label>
      <div class="ss-wrapper">
        <input id="cs-specialiste" placeholder="Tapez le nom, prénom ou spécialité…"/>
        <div id="cs-specialiste-results" class="ss-results"></div>
        <input type="hidden" id="cs-specialiste-id"/>
      </div>
    </div>
    <div class="form-group"><label>Motif de la consultation *</label>
      <textarea id="cs-motif" rows="3" placeholder="Décrivez le motif de la consultation chez le spécialiste…"></textarea>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Date de prescription</label><input id="cs-date" type="date" value="${new Date().toISOString().split('T')[0]}"/></div>
    </div>
    <div class="form-group"><label>Notes</label><textarea id="cs-notes" rows="2"></textarea></div>
    <div id="cs-err" class="alert alert-error hidden"></div>
  `, `
    <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    <button class="btn btn-primary" onclick="submitConsultationSpec()"><i class="fas fa-microscope"></i> Enregistrer la prescription</button>
  `);

  window._csAssureSearch = _createAssureSearch('cs-search', 'cs-assure-id', 'cs-results');
  window._csFeuilleSearch = _createFeuilleSearch('cs-feuille-q', 'cs-feuille-id', 'cs-feuille-results', 'cs-assure-id');

  // SearchSelect pour le spécialiste
  window._csSpecialisteSearch = SearchSelect.create({
    input: document.getElementById('cs-specialiste'),
    hidden: document.getElementById('cs-specialiste-id'),
    results: document.getElementById('cs-specialiste-results'),
    minLength: 2,
    search: async (q) => {
      const res = await Api.getMedecins(q, 'specialiste');
      return (res.data || []).map(m => ({
        id: m.id,
        nom: m.nom,
        prenom: m.prenom,
        label: `${m.nom} ${m.prenom} — ${m.specialite || ''}`,
        specialite: m.specialite,
        value: m.id
      }));
    },
    render: (m) => `<strong>Dr. ${m.nom} ${m.prenom}</strong><br><small>${m.specialite || 'Spécialiste'}</small>`,
  });
}

async function submitConsultationSpec() {
  const err = document.getElementById('cs-err');
  err.classList.add('hidden');
  const assure_id = document.getElementById('cs-assure-id').value;
  if (!assure_id) { err.textContent = 'Sélectionnez un assuré.'; err.classList.remove('hidden'); return; }
  const motif = document.getElementById('cs-motif').value.trim();
  const spec   = document.getElementById('cs-spec').value.trim();
  if (!motif || !spec) { err.textContent = 'Spécialité et motif sont obligatoires.'; err.classList.remove('hidden'); return; }
  const feuille_id = document.getElementById('cs-feuille-id').value;
  if (!feuille_id) { err.textContent = 'Sélectionnez une feuille de maladie.'; err.classList.remove('hidden'); return; }

  const specId = document.getElementById('cs-specialiste-id').value;
  const data = {
    assure_id:         parseInt(assure_id),
    feuille_id:        parseInt(feuille_id),
    specialiste_id:    specId ? parseInt(specId) : null,
    specialite_requise: spec,
    urgence:           document.getElementById('cs-urgence').value,
    motif,
    date_prescription: document.getElementById('cs-date').value,
    notes:             document.getElementById('cs-notes').value.trim() || null,
  };
  try {
    await Api.addConsultationSpec(data);
    Modal.close(); toast('Prescription de consultation enregistrée !', 'success');
    loadConsultationsSpec();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

async function viewConsultation(id) {
  try {
    const rows = (await Api.getPrescriptions({ type: 'consultation_specialiste' })).data;
    const p    = rows.find(x => x.id === id);
    if (!p) { toast('Prescription introuvable.', 'error'); return; }
    const c = p.consultation || {};
    Modal.open(`Prescription #${id} : Consultation Spécialiste`, `
      <div class="det-grid">
        <div class="det-item"><div class="det-lbl">Patient</div><div class="det-val">${p.assure_nom}</div></div>
        <div class="det-item"><div class="det-lbl">N° SS</div><div class="det-val" style="color:var(--text-muted)">${p.numero_ss}</div></div>
        <div class="det-item"><div class="det-lbl">Prescripteur</div><div class="det-val">Dr. ${p.medecin_nom}</div></div>
        <div class="det-item"><div class="det-lbl">Date</div><div class="det-val">${fmtDate(p.date_prescription)}</div></div>
        <div class="det-item"><div class="det-lbl">Spécialité requise</div><div class="det-val"><span class="badge b-light">${c.specialite_requise}</span></div></div>
        <div class="det-item"><div class="det-lbl">Urgence</div><div class="det-val">${c.urgence === 'urgente' ? '<span class="badge b-danger"><i class="fas fa-exclamation-triangle"></i> Urgente</span>' : '<span class="badge b-light">Normale</span>'}</div></div>
        ${c.specialiste_nom ? `<div class="det-item"><div class="det-lbl">Spécialiste désigné</div><div class="det-val">Dr. ${c.specialiste_nom}</div></div>` : ''}
      </div>
      ${c.motif ? `<div class="alert alert-info" style="margin-top:10px"><strong>Motif :</strong> ${c.motif}</div>` : ''}
      ${p.notes ? `<div class="alert alert-warning" style="margin-top:6px"><i class="fas fa-exclamation-triangle"></i> ${p.notes}</div>` : ''}
    `);
  } catch(e) { toast(e.message, 'error'); }
}

document.getElementById('btn-add-consult').onclick = showAddConsultation;
document.getElementById('q-consult').addEventListener('input', e => {
  clearTimeout(window._qcs);
  const v = e.target.value;
  consultPage = 1;
  if (!v) { loadConsultationsSpec(''); return; }
  window._qcs = setTimeout(() => loadConsultationsSpec(v), 300);
});

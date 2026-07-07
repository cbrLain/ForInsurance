/* js/pages/assures.js */
let assuresData = [];
let assuresPage = 1;

async function loadAssures(q = '', pg) {
  if (pg !== undefined) assuresPage = pg;
  setLoader('tbody-assures', 6);
  try {
    const res = await Api.getAssures(q, assuresPage, 20);
    assuresData = res.data;
    renderAssures(res.data);
    renderPagination('pag-assures', res, p => { assuresPage = p; loadAssures(q); });
  } catch(e) { toast(e.message, 'error'); }
}

function renderAssures(rows) {
  const tb = document.getElementById('tbody-assures');
  if (!rows.length) { tb.innerHTML = emptyRow(6, 'Aucun assuré trouvé'); return; }
  tb.innerHTML = rows.map(a => `
    <tr>
      <td><code style="font-size:.8rem;color:var(--text-muted)">${a.numero_ss}</code></td>
      <td><strong>${a.nom} ${a.prenom}</strong></td>
      <td>${fmtDate(a.date_naissance)}</td>
      <td>${a.medecin_traitant || '<span class="text-muted">—</span>'}</td>
      <td>${a.actif ? '<span class="badge b-success">Actif</span>' : '<span class="badge b-danger">Inactif</span>'}</td>
      <td><div class="t-actions">
        <button class="btn btn-sm btn-secondary" onclick="viewAssure(${a.id})"><i class="fas fa-eye"></i> Voir</button>
        <button class="btn btn-sm btn-danger" onclick="deleteAssure(${a.id})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>
  `).join('');
}

function showAddAssure() {
  Modal.open('Inscrire un nouvel assuré', `
    <div class="form-row">
      <div class="form-group"><label>Nom *</label><input id="a-nom" placeholder="DUPONT" style="text-transform:uppercase"/></div>
      <div class="form-group"><label>Prénom *</label><input id="a-prenom" placeholder="Jean"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Date de naissance</label><input id="a-dob" type="date"/></div>
      <div class="form-group"><label>Téléphone</label><input id="a-tel" placeholder="699000000"/></div>
    </div>
    <div class="form-group"><label>Adresse</label><input id="a-adr" placeholder="Yaoundé, Cameroun"/></div>
    <div class="form-group"><label>Email</label><input id="a-email" type="email" placeholder="contact@email.cm"/></div>
    <div id="a-err" class="alert alert-error hidden"></div>
  `, `
    <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    <button class="btn btn-primary" onclick="submitAddAssure()"><i class="fas fa-save"></i> Inscrire</button>
  `);
}

async function submitAddAssure() {
  const err = document.getElementById('a-err');
  err.classList.add('hidden');
  const data = {
    nom: document.getElementById('a-nom').value.trim(),
    prenom: document.getElementById('a-prenom').value.trim(),
    date_naissance: document.getElementById('a-dob').value || null,
    telephone: document.getElementById('a-tel').value.trim() || null,
    adresse: document.getElementById('a-adr').value.trim() || null,
    email: document.getElementById('a-email').value.trim() || null,
  };
  if (!data.nom || !data.prenom) {
    err.textContent = 'Nom et prénom sont obligatoires.';
    err.classList.remove('hidden'); return;
  }
  try {
    await Api.addAssure(data);
    Modal.close(); toast('Assuré inscrit avec succès !', 'success');
    loadAssures();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

async function viewAssure(id) {
  try {
    const a = await Api.getAssure(id);
    Modal.open(`Dossier assuré : ${a.nom} ${a.prenom}`, `
      <div class="det-grid">
        <div class="det-item"><div class="det-lbl">N° SS</div><div class="det-val" style="color:var(--text-muted)">${a.numero_ss}</div></div>
        <div class="det-item"><div class="det-lbl">Statut</div><div class="det-val">${a.actif ? '<span class="badge b-success">Actif</span>' : '<span class="badge b-danger">Inactif</span>'}</div></div>
        <div class="det-item"><div class="det-lbl">Nom</div><div class="det-val">${a.nom} ${a.prenom}</div></div>
        <div class="det-item"><div class="det-lbl">Date de naissance</div><div class="det-val">${fmtDate(a.date_naissance)}</div></div>
        <div class="det-item"><div class="det-lbl">Téléphone</div><div class="det-val">${a.telephone||''}</div></div>
        <div class="det-item"><div class="det-lbl">Email</div><div class="det-val">${a.email||''}</div></div>
        <div class="det-item"><div class="det-lbl">Adresse</div><div class="det-val">${a.adresse||''}</div></div>
        <div class="det-item"><div class="det-lbl">Médecin traitant</div><div class="det-val">${a.medecin_traitant||'—'}</div></div>
        <div class="det-item"><div class="det-lbl">Inscrit le</div><div class="det-val">${fmtDate(a.date_inscription)}</div></div>
      </div>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteAssure(id) {
  const ok = await confirmDialog('Supprimer cet assuré et toutes ses données associées ?', { danger: true });
  if (!ok) return;
  try {
    await Api.deleteAssure(id);
    toast('Assuré supprimé.', 'success');
    loadAssures();
  } catch(e) { toast(e.message, 'error'); }
}

document.getElementById('btn-add-assure').onclick = showAddAssure;
document.getElementById('btn-add-medecin-traitant').onclick = showAddMedecinTraitant;
document.getElementById('q-assures').addEventListener('input', (e) => {
  clearTimeout(window._qt);
  const v = e.target.value;
  assuresPage = 1;
  if (!v) { loadAssures(''); return; }
  window._qt = setTimeout(() => loadAssures(v), 300);
});

async function showAddMedecinTraitant() {
  const _state = { assure: null, medecin: null };
  let _assureSearch = null;
  let _medecinSearch = null;

  function render() {
    const assureHtml = _state.assure
      ? `<div class="selected-item">
          <i class="fas fa-user-check" style="color:var(--success)"></i>
          <span><strong>${_state.assure.nom} ${_state.assure.prenom}</strong> — ${_state.assure.numero_ss}</span>
          <button class="btn btn-sm btn-link" onclick="window._amtClearAssure()" style="margin-left:auto">Changer</button>
        </div>`
      : `<div class="form-group">
          <label>Rechercher l'assuré (nom, prénom, N° SS ou téléphone)</label>
          <div class="ss-wrapper">
            <input id="amt-sa" placeholder="Tapez le nom, prénom, N° SS ou téléphone…"/>
            <div id="amt-sa-results" class="ss-results"></div>
            <input type="hidden" id="amt-sa-id"/>
          </div>
        </div>`;

    const medHtml = !_state.assure
      ? `<p style="color:var(--text-muted);font-size:.85rem">Sélectionnez d'abord l'assuré.</p>`
      : _state.medecin
        ? `<div class="selected-item">
            <i class="fas fa-user-md" style="color:var(--primary)"></i>
            <span><strong>Dr. ${_state.medecin.nom} ${_state.medecin.prenom}</strong> — ${_state.medecin.identifiant}</span>
            <button class="btn btn-sm btn-link" onclick="window._amtClearMedecin()" style="margin-left:auto">Changer</button>
          </div>`
        : `<div class="form-group">
            <label>Rechercher le médecin traitant (nom, prénom ou numéro d'agrément)</label>
            <div class="ss-wrapper">
              <input id="amt-sm" placeholder="Tapez le nom, prénom ou numéro d'agrément…"/>
              <div id="amt-sm-results" class="ss-results"></div>
              <input type="hidden" id="amt-sm-id"/>
            </div>
            <button class="btn btn-sm btn-link" onclick="window._amtShowNewMedecin()" style="margin-top:8px">
              <i class="fas fa-plus-circle"></i> Nouveau médecin traitant
            </button>
            <div id="amt-new-med" style="display:none;margin-top:10px;padding:12px;border:1px solid var(--border);border-radius:6px">
              <p style="font-weight:600;margin-bottom:8px">Nouveau médecin généraliste</p>
              <div class="form-row">
                <div class="form-group"><label>Nom *</label><input id="amt-nm-nom" placeholder="TALLA" style="text-transform:uppercase"/></div>
                <div class="form-group"><label>Prénom *</label><input id="amt-nm-prenom" placeholder="Sylvain"/></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Téléphone</label><input id="amt-nm-tel" placeholder="699000000"/></div>
                <div class="form-group"><label>Email *</label><input id="amt-nm-email" type="email" placeholder="medecin@example.cm"/></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>N° d'agrément</label><input id="amt-nm-agr" placeholder="AGR-XXX"/></div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="window._amtCreateMedecin()"><i class="fas fa-save"></i> Enregistrer et sélectionner</button>
              <div id="amt-nm-err" class="alert alert-error hidden" style="margin-top:6px"></div>
            </div>
          </div>`;

    const validBtn = _state.assure && _state.medecin
      ? `<button class="btn btn-primary" onclick="window._amtSubmit()" style="width:100%;margin-top:12px">
          <i class="fas fa-check"></i> Valider l'enregistrement
         </button>`
      : '';

    Modal.open('Enregistrer un médecin traitant', `
      <p style="color:var(--text-muted);font-size:.82rem;margin-bottom:14px">
        <strong>Étape 1 :</strong> Recherchez l'assuré concerné, puis <strong>Étape 2 :</strong> choisissez son médecin traitant.
      </p>
      <div class="form-section">
        <div class="form-section-title">1. Assuré</div>
        ${assureHtml}
      </div>
      <div class="form-section" style="margin-top:14px">
        <div class="form-section-title">2. Médecin traitant</div>
        ${medHtml}
      </div>
      <div id="amt-err" class="alert alert-error hidden"></div>
      ${validBtn}
    `, `
      <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    `);

    // Initialiser SearchSelect après le rendu
    if (!_state.assure && !_assureSearch) {
      _assureSearch = SearchSelect.create({
        input: document.getElementById('amt-sa'),
        hidden: document.getElementById('amt-sa-id'),
        results: document.getElementById('amt-sa-results'),
        minLength: 2,
        search: async (q) => {
          const res = await Api.getAssures(q);
          return (res.data || []).map(a => ({
            id: a.id,
            nom: a.nom,
            prenom: a.prenom,
            label: `${a.nom} ${a.prenom} — ${a.numero_ss}`,
            numero_ss: a.numero_ss,
            value: a.id
          }));
        },
        render: (a) => `<strong>${a.nom} ${a.prenom}</strong><br><small>${a.numero_ss}</small>`,
        onSelect: (item) => {
          _state.assure = { id: item.id, nom: item.nom, prenom: item.prenom, numero_ss: item.numero_ss };
          _state.medecin = null;
          if (_medecinSearch) { SearchSelect.destroy(_medecinSearch.id); _medecinSearch = null; }
          render();
        },
      });
    }

    if (_state.assure && !_state.medecin && !_medecinSearch) {
      _medecinSearch = SearchSelect.create({
        input: document.getElementById('amt-sm'),
        hidden: document.getElementById('amt-sm-id'),
        results: document.getElementById('amt-sm-results'),
        minLength: 2,
        search: async (q) => {
          const res = await Api.getMedecins(q, 'generaliste');
          return (res.data || []).map(m => ({
            id: m.id,
            nom: m.nom,
            prenom: m.prenom,
            label: `Dr. ${m.nom} ${m.prenom} — ${m.identifiant}`,
            identifiant: m.identifiant,
            value: m.id
          }));
        },
        render: (m) => `<strong>Dr. ${m.nom} ${m.prenom}</strong><br><small>${m.identifiant}</small>`,
        onSelect: (item) => {
          _state.medecin = { id: item.id, nom: item.nom, prenom: item.prenom, identifiant: item.identifiant };
          render();
        },
      });
    }
  }

  window._amtClearAssure = function() {
    _state.assure = null;
    _state.medecin = null;
    if (_assureSearch) { SearchSelect.destroy(_assureSearch.id); _assureSearch = null; }
    if (_medecinSearch) { SearchSelect.destroy(_medecinSearch.id); _medecinSearch = null; }
    render();
  };

  window._amtClearMedecin = function() {
    _state.medecin = null;
    if (_medecinSearch) { SearchSelect.destroy(_medecinSearch.id); _medecinSearch = null; }
    render();
  };

  window._amtShowNewMedecin = function() {
    const el = document.getElementById('amt-new-med');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  window._amtCreateMedecin = async function() {
    const err = document.getElementById('amt-nm-err');
    err.classList.add('hidden');
    const nom = document.getElementById('amt-nm-nom').value.trim().toUpperCase();
    const prenom = document.getElementById('amt-nm-prenom').value.trim();
    const telephone = document.getElementById('amt-nm-tel').value.trim();
    const email = document.getElementById('amt-nm-email').value.trim();
    const num_agrement = document.getElementById('amt-nm-agr').value.trim();
    if (!nom || !prenom) { err.textContent = 'Nom et prénom requis.'; err.classList.remove('hidden'); return; }
    if (!email) { err.textContent = 'Email requis pour envoyer les identifiants de connexion.'; err.classList.remove('hidden'); return; }
    try {
      const res = await Api.addMedecin({ nom, prenom, telephone, email, num_agrement, type: 'generaliste' });
      const medecins = await Api.getMedecins(nom, 'generaliste');
      const med = medecins.find(m => m.id === res.id) || medecins[0];
      _state.medecin = { id: med.id, nom: med.nom, prenom: med.prenom, identifiant: med.identifiant };
      document.getElementById('amt-new-med').style.display = 'none';
      render();
      toast(`Médecin ${med.nom} ${med.prenom} créé et sélectionné.`, 'success');
    } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
  };

  window._amtSubmit = async function() {
    const err = document.getElementById('amt-err');
    err.classList.add('hidden');
    try {
      await Api.setMedecinTraitant(_state.assure.id, _state.medecin.id);
      Modal.close();
      toast(`Médecin traitant enregistré pour ${_state.assure.prenom} ${_state.assure.nom}.`, 'success');
      loadAssures();
    } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
  };

  render();
}

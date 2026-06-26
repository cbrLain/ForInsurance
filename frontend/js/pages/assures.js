/* js/pages/assures.js */
let assuresData = [];

async function loadAssures(q = '') {
  setLoader('tbody-assures', 6);
  try {
    assuresData = await Api.getAssures(q);
    renderAssures(assuresData);
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
  if (!confirm('Supprimer cet assuré ?')) return;
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
  window._qt = setTimeout(() => loadAssures(e.target.value), 400);
});

async function showAddMedecinTraitant() {
  let assures = [];
  try { assures = await Api.getAssures(); } catch {}
  const assureOpts = assures.map(a => `<option value="${a.id}">${a.nom} ${a.prenom} (${a.numero_ss})</option>`).join('');

  let medecins = [];
  try { medecins = await Api.getMedecins('', 'generaliste'); } catch {}
  const medOpts = medecins.map(m => `<option value="${m.id}">${m.nom} ${m.prenom}</option>`).join('');

  Modal.open('Enregistrer un médecin traitant', `
    <div class="form-group">
      <label>Pour l\'assuré *</label>
      <select id="amt-assure"><option value="">-- Sélectionner un assuré --</option>${assureOpts}</select>
    </div>
    <hr style="margin:14px 0;border-color:var(--border)">
    <p style="color:var(--text-muted);font-size:.82rem;margin-bottom:14px">Seuls les médecins généralistes sont éligibles comme médecin traitant.</p>
    <div class="form-group">
      <label><input type="radio" name="amt-mode" value="existing" checked onchange="toggleAmtMode()"> Sélectionner un médecin existant</label>
      <select id="amt-select" style="margin-top:6px"><option value="">-- Sélectionner --</option>${medOpts}</select>
    </div>
    <div class="form-group">
      <label><input type="radio" name="amt-mode" value="new" onchange="toggleAmtMode()"> Créer un nouveau médecin traitant</label>
      <div id="amt-new-fields" style="display:none;margin-top:8px">
        <div class="form-row">
          <div class="form-group"><label>Nom *</label><input id="amt-nom" placeholder="TALLA" style="text-transform:uppercase"/></div>
          <div class="form-group"><label>Prénom *</label><input id="amt-prenom" placeholder="Sylvain"/></div>
        </div>
        <div class="form-group"><label>Téléphone</label><input id="amt-tel" placeholder="699000000"/></div>
      </div>
    </div>
    <div id="amt-err" class="alert alert-error hidden"></div>
  `, `
    <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    <button class="btn btn-primary" onclick="submitAddMedecinTraitant()"><i class="fas fa-check"></i> Enregistrer</button>
  `);
}

function toggleAmtMode() {
  const mode = document.querySelector('input[name="amt-mode"]:checked')?.value;
  document.getElementById('amt-select').disabled = mode !== 'existing';
  document.getElementById('amt-new-fields').style.display = mode === 'new' ? 'block' : 'none';
}

async function submitAddMedecinTraitant() {
  const err = document.getElementById('amt-err');
  err.classList.add('hidden');

  const assureId = document.getElementById('amt-assure').value;
  if (!assureId) { err.textContent = 'Veuillez sélectionner un assuré.'; err.classList.remove('hidden'); return; }

  const mode = document.querySelector('input[name="amt-mode"]:checked')?.value;
  let medId;
  if (mode === 'new') {
    const nom    = document.getElementById('amt-nom').value.trim();
    const prenom = document.getElementById('amt-prenom').value.trim();
    const tel    = document.getElementById('amt-tel').value.trim() || null;
    if (!nom || !prenom) {
      err.textContent = 'Nom et prénom du médecin sont obligatoires.';
      err.classList.remove('hidden'); return;
    }
    try {
      const result = await Api.addMedecin({ nom, prenom, telephone: tel, type: 'generaliste' });
      medId = result.id;
    } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); return; }
  } else {
    medId = document.getElementById('amt-select').value;
    if (!medId) { err.textContent = 'Veuillez sélectionner un médecin.'; err.classList.remove('hidden'); return; }
  }

  try {
    await Api.setMedecinTraitant(parseInt(assureId), parseInt(medId));
    Modal.close(); toast('Médecin traitant enregistré !', 'success');
    loadAssures();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

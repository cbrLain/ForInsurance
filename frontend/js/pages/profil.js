/* js/pages/profil.js — Mon Profil (médecin + assureur) */

async function loadMonProfil() {
  const me = await Api.me();
  const user = me.user;
  const role = user.role;

  const det = document.getElementById('profil-det');
  const statsEl = document.getElementById('profil-stats');

  if (role === 'medecin') {
    const medecins = await Api.getMedecins();
    const med = medecins.find(m => m.identifiant === user.identifiant);

    const infos = [
      { label: 'Identifiant', val: `<code style="color:var(--text-muted)">${user.identifiant}</code>` },
      { label: 'Nom complet', val: `<strong>Dr. ${user.nom} ${user.prenom}</strong>` },
      { label: 'Rôle', val: '<span class="badge b-primary">Médecin</span>' },
      { label: 'Numéro d\'ordre', val: med?.num_agrement || '—' },
      { label: 'Type', val: med?.type === 'specialiste' ? 'Spécialiste' : 'Généraliste' },
    ];
    if (med?.specialite) infos.push({ label: 'Spécialité', val: med.specialite });

    const editables = [
      { label: 'Adresse', id: 'p-adresse', val: med?.adresse || '' },
      { label: 'Téléphone', id: 'p-telephone', val: med?.telephone || '' },
      { label: 'Email', id: 'p-email', val: med?.email || '' },
    ];

    renderProfil(infos, editables, role);

    const stats = await Api.getStats();
    statsEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-file-invoice"></i></div><div><div class="stat-val">${stats.totalFeuilles}</div><div class="stat-lbl">Feuilles créées</div></div></div>
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-prescription-bottle-alt"></i></div><div><div class="stat-val">${stats.totalPrescriptions}</div><div class="stat-lbl">Prescriptions émises</div></div></div>
      </div>
    `;
  } else {
    const p = await getOrFetchPersonne(user);

    const infos = [
      { label: 'Identifiant', val: `<code style="color:var(--text-muted)">${user.identifiant}</code>` },
      { label: 'Nom complet', val: `<strong>${user.nom} ${user.prenom}</strong>` },
      { label: 'Rôle', val: '<span class="badge b-primary">Assureur</span>' },
      { label: 'Fonction', val: 'Agent de sécurité sociale' },
      { label: 'Service', val: 'Gestion des remboursements' },
    ];

    const editables = [
      { label: 'Téléphone', id: 'p-telephone', val: p?.telephone || '' },
      { label: 'Email', id: 'p-email', val: p?.email || '' },
    ];

    renderProfil(infos, editables, role);

    const stats = await Api.getStats();
    statsEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-users"></i></div><div><div class="stat-val">${stats.totalAssures}</div><div class="stat-lbl">Assurés actifs</div></div></div>
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-file-invoice"></i></div><div><div class="stat-val">${stats.totalFeuilles}</div><div class="stat-lbl">Feuilles traitées</div></div></div>
        <div class="stat-card"><div class="stat-ico"><i class="fas fa-credit-card"></i></div><div><div class="stat-val">${fmtMoney(stats.totalRemb)}</div><div class="stat-lbl">Total remboursé</div></div></div>
      </div>
    `;
  }
}

async function getOrFetchPersonne(user) {
  try {
    const ppl = await Api.get('/assures?q=' + encodeURIComponent(user.nom));
    const match = ppl.find(p => p.nom === user.nom && p.prenom === user.prenom);
    if (match) return match;
  } catch {}
  return { telephone: '', email: '' };
}

function renderProfil(infos, editables, role) {
  const det = document.getElementById('profil-det');

  const infoHtml = infos.map(i =>
    `<div class="det-item"><div class="det-lbl">${i.label}</div><div class="det-val">${i.val}</div></div>`
  ).join('');

  const editFields = editables.map(e =>
    `<div class="form-group"><label>${e.label}</label>
      <input id="${e.id}" value="${escHtml(e.val)}" placeholder="${e.label}"/>
    </div>`
  ).join('');

  det.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;grid-column:1/-1;margin-bottom:8px">
      <span style="font-size:.72rem;color:var(--text-muted);font-weight:600;text-transform:uppercase">Informations</span>
      <button class="btn btn-sm btn-outline" id="btn-edit-profil"><i class="fas fa-pen"></i> Modifier</button>
    </div>
    ${infoHtml}
    <div id="edit-section" style="grid-column:1/-1;display:none;margin-top:8px;padding:16px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border)">
      <div style="font-size:.82rem;font-weight:600;color:var(--text);margin-bottom:12px">Modifier mes informations</div>
      <div id="edit-fields">${editFields}</div>
      <div id="edit-err" class="alert alert-error hidden" style="margin-top:8px"></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-sm btn-secondary" id="btn-cancel-edit">Annuler</button>
        <button class="btn btn-sm btn-primary" id="btn-save-profil"><i class="fas fa-save"></i> Enregistrer</button>
      </div>
    </div>
    <div style="grid-column:1/-1;margin-top:16px">
      <button class="btn btn-outline" id="btn-change-pw" style="width:100%"><i class="fas fa-key"></i> Changer le mot de passe</button>
    </div>
  `;

  document.getElementById('btn-edit-profil').onclick = () => {
    const s = document.getElementById('edit-section');
    s.style.display = s.style.display === 'none' ? 'block' : 'none';
  };
  document.getElementById('btn-cancel-edit').onclick = () => {
    document.getElementById('edit-section').style.display = 'none';
  };
  document.getElementById('btn-save-profil').onclick = () => saveProfil(role);
  document.getElementById('btn-change-pw').onclick = showChangePasswordModal;
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function saveProfil(role) {
  const err = document.getElementById('edit-err');
  err.classList.add('hidden');
  const data = {};
  const adresse = document.getElementById('p-adresse')?.value.trim();
  const telephone = document.getElementById('p-telephone')?.value.trim();
  const email = document.getElementById('p-email')?.value.trim();
  if (adresse !== undefined) data.adresse = adresse || null;
  if (telephone !== undefined) data.telephone = telephone || null;
  if (email !== undefined) data.email = email || null;

  if (!Object.keys(data).length) return;
  try {
    await Api.patch('/auth/profil', data);
    document.getElementById('edit-section').style.display = 'none';
    toast('Profil mis à jour avec succès !', 'success');
    loadMonProfil();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

function showChangePasswordModal() {
  Modal.open('Changer le mot de passe', `
    <p style="color:var(--text-muted);font-size:.82rem;margin-bottom:14px">Saisissez votre ancien mot de passe et choisissez un nouveau mot de passe sécurisé.</p>
    <div class="form-group"><label>Ancien mot de passe *</label><input id="pw-old" type="password" placeholder="Votre mot de passe actuel"/></div>
    <div class="form-row">
      <div class="form-group"><label>Nouveau mot de passe *</label><input id="pw-new" type="password" placeholder="Min. 8 car., lettres + chiffres"/></div>
      <div class="form-group"><label>Confirmation *</label><input id="pw-confirm" type="password" placeholder="Retaper le nouveau"/></div>
    </div>
    <div id="pw-err" class="alert alert-error hidden"></div>
    <div id="pw-ok" class="alert alert-success hidden"></div>
  `, `
    <button class="btn btn-secondary" onclick="Modal.close()">Annuler</button>
    <button class="btn btn-primary" id="btn-submit-pw"><i class="fas fa-key"></i> Changer le mot de passe</button>
  `);

  document.getElementById('btn-submit-pw').onclick = async () => {
    const oldPw = document.getElementById('pw-old').value;
    const newPw = document.getElementById('pw-new').value;
    const confirmPw = document.getElementById('pw-confirm').value;
    const err = document.getElementById('pw-err');
    const ok = document.getElementById('pw-ok');
    err.classList.add('hidden');
    ok.classList.add('hidden');

    if (!oldPw || !newPw || !confirmPw) {
      err.textContent = 'Tous les champs sont requis.'; err.classList.remove('hidden'); return;
    }
    if (newPw !== confirmPw) {
      err.textContent = 'Les nouveaux mots de passe ne correspondent pas.'; err.classList.remove('hidden'); return;
    }
    if (newPw.length < 8) {
      err.textContent = 'Le mot de passe doit contenir au moins 8 caractères.'; err.classList.remove('hidden'); return;
    }

    try {
      await Api.patch('/auth/password', {
        ancien_mot_de_passe: oldPw,
        nouveau_mot_de_passe: newPw,
        confirmation: confirmPw,
      });
      ok.innerHTML = '<i class="fas fa-check-circle"></i> Mot de passe modifié avec succès !';
      ok.classList.remove('hidden');
      setTimeout(() => Modal.close(), 1500);
    } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
  };
}

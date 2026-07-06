/* js/pages/patients.js — Gestion des patients (médecin) */
let patientsData = [];
let patientsPage = 1;

async function loadPatients(q = '', pg) {
  if (pg !== undefined) patientsPage = pg;
  setLoader('tbody-patients', 6);
  try {
    const res = await Api.getAssures(q, patientsPage, 20);
    patientsData = res.data;
    renderPatients(res.data);
    renderPagination('pag-patients', res, p => { patientsPage = p; loadPatients(q); });
  } catch(e) { toast(e.message, 'error'); }
}

function renderPatients(rows) {
  const tb = document.getElementById('tbody-patients');
  if (!rows.length) { tb.innerHTML = emptyRow(6, 'Aucun patient trouvé'); return; }
  tb.innerHTML = rows.map(a => `
    <tr>
      <td><code style="font-size:.8rem;color:var(--text-muted)">${a.numero_ss}</code></td>
      <td><strong>${a.nom} ${a.prenom}</strong></td>
      <td>${fmtDate(a.date_naissance)}</td>
      <td>${a.medecin_traitant || '<span class="text-muted">—</span>'}</td>
      <td>${a.actif ? '<span class="badge b-success">Actif</span>' : '<span class="badge b-danger">Inactif</span>'}</td>
      <td><div class="t-actions">
        <button class="btn btn-sm btn-secondary" onclick="viewDossierPatient(${a.id})"><i class="fas fa-folder-open"></i> Dossier</button>
      </div></td>
    </tr>
  `).join('');
}

async function viewDossierPatient(id) {
  try {
    const a = await Api.getAssure(id);
    const feuilles = (await Api.getFeuilles({ assure_id: id })).data;
    const prescriptions = (await Api.getPrescriptions({ type: 'medicaments' })).data;
    const consultSpec = (await Api.getPrescriptions({ type: 'consultation_specialiste' })).data;

    const prescPatient = prescriptions.filter(p => p.assure_id === id);
    const consultPatient = consultSpec.filter(c => c.assure_id === id);

    let dossierHtml = `
      <div class="prt-section">
        <h4>Informations patient</h4>
        <div class="prt-row"><span class="prt-key">N° SS</span><span class="prt-val" style="color:var(--text-muted)">${a.numero_ss}</span></div>
        <div class="prt-row"><span class="prt-key">Nom</span><span class="prt-val"><strong>${a.nom} ${a.prenom}</strong></span></div>
        <div class="prt-row"><span class="prt-key">Naissance</span><span class="prt-val">${fmtDate(a.date_naissance)}</span></div>
        <div class="prt-row"><span class="prt-key">Contact</span><span class="prt-val">${a.telephone || ''} ${a.email ? '· ' + a.email : ''}</span></div>
        <div class="prt-row"><span class="prt-key">Médecin traitant</span><span class="prt-val">${a.medecin_traitant || '—'}</span></div>
      </div>
    `;

    if (feuilles.length) {
      dossierHtml += `
        <div class="prt-section">
          <h4>Feuilles de maladie (${feuilles.length})</h4>
          ${feuilles.slice(0, 10).map(f => `
            <div class="prt-row">
              <span class="prt-key">${fmtDate(f.date_consultation)}</span>
              <span class="prt-val">${f.reference} — ${f.diagnostic} ${badgeStatut(f.statut)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (prescPatient.length) {
      dossierHtml += `
        <div class="prt-section">
          <h4>Prescriptions médicaments (${prescPatient.length})</h4>
          ${prescPatient.slice(0, 10).map(p => `
            <div class="prt-row">
              <span class="prt-key">${fmtDate(p.date_prescription)}</span>
              <span class="prt-val">${(p.medicaments||[]).map(m => m.nom_medicament).join(', ')}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (consultPatient.length) {
      dossierHtml += `
        <div class="prt-section">
          <h4>Consultations spécialistes (${consultPatient.length})</h4>
          ${consultPatient.slice(0, 10).map(c => {
            const det = c.consultation || {};
            return `
              <div class="prt-row">
                <span class="prt-key">${fmtDate(c.date_prescription)}</span>
                <span class="prt-val">${det.specialite_requise} — ${det.motif || ''}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    Modal.wide(`Dossier médical : ${a.nom} ${a.prenom}`, dossierHtml, `
      <button class="btn btn-secondary" onclick="Modal.close()">Fermer</button>
    `);
  } catch(e) { toast(e.message, 'error'); }
}

document.getElementById('q-patients').addEventListener('input', e => {
  clearTimeout(window._qp);
  const v = e.target.value;
  patientsPage = 1;
  if (!v) { loadPatients(''); return; }
  window._qp = setTimeout(() => loadPatients(v), 300);
});

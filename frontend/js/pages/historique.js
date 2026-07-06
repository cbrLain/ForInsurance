/* js/pages/historique.js */

/* ══ MÉDECIN : Historique des consultations ════════════════ */
let historiqueFilter = 'all';

async function loadHistoriqueConsultations(q = '') {
  setLoader('tbody-historique', 6);
  try {
    let feuilles = (await Api.getFeuilles(q ? { q } : {})).data;
    let prescriptions = (await Api.getPrescriptions(q ? { q, type: 'medicaments' } : { type: 'medicaments' })).data;
    let consults = (await Api.getPrescriptions(q ? { q, type: 'consultation_specialiste' } : { type: 'consultation_specialiste' })).data;

    let items = [];

    if (historiqueFilter === 'all' || historiqueFilter === 'feuilles') {
      items = items.concat(feuilles.map(f => ({
        date: f.created_at,
        type: 'feuille',
        patient: f.assure_nom,
        detail: f.reference + ' — ' + f.diagnostic,
        statut: f.statut,
        id: f.id,
        action: 'feuille',
      })));
    }

    if (historiqueFilter === 'all' || historiqueFilter === 'prescriptions') {
      items = items.concat(prescriptions.map(p => ({
        date: p.date_prescription,
        type: 'prescription_med',
        patient: p.assure_nom,
        detail: (p.medicaments||[]).map(m => m.nom_medicament).join(', '),
        statut: 'Prescrit',
        id: p.id,
        action: 'presc_med',
      })));
      items = items.concat(consults.map(c => {
        const det = c.consultation || {};
        return {
          date: c.date_prescription,
          type: 'prescription_consult',
          patient: c.assure_nom,
          detail: det.specialite_requise + (det.motif ? ' : ' + det.motif : ''),
          statut: det.urgence === 'urgente' ? 'Urgente' : 'Programmée',
          id: c.id,
          action: 'presc_consult',
        };
      }));
    }

    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    const tb = document.getElementById('tbody-historique');
    if (!items.length) { tb.innerHTML = emptyRow(6, 'Aucune activité trouvée'); return; }
    tb.innerHTML = items.map(item => {
      const badge = item.type === 'feuille' ? badgeStatut(item.statut)
        : item.type === 'prescription_med' ? '<span class="badge b-light"><i class="fas fa-prescription-bottle-alt"></i> Médicaments</span>'
        : '<span class="badge b-light"><i class="fas fa-microscope"></i> Spécialiste</span>';
      return `
        <tr>
          <td>${fmtDateTime(item.date)}</td>
          <td>${item.patient}</td>
          <td>${item.detail}</td>
          <td>${item.type === 'feuille' ? badgeStatut(item.statut) : item.statut}</td>
          <td><div class="t-actions">
            ${item.action === 'feuille'
              ? `<button class="btn btn-sm btn-secondary" onclick="viewFeuille(${item.id})"><i class="fas fa-eye"></i> Voir</button>`
              : item.action === 'presc_med'
                ? `<button class="btn btn-sm btn-secondary" onclick="viewPrescription(${item.id})"><i class="fas fa-eye"></i> Voir</button>`
                : `<button class="btn btn-sm btn-secondary" onclick="viewConsultation(${item.id})"><i class="fas fa-eye"></i> Voir</button>`}
          </div></td>
        </tr>
      `;
    }).join('');
  } catch(e) { toast(e.message, 'error'); }
}

document.getElementById('ft-historique')?.addEventListener('click', e => {
  const tab = e.target.closest('.ftab');
  if (!tab) return;
  document.querySelectorAll('#ft-historique .ftab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  historiqueFilter = tab.dataset.v;
  loadHistoriqueConsultations(document.getElementById('q-historique').value);
});

document.getElementById('q-historique')?.addEventListener('input', e => {
  clearTimeout(window._qh);
  const v = e.target.value;
  if (!v) { loadHistoriqueConsultations(''); return; }
  window._qh = setTimeout(() => loadHistoriqueConsultations(v), 300);
});

/* ══ ASSUREUR : Historique des opérations ════════════════════ */
let operationsFilter = 'all';

async function loadHistoriqueOperations(q = '') {
  try {
    const stats = await Api.getStats();
    const items = [];

    const feuilles = (await Api.getFeuilles(q ? { q } : {})).data;
    const remb = (await Api.getRemboursements(q)).data;

    if (operationsFilter === 'all' || operationsFilter === 'feuilles') {
      feuilles.slice(0, 30).forEach(f => {
        items.push({
          date: f.created_at,
          icon: '<i class="fas fa-file-medical-alt" style="color:#059669"></i>',
          text: `Feuille <strong>${f.reference}</strong> — ${f.assure_nom}`,
          detail: `Statut : ${f.statut} · ${f.diagnostic || ''}`,
          statut: f.statut,
        });
      });
    }

    if (operationsFilter === 'all' || operationsFilter === 'remboursements') {
      remb.slice(0, 30).forEach(r => {
        items.push({
          date: r.date_remboursement,
          icon: '<i class="fas fa-credit-card" style="color:#2563eb"></i>',
          text: `Remboursement <strong>${fmtMoney(r.montant)}</strong> — ${r.assure_nom}`,
          detail: `Mode : ${r.mode_paiement} · ${r.feuille_ref}`,
          statut: 'Effectué',
        });
      });
    }

    if (operationsFilter === 'all' || operationsFilter === 'demandes') {
      try {
        const res = await fetch('/api/auth/demandes', {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('ss_token') }
        });
        const demandes = await res.json();
        demandes.slice(0, 20).forEach(d => {
          items.push({
            date: d.created_at,
            icon: '<i class="fas fa-user-md" style="color:#7c3aed"></i>',
            text: `Demande inscription — Dr. ${d.nom} ${d.prenom}`,
            detail: `${d.email} · ${d.type}${d.specialite ? ' - ' + d.specialite : ''}`,
            statut: d.statut === 'en_attente' ? 'En attente' : d.statut === 'approuvee' ? 'Approuvée' : 'Rejetée',
          });
        });
      } catch {}
    }

    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    const list = document.getElementById('operations-list');
    if (!items.length) { list.innerHTML = '<div class="empty"><i class="fas fa-inbox"></i><h4>Aucune opération trouvée</h4></div>'; return; }
    list.innerHTML = items.map(item => `
      <div class="act-item">
        <div class="act-dot" style="background:none;font-size:1.1rem">${item.icon}</div>
        <div>
          <div class="act-text">${item.text}</div>
          <div style="font-size:.78rem;color:var(--text-muted)">${item.detail}</div>
          <div class="act-time">${fmtDateTime(item.date)} · ${item.statut}</div>
        </div>
      </div>
    `).join('');
  } catch(e) { toast(e.message, 'error'); }
}

document.getElementById('ft-operations')?.addEventListener('click', e => {
  const tab = e.target.closest('.ftab');
  if (!tab) return;
  document.querySelectorAll('#ft-operations .ftab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  operationsFilter = tab.dataset.v;
  loadHistoriqueOperations(document.getElementById('q-operations').value);
});

document.getElementById('q-operations')?.addEventListener('input', e => {
  clearTimeout(window._qop);
  const v = e.target.value;
  if (!v) { loadHistoriqueOperations(''); return; }
  window._qop = setTimeout(() => loadHistoriqueOperations(v), 300);
});

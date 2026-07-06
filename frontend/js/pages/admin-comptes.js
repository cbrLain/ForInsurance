/* js/pages/admin-comptes.js — Admin : Gestion des comptes */

async function loadAdminComptes() {}

document.getElementById('btn-add-assureur')?.addEventListener('click', async () => {
  const err = document.getElementById('ac-err');
  err.classList.add('hidden');
  const nom = document.getElementById('ac-nom').value.trim();
  const prenom = document.getElementById('ac-prenom').value.trim();
  if (!nom || !prenom) {
    err.textContent = 'Nom et prénom sont obligatoires.';
    err.classList.remove('hidden'); return;
  }
  try {
    const res = await Api.addAssureur({ nom, prenom });
    document.getElementById('ac-nom').value = '';
    document.getElementById('ac-prenom').value = '';
    Modal.open('✅ Compte assureur créé avec succès', `
      <div style="text-align:center;padding:12px 0">
        <p style="color:var(--text-muted);margin-bottom:16px">Veuillez communiquer ces identifiants à l'agent.</p>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:20px;display:inline-block;text-align:left;min-width:260px">
          <div style="margin-bottom:12px">
            <div style="font-size:.72rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;margin-bottom:2px">Identifiant</div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--text);font-family:monospace">${res.identifiant}</div>
          </div>
          <div>
            <div style="font-size:.72rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;margin-bottom:2px">Mot de passe</div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--accent);font-family:monospace">${res.mot_de_passe}</div>
          </div>
        </div>
      </div>
    `, `<button class="btn btn-primary" onclick="Modal.close()"> Fermer</button>`);
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
});

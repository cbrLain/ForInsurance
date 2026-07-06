/* js/app.js : Contrôleur principal */

// ── État global ────────────────────────────────────────────────
let currentUser  = null;
let currentPage  = 'dashboard';

// ── Socket.IO (temps réel) ────────────────────────────────────
const socket = io();
socket.on('connect', () => console.log('🔌 Socket connecté'));
socket.on('disconnect', () => console.log('🔌 Socket déconnecté'));
socket.on('data-change', (payload) => {
  try {
    const user = JSON.parse(localStorage.getItem('ss_user') || 'null');
    if (payload.resource === 'demandes' && user?.role === 'assureur') {
      toast('📩 Nouvelle demande d\'inscription reçue !', 'info', 6000);
    }
    if (currentPage) loadPage(currentPage);
  } catch(e) {
    console.error('Socket error:', e);
  }
});

// ── Initialisation ────────────────────────────────────────────
(function init() {
  // Date dans la topbar
  const now = new Date();
  document.getElementById('top-date').textContent =
    now.toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });

  // Session existante ?
  const token = localStorage.getItem('ss_token');
  const user  = localStorage.getItem('ss_user');
  if (token && user) {
    currentUser = JSON.parse(user);
    showApp(currentUser);
  } else {
    showLanding();
  }
})();

// ── Login ─────────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('f-id').value.trim();
  const pw = document.getElementById('f-pw').value;
  const errEl = document.getElementById('login-err');
  const btnTx = document.querySelector('#btn-login .btn-text');
  const btnSp = document.querySelector('#btn-login .btn-spinner');
  errEl.classList.add('hidden');
  btnTx.classList.add('hidden'); btnSp.classList.remove('hidden');
  try {
    const { token, user } = await Api.login(id, pw);
    localStorage.setItem('ss_token', token);
    localStorage.setItem('ss_user', JSON.stringify(user));
    currentUser = user;
    showApp(user);
  } catch(err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btnTx.classList.remove('hidden'); btnSp.classList.add('hidden');
  }
});

function togglePassword() {
  const pw = document.getElementById('f-pw');
  const eye = document.getElementById('pw-eye');
  if (pw.type === 'password') {
    pw.type = 'text';
    eye.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    pw.type = 'password';
    eye.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

function toggleLandingMenu() {
  document.getElementById('l-nav').classList.toggle('mob-open');
}

// Scroll → header opaque
document.addEventListener('scroll', () => {
  const h = document.querySelector('.l-header');
  if (h) h.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// Navigation douce des ancres
document.querySelector('#l-nav')?.addEventListener('click', e => {
  const a = e.target.closest('.l-nav-link');
  if (a) {
    e.preventDefault();
    document.querySelectorAll('.l-nav-link').forEach(l => l.classList.remove('active'));
    a.classList.add('active');
    document.getElementById('l-nav')?.classList.remove('mob-open');
    const target = a.getAttribute('href');
    if (target) document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  }
});

function setLoginRole(role) {
  document.querySelectorAll('.lc-rtab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.lc-rtab[data-role="${role}"]`).classList.add('active');
  document.getElementById('f-id').placeholder = role === 'assureur' ? 'Entrez votre identifiant' : 'Entrez votre identifiant';
}

function showRegisterScreen() {
  document.getElementById('screen-landing').classList.add('hidden');
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-app').classList.add('hidden');
  document.getElementById('screen-register').classList.remove('hidden');
  document.getElementById('reg-form').classList.remove('hidden');
  document.getElementById('reg-success').classList.add('hidden');
  document.getElementById('reg-err').classList.add('hidden');
  document.getElementById('reg-type')?.addEventListener('change', function() {
    document.getElementById('reg-spec-group').style.display = this.value === 'specialiste' ? 'block' : 'none';
  });
}

async function submitInscription() {
  const nom = document.getElementById('reg-nom').value.trim();
  const prenom = document.getElementById('reg-prenom').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const tel = document.getElementById('reg-tel').value.trim();
  const agrement = document.getElementById('reg-agr').value.trim();
  const type = document.getElementById('reg-type').value;
  const specialite = document.getElementById('reg-spec').value.trim();
  const errEl = document.getElementById('reg-err');

  if (!nom || !prenom || !email || !agrement) {
    errEl.textContent = 'Veuillez remplir tous les champs obligatoires (*).';
    errEl.classList.remove('hidden');
    return;
  }

  errEl.classList.add('hidden');
  try {
    const res = await fetch('/api/auth/register-medecin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, prenom, email, telephone:tel, agrement, type, specialite })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'inscription');
    document.getElementById('reg-form').classList.add('hidden');
    document.getElementById('reg-success').classList.remove('hidden');
    ['reg-nom','reg-prenom','reg-email','reg-tel','reg-agr','reg-spec'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('reg-type').value = 'generaliste';
    document.getElementById('reg-spec-group').style.display = 'none';
  } catch(err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

// ── Déconnexion ───────────────────────────────────────────────
document.getElementById('btn-logout').onclick = () => {
  localStorage.removeItem('ss_token');
  localStorage.removeItem('ss_user');
  currentUser = null;
  document.getElementById('f-id').value = '';
  document.getElementById('f-pw').value = '';
  showLanding();
};

// ── Afficher l'app ────────────────────────────────────────────
function showApp(user) {
  document.getElementById('screen-landing').classList.add('hidden');
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-register').classList.add('hidden');
  document.getElementById('screen-app').classList.remove('hidden');

  // UI utilisateur
  const initials = (user.prenom[0] + user.nom[0]).toUpperCase();
  document.getElementById('s-avatar').textContent  = initials;
  document.getElementById('s-uname').textContent   = `${user.prenom} ${user.nom}`;
  document.getElementById('s-role').innerHTML      = user.role === 'assureur' ? '<i class="fas fa-user-cog"></i> Assureur' : '<i class="fas fa-stethoscope"></i> Médecin';
  document.getElementById('s-urole').textContent   = user.role === 'assureur' ? 'Agent ForInsurance' : 'Professionnel de santé';

  // Navigation selon rôle
  if (user.role === 'assureur') {
    document.getElementById('nav-assureur').classList.remove('hidden');
    document.getElementById('nav-medecin').classList.add('hidden');
  } else {
    document.getElementById('nav-medecin').classList.remove('hidden');
    document.getElementById('nav-assureur').classList.add('hidden');
  }

  navigateTo('dashboard');
}

function showLanding() {
  document.getElementById('screen-landing').classList.remove('hidden');
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-register').classList.add('hidden');
  document.getElementById('screen-app').classList.add('hidden');
}

function showLogin() {
  document.getElementById('screen-landing').classList.add('hidden');
  document.getElementById('screen-login').classList.remove('hidden');
  document.getElementById('screen-register').classList.add('hidden');
  document.getElementById('screen-app').classList.add('hidden');
  document.getElementById('f-id').value = '';
  document.getElementById('f-pw').value = '';
  document.getElementById('login-err').classList.add('hidden');
}

// ── Navigation ────────────────────────────────────────────────
function navigateTo(page) {
  // Cache toutes les pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Met à jour nav
  document.querySelectorAll('.s-item').forEach(i => i.classList.remove('active'));
  const navItem = document.querySelector(`.s-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  // Affiche la page
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  // Titre
  const baseTitles = {
    'dashboard':                 'Tableau de bord',
    'assures':                   'Gestion des assurés',
    'medecins':                  'Gestion des médecins',
    'feuilles':                  'Gestion des feuilles de maladie',
    'remboursements':            'Gestion des remboursements',
    'mes-feuilles':              'Mes feuilles de maladie',
    'prescriptions-med':         'Prescription de médicaments',
    'consultations-spec':        'Prescription vers un spécialiste',
    'mon-profil':                'Mon profil',
    'patients':                  'Gestion des patients',
    'historique-consultations':  'Historique des consultations',
    'historique':                'Historique des opérations',
    'recherche':                 'Recherche',
  };
  const titles = { ...baseTitles };
  if (page === 'mon-profil' && currentUser?.role === 'assureur') {
    titles['mon-profil'] = 'Mon profil · Assureur';
  }
  document.getElementById('page-title').textContent = titles[page] || page;
  currentPage = page;

  // Ferme sidebar mobile
  document.getElementById('sidebar').classList.remove('mob-open');

  // Charge les données
  loadPage(page);
}

function loadPage(page) {
  const role = currentUser?.role;
  switch(page) {
    case 'dashboard':                 loadDashboard(role); break;
    case 'assures':                   loadAssures(); break;
    case 'medecins':                  loadMedecins(); break;
    case 'feuilles':                  loadFeuilles(); break;
    case 'remboursements':            loadRemboursements(); break;
    case 'mes-feuilles':              loadMesFeuilles(); break;
    case 'prescriptions-med':         loadPrescriptionsMed(); break;
    case 'consultations-spec':        loadConsultationsSpec(); break;
    case 'mon-profil':                loadMonProfil(); break;
    case 'patients':                  loadPatients(); break;
    case 'historique-consultations':  loadHistoriqueConsultations(); break;
    case 'historique':                loadHistoriqueOperations(); break;
    case 'recherche':                 loadRecherche(); break;
  }
}

// ── Liens de navigation ───────────────────────────────────────
document.getElementById('sidebar-nav').addEventListener('click', e => {
  const item = e.target.closest('.s-item[data-page]');
  if (item) { e.preventDefault(); navigateTo(item.dataset.page); }
});

// ── Sidebar collapse ──────────────────────────────────────────
document.getElementById('btn-collapse').onclick = () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
};

// ── Menu mobile ───────────────────────────────────────────────
document.getElementById('btn-menu').onclick = () => {
  document.getElementById('sidebar').classList.toggle('mob-open');
};

// ── Overlay mobile ────────────────────────────────────────────
document.getElementById('screen-app').addEventListener('click', e => {
  const sidebar = document.getElementById('sidebar');
  const btn    = document.getElementById('btn-menu');
  if (sidebar.classList.contains('mob-open') && !sidebar.contains(e.target) && !document.getElementById('btn-menu').contains(e.target)) {
    sidebar.classList.remove('mob-open');
  }
});

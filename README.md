# ForInsurance — Système d'Information pour Organisme de Sécurité Sociale

> Projet tuteuré CSI — Conception de Systèmes d'Information

---

## À propos du projet

Ce projet implémente le **Système d'Information** pour un **Organisme de Sécurité Sociale** modélisé dans le rapport UML (Rapport_csi.pdf). Il couvre l'intégralité des cas d'utilisation identifiés lors de la phase d'analyse.

### Acteurs du système
| Acteur | Rôle |
|---|---|
| **Assureur** | Agent de l'OSS — gère les assurés, médecins, remboursements |
| **Médecin** | Généraliste ou spécialiste — crée les feuilles de maladie, prescriptions |
| **Système bancaire** | Acteur externe — reçoit les ordres de virement |

### Cas d'utilisation implémentés (tirés du PDF)
| # | Cas d'utilisation | Acteur | Statut |
|---|---|---|---|
| 1 | Authentification | Médecin / Assureur | O |
| 2 | Inscrire un assuré | Assureur | O |
| 3 | Enregistrer un médecin traitant | Assureur | O |
| 4 | Enregistrer une feuille de maladie | Médecin | O |
| 5 | Compléter une feuille de maladie | Assureur | O |
| 6 | Effectuer le remboursement (espèces / virement) | Assureur | O |
| 7 | Imprimer une facture de remboursement | Assureur | O |
| 8 | Prescrire des médicaments | Médecin | O |
| 9 | Prescrire une consultation chez un spécialiste | Médecin | O |

### Machine à états — Feuille de maladie (diagramme d'état-transition du PDF)
```
Brouillon ──[Envoyer]──► Transmise ──[Ouverture OSS]──► En cours de traitement
    │                        │                                │         │
    └──[Annuler]──► Supprimée└──[Erreur critique]──► Refusée  │         │
                                                               │         │
                                          [Pièce manquante]◄──┘         │
                                               │                         │
                                          Incomplète                     │
                                               │                         │
                                    [Réception pièce]                    │
                                               └──────────────────────►  │
                                                                    [Validation]
                                                                         │
                                                                      Validée
                                                                         │
                                                              [Exécution remboursement]
                                                                         │
                                                                     Remboursée
```

---

## Architecture technique

```
PROJET CSI/
├── Rapport_csi (2).pdf       ← Rapport UML source
│
├── backend/                     ← API REST Node.js
│   ├── server.js                ← Point d'entrée Express
│   ├── .env                     ← Variables d'environnement
│   ├── db/
│   │   ├── database.js          ← Factory : PostgreSQL ou SQLite
│   │   ├── pg-database.js       ← Connexion PostgreSQL (pg)
│   │   ├── sqlite-database.js   ← Connexion SQLite (better-sqlite3)
│   │   ├── schema.pg.sql        ← Schéma PostgreSQL
│   │   ├── schema.sqlite.sql    ← Schéma SQLite
│   │   └── seed.js              ← Données de démonstration
│   ├── middleware/
│   │   └── auth.js              ← Vérification JWT + contrôle de rôle
│   ├── routes/
│   │   ├── auth.js              ← POST /api/auth/login
│   │   ├── assures.js           ← CRUD assurés + médecin traitant
│   │   ├── medecins.js          ← CRUD médecins
│   │   ├── feuilles.js          ← Feuilles de maladie + machine à états
│   │   ├── remboursements.js    ← Remboursements + facture
│   │   ├── prescriptions.js     ← Médicaments + consultations spécialistes
│   │   ├── medicaments.js       ← Recherche médicaments
│   │   ├── stats.js             ← Statistiques tableau de bord
│   │   └── ...                  ← Autres routes (demandes, etc.)
│   └── socket.js                ← Socket.IO (temps réel)
│
└── frontend/                    ← Interface HTML/CSS/JS pure
    ├── index.html               ← SPA — tous les écrans
    ├── css/
    │   └── main.css             ← Design system dark glassmorphism
    ├── img/                     ← Images
    └── js/
        ├── api.js               ← Client HTTP (fetch + JWT)
        ├── ui.js                ← Composants : toast, modal, SearchSelect, badges, pagination
        ├── app.js               ← Routeur principal + Socket.IO
        └── pages/
            ├── dashboard.js     ← Stats + graphique donut
            ├── assures.js       ← Liste, inscription, médecin traitant
            ├── medecins.js      ← Liste, enregistrement
            ├── patients.js      ← Liste patients (vue médecin)
            ├── feuilles.js      ← Feuilles + transitions d'état
            ├── prescriptions.js ← Médicaments + consultation spécialiste
            ├── remboursements.js← Remboursement + impression facture
            ├── profil.js        ← Profil utilisateur
            ├── historique.js    ← Historique
            ├── recherche.js     ← Recherche globale
            └── admin-comptes.js ← Admin : gestion des comptes assureurs
```

### Stack technologique
| Couche | Technologie |
|---|---|
| Runtime | Node.js |
| Framework API | Express.js |
| Base de données | PostgreSQL (via `pg`) ou SQLite (via `better-sqlite3` — fallback local) |
| Authentification | JWT (`jsonwebtoken`) + bcryptjs |
| Temps réel | Socket.IO |
| Email | Nodemailer (SendGrid / Ethereal) |
| Frontend | HTML5 / CSS3 / JavaScript ES6+ (pur, sans framework) |
| Police | Google Fonts — Inter + Outfit |
| Icônes | Font Awesome 5 (CDN) |
| Graphiques | Chart.js 4.4.1 (CDN) |

---

## Installation et démarrage

### Prérequis
- **Node.js** ≥ 18 (`node --version`)
- **npm** ≥ 9 (`npm --version`)

### Installer les dépendances backend
```bash
cd backend
npm install
```

### Initialiser la base de données (seed)
```bash
node db/seed.js
```
> Crée automatiquement `backend/db/securasante.db` (SQLite) si aucune `DATABASE_URL` PostgreSQL n'est configurée.

### Démarrer le serveur
```bash
# Mode production
npm start

# Mode développement (rechargement automatique)
npm run dev
```

### Ouvrir l'application
```
http://localhost:3001
```

> Le backend sert automatiquement le frontend depuis `../frontend/`.

---

## Comptes de démonstration

| Rôle | Identifiant | Mot de passe | Titulaire | Accès |
|---|---|---|---|---|
| Admin | `admin` | `AdminForInsurance2025!` | Admin SYSTEM | Accès complet |
| Assureur | `assureur01` | `assureur123` | NOUMSSI Elvira | Assurés, Médecins, Feuilles, Remboursements |
| Assureur | `assureur02` | `assureur123` | ABONDO Mark | Idem |
| Médecin | `medecin01` | `medecin123` | MAWAMBA Princesse (Généraliste) | Feuilles de maladie, Prescriptions |
| Médecin | `medecin02` | `medecin123` | BILONGO Laurent (Généraliste) | Idem |
| Médecin | `medecin03` | `medecin123` | KIKI Daniel (Spécialiste - Cardiologie) | Idem |
| Médecin | `medecin04` | `medecin123` | TALLA TEYO Sylvain (Spécialiste - Neurologie) | Idem |
| Médecin | `medecin05` | `medecin123` | WAFO TEGUO Vitric (Spécialiste - Dermatologie) | Idem |
| Médecin | `medecin06` | `medecin123` | ONDOA MANGA Harry Johan (Généraliste) | Idem |

---

## API REST — Endpoints

### Authentification
```
POST   /api/auth/login          Corps: { identifiant, mot_de_passe }
GET    /api/auth/me             (token requis)
```

### Assurés
```
GET    /api/assures             ?q=<recherche>&telephone=<tel>
GET    /api/assures/:id
POST   /api/assures             (rôle: assureur)
PUT    /api/assures/:id         (rôle: assureur)
PATCH  /api/assures/:id/medecin-traitant  (rôle: assureur)
DELETE /api/assures/:id         Désactivation logique
```

### Médecins
```
GET    /api/medecins            ?q=<recherche>&type=generaliste|specialiste
GET    /api/medecins/:id
POST   /api/medecins            (rôle: assureur)
PUT    /api/medecins/:id        (rôle: assureur)
```

### Feuilles de maladie
```
GET    /api/feuilles            ?q=&statut=&assure_id=&medecin_id=
GET    /api/feuilles/:id
POST   /api/feuilles            (rôle: medecin) → crée en Brouillon
PATCH  /api/feuilles/:id/statut             → transitions d'état
PATCH  /api/feuilles/:id/completer          → (rôle: assureur)
```

### Médicaments
```
GET    /api/medicaments/search  ?q=<nom>   ← autocomplétion depuis prescription_medicaments
```

### Remboursements
```
GET    /api/remboursements      (rôle: assureur)
GET    /api/remboursements/:id
POST   /api/remboursements      (rôle: assureur) — depuis feuille Validée
GET    /api/remboursements/:id/facture
```

### Prescriptions
```
GET    /api/prescriptions       ?type=medicaments|consultation_specialiste
POST   /api/prescriptions/medicaments              (rôle: medecin)
POST   /api/prescriptions/consultation-specialiste (rôle: medecin)
```

### Statistiques
```
GET    /api/stats               Adapté selon le rôle de l'utilisateur
```

---

## Modèle de données (schéma SQL)

```
utilisateurs              ← comptes d'accès au SI (admin, assureur, medecin)
personnes                 ← super-classe (Nom, Prénom, téléphone, email)
medecins                  ← lié à personnes (type: generaliste|specialiste)
assures                   ← lié à personnes + medecin_traitant
feuilles_maladie          ← document central avec machine à états
remboursements            ← lié à feuille + assuré
prescriptions             ← base (type: medicaments|consultation_specialiste)
prescription_medicaments  ← lignes de médicaments
prescription_consultation ← détail consultation spécialiste
demandes_inscription      ← demandes d'inscription des médecins
```

> La base de données est automatiquement créée au démarrage. SQLite en local (dev), PostgreSQL en production via la variable d'environnement `DATABASE_URL`.

---

## Intégration PostgreSQL

### 1. Configurer `.env`
```env
DATABASE_URL=postgres://user:password@localhost:5432/securasante
JWT_SECRET=votre_secret_jwt_fort
PORT=3001
NODE_ENV=production
```

### 2. Démarrer
```bash
npm start
```

Le code détecte automatiquement `DATABASE_URL` et bascule de SQLite vers PostgreSQL.

---

## Sécurité

| Mesure | Détail |
|---|---|
| Mots de passe | Hachés avec **bcryptjs** (coût 10) |
| Sessions | **JWT** avec expiration 8h |
| Contrôle d'accès | Middleware `requireRole()` sur chaque route sensible |
| Données | Requêtes préparées (protection injection SQL) |
| CORS | Configurable dans `server.js` |

---

## Fonctionnalités notables

### SearchSelect (autocomplétion)
Composant réutilisable dans `frontend/js/ui.js:80` — combobox avec recherche asynchrone, debounce 300ms, navigation clavier, utilisé pour la recherche de patients, médecins, feuilles, médicaments et spécialistes dans tous les formulaires.

### Temps réel (Socket.IO)
Les mutations en base de données sont diffusées à tous les clients connectés via l'événement `data-change`, permettant une mise à jour instantanée des listes.

---

## Test rapide de l'API avec curl

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifiant":"assureur01","mot_de_passe":"assureur123"}'

# Récupérer les assurés (remplacer TOKEN)
curl http://localhost:3001/api/assures \
  -H "Authorization: Bearer TOKEN"

# Récupérer les feuilles de maladie
curl http://localhost:3001/api/feuilles \
  -H "Authorization: Bearer TOKEN"
```

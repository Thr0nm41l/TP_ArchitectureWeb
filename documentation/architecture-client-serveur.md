# Architecture Client-Serveur

## Principe général

Dans une architecture client-serveur, le **client** (le navigateur) communique directement avec un **serveur** qui centralise les données et la logique métier. Le client envoie des requêtes, le serveur répond.

Dans le projet `safedocs-serveur-client`, le rôle de serveur est joué par **Supabase**, un Backend-as-a-Service (BaaS). Il n'y a aucun code serveur écrit : le navigateur utilise directement le SDK Supabase pour s'authentifier, lire et écrire des données.

```
┌───────────────────────────────────┐
│           Navigateur              │
│  index.html + script.js           │
│  (SDK Supabase chargé via CDN)    │
└────────────────┬──────────────────┘
                 │ HTTPS (SDK Supabase)
                 ▼
┌───────────────────────────────────┐
│         Supabase (BaaS)           │
│  - Authentification               │
│  - Base de données (docs)         │
│  - Stockage de fichiers (bucket)  │
└───────────────────────────────────┘
```

---

## Fonctionnement dans le code

### 1. Connexion directe au service

Tout commence dans `script.js`. Le client Supabase est instancié directement dans le navigateur avec l'URL et la clé API publique :

```js
// script.js — lignes 1-6
const { createClient } = supabase
const url = "https://xmljgbrtnttjpcvtbzyl.supabase.co"
const api_key = "eyJhbGci..."
const client = createClient(url, api_key)
```

La clé `api_key` est la clé `anon` de Supabase : elle est publique par conception, mais donne accès direct à la base de données depuis le navigateur. Il n'y a aucun intermédiaire.

### 2. Authentification côté client

Lors du clic sur "Sign In", le formulaire appelle directement l'API d'authentification Supabase :

```js
// script.js — lignes 135-148
const { data: loginData, error: loginError } = await client.auth.signInWithPassword({
    email,
    password,
})
if (!loginError) {
    user = loginData.user
    updateUI()
}
```

Supabase gère la session (JWT), le hachage du mot de passe, la vérification par email, etc. Le développeur n'a rien à implémenter côté serveur.

### 3. Upload et lecture de fichiers

L'upload se fait également en appelant directement le SDK Supabase depuis le navigateur :

```js
// script.js — lignes 166-168
const { data, error } = await client.storage
    .from('docBucket')
    .upload(filePath, file)
```

Puis les métadonnées du fichier sont enregistrées dans la table `docs` :

```js
// script.js — lignes 177-180
await client
    .from('docs')
    .insert([{ user_id: user.id, filename: file.name, url: filePath }])
```

Pour récupérer la liste des fichiers, une requête est envoyée à la base de données Supabase :

```js
// script.js — lignes 82-84
await client
    .from('docs')
    .select('*')
    .eq('user_id', user.id)
```

Tout cela se passe **dans le navigateur**, sans passer par un serveur intermédiaire.

---

## Avantages

- **Simplicité de développement** : pas de backend à écrire, déployer ni maintenir. Quelques fichiers statiques suffisent.
- **Mise en place rapide** : un service comme Supabase fournit clé en main l'authentification, le stockage et la base de données.
- **Pas d'infrastructure à gérer** : idéal pour des prototypes, des projets étudiants ou des petites applications.
- **Déploiement trivial** : les fichiers HTML/CSS/JS peuvent être servis par n'importe quel hébergeur statique (GitHub Pages, Netlify…).

## Inconvénients

- **Sécurité** : la clé API et l'URL du service sont visibles dans le code source du navigateur (F12 → Sources). N'importe qui peut les lire. Des règles de sécurité (Row Level Security chez Supabase) compensent partiellement ce problème, mais cela reste un risque à maîtriser.
- **Logique métier exposée** : toute la logique est dans le JavaScript exécuté côté client, donc visible et potentiellement modifiable par l'utilisateur.
- **Dépendance à un service tiers** : si Supabase change son API, ses tarifs ou ses conditions d'utilisation, l'application entière est impactée.
- **Scalabilité limitée** : difficile d'ajouter des traitements complexes (conversion de fichiers, notifications, jobs planifiés…) sans introduire un serveur.
- **Pas de contrôle total sur les données** : les données sont hébergées chez un prestataire externe.

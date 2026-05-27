# Architecture API REST (Microservices)

## Principe général

Dans une architecture **API REST**, le client (navigateur) ne communique plus directement avec un service tiers. Il envoie des requêtes HTTP à une **API** — un ensemble d'endpoints bien définis — qui se charge d'exécuter la logique métier côté serveur et de répondre en JSON.

Dans le projet `safedocs-api-rest`, cette architecture est poussée plus loin avec un découpage en **microservices** : chaque responsabilité (authentification, gestion de fichiers) est confiée à un service indépendant. Un **gateway** (point d'entrée unique) reçoit les requêtes du navigateur et les route vers le bon service.

```
┌──────────────────────────────────────┐
│            Navigateur                │
│  index.html + script.js              │
│  (appels fetch vers /api/...)        │
└───────────────┬──────────────────────┘
                │ HTTP (JSON)
                ▼
┌──────────────────────────────────────┐
│     Gateway — Nginx (port 3000)      │
│  Route /api/auth/* → auth-service    │
│  Route /api/files/* → files-service  │
└──────┬───────────────────┬───────────┘
       │                   │ réseau Docker interne
       ▼                   ▼
┌─────────────-┐   ┌──────────────────┐
│ auth-service │   │  files-service   │
│  (port 3001) │   │   (port 3002)    │
│  /signup     │   │  /upload         │
│  /login      │   │  /files          │
│  /logout     │   │                  │
└──────┬───────┘   └────────┬─────────┘
       │                    │
       └────────┬───────────┘
                ▼
┌──────────────────────────────────────┐
│           Supabase (BaaS)            │
│  - Authentification                  │
│  - Base de données (docs)            │
│  - Stockage de fichiers (bucket)     │
└──────────────────────────────────────┘
```

---

## Fonctionnement dans le code

### 1. Le Gateway : point d'entrée unique

Le gateway est un serveur **Nginx** dont la configuration (`nginx.conf`) définit les règles de routage. Le navigateur ne connaît que le gateway — il ne sait pas que `auth-service` et `files-service` existent.

```nginx
# gateway/nginx.conf — lignes 12-18
location /api/auth/ {
    proxy_pass http://auth-service:3001/;
}

location /api/files/ {
    proxy_pass http://files-service:3002/;
}
```

Toute requête vers `/api/auth/login` est transparemment redirigée vers `http://auth-service:3001/login`, sans que le navigateur en soit conscient.

### 2. Orchestration avec Docker Compose

Les trois services (gateway, auth-service, files-service) sont des conteneurs Docker indépendants. Le fichier `docker-compose.yaml` les orchestre sur un réseau privé commun :

```yaml
# docker-compose.yaml — lignes 3-49
services:
  auth-service:
    build: ./auth-service
    # Pas de port exposé : inaccessible depuis l'extérieur
    networks: [app-network]

  files-service:
    build: ./files-service
    networks: [app-network]

  gateway:
    build: ./gateway
    ports:
      - "3000:80"        # Seul port ouvert au monde
    environment:
      - AUTH_URL=http://auth-service:3001
      - FILES_URL=http://files-service:3002
    depends_on:
      auth-service:
        condition: service_healthy
      files-service:
        condition: service_healthy
```

`auth-service` et `files-service` ne sont pas exposés sur la machine hôte : seul le gateway est accessible sur le port 3000.

### 3. Le client fait des appels fetch vers l'API

Le frontend (dans `gateway/src/script.js`) ne connaît pas Supabase. Il fait des appels HTTP classiques vers son propre domaine :

```js
// gateway/src/script.js — lignes 122-129
const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
})
const { user } = await response.json()
```

Le serveur répond avec les données de l'utilisateur et un token JWT (`access_token`), que le client stocke en mémoire pour les requêtes suivantes.

### 4. Authentification par token JWT

Les endpoints protégés (upload, liste de fichiers, logout) exigent que le client prouve son identité en incluant le token dans le header `Authorization` :

```js
// gateway/src/script.js — lignes 18-22
const response = await fetch('/api/files/files', {
    headers: {
        'Authorization': `Bearer ${user.access_token}`
    }
})
```

Côté serveur, chaque service extrait et vérifie ce token :

```js
// auth-service/src/utils.js — lignes 21-25
const getAuthToken = (req) => {
    const authHeader = req.headers.authorization
    if (!authHeader) return null
    return authHeader.replace('Bearer ', '')
}
```

### 5. Les services implémentent la logique métier

Chaque service expose des routes Express. `auth-service` expose `/login`, `/signup`, `/logout`. `files-service` expose `/upload` et `/files`. La logique est encapsulée côté serveur — les credentials Supabase ne quittent jamais le conteneur :

```js
// auth-service/src/login.js — lignes 9-38
app.post('/login', async (req, res) => {
    const { email, password } = req.body

    if (!checkInputValidity(email, "email") || !checkInputValidity(password, "text")) {
        return res.status(400).json({ message: 'Invalid input' })
    }

    const { data, error } = await client.auth.signInWithPassword({ email, password })

    if (error) {
        res.status(401).json({ message: error.message })
    } else {
        res.status(200).json({
            user: { ...data.user, access_token: data.session.access_token }
        })
    }
})
```

---

## Conventions REST

L'API respecte les conventions REST :

| Action          | Méthode | Endpoint              | Code retour |
|-----------------|---------|-----------------------|-------------|
| Créer un compte | POST    | `/api/auth/signup`    | 200 / 400   |
| Se connecter    | POST    | `/api/auth/login`     | 200 / 401   |
| Se déconnecter  | POST    | `/api/auth/logout`    | 200 / 401   |
| Uploader        | POST    | `/api/files/upload`   | 200 / 401   |
| Lister fichiers | GET     | `/api/files/files`    | 200 / 401   |

Toutes les réponses sont en **JSON**. Les erreurs retournent un code HTTP approprié (400, 401, 500) avec un message explicite.

---

## Avantages

- **Sécurité** : les credentials (clés Supabase, mots de passe DB) restent sur le serveur, jamais exposés dans le navigateur.
- **Séparation des responsabilités** : chaque service a un rôle clair et peut être modifié, redéployé ou mis à l'échelle indépendamment.
- **Contrôle total sur la logique métier** : la validation, les règles d'accès et les traitements sont gérés côté serveur, hors de portée de l'utilisateur.
- **Scalabilité** : il est possible de démarrer plusieurs instances d'un service sous charge sans toucher aux autres.
- **Interopérabilité** : l'API peut être consommée par d'autres clients (application mobile, autre service, script CLI) sans modifier le serveur.
- **Testabilité** : chaque endpoint peut être testé indépendamment (avec curl, Postman, ou des tests automatisés).

## Inconvénients

- **Complexité accrue** : il faut écrire, configurer et maintenir plusieurs services, un gateway, et des Dockerfiles.
- **Infrastructure à gérer** : Docker, le réseau, les variables d'environnement, les healthchecks… autant de couches qui peuvent tomber en panne.
- **Latence supplémentaire** : une requête passe par le gateway, puis le service, avant d'atteindre Supabase — là où le client-serveur simple appelle Supabase directement.
- **Démarrage plus lent** : `docker compose up` doit attendre que les services soient sains avant de démarrer le gateway (`depends_on: condition: service_healthy`).
- **Sur-ingénierie pour les petits projets** : pour une application simple, ce découpage peut être disproportionné par rapport au gain réel.

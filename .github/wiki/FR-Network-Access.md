🌐 **Langue :** [EN](Network-Access) · [DE](DE-Network-Access) · **FR** · [ES](ES-Network-Access) · [TR](TR-Network-Access) · [EL](EL-Network-Access)

---

# Accès réseau — Sans adresse IP fixe

Tesla Carview tourne sur votre propre serveur — mais pour qu'il soit accessible depuis Internet (y compris depuis votre Tesla), vous avez besoin d'une adresse stable et publiquement accessible. Cette page vous guide pas à pas à travers chaque option.

> **Pas expert en informatique ?** Suivez cette page de haut en bas. Chaque option inclut des instructions précises, sans prérequis supposé.

---

## Quelle option me convient ?

| Votre situation | Meilleure option |
|---|---|
| Connexion domestique (IP change chaque jour) | [Option A : Cloudflare Tunnel](#option-a--cloudflare-tunnel-recommand%C3%A9) ou [Option B : DynDNS + box](#option-b--dyndns--box-domestique) |
| Câble / fibre — **impossible d'ouvrir les ports** (CG-NAT) | [Option A : Cloudflare Tunnel](#option-a--cloudflare-tunnel-recommand%C3%A9) |
| VPS / serveur chez un hébergeur | [Option C : VPS avec IP fixe](#option-c--vps-chez-un-h%C3%A9bergeur) |
| Vous possédez un domaine | [Option D : Domaine propre + enregistrement DNS](#option-d--domaine-propre-avec-enregistrement-dns) |

---

## Le problème avec une connexion domestique

Votre connexion Internet reçoit une **nouvelle adresse IP chaque jour** (ou plus souvent). L'adresse valide aujourd'hui sera incorrecte demain.

**Le DNS dynamique résout ce problème :**
- Vous réservez un nom d'hôte fixe (ex. `my-tesla.duckdns.org`)
- Un petit programme sur votre box ou serveur signale chaque nouvelle IP automatiquement
- Votre nom d'hôte pointe toujours vers l'IP actuelle — aucune mise à jour manuelle nécessaire

---

## Êtes-vous derrière un CG-NAT ?

De nombreux fournisseurs câble (Bouygues, SFR, et d'autres) ne donnent plus à chaque client sa propre IPv4 publique. Plusieurs clients partagent une même IP — c'est le **NAT Carrier-Grade (CG-NAT)**.

**Comment vérifier :**
1. Visitez [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip) — notez l'IP affichée
2. Ouvrez la page de statut de votre box — notez l'IP WAN
3. Si les deux IP sont **différentes** → vous êtes derrière un CG-NAT

Avec un CG-NAT, la redirection de ports **ne fonctionne pas**. Utilisez l'Option A (Cloudflare Tunnel) — elle ne nécessite pas d'ouvrir de ports.

---

## Option A : Cloudflare Tunnel (Recommandé)

Cloudflare Tunnel crée une connexion sortante chiffrée de votre serveur vers le réseau mondial de Cloudflare. Aucune redirection de port nécessaire. Gratuit. Fonctionne derrière un CG-NAT.

**Prérequis :** Un domaine, ou un sous-domaine gratuit (instructions ci-dessous).

### Étape 1 : Obtenir un domaine gratuit (si vous n'en avez pas)

Rendez-vous sur [duckdns.org](https://www.duckdns.org), connectez-vous avec Google ou GitHub, choisissez un nom → vous obtenez par exemple `my-tesla.duckdns.org` gratuitement.

Ou achetez un domaine bon marché (~1 $/an) sur [Porkbun](https://www.porkbun.com), [Namecheap](https://www.namecheap.com), ou [inwx.de](https://www.inwx.de).

### Étape 2 : Ajouter votre domaine à Cloudflare

1. Inscrivez-vous sur [dash.cloudflare.com](https://dash.cloudflare.com) — gratuit
2. Cliquez sur **"Add a Site"** → entrez votre domaine → **Plan gratuit**
3. Cloudflare vous indique deux adresses de serveurs de noms, ex. :
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
4. Rendez-vous chez votre registrar et renseignez ces serveurs de noms
5. Attendez 10–30 minutes → Cloudflare confirme "Nameservers updated"

### Étape 3 : Installer et configurer `cloudflared`

Sur votre serveur (via SSH) :

```bash
# Télécharger et installer
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Se connecter (un lien navigateur est affiché — ouvrez-le)
cloudflared tunnel login

# Créer le tunnel
cloudflared tunnel create tesla-carview
# Notez l'ID de tunnel affiché !
```

Créer le fichier de configuration :

```bash
mkdir -p /etc/cloudflared
nano /etc/cloudflared/config.yml
```

Contenu (remplacez `YOUR_TUNNEL_ID` et `yourdomain.com`) :

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: tesla.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

Créer l'entrée DNS automatiquement :

```bash
cloudflared tunnel route dns tesla-carview tesla.yourdomain.com
```

### Étape 4 : Installer en tant que service système

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Terminé.** Tesla Carview est maintenant accessible sur `https://tesla.yourdomain.com` — avec HTTPS automatique, aucun port ouvert, aucune IP fixe requise.

---

## Option B : DynDNS + Box domestique

> **Important :** Fonctionne uniquement si vous disposez d'une vraie adresse IPv4 publique. [Vérifiez le CG-NAT d'abord](#%C3%AAtes-vous-derri%C3%A8re-un-cg-nat-).

### Étape 1 : S'inscrire à un service DynDNS

**Dynu** (gratuit, pas de confirmation mensuelle requise) :
1. Rendez-vous sur [dynu.com](https://www.dynu.com) → créez un compte → DDNS → Add
2. Entrez un nom, ex. `my-tesla` → vous obtenez `my-tesla.freeddns.org`
3. Notez votre nom d'hôte, identifiant et mot de passe (Panneau de contrôle → API Credentials)

**DuckDNS** (encore plus simple) :
1. [duckdns.org](https://www.duckdns.org) → connectez-vous → choisissez un sous-domaine → notez votre token

### Étape 2 : Configurer votre box

**Livebox / Freebox / box générique :**
Cherchez "DNS dynamique" ou "DDNS" dans les paramètres Internet/WAN de votre box.

| Champ | Dynu | DuckDNS |
|---|---|---|
| Fournisseur | Personnalisé | Personnalisé |
| URL de mise à jour | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` | `https://www.duckdns.org/update?domains=YOURNAME&token=YOURTOKEN&ip=<ipaddr>` |
| Domaine | `my-tesla.freeddns.org` | `my-tesla.duckdns.org` |
| Identifiant | Identifiant Dynu | — |
| Mot de passe | Mot de passe Dynu | — |

### Étape 3 : Redirection de ports

Pour que le trafic entrant atteigne votre serveur :

| Champ | Valeur |
|---|---|
| Nom | Tesla Carview |
| Protocole | TCP |
| Port externe | 443 |
| Vers l'appareil | IP locale de votre serveur (ex. `192.168.1.100`) |
| Port interne | 443 |

> **Conseil :** Attribuez une IP locale fixe à votre serveur dans les paramètres de votre box.

### Étape 4 : Certificat SSL et configuration Tesla Carview

```bash
# Définir FRONTEND_URL dans /opt/tesla-carview/backend/.env :
FRONTEND_URL=https://my-tesla.freeddns.org

# Obtenir le certificat SSL :
certbot --nginx -d my-tesla.freeddns.org
```

---

## Option C : VPS chez un hébergeur

Un VPS (Virtual Private Server) est un petit serveur Linux loué avec une **IP publique fixe et permanente**. Pas de DynDNS, pas de redirection de ports.

**Comparatif de prix (2025) :**

| Hébergeur | Produit | Prix/mois |
|---|---|---|
| [Hetzner](https://www.hetzner.com) | CX22 | ~4,35 € |
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~4,44 € |
| [Contabo](https://contabo.com) | VPS S | ~5,99 € |

**Installation (exemple : Hetzner) :**
1. Inscrivez-vous → créez un serveur → choisissez Ubuntu 24.04 → notez l'IP publique
2. Connectez-vous en SSH : `ssh root@YOUR-SERVER-IP`
3. Lancez le script d'installation :
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

Le script demande votre nom de domaine et configure nginx + Let's Encrypt automatiquement.

Ensuite, pointez un domaine dessus → [Option D](#option-d--domaine-propre-avec-enregistrement-dns)

---

## Option D : Domaine propre avec enregistrement DNS

Si vous avez votre propre domaine et un serveur avec une IP fixe, créez un **enregistrement A** :

**Qu'est-ce qu'un enregistrement A ?** C'est une entrée dans l'annuaire : `tesla.yourdomain.com → 123.456.789.0`

**Chez Cloudflare DNS :**
DNS → Add record → Type : A, Nom : `tesla`, IPv4 : IP de votre serveur → Save

**Chez Namecheap :**
Domain List → Manage → Advanced DNS → Add New Record → A Record, Host : `tesla`, Value : votre IP

**Chez OVH/Gandi :**
Zone DNS → Ajouter un enregistrement → A, Sous-domaine : `tesla`, Cible : votre IP

**Chez Hetzner DNS ([dns.hetzner.com](https://dns.hetzner.com)) :**
Sélectionnez la zone → Records → Add Record → A, Name : `tesla`, Value : votre IP

> **TTL :** Définissez 300 (5 minutes) au départ — facile à corriger en cas d'erreur. Augmentez à 3600 ensuite.

### Vérifier la propagation

```bash
nslookup tesla.yourdomain.com
# ou en ligne : https://dnschecker.org
```

### IP dynamique avec votre propre domaine

Si vous avez un domaine mais pas d'IP fixe :

**CNAME → DuckDNS** (la box met à jour DuckDNS automatiquement) :
```
tesla.yourdomain.com  →  CNAME  →  my-tesla.duckdns.org
```

---

## Arbre de décision

```
L'IP de votre box est-elle différente de ce que https://api4.my-ip.io/ip affiche ?
  OUI (CG-NAT) → Option A : Cloudflare Tunnel
  NON :
    Avez-vous un serveur dans un data centre ?
      OUI → Option C + D (VPS + enregistrement DNS)
      NON (réseau domestique) :
        Avez-vous votre propre domaine ?
          OUI → Option B (DynDNS) + Option D (enregistrement DNS)
          NON → Option B avec sous-domaine gratuit (DuckDNS/Dynu)
```

---

## Problèmes courants

### "Site inaccessible" juste après l'installation

La propagation DNS prend 5–30 minutes. Testez d'abord en local :
```bash
curl -I http://localhost
```

### Erreurs HTTPS / "Certificat invalide"

```bash
certbot renew --force-renewal
systemctl restart nginx
```

### L'URL de mise à jour DynDNS de la box ne fonctionne pas

Votre box remplace `<ipaddr>` automatiquement — ne le remplissez pas manuellement. Testez l'URL dans un navigateur en remplaçant `<ipaddr>` par votre IP actuelle.

### "Mon IP WAN commence par 100. ou 10."

C'est du CG-NAT → utilisez [l'Option A (Cloudflare Tunnel)](#option-a--cloudflare-tunnel-recommand%C3%A9).

### IPv6 / pas d'IPv4

Les nouvelles connexions fibre utilisent IPv6. Le fonctionnement est identique — utilisez un enregistrement **AAAA** au lieu de **A** dans le DNS.

---

## Liens utiles

- [Documentation Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/) — DNS dynamique gratuit
- [Dynu DDNS](https://www.dynu.com/) — gratuit, pas de confirmation mensuelle
- [dnschecker.org](https://dnschecker.org) — vérifier la propagation DNS dans le monde
- [api4.my-ip.io/ip](https://api4.my-ip.io/ip) — vérifier votre IP publique

---

*→ [[FR-Installation]] | [[FR-Raspberry-Pi-Storage]] | [[FR-Home]]*

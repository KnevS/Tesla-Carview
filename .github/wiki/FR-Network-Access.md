# Accès réseau — Sans adresse IP fixe

Tesla Carview fonctionne sur votre propre serveur — mais pour qu'il soit accessible depuis internet (y compris depuis votre Tesla), vous avez besoin d'une adresse stable et accessible publiquement. Cette page vous guide à travers toutes les options, étape par étape.

> **Vous n'êtes pas expert en informatique ?** Suivez cette page de haut en bas. Chaque option inclut des instructions précises sans supposer de connaissances préalables.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Network-Access)** | English version |
| 🇩🇪 **[Deutsch](DE-Network-Access)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Network-Access)** | Vous êtes ici |
| 🇪🇸 **[Español](ES-Network-Access)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Network-Access)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Network-Access)** | Ελληνική έκδοση |

---

## Quelle option me convient ?

| Votre situation | Meilleure option |
|---|---|
| Internet domestique (IP change chaque jour) | [Option A : Cloudflare Tunnel](#option-a--cloudflare-tunnel-recommandé) ou [Option B : DynDNS + routeur](#option-b--dyndns--routeur-domestique) |
| Câble / fibre — **impossible d'ouvrir des ports** (CG-NAT) | [Option A : Cloudflare Tunnel](#option-a--cloudflare-tunnel-recommandé) |
| VPS / serveur chez un hébergeur | [Option C : VPS avec IP fixe](#option-c--vps-chez-un-hébergeur) |
| Vous possédez un domaine | [Option D : Domaine propre + enregistrement DNS](#option-d--domaine-propre-avec-enregistrement-dns) |

---

## Le problème avec l'internet domestique

Votre connexion internet domestique reçoit une **nouvelle adresse IP chaque jour** (voire plus souvent). Cela signifie que l'adresse que vous saisissez aujourd'hui sera incorrecte demain.

**Le DNS dynamique** résout ce problème :
- Vous réservez un nom d'hôte fixe (ex. `mon-tesla.duckdns.org`)
- Un petit programme sur votre routeur ou serveur signale automatiquement chaque nouvelle IP
- Votre nom d'hôte pointe toujours vers l'IP actuelle — sans mise à jour manuelle

---

## Êtes-vous derrière un CG-NAT ?

De nombreux opérateurs câble (Vodafone, Virgin Media et d'autres) ne donnent plus à chaque client sa propre adresse IPv4 publique. Plusieurs clients partagent une même IP — c'est le **Carrier-Grade NAT (CG-NAT)**.

**Comment vérifier :**
1. Visitez [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip) — notez l'IP affichée
2. Ouvrez la page de statut de votre routeur — notez l'IP WAN
3. Si les deux IP sont **différentes** → vous êtes derrière un CG-NAT

Avec le CG-NAT, la redirection de port **ne fonctionne pas**. Utilisez l'Option A (Cloudflare Tunnel) — elle ne nécessite pas de ports ouverts.

---

## Option A : Cloudflare Tunnel (Recommandé)

Cloudflare Tunnel crée une connexion sortante chiffrée depuis votre serveur vers le réseau mondial de Cloudflare. Pas besoin de redirection de port. Gratuit. Fonctionne derrière un CG-NAT.

**Prérequis :** Un domaine, ou un sous-domaine gratuit (instructions ci-dessous).

### Étape 1 : Obtenir un domaine gratuit (si vous n'en avez pas)

Rendez-vous sur [duckdns.org](https://www.duckdns.org), connectez-vous avec Google ou GitHub, choisissez un nom → vous obtenez par exemple `mon-tesla.duckdns.org` gratuitement.

Ou achetez un domaine bon marché (~1 $/an) sur [Porkbun](https://www.porkbun.com), [Namecheap](https://www.namecheap.com) ou [inwx.de](https://www.inwx.de).

### Étape 2 : Ajouter votre domaine à Cloudflare

1. Inscrivez-vous sur [dash.cloudflare.com](https://dash.cloudflare.com) — gratuit
2. Cliquez sur **« Add a Site »** → saisissez votre domaine → **Free plan**
3. Cloudflare vous indique deux adresses de serveurs de noms, ex. :
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
4. Rendez-vous chez votre registrar et saisissez ces adresses comme serveurs de noms
5. Attendez 10 à 30 minutes → Cloudflare confirme « Nameservers updated »

### Étape 3 : Installer et configurer `cloudflared`

Sur votre serveur (via SSH) :

```bash
# Télécharger et installer
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Se connecter (un lien de navigateur s'affiche — ouvrez-le)
cloudflared tunnel login

# Créer le tunnel
cloudflared tunnel create tesla-carview
# Notez l'ID du tunnel affiché !
```

Créez le fichier de configuration :

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

Créez l'entrée DNS automatiquement :

```bash
cloudflared tunnel route dns tesla-carview tesla.yourdomain.com
```

### Étape 4 : Installer en tant que service système

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Terminé.** Tesla Carview est désormais accessible sur `https://tesla.votredomaine.com` — avec HTTPS automatique, sans ports ouverts, sans IP fixe nécessaire.

---

## Option B : DynDNS + routeur domestique

> **Important :** Fonctionne uniquement si vous disposez d'une véritable adresse IPv4 publique. [Vérifiez d'abord le CG-NAT](#êtes-vous-derrière-un-cg-nat).

### Étape 1 : S'inscrire à un service DynDNS

**Dynu** (gratuit, sans confirmation mensuelle requise) :
1. Rendez-vous sur [dynu.com](https://www.dynu.com) → créez un compte → DDNS → Add
2. Saisissez un nom, ex. `mon-tesla` → vous obtenez `mon-tesla.freeddns.org`
3. Notez votre nom d'hôte, nom d'utilisateur et mot de passe (Panneau de contrôle → API Credentials)

**DuckDNS** (encore plus simple) :
1. [duckdns.org](https://www.duckdns.org) → se connecter → choisir un sous-domaine → noter votre token

### Étape 2 : Configurer votre routeur

**FritzBox :**
1. Ouvrez [http://fritz.box](http://fritz.box) → **Internet → Accès externe → DynDNS**
2. Cochez **« Utiliser DynDNS »** et remplissez :

   | Champ | Dynu | DuckDNS |
   |---|---|---|
   | Fournisseur | Défini par l'utilisateur | Défini par l'utilisateur |
   | URL de mise à jour | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` | `https://www.duckdns.org/update?domains=YOURNAME&token=YOURTOKEN&ip=<ipaddr>` |
   | Domaine | `mon-tesla.freeddns.org` | `mon-tesla.duckdns.org` |
   | Nom d'utilisateur | Nom d'utilisateur Dynu | — |
   | Mot de passe | Mot de passe Dynu | — |

3. Cliquez sur **Appliquer** → coche verte = fonctionnel

**Autres routeurs :** Recherchez « DNS dynamique » ou « DDNS » dans les paramètres internet/WAN.

### Étape 3 : Redirection de port

Pour que le trafic entrant atteigne votre serveur :

**FritzBox :** Internet → Accès externe → Partage de ports → Nouveau partage de ports → Autre application

| Champ | Valeur |
|---|---|
| Nom | Tesla Carview |
| Protocole | TCP |
| Port externe | 443 |
| Vers l'appareil | L'IP locale de votre serveur (ex. `192.168.1.100`) |
| Port interne | 443 |

> **Conseil :** Attribuez une IP locale fixe à votre serveur. Sur FritzBox : Réseau domestique → Réseau → votre appareil → Toujours attribuer cette IP.

### Étape 4 : Certificat SSL et configuration de Tesla Carview

```bash
# Définir FRONTEND_URL dans /opt/tesla-carview/backend/.env :
FRONTEND_URL=https://mon-tesla.freeddns.org

# Obtenir un certificat SSL :
certbot --nginx -d mon-tesla.freeddns.org
```

---

## Option C : VPS chez un hébergeur

Un VPS (serveur privé virtuel) est un petit serveur Linux loué avec une **adresse IP publique fixe et permanente**. Pas de DynDNS, pas de redirection de port nécessaire.

**Comparaison des prix (2025) :**

| Fournisseur | Produit | Prix/mois |
|---|---|---|
| [Hetzner](https://www.hetzner.com) | CX22 | ~4,35 € |
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~4,44 € |
| [Contabo](https://contabo.com) | VPS S | ~5,99 € |

**Configuration (exemple : Hetzner) :**
1. Inscrivez-vous → créez un serveur → choisissez Ubuntu 24.04 → notez l'IP publique
2. Connectez-vous en SSH : `ssh root@YOUR-SERVER-IP`
3. Lancez le script d'installation :
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

Le script vous demande votre nom de domaine et configure nginx + Let's Encrypt automatiquement.

Puis pointez un domaine vers le serveur → [Option D](#option-d--domaine-propre-avec-enregistrement-dns)

---

## Option D : Domaine propre avec enregistrement DNS

Si vous possédez votre propre domaine et un serveur avec une IP fixe, créez un **enregistrement A** :

**Qu'est-ce qu'un enregistrement A ?** C'est une entrée dans l'annuaire : `tesla.votredomaine.com → 123.456.789.0`

**Chez Cloudflare DNS :**
DNS → Ajouter un enregistrement → Type : A, Nom : `tesla`, IPv4 : l'IP de votre serveur → Enregistrer

**Chez Namecheap :**
Liste des domaines → Gérer → DNS avancé → Ajouter un enregistrement → A Record, Hôte : `tesla`, Valeur : votre IP

**Chez IONOS :**
Domaines → votre domaine → DNS → Ajouter un enregistrement → A, Nom d'hôte : `tesla`, Destination : votre IP

**Chez Hetzner DNS ([dns.hetzner.com](https://dns.hetzner.com)) :**
Sélectionner la zone → Enregistrements → Ajouter un enregistrement → A, Nom : `tesla`, Valeur : votre IP

> **TTL :** Définissez 300 (5 minutes) au départ — facilite la correction des erreurs. Augmentez à 3600 ensuite.

### Vérifier la propagation

```bash
nslookup tesla.votredomaine.com
# ou en ligne : https://dnschecker.org
```

### IP dynamique avec votre propre domaine

Si vous avez un domaine mais pas d'IP fixe :

**CNAME → DuckDNS** (le routeur maintient DuckDNS à jour) :
```
tesla.votredomaine.com  →  CNAME  →  mon-tesla.duckdns.org
```

---

## Arbre de décision

```
L'IP de votre routeur est-elle différente de ce qu'affiche https://api4.my-ip.io/ip ?
  OUI (CG-NAT) → Option A : Cloudflare Tunnel
  NON :
    Avez-vous un serveur dans un centre de données ?
      OUI → Option C + D (VPS + enregistrement DNS)
      NON (réseau domestique) :
        Avez-vous votre propre domaine ?
          OUI → Option B (DynDNS) + Option D (enregistrement DNS)
          NON  → Option B avec sous-domaine gratuit (DuckDNS/Dynu)
```

---

## Problèmes courants

### « Site inaccessible » juste après la configuration

La propagation DNS prend 5 à 30 minutes. Testez d'abord en local :
```bash
curl -I http://localhost
```

### « Certificat invalide » / Erreurs HTTPS

```bash
certbot renew --force-renewal
systemctl restart nginx
```

### L'URL de mise à jour DynDNS du routeur ne fonctionne pas

Votre routeur remplace automatiquement `<ipaddr>` — ne le renseignez pas manuellement. Testez l'URL dans un navigateur en remplaçant `<ipaddr>` par votre IP actuelle réelle.

### « Mon IP WAN commence par 100. ou 10. »

C'est le CG-NAT → utilisez l'[Option A (Cloudflare Tunnel)](#option-a--cloudflare-tunnel-recommandé).

### IPv6 / pas d'IPv4

Les nouvelles connexions fibre utilisent IPv6. Le fonctionnement est identique — utilisez un enregistrement **AAAA** plutôt que **A** dans le DNS. Votre routeur conserve un préfixe IPv6 fixe (pas de DynDNS nécessaire pour IPv6 sur la plupart des connexions).

---

## Liens utiles

- [Documentation Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/) — DNS dynamique gratuit
- [Dynu DDNS](https://www.dynu.com/) — gratuit, sans confirmation mensuelle
- [dnschecker.org](https://dnschecker.org) — vérifier la propagation DNS dans le monde entier
- [api4.my-ip.io/ip](https://api4.my-ip.io/ip) — vérifier votre IP publique

---

*→ [[Installation]] | [[Raspberry-Pi-Storage]] | [[Home]]*

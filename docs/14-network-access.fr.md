# Accessible depuis n'importe où — sans IP fixe

> 🤖 *Cette traduction française est assistée par IA depuis [14-network-access.en.md](14-network-access.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](14-network-access.md)

Ce chapitre explique **pas à pas** comment rendre Tesla Carview accessible depuis n'importe où — même sans adresse IP publique fixe, même derrière un routeur domestique, même sur une connexion internet résidentielle.

> **Pas un expert IT ? Pas de problème.** Chaque option comprend des instructions étape par étape précises que vous pouvez suivre sans connaissance préalable.

---

## Quelle option me convient ?

| Situation | Meilleure option |
|---|---|
| Internet domestique (routeur), IP change quotidiennement | [Option A : Cloudflare Tunnel](#option-a--cloudflare-tunnel-recommandé-pour-usage-domestique) ou [Option B : DynDNS + routeur](#option-b--dyndns--routeur-domestique) |
| Internet câble ou fibre — **impossible d'ouvrir des ports** (CG-NAT) | [Option A : Cloudflare Tunnel](#option-a--cloudflare-tunnel-recommandé-pour-usage-domestique) |
| Serveur personnel / VPS chez un hébergeur (netcup, Hetzner) | [Option C : VPS avec IP fixe](#option-c--vps-chez-un-hébergeur-netcup-hetzner-contabo) |
| Domaine personnel disponible | [Option D : Domaine personnel + enregistrement DNS](#option-d--domaine-personnel-avec-enregistrement-dns) |

---

## Le problème avec les adresses IP dynamiques

Votre connexion internet domestique **n'a pas d'adresse IP fixe** — le routeur en reçoit une nouvelle chaque jour (ou plus souvent). Cela signifie : si vous saisissez `192.0.2.47` dans l'app aujourd'hui, ce sera faux demain.

La solution s'appelle **Dynamic DNS (DynDNS ou DDNS)** :
- Vous réservez un nom de domaine fixe (par ex. `my-tesla.duckdns.org`)
- Un petit programme (tournant automatiquement sur votre routeur ou serveur) signale la nouvelle adresse IP à chaque changement
- Votre nom de domaine pointe toujours vers l'IP actuelle — vous n'avez jamais à changer quoi que ce soit manuellement

---

## Autre problème : pas d'IPv4 publique (CG-NAT)

De nombreuses connexions internet câble (par ex. Vodafone, Virgin Media, certains opérateurs mobiles) ne fournissent plus leur propre adresse IPv4 publique. Plusieurs clients partagent une IP. Cela s'appelle Carrier-Grade NAT (CG-NAT).

**Test de détection :** Allez sur [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip) et comparez l'IP affichée avec l'IP que votre routeur montre dans sa page de statut. Si les IP sont **différentes** → vous êtes derrière CG-NAT. L'Option B **ne marchera pas**.

Avec CG-NAT, l'**Option A (Cloudflare Tunnel)** est la seule solution sans serveur supplémentaire.

---

## Option A : Cloudflare Tunnel (recommandé pour usage domestique)

**Qu'est-ce que c'est ?** Cloudflare Tunnel établit une connexion sortante chiffrée depuis votre serveur vers internet — sans ouvrir aucun port dans votre routeur. Votre instance Tesla Carview devient accessible via le réseau global de Cloudflare.

**Coût :** Gratuit.

**Prérequis :**
- Un domaine (par ex. `mydomain.com`) **ou** un sous-domaine gratuit (instructions ci-dessous)
- Le domaine doit être géré par Cloudflare (étape gratuite)

### Étape 1 : Obtenir un domaine gratuit (si vous n'en avez pas)

Sans domaine personnel, utilisez DuckDNS :
1. Allez sur [https://www.duckdns.org](https://www.duckdns.org) et connectez-vous avec Google ou GitHub
2. Choisissez un nom, par ex. `my-tesla` → vous obtenez `my-tesla.duckdns.org`
3. Notez votre **token** (la longue chaîne alphanumérique affichée sous votre profil)

Alternativement : Obtenez un domaine bon marché à partir de ~1 $/an chez [Namecheap](https://www.namecheap.com), [Porkbun](https://www.porkbun.com) ou [inwx.de](https://www.inwx.de).

### Étape 2 : Compte Cloudflare + ajout du domaine

1. Allez sur [https://dash.cloudflare.com](https://dash.cloudflare.com) → inscription gratuite
2. Cliquez sur **« Add a Site »** et saisissez votre domaine
3. Choisissez le **Free plan** (0 €)
4. Cloudflare vous montre deux adresses de serveurs de noms, par ex. :
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
5. Allez chez votre registrar de domaine (Namecheap, IONOS etc.) et saisissez-les **comme serveurs de noms**
   - Chez Namecheap : Domain List → Manage → Nameservers → Custom DNS
   - Chez IONOS : Domains → votre domaine → Nameservers → Custom nameservers
6. Patientez 10–30 minutes jusqu'à ce que Cloudflare confirme : **« Nameservers updated »**

### Étape 3 : Créer le tunnel

Sur votre serveur (via SSH ou terminal) :

```bash
# Installer cloudflared
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Se connecter à votre compte Cloudflare (une fenêtre de navigateur s'ouvre)
cloudflared tunnel login

# Créer le tunnel (choisissez n'importe quel nom)
cloudflared tunnel create tesla-carview

# Cela affiche : Tunnel ID (par ex. "abc123-...") — notez-le !
```

### Étape 4 : Configurer le tunnel

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

Créer l'enregistrement DNS (Cloudflare le fait automatiquement) :
```bash
cloudflared tunnel route dns tesla-carview tesla.yourdomain.com
```

### Étape 5 : Installer en tant que service (démarre automatiquement après redémarrage)

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Terminé !** Tesla Carview est désormais accessible sur `https://tesla.yourdomain.com` — avec HTTPS automatique, sans redirection de port, sans IP fixe.

---

## Option B : DynDNS + routeur domestique

> **Important :** Ne fonctionne que si vous avez votre **propre IPv4 publique** (pas de CG-NAT). Testez cela d'abord — [voir ci-dessus](#autre-problème--pas-divpv4-publique-cg-nat).

**Qu'est-ce que c'est ?** Votre routeur signale automatiquement sa nouvelle adresse IP à un service DynDNS. Vous pouvez toujours atteindre Tesla Carview sous le même nom de domaine.

### Étape 1 : Choisir un service DynDNS et s'inscrire

**Recommandé : Dynu** (complètement gratuit, pas de confirmation mensuelle requise)

1. Allez sur [https://www.dynu.com](https://www.dynu.com) → créer un compte
2. DDNS → Add → saisir un nom, par ex. `my-tesla` → vous obtenez `my-tesla.freeddns.org`
3. Notez : **hostname**, **username**, **password** (sous Control Panel → API Credentials)

**Alternative : DuckDNS** (encore plus simple, mais nécessite une configuration manuelle du routeur)

1. [https://www.duckdns.org](https://www.duckdns.org) → connexion → choisir un sous-domaine
2. URL de mise à jour : `https://www.duckdns.org/update?domains=YOURNAME&token=YOURTOKEN&ip=`

### Étape 2 : Configurer votre routeur

Pour **FritzBox :**
1. Ouvrir l'interface FritzBox : [http://fritz.box](http://fritz.box)
2. **Internet → Partage → DynDNS**
3. Cocher **« Utiliser DynDNS »**
4. Remplir :

   | Champ | Valeur Dynu |
   |---|---|
   | Fournisseur DynDNS | Personnalisé |
   | URL de mise à jour | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` |
   | Nom de domaine | `my-tesla.freeddns.org` |
   | Nom d'utilisateur | Username Dynu |
   | Mot de passe | Password Dynu |

5. **Appliquer** → la FritzBox teste la connexion → coche verte = fonctionne

Pour **autres routeurs :** Cherchez « Dynamic DNS » ou « DDNS » dans les paramètres du routeur — la plupart des routeurs modernes le supportent avec des champs similaires.

### Étape 3 : Redirection de port

Pour que le trafic depuis l'extérieur atteigne votre serveur :

1. **Internet → Partage → Partage de port** (FritzBox)
2. **Nouveau partage de port** → **Autre application**
3. Remplir :

   | Champ | Valeur |
   |---|---|
   | Nom | Tesla Carview HTTPS |
   | Protocole | TCP |
   | Port externe | 443 |
   | Vers appareil | IP de votre serveur sur le réseau local (par ex. `192.168.1.100`) |
   | Port interne | 443 |

4. **Appliquer** et activer

> **Astuce :** Donnez à votre serveur une **IP locale fixe (statique)** pour que la redirection de port ne « dérive » pas. Sur FritzBox : Réseau domestique → Réseau → votre appareil → Toujours attribuer cette IP.

### Étape 4 : Configurer Tesla Carview

Ouvrez `/opt/tesla-carview/backend/.env` et définissez :

```bash
FRONTEND_URL=https://my-tesla.freeddns.org
```

Obtenez un certificat SSL via Let's Encrypt :
```bash
certbot --nginx -d my-tesla.freeddns.org
```

**Terminé !** Accessible sur `https://my-tesla.freeddns.org`.

---

## Option C : VPS chez un hébergeur (netcup, Hetzner, Contabo)

Un VPS (Virtual Private Server) est un petit serveur Linux loué dans un centre de données. Il a toujours une **adresse IPv4 publique fixe** — pas besoin de bricolage DynDNS.

**Comparaison de prix (2026) :**

| Fournisseur | Produit | Prix/mois | Specs | Notes |
|---|---|---|---|---|
| [netcup](https://www.netcup.com/en/server/vps-lite) | **VPS nano G11s** ⭐ | **~3,08 €** | 2 vCore · 2 Go RAM · 60 Go SSD | Entrée de gamme la moins chère, DC allemand, trafic illimité — **recommandé pour TeslaView** |
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~4,44 € | 2 vCore · 2 Go RAM · 40 Go SSD | Un peu plus de marge de performance |
| [Hetzner](https://www.hetzner.com) | CX22 | ~4,35 € | 2 vCPU · 4 Go RAM · 40 Go | Très fiable, Nuremberg/Falkenstein |
| [Contabo](https://contabo.com) | VPS S | ~5,99 € | 4 vCPU · 8 Go RAM · 100 Go | Beaucoup de stockage pour multi-tenant |
| [IONOS](https://www.ionos.com) | VPS S | ~1,00 € | 1 vCore · 1 Go RAM · 10 Go | Premier mois bon marché, plus élevé ensuite |

> 💡 **Code de réduction pour netcup :** Nous pouvons vous envoyer un code de réduction personnel pour netcup sur demande. Envoyez simplement un court e-mail à [rabatt-code-netcup@krische.com](mailto:rabatt-code-netcup@krische.com) avec le sujet « netcup TeslaView ».

> **Pourquoi le VPS nano G11s pour TeslaView ?** Tesla Carview utilise ~150–200 Mo RAM au repos (backend + nginx + proxy). 2 Go RAM donne beaucoup de marge. Le SSD 60 Go a de la place pour de nombreuses années de données de télémétrie (SQLite grandit ~500 Mo/an pour un véhicule actif). 2 vCores garantissent que les requêtes d'export et de migration ne bloquent pas le poller.

### Installation chez netcup (exemple)

1. S'inscrire sur [netcup.eu](https://www.netcup.eu)
2. **Server Control Panel (SCP)** → commander VPS → choisir Ubuntu 24.04
3. Copier le mot de passe root depuis l'e-mail de confirmation
4. Ouvrir un terminal et se connecter :
   ```bash
   ssh root@YOUR-SERVER-IP
   ```
5. Installer Tesla Carview :
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

Le script d'installation demande un nom de domaine. Saisissez votre domaine (par ex. `tesla.yourdomain.com`) — Let's Encrypt et nginx sont configurés automatiquement.

### Pointer un domaine vers le VPS

Si vous avez votre propre domaine, créez un **enregistrement A** :

```
tesla.yourdomain.com  →  A  →  YOUR-VPS-IP  →  TTL 300
```

Comment faire : [→ Option D ci-dessous](#option-d--domaine-personnel-avec-enregistrement-dns)

---

## Option D : Domaine personnel avec enregistrement DNS

Si vous avez votre propre domaine (par ex. `yourdomain.com`) et un serveur avec une **IP fixe** (VPS ou IP domestique statique), un enregistrement DNS suffit.

### Qu'est-ce qu'un enregistrement A ?

Un **enregistrement A** fonctionne comme une entrée d'annuaire téléphonique :
- À gauche se trouve le nom : `tesla.yourdomain.com`
- À droite se trouve l'adresse : `123.456.789.0` (l'IP de votre serveur)
- Chaque navigateur qui visite `tesla.yourdomain.com` se voit dire : « L'IP est `123.456.789.0` »

### Comment créer un enregistrement A

**Chez Namecheap :**
1. Domain List → Manage → Advanced DNS → Add New Record
2. Type : **A Record**, Host : `tesla`, Value : votre IP serveur
3. Save All Changes

**Chez IONOS :**
1. Domains → votre domaine → DNS → Add record
2. Type : **A**, Hostname : `tesla`, Destination : votre IP serveur
3. Save

**Chez inwx.de :**
1. Gestion de domaine → DNS → Add record
2. Type : **A**, Name : `tesla`, Content : votre IP serveur, TTL : 300
3. Save

**Chez Hetzner DNS Console ([dns.hetzner.com](https://dns.hetzner.com)) :**
1. Sélectionner la zone → Records → Add Record
2. Type : **A**, Name : `tesla`, Value : votre IP serveur
3. Add record

> **TTL** (Time to Live) détermine combien de temps les entrées DNS sont cachées. Mettez 300 (5 minutes) pendant l'installation initiale pour que les erreurs puissent être corrigées rapidement. Vous pourrez l'augmenter à 3600 plus tard.

### Vérifier : l'enregistrement DNS s'est-il propagé ?

```bash
# Tester depuis votre ordinateur personnel :
nslookup tesla.yourdomain.com
# ou
dig tesla.yourdomain.com
```

Ou en ligne : [https://dnschecker.org](https://dnschecker.org) — montre si l'enregistrement est visible dans le monde entier.

### IP dynamique avec son propre domaine

Si vous avez votre propre domaine mais pas d'IP fixe, combinez les deux approches :

**Variante 1 : CNAME pointant vers DuckDNS** (le routeur tient DuckDNS à jour automatiquement)
```
tesla.yourdomain.com  →  CNAME  →  my-tesla.duckdns.org
```

**Variante 2 : script de mise à jour + cron**
```bash
# Cron qui met à jour l'IP toutes les 5 minutes :
*/5 * * * * curl -s "https://www.duckdns.org/update?domains=my-tesla&token=YOURTOKEN&ip=$(curl -s https://api4.my-ip.io/ip)"
```

---

## Problèmes courants et solutions

### « Site inaccessible » après installation

1. **Patientez 5–30 minutes** — les entrées DNS prennent du temps à se propager
2. **Testez localement d'abord :** Tesla Carview est-il joignable sur le serveur ?
   ```bash
   curl -I http://localhost
   ```
3. **Redirection de port du routeur :** Cliquez sur **Test** à côté de la règle de partage de port

### « Certificat invalide » / erreurs HTTPS

```bash
# Réémettre le certificat Let's Encrypt :
certbot renew --force-renewal
systemctl restart nginx
```

### URL de mise à jour du routeur ne fonctionnant pas

- Votre routeur remplace `<ipaddr>` par l'IP actuelle — ne le remplissez pas manuellement
- Testez l'URL manuellement dans votre navigateur (remplacez `<ipaddr>` temporairement par votre IP réelle)
- Vérifiez : le statut de votre routeur affiche-t-il une IP publique ? Une adresse commençant par `10.x.x.x` ou `100.x.x.x` signifie CG-NAT

### « Mon IP commence par 100. » ou « 10. »

C'est du **CG-NAT** — voir [Option A (Cloudflare Tunnel)](#option-a--cloudflare-tunnel-recommandé-pour-usage-domestique), c'est la seule solution sans serveur supplémentaire.

### IPv6 au lieu d'IPv4

Les connexions internet plus récentes (surtout la fibre) fonctionnent avec **IPv6**. Cela marche de la même façon — votre routeur a une adresse IPv6 fixe et n'a pas besoin de DynDNS. Dans l'enregistrement DNS, utilisez le type **AAAA** (IPv6) au lieu de **A** (IPv4).

---

## Arbre de décision

```
Êtes-vous derrière CG-NAT ?  (IP commençant par 100. ou votre routeur montre une IP différente de ipify.org)
  → OUI : Option A (Cloudflare Tunnel)
  → NON :
      Avez-vous un serveur dans un centre de données ?
        → OUI : Option C + D (VPS + enregistrement DNS)
        → NON (réseau domestique) : Option B (DynDNS + routeur)
```

---

## Liens utiles

- [Documentation Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/)
- [Dynu DDNS](https://www.dynu.com/)
- [Tutoriel netcup : nginx Reverse Proxy](https://community.netcup.com/en/tutorials/how-to-setup-nginx-reverse-proxy)
- [Hetzner DNS Console](https://dns.hetzner.com)
- [dnschecker.org — vérifier la propagation DNS](https://dnschecker.org)
- [ipify.org — vérifier votre IP publique](https://api4.my-ip.io/ip)

---

*→ Retour à [02-deployment.en.md](02-deployment.en.md) | [Toute la doc](README.en.md)*

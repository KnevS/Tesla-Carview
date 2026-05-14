# Stockage Raspberry Pi — Plus jamais de carte SD défaillante

Les cartes SD et le fonctionnement en serveur 24h/24 font mauvais ménage. Cette page explique pourquoi, et vous guide vers la meilleure alternative pour votre configuration — étape par étape.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Raspberry-Pi-Storage)** | English version |
| 🇩🇪 **[Deutsch](DE-Raspberry-Pi-Storage)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Raspberry-Pi-Storage)** | Vous êtes ici |
| 🇪🇸 **[Español](ES-Raspberry-Pi-Storage)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Raspberry-Pi-Storage)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Raspberry-Pi-Storage)** | Ελληνική έκδοση |

---

## Pourquoi les cartes SD tombent en panne

Les cartes SD modernes supportent **3 000 à 10 000 cycles d'écriture par bloc**. Cela semble beaucoup. Ce ne l'est pas.

| Qui écrit sur la carte SD ? | À quelle fréquence ? |
|---|---|
| Journaux des conteneurs Docker | Plusieurs fois par minute |
| Base de données SQLite (trajets, sessions de recharge) | Toutes les 30 à 60 secondes |
| Journaux système (`/var/log`) | En continu |
| Swap OS | Sous pression mémoire |

**Résultat concret :** Sous la charge d'écriture de Tesla Carview, une carte SD typique dure **3 à 18 mois**, puis :
- Corruption du système de fichiers → le système ne démarre plus
- Perte de données (les sauvegardes aident, mais le mal est fait)
- Dans le pire cas : corruption silencieuse et indétectée des données

> **En résumé :** La carte SD est acceptable pour un test rapide. Pour un fonctionnement permanent, passez toujours à un SSD.

---

## Arbre de décision — quelle option vous convient ?

```
Quel Raspberry Pi avez-vous ?
│
├── Raspberry Pi 5
│     ├── Vous voulez les meilleures performances et la plus longue durée de vie ?
│     │     → Option B : SSD NVMe via M.2 HAT+ ⭐ recommandé
│     └── Simple, économique, sans assemblage ?
│           → Option A : SSD USB (excellent aussi sur Pi 5)
│
├── Raspberry Pi 4
│     ├── Homelab avec LAN Gigabit + serveur existant ?
│     │     → Option C : Démarrage réseau PXE (aucun stockage local)
│     └── Réseau domestique ordinaire ?
│           → Option A : SSD USB (solution la plus simple)
│
└── Raspberry Pi 3 ou plus ancien
      → Option A : SSD USB (USB 2.0, plus lent que Pi 4/5)
        ou : Passer au Pi 4/5 — meilleur investissement à long terme
```

---

## Option A : SSD USB (la plus simple pour tous les modèles de Pi)

**Ce dont vous avez besoin :** Un SSD portable ou un SSD SATA 2,5" + adaptateur USB.

### Matériel recommandé (2025)

| Produit | Prix approximatif | Remarques |
|---|---|---|
| Samsung T7 (500 Go) | ~55 € | Excellent, mais Pi 4 nécessite un correctif (→ ci-dessous) |
| Crucial X6 (500 Go) | ~45 € | Fiable, sans problème de compatibilité |
| WD My Passport SSD (500 Go) | ~50 € | Bien testé sur Raspberry Pi OS |
| SSD SATA 2,5" + adaptateur USB 3.0 UGREEN | ~35–50 € | Très fiable pour Pi 4 |

> **Évitez les adaptateurs USB-SATA bas de gamme sans marque** — ils présentent souvent des problèmes de compatibilité UASP sur Pi 4. Les adaptateurs de marque (UGREEN, Inateck) sont plus fiables.

### Étape 1 : Écrire le système d'exploitation sur le SSD

1. Téléchargez [Raspberry Pi Imager](https://www.raspberrypi.com/software/) et installez-le sur votre ordinateur habituel
2. Connectez le SSD via USB à votre ordinateur habituel
3. Ouvrez Imager :
   - **Device :** choisissez Raspberry Pi 4 ou 5
   - **OS :** Raspberry Pi OS Lite (64 bits) — sans interface graphique, plus de ressources pour Docker
   - **Storage :** votre SSD
4. Cliquez sur l'icône ⚙️ → pré-configurez :
   - Nom d'hôte : ex. `tesla-pi`
   - Activer SSH : oui
   - Identifiants Wi-Fi (si vous n'utilisez pas Ethernet)
   - Nom d'utilisateur + mot de passe
5. Cliquez sur **Write** — terminé en ~5 minutes

### Étape 2 : Activer le démarrage USB sur Pi 4 (une seule fois, à ignorer pour Pi 5)

Le Pi 5 démarre depuis USB sans configuration. Le Pi 4 nécessite une mise à jour unique du bootloader :

```bash
# Démarrez brièvement depuis une carte SD, puis exécutez :
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot
```

Ensuite : retirez la carte SD, branchez le SSD, mettez sous tension → le Pi démarre depuis le SSD.

### Étape 3 : Correctif pour le Samsung T7 sur Pi 4 (si nécessaire)

Si votre Pi 4 bloque avec le Samsung T7 (LED rouge clignotante, ne démarre pas) :

```bash
# Ouvrez ce fichier — il doit rester sur une seule ligne !
sudo nano /boot/firmware/cmdline.txt

# Ajoutez à la fin de la ligne (avec un espace avant) :
usb-storage.quirks=04e8:4001:u

# Enregistrez (Ctrl+O, Entrée, Ctrl+X), puis redémarrez :
sudo reboot
```

Cela désactive UASP uniquement pour le T7. Les performances restent 5 à 10 fois supérieures à une carte SD.

### Étape 4 : Installer Tesla Carview

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Option B : SSD NVMe sur Raspberry Pi 5 (meilleures performances)

Le Pi 5 dispose d'un **connecteur PCIe**. Avec un M.2 HAT, vous obtenez des vitesses NVMe de **400 à 900 Mo/s** — contre ~20 à 90 Mo/s pour les cartes SD.

### Matériel nécessaire

| Composant | Recommandation | Prix approximatif |
|---|---|---|
| Raspberry Pi 5 (4 Go ou 8 Go) | — | à partir de 60 € |
| **Raspberry Pi M.2 HAT+** officiel | Format 2230 ou 2242 | ~15 € |
| **ou** Pimoroni NVMe BASE | Compact, sans entretoises | ~20 € |
| **ou** Pineberry HatDrive Bottom | Se monte sous le Pi | ~25 € |
| SSD NVMe M.2 **2230 ou 2242** | WD SN350, Kingston NV2, Samsung PM991 | 25–60 € |

> **Le format est crucial :** Le M.2 HAT+ officiel ne supporte que les formats **2230** et **2242** (SSD courts). Les SSD 2280 standard (les longs courants) n'y rentrent pas. Les HAT tiers supportent souvent le 2280 — vérifiez avant d'acheter.

### Étape 1 : Assemblage

1. Insérez le SSD dans le slot M.2 en angle, puis appuyez à plat
2. Fixez avec la vis fournie
3. Connectez le câble ruban FFC (HAT ↔ connecteur PCIe du Pi 5)
4. Montez le HAT sur le connecteur GPIO du Pi 5

### Étape 2 : Écrire le système d'exploitation sur le NVMe

**Méthode simple :** Démarrez depuis une carte SD, puis écrivez sur le NVMe depuis celle-ci :
```bash
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# Sélectionnez le SSD NVMe comme cible → écrire
```

**Alternative :** Utilisez un adaptateur USB-NVMe sur un ordinateur habituel et utilisez Raspberry Pi Imager comme dans l'Option A.

### Étape 3 : Définir la priorité de démarrage

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

Retirez la carte SD → le Pi démarre depuis le NVMe.

### Étape 4 : Optionnel — activer PCIe Gen 3

Le Pi 5 utilise Gen 2 par défaut (~400 Mo/s). Gen 3 (~900 Mo/s) est non officiel mais généralement stable :

```bash
sudo nano /boot/firmware/config.txt
# Ajoutez à la fin :
dtparam=pciex1_gen=3
```

---

## Option C : Démarrage réseau PXE (pour les passionnés de homelab)

Le démarrage PXE signifie que le Pi **n'a aucun stockage local** — il démarre entièrement via le réseau depuis un serveur central. Idéal si :
- Vous gérez plusieurs Pi
- Un NAS (Synology, TrueNAS) ou un mini-PC est déjà sur votre réseau
- Vous préférez des sauvegardes et une gestion centralisées

**Prérequis :**
- Ethernet Gigabit (le Wi-Fi est trop lent/instable pour PXE)
- Un serveur existant sur le réseau capable de faire tourner DHCP + TFTP + NFS
- Raspberry Pi 4 ou 5

### Aperçu de la configuration

Sur le serveur PXE (Debian/Ubuntu) :

```bash
sudo apt install dnsmasq nfs-kernel-server -y
sudo mkdir -p /srv/tftp /srv/nfs/rpi

# Ajouter à /etc/exports :
echo "/srv/nfs/rpi *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
```

**/etc/dnsmasq.conf** (DHCP proxy — fonctionne en parallèle de votre routeur existant) :
```ini
port=0
dhcp-range=192.168.1.0,proxy
log-dhcp
enable-tftp
tftp-root=/srv/tftp
pxe-service=0,"Raspberry Pi Boot"
```

La copie complète du rootfs et la configuration NFS sont détaillées — suivez le guide officiel :
[Documentation de démarrage réseau Raspberry Pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**PXE en vaut-il la peine pour vous ?** Uniquement si vous gérez déjà un homelab avec stockage centralisé. Pour un seul Pi, le SSD USB ou NVMe est plus simple et tout aussi robuste.

---

## Migration de la carte SD vers le SSD (sans perte de données)

Vous utilisez déjà Tesla Carview sur une carte SD ? Vous pouvez migrer en environ 20 minutes sans perdre aucune donnée.

### Étape 1 : Cloner la carte SD sur le SSD

```bash
# Connectez le SSD via USB au Pi en cours de fonctionnement
# Identifiez le disque cible (généralement /dev/sda) :
lsblk

# Cloner (le Pi peut continuer à fonctionner) :
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress conv=fsync

# Redimensionner la partition pour utiliser tout le SSD :
sudo parted /dev/sda resizepart 2 100%
sudo resize2fs /dev/sda2
```

### Étape 2 : Changer la source de démarrage

Activez le démarrage USB comme décrit dans [l'Option A, Étape 2](#étape-2--activer-le-démarrage-usb-sur-pi-4-une-seule-fois-à-ignorer-pour-pi-5), puis retirez la carte SD.

### Étape 3 : Vérifier

```bash
findmnt /
# Doit afficher /dev/sda2 ou nvme0n1p2, PAS mmcblk0p2
```

---

## Comparatif

| | Carte SD | SSD USB | NVMe (Pi 5) | PXE |
|---|---|---|---|---|
| **Longévité** | ❌ Quelques mois | ✅ Des années | ✅ Des années | ✅ Pas d'usure locale |
| **Facilité de mise en place** | ✅ Minimale | ✅ Faible | 🟡 Moyenne (assemblage HAT) | ❌ Élevée |
| **Coût** | ✅ ~10 € | 🟡 ~35–60 € | 🟡 ~50–100 € | ✅ 0 € (si serveur existant) |
| **Vitesse de lecture** | 20–90 Mo/s | 200–500 Mo/s | 400–900 Mo/s | Vitesse LAN |
| **Recommandé pour** | Tests uniquement | Pi 4 usage permanent | Pi 5 usage permanent | Homelabs |

---

## Foire aux questions

### Puis-je laisser la carte SD en place après le passage au SSD ?

Pi 4 : Oui — si la carte SD n'est pas amorçable, le Pi l'ignore et démarre depuis USB.
Pi 5 : Oui — après la configuration de l'ordre de démarrage, NVMe/USB a la priorité.

### Quelle taille de SSD choisir ?

60 à 120 Go sont amplement suffisants. La base de données Tesla Carview atteint quelques centaines de Mo sur plusieurs années. Choisir un SSD légèrement plus grand est peu coûteux et offre davantage de blocs au contrôleur pour le nivellement de l'usure → durée de vie plus longue.

### Puis-je utiliser une clé USB à la place ?

Techniquement oui, mais **déconseillé**. Les clés USB n'ont pas de nivellement de l'usure — elles tombent en panne plus vite que les cartes SD. La différence de prix avec un SSD d'entrée de gamme est minime.

### Qu'en est-il des coupures de courant ?

Les SSD sont plus résistants que les cartes SD lors d'une coupure de courant soudaine, mais pas immunisés. Utilisez la sauvegarde intégrée : **Admin → Données → Sauvegarde** régulièrement, ou activez les sauvegardes nocturnes automatisées.

---

## Liens utiles

- [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
- [Documentation officielle du M.2 HAT+](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Guide de démarrage réseau Raspberry Pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [raspberry.tips : Démarrer le Pi 4 depuis un SSD USB](https://raspberry.tips/en/raspberrypi-tutorials/boot-raspberry-pi-from-usb-ssd-flash-drive-pi-4-5)
- [raspberry.tips : Configuration NVMe du Pi 5 + benchmarks](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)

---

*→ [[Installation]] | [[Network-Access]] | [[Home]]*

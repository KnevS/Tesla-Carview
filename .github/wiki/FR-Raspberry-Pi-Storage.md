🌐 **Langue :** [EN](Raspberry-Pi-Storage) · [DE](DE-Raspberry-Pi-Storage) · **FR** · [ES](ES-Raspberry-Pi-Storage) · [TR](TR-Raspberry-Pi-Storage) · [EL](EL-Raspberry-Pi-Storage)

---

# Stockage Raspberry Pi — Fini la mort des cartes SD

Les cartes SD et le fonctionnement serveur 24h/24 ne font pas bon ménage. Cette page explique pourquoi, et vous guide vers la bonne alternative pour votre configuration — étape par étape.

---

## Pourquoi les cartes SD tombent en panne

Les cartes SD modernes survivent à **3 000–10 000 cycles d'écriture par bloc**. Ça paraît beaucoup. Ce ne l'est pas.

| Qu'est-ce qui écrit sur la carte SD ? | À quelle fréquence ? |
|---|---|
| Journaux des conteneurs Docker | Plusieurs fois par minute |
| Base de données SQLite (trajets, sessions de recharge) | Toutes les 30–60 secondes |
| Journaux système (`/var/log`) | En continu |
| Swap système | Sous pression mémoire |

**Résultat réaliste :** Sous la charge d'écriture de Tesla Carview, une carte SD typique dure **3 à 18 mois**, puis :
- Corruption du système de fichiers → le système ne démarre plus
- Données perdues (les sauvegardes aident, mais le mal est fait)
- Dans le pire des cas : corruption silencieuse non détectée

> **En résumé :** La carte SD convient pour un test rapide. Pour une utilisation permanente, passez toujours à un SSD.

---

## Arbre de décision — quelle option vous convient ?

```
Quel Raspberry Pi avez-vous ?
│
├── Raspberry Pi 5
│     ├── Vous voulez les meilleures performances et la plus longue durée de vie ?
│     │     → Option B : SSD NVMe via M.2 HAT+ ⭐ recommandé
│     └── Simple, économique, sans assemblage ?
│           → Option A : SSD USB (également excellent sur Pi 5)
│
├── Raspberry Pi 4
│     ├── Homelab avec LAN Gigabit + serveur existant ?
│     │     → Option C : Démarrage réseau PXE (aucun stockage local)
│     └── Réseau domestique classique ?
│           → Option A : SSD USB (solution la plus simple)
│
└── Raspberry Pi 3 ou plus ancien
     → Plus pris en charge (ARM 32 bits). Tesla Carview nécessite
        un Pi 4 ou 5 — voir Installation.
```

---

## Option A : SSD USB (le plus simple pour tous les modèles Pi)

**Ce dont vous avez besoin :** Un SSD portable, ou un SSD SATA 2,5" + adaptateur USB.

### Matériel recommandé (2025)

| Produit | Prix approximatif | Notes |
|---|---|---|
| Samsung T7 (500 Go) | ~55 € | Excellent, mais Pi 4 nécessite un correctif (→ ci-dessous) |
| Crucial X6 (500 Go) | ~45 € | Fiable, sans quirks |
| WD My Passport SSD (500 Go) | ~50 € | Bien testé sur Raspberry Pi OS |
| SSD SATA 2,5" + adaptateur USB 3.0 UGREEN | ~35–50 € | Très fiable pour Pi 4 |

> **Évitez les adaptateurs USB-SATA sans marque** — ils ont souvent des problèmes de compatibilité UASP sur Pi 4. Les adaptateurs de marque (UGREEN, Inateck) sont plus fiables.

### Étape 1 : Écrire le système d'exploitation sur le SSD

1. Téléchargez [Raspberry Pi Imager](https://www.raspberrypi.com/software/) et installez-le sur votre ordinateur
2. Branchez le SSD en USB sur votre ordinateur
3. Ouvrez Imager :
   - **Appareil :** choisissez Raspberry Pi 4 ou 5
   - **OS :** Raspberry Pi OS Lite (64 bits) — sans bureau, plus de ressources pour Docker
   - **Stockage :** votre SSD
4. Cliquez sur l'icône ⚙️ → pré-configurez :
   - Nom d'hôte : ex. `tesla-pi`
   - Activer SSH : oui
   - Identifiants Wi-Fi (si vous n'utilisez pas Ethernet)
   - Nom d'utilisateur + mot de passe
5. Cliquez sur **Write** — terminé en ~5 minutes

### Étape 2 : Activer le démarrage USB sur Pi 4 (unique, Pi 5 ignore cette étape)

Le Pi 5 démarre depuis USB nativement. Le Pi 4 nécessite une mise à jour unique du bootloader :

```bash
# Démarrez brièvement depuis une carte SD, puis exécutez :
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot
```

Ensuite : retirez la carte SD, branchez le SSD, allumez → le Pi démarre depuis le SSD.

### Étape 3 : Correctif Samsung T7 pour Pi 4 (si nécessaire)

Si votre Pi 4 est bloqué avec le Samsung T7 (LED rouge clignotante, ne démarre pas) :

```bash
# Ouvrez ce fichier — doit rester sur une seule ligne !
sudo nano /boot/firmware/cmdline.txt

# Ajoutez à la fin de la ligne (avec un espace avant) :
usb-storage.quirks=04e8:4001:u

# Sauvegardez (Ctrl+O, Entrée, Ctrl+X), puis redémarrez :
sudo reboot
```

Cela désactive UASP uniquement pour le T7. Les performances restent 5–10× meilleures qu'une carte SD.

### Étape 4 : Installer Tesla Carview

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Option B : SSD NVMe sur Raspberry Pi 5 (meilleures performances)

Le Pi 5 possède un **connecteur PCIe**. Avec un M.2 HAT, vous obtenez des vitesses NVMe de **400–900 Mo/s** — contre ~20–90 Mo/s pour les cartes SD.

### Matériel nécessaire

| Composant | Recommandation | Prix approximatif |
|---|---|---|
| Raspberry Pi 5 (4 Go ou 8 Go) | — | à partir de 60 € |
| **Raspberry Pi M.2 HAT+** officiel | Format 2230 ou 2242 | ~15 € |
| **ou** Pimoroni NVMe BASE | Compact, sans entretoises | ~20 € |
| **ou** Pineberry HatDrive Bottom | Se monte sous le Pi | ~25 € |
| SSD NVMe M.2 **2230 ou 2242** | WD SN350, Kingston NV2, Samsung PM991 | 25–60 € |

> **Le format est crucial :** Le M.2 HAT+ officiel ne prend en charge que les formats **2230** et **2242** (SSD courts). Les SSD 2280 standard (les longs courants) ne rentrent pas. Les HAT tiers supportent souvent le 2280 — vérifiez avant d'acheter.

### Étape 1 : Assemblage

1. Insérez le SSD dans le slot M.2 en angle, puis aplatissez
2. Fixez avec la vis fournie
3. Connectez le câble FFC (HAT ↔ connecteur PCIe du Pi 5)
4. Montez le HAT sur le header GPIO du Pi 5

### Étape 2 : Écrire l'OS sur le NVMe

**Méthode simple :** Démarrez depuis la carte SD, puis écrivez sur le NVMe depuis là :
```bash
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# Sélectionnez le SSD NVMe comme cible → écrire
```

**Alternative :** Utilisez un adaptateur USB-NVMe sur un ordinateur et utilisez Raspberry Pi Imager comme dans l'Option A.

### Étape 3 : Définir l'ordre de démarrage

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

Retirez la carte SD → le Pi démarre depuis le NVMe.

### Étape 4 : Optionnel — activer PCIe Gen 3

Le Pi 5 utilise Gen 2 par défaut (~400 Mo/s). Gen 3 (~900 Mo/s) n'est pas officiel mais généralement stable :

```bash
sudo nano /boot/firmware/config.txt
# Ajoutez à la fin :
dtparam=pciex1_gen=3
```

---

## Option C : Démarrage réseau PXE (pour les amateurs de homelab)

Le démarrage PXE signifie que le Pi n'a **aucun stockage local** — il démarre entièrement via le réseau depuis un serveur central. Idéal quand :
- Vous gérez plusieurs Pi
- Un NAS (Synology, TrueNAS) ou mini PC est déjà sur votre réseau
- Vous préférez les sauvegardes et la gestion centralisées

**Prérequis :**
- Ethernet Gigabit (le Wi-Fi est trop lent/peu fiable pour PXE)
- Un serveur existant sur le réseau pouvant exécuter DHCP + TFTP + NFS
- Raspberry Pi 4 ou 5

### Aperçu rapide de la configuration

Sur le serveur PXE (Debian/Ubuntu) :

```bash
sudo apt install dnsmasq nfs-kernel-server -y
sudo mkdir -p /srv/tftp /srv/nfs/rpi

# Ajouter à /etc/exports :
echo "/srv/nfs/rpi *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
```

**/etc/dnsmasq.conf** (proxy DHCP — fonctionne avec votre routeur existant) :
```ini
port=0
dhcp-range=192.168.1.0,proxy
log-dhcp
enable-tftp
tftp-root=/srv/tftp
pxe-service=0,"Raspberry Pi Boot"
```

La copie complète du rootfs et la configuration NFS sont étendues — suivez le guide officiel :
[Documentation de démarrage réseau Raspberry Pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**Le PXE en vaut-il la peine pour vous ?** Uniquement si vous gérez déjà un homelab avec un stockage central. Pour un seul Pi, SSD USB ou NVMe est plus simple et tout aussi robuste.

---

## Migrer d'une carte SD vers un SSD (sans perte de données)

Vous avez déjà Tesla Carview sur une carte SD ? Vous pouvez migrer en environ 20 minutes sans perdre de données.

### Étape 1 : Cloner la carte SD sur le SSD

```bash
# Branchez le SSD en USB sur le Pi en fonctionnement
# Identifiez le disque cible (généralement /dev/sda) :
lsblk

# Cloner (le Pi peut continuer à fonctionner) :
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress conv=fsync

# Redimensionner la partition pour utiliser tout le SSD :
sudo parted /dev/sda resizepart 2 100%
sudo resize2fs /dev/sda2
```

### Étape 2 : Changer la source de démarrage

Activez le démarrage USB comme décrit dans [Option A, Étape 2](#%C3%A9tape-2--activer-le-d%C3%A9marrage-usb-sur-pi-4-unique-pi-5-ignore-cette-%C3%A9tape), puis retirez la carte SD.

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
| **Effort d'installation** | ✅ Minimal | ✅ Faible | 🟡 Moyen (assemblage HAT) | ❌ Élevé |
| **Coût** | ✅ ~10 € | 🟡 ~35–60 € | 🟡 ~50–100 € | ✅ 0 € (si serveur existant) |
| **Vitesse de lecture** | 20–90 Mo/s | 200–500 Mo/s | 400–900 Mo/s | Vitesse LAN |
| **Recommandé pour** | Tests uniquement | Pi 4 usage permanent | Pi 5 usage permanent | Homelabs |

---

## FAQ

### Puis-je laisser la carte SD en place après être passé au SSD ?

Pi 4 : Oui — si la carte SD n'est pas amorçable, le Pi l'ignore et démarre depuis USB.
Pi 5 : Oui — après configuration de l'ordre de démarrage, NVMe/USB est prioritaire.

### Quelle taille doit avoir le SSD ?

60–120 Go est largement suffisant. La base de données Tesla Carview grossit de quelques centaines de Mo sur des années. Prendre légèrement plus grand est bon marché et donne au contrôleur SSD plus de blocs pour le nivellement de l'usure → durée de vie plus longue.

### Puis-je utiliser une clé USB à la place ?

Techniquement oui, mais **déconseillé**. Les clés USB n'ont pas de nivellement de l'usure — elles tombent en panne plus vite que les cartes SD. La différence de prix avec un SSD bon marché est minime.

### Qu'en est-il des coupures de courant ?

Les SSD sont plus résistants que les cartes SD lors d'une coupure de courant soudaine, mais pas à l'abri. Utilisez la sauvegarde intégrée : **Admin → Data → Backup** régulièrement, ou activez les sauvegardes automatiques nocturnes.

---

## Liens utiles

- [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
- [Documentation officielle M.2 HAT+](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Guide de démarrage réseau PXE Raspberry Pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [raspberry.tips : Démarrer Pi 4 depuis SSD USB](https://raspberry.tips/en/raspberrypi-tutorials/boot-raspberry-pi-from-usb-ssd-flash-drive-pi-4-5)
- [raspberry.tips : NVMe Pi 5 + benchmarks](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)

---

*→ [[FR-Installation]] | [[FR-Network-Access]] | [[FR-Home]]*

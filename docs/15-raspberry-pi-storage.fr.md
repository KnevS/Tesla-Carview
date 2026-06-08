# Raspberry Pi : choisir le bon stockage — plus de mort de carte SD

> 🤖 *Cette traduction française est assistée par IA depuis [15-raspberry-pi-storage.en.md](15-raspberry-pi-storage.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](15-raspberry-pi-storage.md)

Les cartes SD et le fonctionnement 24/7 forment un mauvais mélange. Ce chapitre explique **pourquoi**, quelle alternative convient le mieux à votre setup, et comment la mettre en route en 20 minutes.

---

## Le problème : pourquoi les cartes SD ne conviennent pas aux serveurs

Les cartes SD modernes survivent typiquement à **3 000–10 000 cycles d'écriture par bloc de stockage** — les cartes plus anciennes encore moins. Cela paraît beaucoup. Ça ne l'est pas.

| Qu'est-ce qui écrit sur la carte SD ? | Fréquence |
|---|---|
| Logs des conteneurs Docker | Plusieurs fois par minute |
| Base SQLite (trajets, sessions de charge) | À chaque cycle de poll (toutes les 30–60 s) |
| Logs système (`/var/log`) | En continu |
| Fichier swap de l'OS | Sous pression mémoire |

**Résultat réaliste :** Une carte SD typique sous la charge d'écriture de Tesla Carview dure **3–18 mois**, après quoi :
- Corruption du système de fichiers → le système ne démarre plus
- Données perdues (les sauvegardes aident, mais le mal est fait)
- Pire cas : corruption de données silencieuse, non détectée

> **Bilan : la carte SD convient pour des expériences rapides. Pour un fonctionnement permanent, remplacez-la toujours.**

---

## Quelle option me convient ?

```
Quel Raspberry Pi avez-vous ?
│
├── Raspberry Pi 5
│     ├── Vous voulez performance maximale et longévité ?
│     │     → Option B : SSD NVMe via M.2 HAT+ ⭐ (recommandé)
│     └── Simple & bon marché, pas d'assemblage ?
│           → Option A : SSD USB (excellent aussi sur Pi 5)
│
├── Raspberry Pi 4
│     ├── Homelab avec réseau Gigabit + serveur existant ?
│     │     → Option C : Boot réseau PXE (pas de stockage local nécessaire)
│     └── Réseau domestique normal, pas de serveur supplémentaire ?
│           → Option A : SSD USB (solution la plus simple)
│
└── Raspberry Pi 3 ou plus ancien
      → Option A : SSD USB (USB 2.0, plus lent que Pi 4/5)
        ou : acheter un Pi plus récent — Pi 4/5 est un meilleur investissement
```

---

## Option A : SSD USB (solution la plus simple pour tous les modèles de Pi)

**Ce qu'il vous faut :**
- Un SSD portable **ou** un SSD 2,5″ + adaptateur USB
- C'est tout

**Matériel recommandé (2025) :**

| Produit | Prix approximatif | Notes |
|---|---|---|
| Samsung T7 (500 Go) | ~55 € | Excellent, mais le Pi 4 nécessite un workaround quirk (→ ci-dessous) |
| Crucial X6 (500 Go) | ~45 € | Fiable, sans quirks |
| WD My Passport SSD (500 Go) | ~50 € | Bien testé sous Raspberry Pi OS |
| SSD SATA 2,5″ + adaptateur UGREEN USB 3.0 | ~35–50 € | Très fiable, recommandé pour Pi 4 |

> **Évitez les adaptateurs bon marché :** Certains adaptateurs USB-SATA sans marque ont des problèmes UASP (USB Attached SCSI Protocol) sur le Pi 4. Les adaptateurs de marque (UGREEN, Inateck) sont plus fiables.

### Étape 1 : Écrire l'OS sur le SSD

1. Téléchargez **Raspberry Pi Imager** : [https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/)
2. Connectez le SSD via USB à votre ordinateur habituel
3. Ouvrez Imager :
   - **Device :** choisissez Raspberry Pi 4 ou 5
   - **OS :** Raspberry Pi OS Lite (64 bits) — sans bureau, économise les ressources
   - **Storage :** votre SSD
4. Cliquez sur l'icône engrenage (⚙️) → préconfigurez :
   - Définir le hostname (par ex. `tesla-pi`)
   - Activer SSH
   - Saisir les identifiants Wi-Fi (si pas Ethernet)
   - Définir nom d'utilisateur + mot de passe
5. **Write** — fait en environ 5 minutes

### Étape 2 : Mettre à jour le bootloader sur Pi 4 (Pi 4 uniquement, une seule fois)

Le Pi 4 doit être configuré une fois pour démarrer depuis USB. **Le Pi 5 le fait d'usine — sautez cette étape.**

```bash
# Soit : démarrer brièvement depuis une carte SD ordinaire, puis :
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot

# Ou directement via EEPROM :
sudo rpi-eeprom-update -a
sudo reboot
```

Ensuite : retirez la carte SD, branchez le SSD, allumez le Pi → boot depuis SSD.

### Étape 3 : Quirk Samsung T7 sur Pi 4 (si nécessaire)

Si le Pi 4 ne démarre pas avec le Samsung T7 (bloqué sur l'écran éclair rouge) :

```bash
# Ouvrez /boot/firmware/cmdline.txt (doit rester sur une seule ligne !) :
sudo nano /boot/firmware/cmdline.txt

# Ajoutez à la fin de la ligne (avec un espace devant) :
usb-storage.quirks=04e8:4001:u

# Sauvegarder, redémarrer :
sudo reboot
```

Cela désactive UASP pour le T7 — la performance reste 5–10× meilleure qu'une carte SD.

### Étape 4 : Installer Tesla Carview

À partir d'ici, procédez comme décrit dans [02-deployment.en.md](02-deployment.en.md) :

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Option B : SSD NVMe sur Raspberry Pi 5 (meilleures performances)

Le Pi 5 a un **connecteur PCIe** — avec le M.2 HAT+ officiel ou un adaptateur tiers, vous obtenez des vitesses NVMe de **400–900 Mo/s** (comparez : carte SD 20–90 Mo/s).

**Ce qu'il vous faut :**

| Composant | Recommandation | Prix approximatif |
|---|---|---|
| Raspberry Pi 5 (4 Go ou 8 Go RAM) | — | à partir de 60 € |
| **Raspberry Pi M.2 HAT+** officiel | Format 2230 ou 2242 | ~15 € |
| **ou** Pimoroni NVMe BASE | Compact, pas besoin d'entretoises | ~20 € |
| **ou** Pineberry HatDrive Bottom | Se monte sous le Pi | ~25 € |
| SSD NVMe M.2 2230 ou 2242 | WD Green SN350, Kingston NV2, Samsung PM991 | 25–60 € |

> **Vérifiez le format :** Le M.2 HAT+ ne supporte que les formats **2230** et **2242** (SSD courts/moyens). Les SSD 2280 standard (les longs) ne rentrent pas dans le HAT+ officiel — mais certains HAT tiers les supportent.

### Étape 1 : Assembler le matériel

1. Glissez le SSD dans le slot M.2 en biais, puis pressez à plat
2. Fixez avec la vis fournie
3. Connectez le câble plat FFC (HAT → connecteur PCIe du Pi 5)
4. Montez le HAT sur le header GPIO du Pi 5

### Étape 2 : Écrire l'OS sur le SSD NVMe

**Variante A (facile) :** Écrire depuis un Pi OS en cours d'exécution directement sur le NVMe :

```bash
# Démarrez le Pi avec carte SD, puis :
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# → Sélectionnez le SSD NVMe comme cible → écrire
```

**Variante B :** Écrire sur le SSD avec un adaptateur USB-NVMe sur un ordinateur ordinaire (comme Option A).

### Étape 3 : Définir l'ordre de boot

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

Retirez la carte SD, redémarrez le Pi → boot depuis NVMe.

### Étape 4 : Optimiser la vitesse PCIe (optionnel)

Le Pi 5 fait tourner PCIe en Gen 2 par défaut (~400 Mo/s). Gen 3 (~900 Mo/s) est possible mais pas officiellement supporté :

```bash
# /boot/firmware/config.txt :
sudo nano /boot/firmware/config.txt

# Pour Gen 3 (à vos risques, généralement stable) :
dtparam=pciex1_gen=3
```

---

## Option C : Boot réseau PXE (pour les passionnés de homelab)

**Qu'est-ce que c'est ?** Le Pi n'a aucun stockage local. Il boote **entièrement par le réseau** depuis un serveur central. Idéal quand :
- Vous gérez plusieurs Pi
- Un NAS (Synology, TrueNAS) ou mini PC est déjà disponible comme serveur
- Vous préférez sauvegardes et mises à jour centralisées

**Prérequis :**
- Ethernet Gigabit (pas de Wi-Fi — trop lent et peu fiable pour PXE)
- Un serveur sur le réseau qui peut fournir DHCP + TFTP (NAS, vieux PC, Pi 4)
- Raspberry Pi 4 ou 5 (Pi 3 fonctionne avec un effort supplémentaire)

### Installation rapide : serveur PXE avec dnsmasq

Sur le serveur (Debian/Ubuntu ou le NAS) :

```bash
# Installer dnsmasq
sudo apt install dnsmasq -y

# Créer le répertoire TFTP
sudo mkdir -p /srv/tftp/rpi

# Mettre en place le système de fichiers racine NFS pour le Pi :
sudo apt install nfs-kernel-server -y
sudo mkdir -p /srv/nfs/rpi

# /etc/exports :
echo "/srv/nfs/rpi *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
```

**/etc/dnsmasq.conf** (mode proxy DHCP — fonctionne aux côtés de votre routeur existant) :

```ini
port=0
dhcp-range=192.168.1.0,proxy
log-dhcp
enable-tftp
tftp-root=/srv/tftp
pxe-service=0,"Raspberry Pi Boot"
```

La configuration complète (copie du rootfs, configuration NFS, configuration côté Pi) est étendue —
suivez la documentation officielle PXE de Raspberry Pi :
[https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**Quand PXE vaut-il vraiment le coup ?** Quand vous avez déjà un homelab avec stockage centralisé. Pour un seul Pi, SSD USB ou NVMe est plus simple et tout aussi bon.

---

## Migrer de carte SD vers SSD (installation existante)

Tesla Carview tourne déjà sur une carte SD et vous voulez passer au SSD ? Pas de problème — sans perte de données :

### Étape 1 : Cloner la carte SD vers le SSD

```bash
# Connectez le SSD via USB au Pi en cours d'exécution
# Identifiez le disque cible :
lsblk
# → Le SSD apparaît habituellement comme /dev/sda

# Cloner la carte SD vers le SSD (le Pi peut rester en marche) :
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress conv=fsync

# Redimensionner la partition sur le SSD pour utiliser tout l'espace disponible :
sudo parted /dev/sda resizepart 2 100%
sudo resize2fs /dev/sda2
```

### Étape 2 : Boot depuis SSD

Mettre à jour le bootloader comme décrit ci-dessus (Option A, Étape 2), puis retirer la carte SD — le SSD reste connecté.

### Étape 3 : Vérifier

```bash
# Vérifier qu'on a bien booté depuis le SSD :
findmnt /
# → devrait afficher /dev/sda2 ou nvme0n1p2, PAS mmcblk0p2
```

---

## Comparaison rapide de toutes les options

| | Carte SD | SSD USB | NVMe (Pi 5) | PXE |
|---|---|---|---|---|
| **Longévité** | ❌ Mois | ✅ Années | ✅ Années | ✅ Pas d'usure locale |
| **Effort d'installation** | ✅ Minimal | ✅ Faible | 🟡 Moyen (assembler HAT) | ❌ Élevé |
| **Coût** | ✅ ~10 € | 🟡 ~35–60 € | 🟡 ~50–100 € | ✅ 0 € (si serveur existant) |
| **Vitesse de lecture** | 20–90 Mo/s | 200–500 Mo/s | 400–900 Mo/s | Vitesse LAN |
| **Recommandé pour** | Tests | Pi 4 usage permanent | Pi 5 usage permanent | Homelab |

---

## Questions fréquentes

### « Dois-je retirer la carte SD ou puis-je la laisser ? »

Sur Pi 4 : après la mise à jour du bootloader, la carte SD peut être retirée. Le Pi bootera alors toujours depuis USB. Si vous la laissez et qu'elle est vide ou non bootable, il boote quand même depuis USB.

Sur Pi 5 : la carte SD peut rester insérée — après configuration, le Pi préfère de toute façon NVMe/USB.

### « Quelle doit être la taille du SSD ? »

**60–120 Go** suffisent largement pour Tesla Carview. La base SQLite grandit à quelques centaines de Mo sur des années. Acheter plus grand coûte à peine plus et donne au contrôleur SSD plus de marge pour le wear levelling → durée de vie plus longue.

### « Que se passe-t-il en cas de coupure de courant — est-ce que je perds des données ? »

Les SSD et SSD NVMe sont plus résistants aux pannes de courant que les cartes SD, mais pas immunisés. Pour les données importantes : **sauvegardes régulières** via l'interface admin de Tesla Carview (`Admin → Données → Sauvegarde`) ou activez les sauvegardes nocturnes automatiques.

### « Puis-je utiliser une clé USB au lieu d'un SSD ? »

Techniquement oui, mais **pas recommandé**. Les clés USB n'ont typiquement pas d'algorithmes de wear levelling — elles meurent encore plus vite que les cartes SD. La différence de prix avec un SSD bon marché est minime.

---

## Liens utiles

- [Téléchargement Raspberry Pi Imager](https://www.raspberrypi.com/software/)
- [raspberry.tips : Boot Pi 4 depuis SSD USB (EN)](https://raspberry.tips/en/raspberrypi-tutorials/boot-raspberry-pi-from-usb-ssd-flash-drive-pi-4-5)
- [raspberry.tips : Setup NVMe Pi 5 + benchmarks (EN)](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)
- [Documentation officielle Pi M.2 HAT+](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Documentation officielle PXE boot Raspberry Pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [Calculateur de durée de vie carte SD](https://raspberry.tips/en/calculate-raspberry-pi-sd-card-lifespan-test-now)

---

*→ Retour à [02-deployment.en.md](02-deployment.en.md) | [Accès réseau](14-network-access.en.md) | [Toute la doc](README.en.md)*

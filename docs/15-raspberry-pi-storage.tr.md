# Raspberry Pi: Doğru depolama seçimi — SD kart ölümüne son

> 🤖 *Bu Türkçe çeviri [15-raspberry-pi-storage.en.md](15-raspberry-pi-storage.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](15-raspberry-pi-storage.md)

SD kartlar ve 7/24 işletim kötü bir kombinasyondur. Bu bölüm **nedenini**, hangi alternatifin kurulumunuza en uygun olduğunu ve 20 dakikada nasıl çalıştıracağınızı açıklar.

---

## Sorun: SD kartlar neden sunucular için uygun değildir

Modern SD kartlar tipik olarak **depolama bloğu başına 3.000–10.000 yazma döngüsünü** kaldırır — eski kartlar daha azını. Bu çok gibi geliyor. Değil.

| SD karta ne yazıyor? | Sıklık |
|---|---|
| Docker container logları | Dakikada birden fazla kez |
| SQLite veritabanı (seferler, şarj seansları) | Her poll döngüsü (her 30–60 sn) |
| Sistem logları (`/var/log`) | Sürekli |
| OS swap dosyası | Bellek baskısı altında |

**Gerçekçi sonuç:** Tesla Carview'in yazma yükü altındaki tipik bir SD kart **3–18 ay** dayanır, ardından:
- Dosya sistemi bozulması → sistem önyükleme yapmaz
- Veri kaybı (yedekler yardımcı olur, ama hasar oldu)
- En kötü senaryo: sessiz, tespit edilmemiş veri bozulması

> **Sonuç: SD kart hızlı denemeler için uygundur. Kalıcı işletim için her zaman değiştirin.**

---

## Benim için hangi seçenek doğru?

```
Hangi Raspberry Pi'niz var?
│
├── Raspberry Pi 5
│     ├── Maksimum performans ve dayanıklılık mı istiyorsunuz?
│     │     → Seçenek B: M.2 HAT+ ile NVMe SSD ⭐ (önerilir)
│     └── Basit ve ucuz, montaj yok mu?
│           → Seçenek A: USB SSD (Pi 5'te de mükemmel)
│
├── Raspberry Pi 4
│     ├── Gigabit ağ + mevcut sunuculu homelab mi?
│     │     → Seçenek C: PXE ağ önyükleme (yerel depolama gerekmez)
│     └── Normal ev ağı, ek sunucu yok mu?
│           → Seçenek A: USB SSD (en basit çözüm)
│
└── Raspberry Pi 3 veya daha eski
     → Artık desteklenmiyor (32 bit ARM). Tesla Carview için
        Pi 4 veya 5 gerekir — bkz. Kurulum.
```

---

## Seçenek A: USB SSD (tüm Pi modelleri için en basit çözüm)

**İhtiyacınız olan:**
- Taşınabilir bir SSD **veya** 2,5" SSD + USB adaptörü
- Bu kadar

**Önerilen donanım (2025):**

| Ürün | Yaklaşık fiyat | Notlar |
|---|---|---|
| Samsung T7 (500 GB) | ~€55 | Mükemmel, ancak Pi 4 quirk workaround gerektirir (→ aşağıda) |
| Crucial X6 (500 GB) | ~€45 | Güvenilir, quirk yok |
| WD My Passport SSD (500 GB) | ~€50 | Raspberry Pi OS altında iyi test edildi |
| 2,5" SATA SSD + UGREEN USB 3.0 adaptör | ~€35–50 | Çok güvenilir, Pi 4 için önerilir |

> **Ucuz adaptörlerden kaçının:** Bazı isimsiz USB-SATA adaptörlerinde Pi 4'te UASP (USB Attached SCSI Protocol) sorunları var. Marka adaptörler (UGREEN, Inateck) daha güvenilirdir.

### Adım 1: OS'i SSD'ye yaz

1. **Raspberry Pi Imager**'ı indirin: [https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/)
2. SSD'yi USB üzerinden normal bilgisayarınıza bağlayın
3. Imager'ı açın:
   - **Device:** Raspberry Pi 4 veya 5 seçin
   - **OS:** Raspberry Pi OS Lite (64-bit) — masaüstü yok, kaynak tasarrufu sağlar
   - **Storage:** SSD'niz
4. Dişli simgesine (⚙️) tıklayın → önceden yapılandırın:
   - Hostname ayarla (örn. `tesla-pi`)
   - SSH'ı etkinleştir
   - Wi-Fi kimlik bilgilerini gir (Ethernet kullanmıyorsanız)
   - Kullanıcı adı + parola ayarla
5. **Write** — yaklaşık 5 dakikada biter

### Adım 2: Pi 4'te bootloader'ı güncelle (yalnızca Pi 4, bir kerelik)

Pi 4'ün USB'den önyükleme yapacak şekilde bir kez yapılandırılması gerekir. **Pi 5 bunu kutudan çıktığı gibi yapar — bu adımı atlayın.**

```bash
# Ya da: kısa süre normal bir SD karttan önyükleyin, sonra:
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot

# Veya doğrudan EEPROM üzerinden:
sudo rpi-eeprom-update -a
sudo reboot
```

Sonra: SD kartı çıkarın, SSD'yi takın, Pi'yi açın → SSD'den önyükler.

### Adım 3: Pi 4'te Samsung T7 quirk'i (gerekirse)

Pi 4 Samsung T7 ile önyükleme yapmazsa (kırmızı şimşek ekranında takılı kalır):

```bash
# /boot/firmware/cmdline.txt dosyasını açın (tek satır kalmalı!):
sudo nano /boot/firmware/cmdline.txt

# Satırın sonuna ekleyin (önünde boşluk ile):
usb-storage.quirks=04e8:4001:u

# Kaydedin, yeniden başlatın:
sudo reboot
```

Bu, T7 için UASP'yi devre dışı bırakır — performans yine de SD karttan 5–10× daha iyidir.

### Adım 4: Tesla Carview'i kur

Bu noktadan itibaren, [02-deployment.en.md](02-deployment.en.md) içinde açıklandığı gibi devam edin:

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Seçenek B: Raspberry Pi 5'te NVMe SSD (en iyi performans)

Pi 5'in bir **PCIe konektörü** vardır — resmi M.2 HAT+ veya üçüncü taraf adaptör ile **400–900 MB/s** NVMe hızlarına ulaşırsınız (karşılaştırma: SD kart 20–90 MB/s).

**İhtiyacınız olan:**

| Bileşen | Tavsiye | Yaklaşık fiyat |
|---|---|---|
| Raspberry Pi 5 (4 GB veya 8 GB RAM) | — | €60'tan başlayan |
| Resmi **Raspberry Pi M.2 HAT+** | 2230 veya 2242 form faktörü | ~€15 |
| **veya** Pimoroni NVMe BASE | Kompakt, spacer gerekmez | ~€20 |
| **veya** Pineberry HatDrive Bottom | Pi'nin altına monte edilir | ~€25 |
| NVMe SSD M.2 2230 veya 2242 | WD Green SN350, Kingston NV2, Samsung PM991 | €25–60 |

> **Form faktörünü kontrol edin:** M.2 HAT+ yalnızca **2230** ve **2242** (kısa/orta SSD'ler) destekler. Standart 2280 SSD'ler (uzun olanlar) resmi HAT+'a uymaz — ancak bazı üçüncü taraf HAT'lar bunları destekler.

### Adım 1: Donanımı monte edin

1. SSD'yi M.2 yuvasına eğik şekilde kaydırın, sonra düz bastırın
2. Dahil edilen vidayla sabitleyin
3. FFC düz şerit kablosunu bağlayın (HAT → Pi 5 PCIe konektörü)
4. HAT'ı Pi 5 GPIO başlığına monte edin

### Adım 2: OS'i NVMe SSD'ye yaz

**Varyant A (kolay):** Çalışan bir Pi OS'ten doğrudan NVMe'ye yazın:

```bash
# Pi'yi SD kartla önyükleyin, sonra:
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# → NVMe SSD'yi hedef olarak seçin → yazın
```

**Varyant B:** Normal bir bilgisayarda USB-NVMe adaptörü kullanarak SSD'ye yazın (Seçenek A ile aynı).

### Adım 3: Önyükleme sırasını ayarla

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

SD kartı çıkarın, Pi'yi yeniden başlatın → NVMe'den önyükler.

### Adım 4: PCIe hızını optimize et (opsiyonel)

Pi 5 PCIe'yi varsayılan olarak Gen 2'de çalıştırır (~400 MB/s). Gen 3 (~900 MB/s) mümkündür ancak resmi olarak desteklenmez:

```bash
# /boot/firmware/config.txt:
sudo nano /boot/firmware/config.txt

# Gen 3 için (kendi sorumluluğunuzda, genellikle stabil):
dtparam=pciex1_gen=3
```

---

## Seçenek C: PXE ağ önyükleme (homelab meraklıları için)

**Nedir?** Pi'nin hiç yerel depolaması yoktur. **Tamamen ağ üzerinden** merkezi bir sunucudan önyükler. İdeal olduğu durumlar:
- Birden fazla Pi yönetiyorsunuz
- Sunucu olarak zaten bir NAS (Synology, TrueNAS) veya mini PC mevcut
- Merkezi yedekleme ve güncellemeleri tercih ediyorsunuz

**Gereksinimler:**
- Gigabit Ethernet (Wi-Fi yok — PXE için çok yavaş ve güvenilmez)
- DHCP + TFTP sağlayabilen ağda bir sunucu (NAS, eski PC, Pi 4)
- Raspberry Pi 4 veya 5

### Hızlı kurulum: dnsmasq ile PXE sunucusu

Sunucuda (Debian/Ubuntu veya NAS):

```bash
# dnsmasq'ı kurun
sudo apt install dnsmasq -y

# TFTP dizini oluşturun
sudo mkdir -p /srv/tftp/rpi

# Pi için NFS kök dosya sistemi kurun:
sudo apt install nfs-kernel-server -y
sudo mkdir -p /srv/nfs/rpi

# /etc/exports:
echo "/srv/nfs/rpi *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
```

**/etc/dnsmasq.conf** (proxy DHCP modu — mevcut yönlendiricinizin yanında çalışır):

```ini
port=0
dhcp-range=192.168.1.0,proxy
log-dhcp
enable-tftp
tftp-root=/srv/tftp
pxe-service=0,"Raspberry Pi Boot"
```

Tam kurulum (rootfs kopyalama, NFS yapılandırması, Pi tarafı yapılandırması) kapsamlıdır — resmi Raspberry Pi PXE dokümantasyonunu takip edin:
[https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**PXE gerçekten ne zaman değerlidir?** Zaten merkezi depolamalı bir homelab çalıştırıyorsanız. Tek bir Pi için USB SSD veya NVMe daha basit ve aynı derecede iyidir.

---

## SD karttan SSD'ye geçiş (mevcut kurulum)

Zaten bir SD kartta Tesla Carview çalıştırıyorsanız ve SSD'ye geçmek istiyorsanız? Sorun değil — veri kaybı olmadan:

### Adım 1: SD kartı SSD'ye klonlayın

```bash
# SSD'yi çalışan Pi'ye USB üzerinden bağlayın
# Hedef diski belirleyin:
lsblk
# → SSD genellikle /dev/sda olarak görünür

# SD kartı SSD'ye klonlayın (Pi çalışmaya devam edebilir):
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress conv=fsync

# SSD'deki bölümü mevcut tüm alanı kullanacak şekilde yeniden boyutlandırın:
sudo parted /dev/sda resizepart 2 100%
sudo resize2fs /dev/sda2
```

### Adım 2: SSD'den önyükleyin

Yukarıda açıklandığı gibi (Seçenek A, Adım 2) bootloader'ı güncelleyin, sonra SD kartı çıkarın — SSD bağlı kalır.

### Adım 3: Doğrulayın

```bash
# SSD'den önyüklendiğimizi kontrol edin:
findmnt /
# → /dev/sda2 veya nvme0n1p2 göstermeli, mmcblk0p2 DEĞİL
```

---

## Tüm seçeneklerin hızlı karşılaştırması

| | SD kart | USB SSD | NVMe (Pi 5) | PXE |
|---|---|---|---|---|
| **Dayanıklılık** | ❌ Aylar | ✅ Yıllar | ✅ Yıllar | ✅ Yerel aşınma yok |
| **Kurulum çabası** | ✅ Minimum | ✅ Düşük | 🟡 Orta (HAT monte) | ❌ Yüksek |
| **Maliyet** | ✅ ~€10 | 🟡 ~€35–60 | 🟡 ~€50–100 | ✅ €0 (sunucu varsa) |
| **Okuma hızı** | 20–90 MB/s | 200–500 MB/s | 400–900 MB/s | LAN hızı |
| **Tavsiye edilir** | Test | Pi 4 kalıcı kullanım | Pi 5 kalıcı kullanım | Homelab |

---

## Sıkça sorulan sorular

### "SD kartı çıkarmak zorunda mıyım yoksa içeride bırakabilir miyim?"

Pi 4'te: bootloader güncellemesinden sonra SD kart çıkarılabilir. Pi her zaman USB'den önyükleyecektir. İçeride bırakırsanız ve boşsa veya önyüklenebilir değilse, yine USB'den önyükler.

Pi 5'te: SD kart takılı kalabilir — yapılandırmadan sonra Pi zaten NVMe/USB'yi tercih eder.

### "SSD ne kadar büyük olmalı?"

Tesla Carview için **60–120 GB** fazlasıyla yeterlidir. SQLite veritabanı yıllar içinde birkaç yüz MB'a büyür. Daha büyük almak çok daha fazlaya mal olmaz ve SSD denetleyicisine wear leveling için daha fazla alan sağlar → daha uzun ömür.

### "Elektrik kesintilerinde — veri kaybeder miyim?"

SSD'ler ve NVMe SSD'ler elektrik kesintilerinde SD kartlardan daha dayanıklıdır, ancak bağışık değildir. Önemli veriler için: Tesla Carview admin arayüzü üzerinden (`Admin → Veri → Yedek`) **düzenli yedeklemeler** veya otomatik gecelik yedeklemeyi etkinleştirin.

### "SSD yerine USB flash sürücü kullanabilir miyim?"

Teknik olarak evet, ancak **önerilmez**. USB flash sürücülerin genellikle wear leveling algoritmaları yoktur — SD kartlardan bile daha hızlı ölürler. Ucuz bir SSD ile fiyat farkı minimumdur.

---

## Faydalı bağlantılar

- [Raspberry Pi Imager indirme](https://www.raspberrypi.com/software/)
- [raspberry.tips: Pi 4'ü USB SSD'den önyükle (EN)](https://raspberry.tips/en/raspberrypi-tutorials/boot-raspberry-pi-from-usb-ssd-flash-drive-pi-4-5)
- [raspberry.tips: Pi 5 NVMe kurulum + benchmark'lar (EN)](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)
- [Resmi Pi M.2 HAT+ dokümantasyonu](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Raspberry Pi PXE önyükleme dokümantasyonu](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [SD kart ömür hesaplayıcı](https://raspberry.tips/en/calculate-raspberry-pi-sd-card-lifespan-test-now)

---

*→ [02-deployment.en.md](02-deployment.en.md) dosyasına geri dön | [Ağ erişimi](14-network-access.en.md) | [Tüm dokümanlar](README.en.md)*

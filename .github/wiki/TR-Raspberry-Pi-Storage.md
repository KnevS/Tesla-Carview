🌐 **Dil:** [EN](Raspberry-Pi-Storage) · [DE](DE-Raspberry-Pi-Storage) · [FR](FR-Raspberry-Pi-Storage) · [ES](ES-Raspberry-Pi-Storage) · **TR** · [EL](EL-Raspberry-Pi-Storage)

---

# Raspberry Pi Depolama — SD Kart Ölümüne Son

SD kartlar ve 7/24 sunucu çalıştırma iyi bir kombinasyon değil. Bu sayfa nedenini açıklar ve kurulumun için adım adım doğru alternatife yönlendirir.

---

## SD kartlar neden bozuluyor

Modern SD kartlar **blok başına 3.000–10.000 yazma döngüsü** dayanır. Bu çok gibi görünüyor. Değil.

| SD karta ne yazıyor? | Ne sıklıkla? |
|---|---|
| Docker konteyner logları | Dakikada birden fazla kez |
| SQLite veritabanı (seyahatler, şarj oturumları) | Her 30–60 saniyede |
| Sistem logları (`/var/log`) | Sürekli |
| İşletim sistemi swap | Bellek baskısı altında |

**Gerçekçi sonuç:** Tesla Carview'in yazma yükü altında tipik bir SD kart **3–18 ay** dayanır, sonra:
- Dosya sistemi bozulması → sistem başlamaz
- Veri kaybı (yedekler yardımcı olur ama hasar verilmiştir)
- En kötü durum: sessiz, tespit edilemeyen veri bozulması

> **Sonuç:** SD kart hızlı bir test için uygundur. Kalıcı çalışma için her zaman SSD'ye geç.

---

## Karar ağacı — hangi seçenek sana uygun?

```
Hangi Raspberry Pi'n var?
│
├── Raspberry Pi 5
│     ├── En iyi performans ve en uzun ömür mü istiyorsun?
│     │     → Seçenek B: M.2 HAT+ ile NVMe SSD ⭐ önerilen
│     └── Basit, ucuz, montaj yok mu?
│           → Seçenek A: USB SSD (Pi 5'te de mükemmel)
│
├── Raspberry Pi 4
│     ├── Gigabit LAN + mevcut sunuculu homelab mı?
│     │     → Seçenek C: PXE ağ önyüklemesi (hiç yerel depolama yok)
│     └── Normal ev ağı mı?
│           → Seçenek A: USB SSD (en basit çözüm)
│
└── Raspberry Pi 3 veya daha eski
     → Artık desteklenmiyor (32 bit ARM). Tesla Carview için
        Pi 4 veya 5 gerekir — bkz. Kurulum.
```

---

## Seçenek A: USB SSD (tüm Pi modelleri için en basit)

**Ne gerekiyor:** Taşınabilir SSD veya 2,5" SATA SSD + USB adaptör.

### Önerilen donanım (2025)

| Ürün | Yaklaşık fiyat | Notlar |
|---|---|---|
| Samsung T7 (500 GB) | ~55 € | Harika, ama Pi 4 düzeltme gerektirir (→ aşağıda) |
| Crucial X6 (500 GB) | ~45 € | Güvenilir, sorunsuz |
| WD My Passport SSD (500 GB) | ~50 € | Raspberry Pi OS'ta iyi test edilmiş |
| 2,5" SATA SSD + UGREEN USB 3.0 adaptör | ~35–50 € | Pi 4 için çok güvenilir |

> **Ucuz markasız USB-SATA adaptörlerden kaçın** — Pi 4'te genellikle UASP uyumluluk sorunları var. Markalı adaptörler (UGREEN, Inateck) daha güvenilir.

### Adım 1: İşletim sistemini SSD'ye yaz

1. [Raspberry Pi Imager](https://www.raspberrypi.com/software/)'ı normal bilgisayarına indir ve kur
2. SSD'yi USB ile bilgisayarına bağla
3. Imager'ı aç:
   - **Cihaz:** Raspberry Pi 4 veya 5 seç
   - **İşletim sistemi:** Raspberry Pi OS Lite (64-bit) — masaüstü yok, Docker için daha fazla kaynak
   - **Depolama:** SSD'n
4. ⚙️ dişli simgesine tıkla → önceden yapılandır:
   - Hostname: ör. `tesla-pi`
   - SSH'yi etkinleştir: evet
   - Wi-Fi kimlik bilgileri (Ethernet kullanmıyorsan)
   - Kullanıcı adı + şifre
5. **Write**'a tıkla — ~5 dakikada biter

### Adım 2: Pi 4'te USB önyüklemesini etkinleştir (tek seferlik, Pi 5 bunu atlar)

Pi 5 USB'den kutudan çıkar çıkmaz önyükleme yapar. Pi 4 tek seferlik bir önyükleyici güncellemesi gerektirir:

```bash
# Kısa süre SD karttan önyükle, sonra çalıştır:
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot
```

Sonra: SD kartı çıkar, SSD'yi tak, güç ver → Pi SSD'den önyükleme yapar.

### Adım 3: Pi 4 için Samsung T7 düzeltmesi (gerekirse)

Pi 4'ün Samsung T7 ile takılı kalması durumunda (kırmızı LED yanıp sönüyor, önyükleme yapmıyor):

```bash
# Bu dosyayı aç — tek satır kalmalı!
sudo nano /boot/firmware/cmdline.txt

# Satırın sonuna ekle (önünde boşlukla):
usb-storage.quirks=04e8:4001:u

# Kaydet (Ctrl+O, Enter, Ctrl+X), sonra yeniden başlat:
sudo reboot
```

Bu yalnızca T7 için UASP'yi devre dışı bırakır. Performans hâlâ SD karttan 5–10 kat daha iyi.

### Adım 4: Tesla Carview'i kur

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Seçenek B: Raspberry Pi 5'te NVMe SSD (en iyi performans)

Pi 5'in bir **PCIe konnektörü** var. M.2 HAT ile **400–900 MB/s** NVMe hızları elde edilir — SD kartların ~20–90 MB/s'sine karşı.

### Gerekli donanım

| Bileşen | Öneri | Yaklaşık fiyat |
|---|---|---|
| Raspberry Pi 5 (4 GB veya 8 GB) | — | 60 €'dan itibaren |
| Resmi **Raspberry Pi M.2 HAT+** | 2230 veya 2242 form faktörü | ~15 € |
| **veya** Pimoroni NVMe BASE | Kompakt, ara parça yok | ~20 € |
| **veya** Pineberry HatDrive Bottom | Pi'nin altına monte edilir | ~25 € |
| NVMe SSD M.2 **2230 veya 2242** | WD SN350, Kingston NV2, Samsung PM991 | 25–60 € |

> **Form faktörü kritik:** Resmi M.2 HAT+ yalnızca **2230** ve **2242** (kısa SSD'ler) destekler. Standart 2280 SSD'ler (yaygın uzun olanlar) sığmaz. Üçüncü taraf HAT'lar genellikle 2280'i destekler — satın almadan önce kontrol et.

### Adım 1: Montaj

1. SSD'yi açılı şekilde M.2 yuvasına kaydır, sonra düz bas
2. Dahil edilen vidayla sabitle
3. FFC şerit kablosunu bağla (HAT ↔ Pi 5 PCIe konnektörü)
4. HAT'ı Pi 5 GPIO başlığına monte et

### Adım 2: İşletim sistemini NVMe'ye yaz

**Kolay yöntem:** SD karttan önyükle, sonra oradan NVMe'ye yaz:
```bash
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# NVMe SSD'yi hedef olarak seç → yaz
```

**Alternatif:** Normal bir bilgisayarda USB-NVMe adaptörü kullan ve Seçenek A'daki gibi Raspberry Pi Imager kullan.

### Adım 3: Önyükleme önceliğini ayarla

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

SD kartı çıkar → Pi NVMe'den önyükleme yapar.

### Adım 4: İsteğe bağlı — PCIe Gen 3'ü etkinleştir

Pi 5 varsayılan olarak Gen 2 (~400 MB/s) kullanır. Gen 3 (~900 MB/s) resmi değil ama genellikle kararlı:

```bash
sudo nano /boot/firmware/config.txt
# Sona ekle:
dtparam=pciex1_gen=3
```

---

## Seçenek C: PXE Ağ Önyüklemesi (homelab meraklıları için)

PXE önyüklemesi Pi'nin **hiç yerel depolaması olmadığı** anlamına gelir — tamamen ağ üzerinden merkezi bir sunucudan önyükleme yapar. Şu durumlarda harika:
- Birden fazla Pi yönetiyorsun
- Ağında zaten bir NAS (Synology, TrueNAS) veya mini PC var
- Merkezi yedekleme ve yönetimi tercih ediyorsun

**Gereksinimler:**
- Gigabit Ethernet (Wi-Fi PXE için çok yavaş/güvenilmez)
- Ağda DHCP + TFTP + NFS çalıştırabilen mevcut bir sunucu
- Raspberry Pi 4 veya 5

### Hızlı kurulum özeti

PXE sunucusunda (Debian/Ubuntu):

```bash
sudo apt install dnsmasq nfs-kernel-server -y
sudo mkdir -p /srv/tftp /srv/nfs/rpi

# /etc/exports'a ekle:
echo "/srv/nfs/rpi *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
```

**/etc/dnsmasq.conf** (proxy DHCP — mevcut routerla birlikte çalışır):
```ini
port=0
dhcp-range=192.168.1.0,proxy
log-dhcp
enable-tftp
tftp-root=/srv/tftp
pxe-service=0,"Raspberry Pi Boot"
```

Tam rootfs kopyası ve NFS yapılandırması kapsamlıdır — resmi kılavuzu takip et:
[Raspberry Pi PXE önyükleme belgeleri](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**PXE sana değer mi?** Yalnızca merkezi depolamalı bir homelab zaten çalıştırıyorsan. Tek bir Pi için USB SSD veya NVMe daha basit ve eşit derecede sağlamdır.

---

## SD karttan SSD'ye geçiş (veri kaybı olmadan)

Zaten Tesla Carview SD kartta çalışıyor mu? Veri kaybetmeden yaklaşık 20 dakikada geçiş yapabilirsin.

### Adım 1: SD kartı SSD'ye klonla

```bash
# SSD'yi çalışan Pi'ye USB ile bağla
# Hedef diski belirle (genellikle /dev/sda):
lsblk

# Klonla (Pi çalışmaya devam edebilir):
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress conv=fsync

# Bölümü tüm SSD'yi kullanacak şekilde yeniden boyutlandır:
sudo parted /dev/sda resizepart 2 100%
sudo resize2fs /dev/sda2
```

### Adım 2: Önyükleme kaynağını değiştir

[Seçenek A, Adım 2](#adım-2-pi-4te-usb-önyüklemesini-etkinleştir-tek-seferlik-pi-5-bunu-atlar)'de açıklandığı gibi USB önyüklemesini etkinleştir, sonra SD kartı çıkar.

### Adım 3: Doğrula

```bash
findmnt /
# /dev/sda2 veya nvme0n1p2 göstermeli, mmcblk0p2 DEĞİL
```

---

## Karşılaştırma

| | SD Kart | USB SSD | NVMe (Pi 5) | PXE |
|---|---|---|---|---|
| **Dayanıklılık** | ❌ Aylar | ✅ Yıllar | ✅ Yıllar | ✅ Yerel aşınma yok |
| **Kurulum çabası** | ✅ Minimum | ✅ Düşük | 🟡 Orta (HAT montajı) | ❌ Yüksek |
| **Maliyet** | ✅ ~10 € | 🟡 ~35–60 € | 🟡 ~50–100 € | ✅ 0 € (sunucu varsa) |
| **Okuma hızı** | 20–90 MB/s | 200–500 MB/s | 400–900 MB/s | LAN hızı |
| **Önerilen** | Yalnızca test | Pi 4 kalıcı kullanım | Pi 5 kalıcı kullanım | Homelablar |

---

## SSS

### SSD'ye geçtikten sonra SD kartı bırakabilir miyim?

Pi 4: Evet — SD kart önyüklenebilir değilse Pi onu yok sayar ve USB'den önyükleme yapar.
Pi 5: Evet — önyükleme sırası yapılandırmasından sonra NVMe/USB öncelik alır.

### SSD ne kadar büyük olmalı?

60–120 GB fazlasıyla yeterli. Tesla Carview veritabanı yıllar içinde birkaç yüz MB'a büyür. Biraz daha büyük almak ucuz ve SSD denetleyicisine aşınma dengelemesi için daha fazla blok verir → daha uzun ömür.

### Bunun yerine USB flash bellek kullanabilir miyim?

Teknik olarak evet, ama **önerilmez**. Flash belleklerin aşınma dengelemesi yoktur — SD kartlardan daha hızlı ölürler. Ucuz bir SSD ile fiyat farkı minimum.

### Elektrik kesintileri ne olacak?

SSD'ler ani güç kaybında SD kartlardan daha dayanıklıdır ama bağışık değil. Dahili yedeklemeyi kullan: **Admin → Data → Backup** düzenli olarak, veya otomatik gece yedeklemelerini etkinleştir.

---

## Faydalı Bağlantılar

- [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
- [Resmi M.2 HAT+ belgeleri](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Raspberry Pi PXE önyükleme kılavuzu](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [raspberry.tips: Pi 4'ü USB SSD'den başlat](https://raspberry.tips/en/raspberrypi-tutorials/boot-raspberry-pi-from-usb-ssd-flash-drive-pi-4-5)
- [raspberry.tips: Pi 5 NVMe kurulumu + kıyaslamalar](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)

---

*→ [[TR-Installation]] | [[TR-Network-Access]] | [[TR-Home]]*

# Raspberry Pi Depolama — SD Kart Ölümüne Son

SD kartlar ve 7/24 sunucu çalışması kötü bir kombinasyondur. Bu sayfa nedenini açıklar ve kurulumunuz için doğru alternatife adım adım rehberlik eder.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Raspberry-Pi-Storage)** | English version |
| 🇩🇪 **[Deutsch](DE-Raspberry-Pi-Storage)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Raspberry-Pi-Storage)** | Version française |
| 🇪🇸 **[Español](ES-Raspberry-Pi-Storage)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Raspberry-Pi-Storage)** | Buradasınız |
| 🇬🇷 **[Ελληνικά](EL-Raspberry-Pi-Storage)** | Ελληνική έκδοση |

---

## SD kartlar neden bozuluyor

Modern SD kartlar **blok başına 3.000–10.000 yazma döngüsüne** dayanır. Bu çok fazla gibi görünür. Değil.

| SD karta ne yazar? | Ne sıklıkla? |
|---|---|
| Docker konteyner logları | Dakikada birden fazla kez |
| SQLite veritabanı (yolculuklar, şarj oturumları) | Her 30–60 saniyede bir |
| Sistem logları (`/var/log`) | Sürekli |
| İşletim sistemi swap | Bellek baskısı altında |

**Gerçekçi sonuç:** Tesla Carview'un yazma yükü altında tipik bir SD kart **3–18 ay** dayanır, ardından:
- Dosya sistemi bozulması → sistem açılmıyor
- Veri kaybı (yedekler yardımcı olur, ancak hasar verilmiş olur)
- En kötü durum: sessiz, fark edilmeden veri bozulması

> **Özet:** SD kart hızlı test için iyidir. Kalıcı çalışma için her zaman SSD'ye geçin.

---

## Karar ağacı — hangi seçenek size uyar?

```
Hangi Raspberry Pi'ye sahipsiniz?
│
├── Raspberry Pi 5
│     ├── En iyi performans ve en uzun ömür mü istiyorsunuz?
│     │     → Seçenek B: M.2 HAT+ üzerinden NVMe SSD ⭐ önerilen
│     └── Basit, ucuz, montaj yok mu?
│           → Seçenek A: USB SSD (Pi 5'te de mükemmel)
│
├── Raspberry Pi 4
│     ├── Gigabit LAN + mevcut sunucu olan homelab?
│     │     → Seçenek C: PXE ağ önyüklemesi (hiç yerel depolama yok)
│     └── Normal ev ağı?
│           → Seçenek A: USB SSD (en basit çözüm)
│
└── Raspberry Pi 3 veya daha eski
      → Seçenek A: USB SSD (USB 2.0, Pi 4/5'ten daha yavaş)
        ya da: Pi 4/5'e yükseltin — uzun vadede daha iyi yatırım
```

---

## Seçenek A: USB SSD (tüm Pi modelleri için en basit)

**Gerekenler:** Taşınabilir bir SSD veya 2.5" SATA SSD + USB adaptörü.

### Önerilen donanım (2025)

| Ürün | Yaklaşık fiyat | Notlar |
|---|---|---|
| Samsung T7 (500 GB) | ~€55 | Harika, ancak Pi 4'te quirk düzeltmesi gerekiyor (→ aşağıda) |
| Crucial X6 (500 GB) | ~€45 | Güvenilir, quirk yok |
| WD My Passport SSD (500 GB) | ~€50 | Raspberry Pi OS'ta iyi test edilmiş |
| 2.5" SATA SSD + UGREEN USB 3.0 adaptörü | ~€35–50 | Pi 4 için çok güvenilir |

> **Ucuz markasız USB-SATA adaptörlerden kaçının** — Pi 4'te sıklıkla UASP uyumluluk sorunları yaşanır. Marka adaptörler (UGREEN, Inateck) daha güvenilirdir.

### Adım 1: İşletim sistemini SSD'ye yazın

1. [Raspberry Pi Imager](https://www.raspberrypi.com/software/)'ı indirin ve normal bilgisayarınıza kurun
2. SSD'yi USB üzerinden normal bilgisayarınıza bağlayın
3. Imager'ı açın:
   - **Cihaz:** Raspberry Pi 4 veya 5 seçin
   - **İşletim sistemi:** Raspberry Pi OS Lite (64-bit) — masaüstü yok, Docker için daha fazla kaynak
   - **Depolama:** SSD'niz
4. ⚙️ dişli simgesine tıklayın → önceden yapılandırın:
   - Ana bilgisayar adı: örn. `tesla-pi`
   - SSH'yi etkinleştir: evet
   - Wi-Fi kimlik bilgileri (Ethernet kullanmıyorsanız)
   - Kullanıcı adı + şifre
5. **Yaz** düğmesine tıklayın — ~5 dakikada tamamlanır

### Adım 2: Pi 4'te USB önyüklemesini etkinleştirin (tek seferlik, Pi 5 bu adımı atlar)

Pi 5 USB'den kutudan çıktığı gibi önyüklenir. Pi 4 tek seferlik bir önyükleyici güncellemesi gerektirir:

```bash
# Kısa süreliğine SD karttan önyükleyin, ardından çalıştırın:
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot
```

Ardından: SD kartı çıkarın, SSD'yi takın, güç verin → Pi SSD'den önyüklenir.

### Adım 3: Pi 4 için Samsung T7 quirk düzeltmesi (gerekirse)

Pi 4'ünüz Samsung T7 ile takılıyorsa (kırmızı LED yanıp sönüyor, önyüklemiyor):

```bash
# Bu dosyayı açın — tek satır olarak kalmalıdır!
sudo nano /boot/firmware/cmdline.txt

# Satırın sonuna ekleyin (önüne boşluk koyarak):
usb-storage.quirks=04e8:4001:u

# Kaydedin (Ctrl+O, Enter, Ctrl+X), ardından yeniden başlatın:
sudo reboot
```

Bu yalnızca T7 için UASP'yi devre dışı bırakır. Performans hâlâ SD karta göre 5–10 kat daha iyi olacaktır.

### Adım 4: Tesla Carview'u yükleyin

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Seçenek B: Raspberry Pi 5'te NVMe SSD (en iyi performans)

Pi 5'in bir **PCIe bağlayıcısı** vardır. Bir M.2 HAT ile **400–900 MB/s** NVMe hızlarına ulaşırsınız — SD kartların ~20–90 MB/s'ine kıyasla.

### Gereken donanım

| Bileşen | Öneri | Yaklaşık fiyat |
|---|---|---|
| Raspberry Pi 5 (4 GB veya 8 GB) | — | 60€'dan itibaren |
| Resmi **Raspberry Pi M.2 HAT+** | 2230 veya 2242 form faktörü | ~€15 |
| **ya da** Pimoroni NVMe BASE | Kompakt, aralayıcı yok | ~€20 |
| **ya da** Pineberry HatDrive Bottom | Pi'nin altına monte edilir | ~€25 |
| NVMe SSD M.2 **2230 veya 2242** | WD SN350, Kingston NV2, Samsung PM991 | €25–60 |

> **Form faktörü kritiktir:** Resmi M.2 HAT+ yalnızca **2230** ve **2242** (kısa SSD'ler) destekler. Standart 2280 SSD'ler (yaygın uzun olanlar) sığmaz. Üçüncü taraf HAT'lar genellikle 2280'i destekler — satın almadan önce kontrol edin.

### Adım 1: Montaj

1. SSD'yi açılı şekilde M.2 yuvasına kaydırın, ardından düz bastırın
2. Dahil edilen vidayla sabitleyin
3. FFC şerit kablosunu bağlayın (HAT ↔ Pi 5 PCIe bağlayıcısı)
4. HAT'ı Pi 5 GPIO başlığına monte edin

### Adım 2: İşletim sistemini NVMe'ye yazın

**Kolay yöntem:** SD karttan önyükleyin, ardından oradan NVMe'ye yazın:
```bash
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# NVMe SSD'yi hedef olarak seçin → yaz
```

**Alternatif:** Normal bir bilgisayarda USB-NVMe adaptörü kullanın ve Seçenek A'daki gibi Raspberry Pi Imager'ı kullanın.

### Adım 3: Önyükleme önceliğini ayarlayın

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

SD kartı çıkarın → Pi NVMe'den önyüklenir.

### Adım 4: İsteğe bağlı — PCIe Gen 3'ü etkinleştirin

Pi 5 varsayılan olarak Gen 2 (~400 MB/s) kullanır. Gen 3 (~900 MB/s) resmi değildir ancak genellikle kararlıdır:

```bash
sudo nano /boot/firmware/config.txt
# Sona ekleyin:
dtparam=pciex1_gen=3
```

---

## Seçenek C: PXE Ağ Önyüklemesi (homelab meraklıları için)

PXE önyüklemesi, Pi'nin **hiç yerel depolama alanı olmadığı** anlamına gelir — tamamen ağ üzerinden merkezi bir sunucudan önyüklenir. Şu durumlarda harikadır:
- Birden fazla Pi yönetiyorsunuz
- Ağınızda zaten bir NAS (Synology, TrueNAS) veya mini PC var
- Merkezi yedeklemeler ve yönetimi tercih ediyorsunuz

**Gereksinimler:**
- Gigabit Ethernet (Wi-Fi PXE için çok yavaş/güvenilmez)
- Ağda DHCP + TFTP + NFS çalıştırabilen mevcut bir sunucu
- Raspberry Pi 4 veya 5

### Hızlı kurulum genel bakışı

PXE sunucusunda (Debian/Ubuntu):

```bash
sudo apt install dnsmasq nfs-kernel-server -y
sudo mkdir -p /srv/tftp /srv/nfs/rpi

# /etc/exports dosyasına ekleyin:
echo "/srv/nfs/rpi *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
```

**/etc/dnsmasq.conf** (proxy DHCP — mevcut yönlendiricinizle birlikte çalışır):
```ini
port=0
dhcp-range=192.168.1.0,proxy
log-dhcp
enable-tftp
tftp-root=/srv/tftp
pxe-service=0,"Raspberry Pi Boot"
```

Tam rootfs kopyası ve NFS yapılandırması kapsamlıdır — resmi kılavuzu takip edin:
[Raspberry Pi PXE önyükleme belgeleri](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**PXE sizin için değer mi?** Yalnızca merkezi depolamayla zaten bir homelab çalıştırıyorsanız. Tek bir Pi için USB SSD veya NVMe daha basit ve eşit derecede sağlamdır.

---

## SD karttan SSD'ye geçiş (veri kaybı olmadan)

Tesla Carview'u zaten SD kartta çalıştırıyor musunuz? Yaklaşık 20 dakikada veri kaybetmeden geçiş yapabilirsiniz.

### Adım 1: SD kartı SSD'ye klonlayın

```bash
# SSD'yi USB üzerinden çalışan Pi'ye bağlayın
# Hedef diski tanımlayın (genellikle /dev/sda):
lsblk

# Klonlayın (Pi çalışmaya devam edebilir):
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress conv=fsync

# Bölümü tam SSD kullanacak şekilde yeniden boyutlandırın:
sudo parted /dev/sda resizepart 2 100%
sudo resize2fs /dev/sda2
```

### Adım 2: Önyükleme kaynağını değiştirin

[Seçenek A, Adım 2](#adım-2-pi-4te-usb-önyüklemesini-etkinleştirin-tek-seferlik-pi-5-bu-adımı-atlar)'de açıklandığı gibi USB önyüklemesini etkinleştirin, ardından SD kartı çıkarın.

### Adım 3: Doğrulayın

```bash
findmnt /
# /dev/sda2 veya nvme0n1p2 göstermeli, mmcblk0p2 DEĞİL
```

---

## Karşılaştırma

| | SD kart | USB SSD | NVMe (Pi 5) | PXE |
|---|---|---|---|---|
| **Dayanıklılık** | ❌ Aylar | ✅ Yıllar | ✅ Yıllar | ✅ Yerel aşınma yok |
| **Kurulum çabası** | ✅ Minimal | ✅ Düşük | 🟡 Orta (HAT montajı) | ❌ Yüksek |
| **Maliyet** | ✅ ~€10 | 🟡 ~€35–60 | 🟡 ~€50–100 | ✅ €0 (sunucu varsa) |
| **Okuma hızı** | 20–90 MB/s | 200–500 MB/s | 400–900 MB/s | LAN hızı |
| **Önerilen** | Yalnızca test | Pi 4 kalıcı kullanım | Pi 5 kalıcı kullanım | Homelablar |

---

## SSS

### SSD'ye geçtikten sonra SD kartı takılı bırakabilir miyim?

Pi 4: Evet — SD kart önyüklenebilir değilse, Pi onu yoksayar ve USB'den önyüklenir.
Pi 5: Evet — önyükleme sırası yapılandırmasından sonra NVMe/USB öncelik kazanır.

### SSD ne kadar büyük olmalı?

60–120 GB yeterlidir. Tesla Carview veritabanı yıllar içinde birkaç yüz MB'ye büyür. Biraz daha büyük almak ucuzdur ve SSD denetleyicisine aşınma dengeleme için daha fazla blok verir → daha uzun ömür.

### Bunun yerine USB flash sürücü kullanabilir miyim?

Teknik olarak evet, ancak **önerilmez**. Flash sürücülerin aşınma dengelemesi yoktur — SD kartlardan daha hızlı bozulurlar. Ucuz bir SSD ile fiyat farkı minimumdur.

### Güç kesintisi olursa ne olur?

SSD'ler ani güç kesintisinde SD kartlara göre daha dayanıklıdır, ancak bağışık değildir. Yerleşik yedeklemeyi düzenli olarak kullanın: **Yönetici → Veri → Yedekleme** veya otomatik geceleri yedeklemeleri etkinleştirin.

---

## Yararlı Bağlantılar

- [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
- [Resmi M.2 HAT+ belgeleri](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Raspberry Pi PXE önyükleme kılavuzu](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [raspberry.tips: Pi 4'ü USB SSD'den önyükleyin](https://raspberry.tips/en/raspberrypi-tutorials/boot-raspberry-pi-from-usb-ssd-flash-drive-pi-4-5)
- [raspberry.tips: Pi 5 NVMe kurulumu + benchmark'lar](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)

---

*→ [[Installation]] | [[Network-Access]] | [[Home]]*

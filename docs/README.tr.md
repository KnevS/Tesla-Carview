# 📚 Tesla Carview — Teknik dokümantasyon

> 🤖 *Bu Türkçe çeviri [README.en.md](README.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](README.md) · 👤 [Kullanıcı el kitabı (EN)](../frontend/src/handbook/handbook.en.md)

Bu dokümantasyon **kendi sunucusunda barındıranlara (self-hoster), yöneticilere ve geliştiricilere** yöneliktir. Kurulum, yapılandırma, işletim ve mimari konularını kapsar.

> **Çalışan uygulamayı kullananlar** (giriş, sürüş günlüğü, kontroller, izinler, demo vb.) için her şey `/handbook` yolundaki **uygulama içi el kitabında** veya doğrudan [`frontend/src/handbook/handbook.en.md`](../frontend/src/handbook/handbook.en.md) dosyasında bulunur. İki belge bilinçli olarak birkaç konuda örtüşür ancak her zaman birbirine atıfta bulunur.

---

## İçindekiler

### 🚀 İlk kurulum

| Belge | Konu |
|---|---|
| [01-quickstart.en.md](01-quickstart.en.md) | Hızlı başlangıç: repoyu klonlayın, backend + frontend'i yerel çalıştırın |
| [02-deployment.en.md](02-deployment.en.md) | Linux sunucu / Raspberry Pi üzerinde Docker + nginx + Let's Encrypt ile üretim deployment'ı |
| [14-network-access.en.md](14-network-access.en.md) | **Sabit IP olmadan her yerden erişim** — DynDNS, FritzBox, Cloudflare Tunnel, VPS, kendi alan adı |
| [15-raspberry-pi-storage.en.md](15-raspberry-pi-storage.en.md) | **Raspberry Pi depolama** — SD kartı USB SSD, NVMe HAT+ veya PXE ağ önyükleme ile değiştirme |
| [07-setup-wizard.en.md](07-setup-wizard.en.md) | Etkileşimli yapılandırma asistanı (`deploy/setup-wizard.sh`) |
| [08-dokploy.en.md](08-dokploy.en.md) | Alternatif: Dokploy ile deployment |

### ⚙️ Yapılandırma

| Belge | Konu |
|---|---|
| [10-configuration.en.md](10-configuration.en.md) | **Her ENV değişkeni** — gerekli, opsiyonel, demo, otomatik güncelleme |
| [04-tesla-api.en.md](04-tesla-api.en.md) | Tesla geliştirici hesabı oluşturma, uygulama kaydı, scope seçimi |
| [09-tesla-api-usage.en.md](09-tesla-api-usage.en.md) | Tesla API maliyet, kota, izleme |

### 🛠 İşletim

| Belge | Konu |
|---|---|
| [11-operations.en.md](11-operations.en.md) | **Yedekleme ve geri yükleme**, **gecelik bakım**, **demo modu**, otomatik güncelleme, sistem sağlığı, loglar |
| [12-high-availability.en.md](12-high-availability.en.md) | **HA mimarisi** (önizleme) — warm standby, aktif-aktif, coğrafi yedekli, K8s. Talep üzerine projeye özel sunulur. |

### 🔐 Güvenlik

| Belge | Konu |
|---|---|
| [03-authentication.en.md](03-authentication.en.md) | Kimlik doğrulama akışı: JWT, refresh token, MFA, passkey |
| [05-security-architecture.en.md](05-security-architecture.en.md) | Tehdit modeli ve tüm güvenlik önlemleri |
| [06-fail2ban.en.md](06-fail2ban.en.md) | fail2ban ile kaba kuvvet (brute-force) koruması |

---

## Hangi bilgi nerede?

| Soru | Cevap |
|---|---|
| "Tesla Carview'i sunucuma nasıl kurarım?" | [02-deployment.en.md](02-deployment.en.md) |
| "Hangi env değişkeni X'i kontrol eder?" | [10-configuration.en.md](10-configuration.en.md) |
| "Nasıl yedek oluştururum?" | [11-operations.en.md](11-operations.en.md) |
| "Tesla'm görünmüyor — şimdi ne yapayım?" | [Kullanıcı el kitabı → Sorun giderme](../frontend/src/handbook/handbook.en.md#-troubleshooting) |
| "Vergi dairesi için sürüş günlüğünü nasıl kullanırım?" | [Kullanıcı el kitabı → BMF sürüş günlüğü](../frontend/src/handbook/handbook.en.md#-logbook-for-the-tax-office-bmf-compliant-fahrtenbuch-bmf) |
| "Hesabım için MFA'yı nasıl etkinleştiririm?" | [Kullanıcı el kitabı → Güvenlik](../frontend/src/handbook/handbook.en.md#-security) |
| "Yeni hesaplar neden MFA gerektiriyor?" | [03-authentication.en.md](03-authentication.en.md) (mimari) ve [Kullanıcı el kitabı → Güvenlik](../frontend/src/handbook/handbook.en.md#-security) (kullanıcı tarafı) |
| "Demo modu arka planda nasıl çalışıyor?" | [11-operations.en.md → Demo modu](11-operations.en.md#-demo-mode) |
| "Denetim loguna ne kaydediliyor?" | [05-security-architecture.en.md](05-security-architecture.en.md) ve `/admin/audit` arayüzü |

---

## Doküman dışındaki ilgili içerikler

- **`backend/.env.example`** — backend yapılandırması için açıklamalı şablon
- **`frontend/.env.example`** — footer iletişim bilgisi şablonu (build zamanında)
- **`deploy/setup.sh`** — tamamen otomatik sunucu kurulumu
- **`deploy/setup-wizard.sh`** — etkileşimli asistan
- **`deploy/update.sh`** — kesintisiz (zero-downtime) güncelleme
- **`docker-compose.prod.yml`** — backend + frontend + nginx içeren üretim stack'i

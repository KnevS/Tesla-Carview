# 🛡️ Yüksek Erişilebilirlik (HA) — mimari seçenekleri

> 🤖 *Bu Türkçe çeviri [12-high-availability.en.md](12-high-availability.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](12-high-availability.md) · 🏠 [Doküman dizini](.)

Tesla Carview, bir Linux sunucusu veya Raspberry Pi üzerinde **tek düğümlü deployment** olarak gönderilir — ev kullanıcıları için kendi sunucusunda barındırmada mükemmel: hızlı, hafif, ucuz. Tanımlı SLA gereksinimleri olan **ticari çok araçlı / çok kiracılı kurulumlar** için, talep üzerine **yüksek erişilebilirlik (HA) kurulumu** mevcuttur — proje bazında tasarlanır, standart repoda değildir.

---

## HA ne zaman değerlidir?

Genel kurallar. Bunlardan biri "evet" ise, bir HA tartışması mantıklı olur:

- 🚛 **5'ten fazla araç** ve/veya üretimde birden fazla tenant → bir kesinti aynı anda birçok kullanıcıyı vurur
- 📑 **Vergi bağlayıcı sürüş günlüğü** (BMF export) — veri kaybı hızla pahalıya patlar
- ⏱ **Aktif Tesla komutları** (önceden ısıtma, şarj programı) 7/24 çalışmalıdır
- 🛠 **Bakım pencereleri yalnızca Alman ofis saatleri dışında**, gece riskine izin verilmez
- 📈 **Üçüncü taraflara verilen servis seviyeleri** (filo operatörleri, şirket aracı havuzları)

1–2 araçlı özel kullanım için tek düğüm + günlük yedek + geri yükleme akışı yeterli (bkz. [11-operations.en.md](11-operations.en.md)).

---

## Olası HA topolojileri (önizleme)

Bu seçenekler uygulanabilirdir ve talep üzerine sunulabilir — doğru seçim erişilebilirlik hedeflerine, bütçeye ve mevcut altyapıya bağlıdır.

### Tier 1 — Warm standby (RTO ≈ 5 dk, RPO ≈ 5 dk)
- İkinci bir konumda ikinci özdeş sunucu
- Periyodik SQLite yedekleme replikasyonu (örn. `litestream` → S3 uyumlu object storage)
- Geçiş için DNS failover veya floating IP
- **Artı:** ucuz, basit, hata senaryolarının %95'ini kapsar
- **Uyarı:** kısa veri kaybı olası (saniyelerden birkaç dakikaya)

### Tier 2 — Load balancer arkasında aktif-aktif (RTO < 1 dk, RPO ≈ 0)
- Bir L7 load balancer arkasında birden fazla backend container'ı (nginx/HAProxy/Traefik)
- SQLite, sunucu tarafı Postgres ile değiştirilir (veya `rqlite` gibi sqlite uyumlu bir cluster)
- Stateless backend (JWT tabanlı, oturum affinitesi gerekmez)
- Yedekler ve tenant migrasyonları için paylaşılan object storage
- **Artı:** insan müdahalesi olmadan gerçek failover
- **Uyarı:** daha fazla hareketli parça, daha yüksek işletim maliyeti

### Tier 3 — Coğrafi yedekli (RTO < 1 dk, RPO ≈ 0, bölgesel kesintiler kapsanır)
- Tier 2, ikinci bir coğrafi bölgede deploy edilir (örn. Frankfurt + Berlin)
- Senkron replikasyon veya quorum cluster ile veritabanı (PostgreSQL Patroni, CockroachDB)
- Bölgeler arası yönlendirme için Anycast DNS veya global load balancer
- **Artı:** veri merkezi kesintisinden kurtulur
- **Uyarı:** zorlayıcı kurulum; bölgeler arası veritabanına gecikme planlanmalıdır

### Tier 4 — Kubernetes-native multi-replica deployment
- backend + frontend + reverse proxy için Helm chart
- Horizontal Pod Autoscaler (HPA)
- Replikalı backend storage class ile PersistentVolume (Longhorn, OpenEBS, Ceph)
- `.env` değerleri için Sealed Secrets / External Secrets Operator
- **Artı:** mevcut bir cloud / on-prem K8s platformuna entegre olur
- **Uyarı:** yalnızca ≥ 10 tenant veya mevcut K8s ortamı olduğunda değerlidir

---

## Standart repoda zaten HA hazırlığı olan şeyler

Açık bir HA kurulumu olmadan bile, mimari bir yükseltmenin her şeyi bozmaması için tasarlanmıştır:

- **Stateless backend** — oturum store gerektirmez, yatay ölçekleme basittir (JWT + httpOnly refresh cookie)
- **Multi-tenant izolasyonu** — her tenant DB ayrı, `/api/data/backup` + `/restore` üzerinden tenant başına yedekleme/geri yükleme (bkz. [11-operations.en.md](11-operations.en.md))
- **Frontend'de bakım örtüsü** — kullanıcılar container takası sırasında "hata" görmez, dostça bir güncelleme kartı görür
- **Audit log** — güvenlikle ilgili her eylem kaydedilir, failover sonrası adli iz
- **Gecelik bakım** — DB vacuum, süresi dolmuş token'lar, eski audit log'ları otomatik temizlenir
- **System-health endpoint'i** (`/api/system/health`) — doğrudan Kubernetes liveness/readiness probe olarak veya dış izlemede (Uptime Kuma, Healthchecks.io, Statping) kullanılabilir

---

## HA'ya ihtiyacınız varsa nasıl ilerlersiniz

1. **Gereksinimleri netleştirin** — RTO/RPO hedefleri, tenant ve araç sayısı, uyumluluk (GDPR işleme sözleşmesi, BMF saklama)
2. **Topoloji seçin** — yukarıdaki katmanlardan biri veya projeye özgü bir karışım
3. **Migrasyon planı** — tek düğüm → veri kaybı olmadan HA, muhtemelen önce Postgres'e geçiş
4. **İşletim devri** — runbook'lar, izleme, nöbet kurulumu, olay playbook'ları
5. **Yük testleri** — failover tatbikatları, yedekleme-geri yükleme provaları

Bu adımlar bir müşteri projesinde operatörle bireysel olarak planlanır — repoda tek-tipe-uyar-herkese tarifi yoktur.

---

## İletişim / ilgi

Danışmanlık ve somut bir HA mimarisi talep üzerine. İletişim yolları uygulama footer'ında (operatör adresi için `frontend/.env.example`'a bakın) ve [`AUTHORS`](../AUTHORS) ile [`NOTICE.md`](../NOTICE.md) içindedir.

---

## Ayrıca bakın

- [02-deployment.en.md](02-deployment.en.md) — standart tek düğümlü deployment
- [05-security-architecture.en.md](05-security-architecture.en.md) — güvenlik modeli ve tehdit modeli (HA gereksinimlerinin temeli)
- [11-operations.en.md](11-operations.en.md) — yedekleme, geri yükleme, bakım — HA'nın üzerine oturduğu yapı taşları

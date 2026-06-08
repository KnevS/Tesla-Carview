# Hızlı başlangıç — Yerel geliştirme

> 🤖 *Bu Türkçe çeviri [01-quickstart.en.md](01-quickstart.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](01-quickstart.md)

Bu kılavuz yerel bir geliştirme ortamı kurar.
Üretim deployment'ı için bkz. [02-deployment.en.md](./02-deployment.en.md).

## Ön koşullar

- **Node.js** 20 veya daha yeni
- **Git**

## 1. Repoyu klonla

```bash
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview
```

## 2. Backend'i kur

```bash
cd backend
cp .env.example .env
```

`.env` dosyasını düzenle — en azından `JWT_SECRET` değerini uzun ve rastgele bir değere ayarla:

```bash
# güvenli bir değer üret:
openssl rand -hex 64
```

Tesla API kimlik bilgileri için bkz. [04-tesla-api.en.md](./04-tesla-api.en.md).

```bash
npm install
npm run dev
# backend http://localhost:3000 üzerinde çalışır
```

## 3. Frontend'i kur

```bash
cd frontend
npm install
npm run dev
# frontend http://localhost:5173 üzerinde çalışır
```

## 4. Kurulum sihirbazı (ilk başlatma)

http://localhost:5173 adresini ilk açtığınızda otomatik olarak **/setup** sayfasına yönlendirilirsiniz.

Orada yönetici hesabınızı tarayıcıdan oluşturursunuz:
- bir kullanıcı adı seçin
- güçlü bir parola belirleyin (≥ 12 karakter)

Alternatif olarak terminal asistanı üzerinden:
```bash
bash deploy/setup-wizard.sh
```

## 5. Giriş yaptıktan sonra

1. Ayarlar altında MFA'yı etkinleştirin (önerilir)
2. Tesla aracınızı bağlayın: [04-tesla-api.en.md](./04-tesla-api.en.md)

## 6. Tesla bağlantısı (yerel test için opsiyonel)

Tesla API kimlik bilgileri olmadan uygulama tamamen çalışır ancak gerçek araç verisi göstermez.

Gerçek Tesla bağlantısı için: [04-tesla-api.en.md](./04-tesla-api.en.md)

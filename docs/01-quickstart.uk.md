# Швидкий старт — локальна розробка

> 🤖 *Цей український переклад створений з AI-підтримкою з [README.en.md](README.en.md). Виправлення приймаються на GitHub.*

> 🇩🇪 [Auf Deutsch lesen](01-quickstart.md) · 🇬🇧 [Read in English](01-quickstart.en.md)

Ця інструкція налаштовує локальне середовище розробки.
Для продакшн-розгортання дивіться [02-deployment.en.md](./02-deployment.en.md).

## Передумови

- **Node.js** 20 або новіша
- **Git**

## 1. Клонувати репозиторій

```bash
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview
```

## 2. Налаштувати backend

```bash
cd backend
cp .env.example .env
```

Відредагуйте `.env` — як мінімум встановіть `JWT_SECRET` на довге випадкове значення:

```bash
# згенерувати безпечне значення:
openssl rand -hex 64
```

Щодо облікових даних Tesla API дивіться [04-tesla-api.en.md](./04-tesla-api.en.md).

```bash
npm install
npm run dev
# backend запускається на http://localhost:3000
```

## 3. Налаштувати frontend

```bash
cd frontend
npm install
npm run dev
# frontend запускається на http://localhost:5173
```

## 4. Майстер налаштування (перший запуск)

Коли ви вперше відкриєте http://localhost:5173, вас автоматично перенаправить на **/setup**.

Там ви створюєте обліковий запис адміністратора в браузері:
- виберіть ім'я користувача
- встановіть надійний пароль (≥ 12 символів)

Альтернативно через термінальний майстер:
```bash
bash deploy/setup-wizard.sh
```

## 5. Після входу

1. Увімкніть MFA в Налаштуваннях (рекомендовано)
2. Підключіть автомобіль Tesla: [04-tesla-api.en.md](./04-tesla-api.en.md)

## 6. Підключення Tesla (необов'язково для локального тестування)

Без облікових даних Tesla API застосунок працює повністю, але не показує реальних даних авто.

Для справжнього підключення Tesla: [04-tesla-api.en.md](./04-tesla-api.en.md)

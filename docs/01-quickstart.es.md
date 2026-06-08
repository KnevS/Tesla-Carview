# Inicio rápido — Desarrollo local

> 🤖 *Esta traducción al español es asistida por IA desde [01-quickstart.en.md](01-quickstart.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](01-quickstart.md)

Esta guía configura un entorno de desarrollo local.
Para el despliegue en producción, véase [02-deployment.en.md](./02-deployment.en.md).

## Requisitos previos

- **Node.js** 20 o superior
- **Git**

## 1. Clonar el repositorio

```bash
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview
```

## 2. Configurar el backend

```bash
cd backend
cp .env.example .env
```

Ajusta el `.env` — como mínimo define `JWT_SECRET` con un valor aleatorio largo:

```bash
# generar un valor seguro:
openssl rand -hex 64
```

Para las credenciales de la Tesla API véase [04-tesla-api.en.md](./04-tesla-api.en.md).

```bash
npm install
npm run dev
# el backend se ejecuta en http://localhost:3000
```

## 3. Configurar el frontend

```bash
cd frontend
npm install
npm run dev
# el frontend se ejecuta en http://localhost:5173
```

## 4. Asistente de configuración (primer arranque)

Cuando abras por primera vez http://localhost:5173 serás redirigido automáticamente a **/setup**.

Allí creas tu cuenta de administrador en el navegador:
- elige un nombre de usuario
- define una contraseña robusta (≥ 12 caracteres)

Alternativamente mediante el asistente de terminal:
```bash
bash deploy/setup-wizard.sh
```

## 5. Tras iniciar sesión

1. Activa MFA en Ajustes (recomendado)
2. Conecta tu vehículo Tesla: [04-tesla-api.en.md](./04-tesla-api.en.md)

## 6. Conectar Tesla (opcional para pruebas locales)

Sin las credenciales de la Tesla API la aplicación funciona por completo pero no muestra datos reales del vehículo.

Para la conexión real con Tesla: [04-tesla-api.en.md](./04-tesla-api.en.md)

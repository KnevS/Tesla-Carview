🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](First-Login)** | English version |
| 🇩🇪 **[Deutsch](DE-First-Login)** | Deutsche Version |
| 🇫🇷 **[Français](FR-First-Login)** | Version française |
| 🇪🇸 **[Español](ES-First-Login)** | Estás aquí |
| 🇹🇷 **[Türkçe](TR-First-Login)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-First-Login)** | Ελληνική έκδοση |

---

# Primer inicio de sesión y configuración del tenant

Después de la instalación, esta página le guía a través de la primera vez que abre Tesla Carview.

---

## ¿Qué es un "tenant"?

Tesla Carview admite varias cuentas aisladas en un mismo servidor — llamadas **tenants**. Cada tenant tiene:
- Sus propios usuarios y vehículos
- Su propia base de datos (los datos están completamente separados)
- Sus propios ajustes y contenido legal

**Para una instalación de un solo usuario:** Tiene un tenant (creado durante la instalación). No necesita pensar en los tenants en absoluto — la página de inicio de sesión lo gestiona automáticamente.

**Para una familia / grupo pequeño:** Cada persona puede tener su propia cuenta bajo el mismo tenant. O puede crear tenants separados para un aislamiento completo.

---

## Iniciar sesión por primera vez

1. Abra `https://tesla.yourdomain.com` en su navegador
2. Verá la página de inicio de sesión

   Si solo tiene **un tenant** en su servidor, el campo de tenant se oculta automáticamente — solo ingrese su nombre de usuario y contraseña.

   Si tiene **varios tenants**, aparece un menú desplegable para seleccionar en cuál iniciar sesión.

3. Ingrese su nombre de usuario y contraseña de administrador (configurados durante la instalación)
4. Marque **"Mantener sesión iniciada (90 días)"** — muy recomendable, especialmente para el navegador del Tesla

5. Haga clic en **Iniciar sesión**

---

## El asistente de configuración

Si es la primera vez que conecta una cuenta de Tesla, un asistente de configuración le guía a través de:

1. **Conectar cuenta de Tesla** → Consulte [Configuración de la API de Tesla](Tesla-API-Setup)
2. **Seleccionar vehículo** → Elija qué automóvil desea rastrear
3. **Contenido legal** → Configure el aviso legal/privacidad (requerido si es accesible públicamente)
4. **¡Listo!** → Se le lleva al Dashboard

---

## Invitar a otros usuarios

Como administrador, puede invitar a otros a su tenant (familiares, pareja):

1. Vaya a **Admin → Usuarios → Invitar usuario**
2. Ingrese su correo electrónico o nombre de usuario
3. Recibirán un enlace para crear su propia contraseña
4. Puede establecer qué vehículos pueden ver y qué acciones pueden realizar

Consulte [Multi-Tenant y usuarios](Multi-Tenant) para todos los detalles.

---

## Usar Tesla Carview desde el navegador del Tesla

La pantalla táctil del Tesla tiene un navegador integrado. Puede usar Tesla Carview directamente desde el automóvil:

1. Abra el navegador en la pantalla táctil del Tesla
2. Navegue a `https://tesla.yourdomain.com`
3. Inicie sesión con su nombre de usuario y contraseña (marque "Mantener sesión iniciada" por 90 días)
4. Añada un marcador o agréguelo a la pantalla de inicio para acceso rápido

> 💡 **Consejo:** El navegador del Tesla no admite passkeys (inicio de sesión con huella dactilar/reconocimiento facial). Use nombre de usuario + contraseña y marque "Mantener sesión iniciada" para que solo tenga que iniciar sesión una vez.

---

## Cambiar su contraseña

1. Vaya a **Ajustes → Cuenta**
2. Haga clic en **Cambiar contraseña**
3. Ingrese su contraseña actual y la nueva (mínimo 12 caracteres)

---

## Configurar la autenticación de dos factores (MFA)

Por seguridad, configure el MFA con una aplicación de autenticación (Google Authenticator, Authy, Bitwarden):

1. Vaya a **Ajustes → Seguridad**
2. Haga clic en **Configurar autenticación de dos factores**
3. Escanee el código QR con su aplicación de autenticación
4. Ingrese el código de 6 dígitos para confirmar

Después de la configuración, se le pedirá el código en cada inicio de sesión (a menos que use una passkey).

Consulte [Seguridad](Security) para más detalles sobre todas las opciones de autenticación.

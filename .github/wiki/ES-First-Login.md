🌐 **Idioma:** [EN](First-Login) · [DE](DE-First-Login) · [FR](FR-First-Login) · **ES** · [TR](TR-First-Login) · [EL](EL-First-Login)

---

# Primer acceso y configuración del inquilino

Después de la instalación, esta página te guía la primera vez que abres Tesla Carview.

---

## ¿Qué es un "inquilino"?

Tesla Carview soporta múltiples cuentas aisladas en un mismo servidor — llamadas **inquilinos**. Cada inquilino tiene:
- Sus propios usuarios y vehículos
- Su propia base de datos (los datos están completamente separados)
- Sus propios ajustes y contenido legal

**Para uso individual:** Tienes un inquilino (creado durante la instalación). No necesitas pensar en inquilinos — la página de inicio de sesión lo gestiona automáticamente.

**Para familia / grupo pequeño:** Cada persona puede tener su propia cuenta bajo el mismo inquilino. O puedes crear inquilinos separados para total aislamiento.

---

## Iniciar sesión por primera vez

1. Abre `https://tesla.tudominio.com` en tu navegador
2. Verás la página de inicio de sesión

   Si solo tienes **un inquilino** en tu servidor, el campo de inquilino se oculta automáticamente — solo introduce tu usuario y contraseña.

   Si tienes **varios inquilinos**, aparece un desplegable para seleccionar en cuál iniciar sesión.

3. Introduce tu nombre de usuario y contraseña de admin (configurados durante la instalación)
4. Marca **"Mantener sesión (90 días)"** — muy recomendado, especialmente para el navegador del Tesla

5. Haz clic en **Iniciar sesión**

---

## El asistente de configuración

Si es la primera vez que conectas una cuenta Tesla, un asistente te guía a través de:

1. **Conectar cuenta Tesla** → Ver [Configuración de la API Tesla](ES-Tesla-API-Setup)
2. **Seleccionar vehículo** → Elige qué coche rastrear
3. **Contenido legal** → Configura el aviso legal/privacidad (necesario si es accesible públicamente)
4. **¡Listo!** → Te lleva al Panel

---

## Invitar a otros usuarios

Como admin, puedes invitar a otros a tu inquilino (familiares, pareja):

1. Ve a **Admin → Usuarios → Invitar usuario**
2. Introduce su email o nombre de usuario
3. Recibirán un enlace para crear su propia contraseña
4. Puedes configurar qué vehículos pueden ver y qué acciones pueden realizar

Ver [Multi-tenant y usuarios](ES-Multi-Tenant) para todos los detalles.

---

## Usar Tesla Carview desde el navegador del Tesla

La pantalla táctil del Tesla tiene un navegador integrado. Puedes usar Tesla Carview directamente desde el coche:

1. Abre el navegador en la pantalla táctil del Tesla
2. Navega a `https://tesla.tudominio.com`
3. Inicia sesión con tu usuario y contraseña (marca "Mantener sesión" 90 días)
4. Añade a favoritos o a la pantalla de inicio para acceso rápido

> 💡 **Consejo:** El navegador del Tesla no soporta passkeys (huella/cara). Usa usuario + contraseña y marca "Mantener sesión" para iniciar sesión solo una vez.

---

## Cambiar tu contraseña

1. Ve a **Ajustes → Cuenta**
2. Haz clic en **Cambiar contraseña**
3. Introduce tu contraseña actual y la nueva (mínimo 12 caracteres)

---

## Configurar autenticación en dos pasos (MFA)

Por seguridad, configura MFA con una app de autenticación (Google Authenticator, Authy, Bitwarden):

1. Ve a **Ajustes → Seguridad**
2. Haz clic en **Configurar autenticación en dos pasos**
3. Escanea el código QR con tu app de autenticación
4. Introduce el código de 6 dígitos para confirmar

Después de la configuración, se te pedirá el código en cada inicio de sesión (a menos que uses una passkey).

Ver [Seguridad](ES-Security) para más detalles sobre todas las opciones de autenticación.

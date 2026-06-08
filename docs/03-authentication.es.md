# Autenticación y MFA

> 🤖 *Esta traducción al español es asistida por IA desde [03-authentication.en.md](03-authentication.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](03-authentication.md)

## Flujo de inicio de sesión

```
[Navegador]  POST /api/auth/login  { username, password }

  Caso A: sin MFA
  <-- { accessToken, user }
  redirigir al dashboard

  Caso B: MFA activado
  <-- { requiresMfa: true, tempToken }  (válido 5 min)
  redirigir a la entrada de MFA

  POST /api/auth/mfa/verify  { tempToken, code }
  <-- { accessToken, user }
  redirigir al dashboard
```

## Concepto de tokens

| Token | Almacenamiento | Validez | Uso |
|---|---|---|---|
| **Access token** | Memoria JS (Pinia) | 15 minutos | Peticiones API como cabecera `Bearer` |
| **Refresh token** | Cookie httpOnly | 7 días | obtener un nuevo access token |
| **Temp token** | Memoria JS | 5 minutos | sólo para la verificación de MFA |

**¿Por qué no usar localStorage?** localStorage es legible por JavaScript y, por tanto, vulnerable a XSS.
El access token en memoria desaparece al cerrar la pestaña; la cookie httpOnly no.
La cookie de refresh no puede ser leída por JavaScript.

## Configurar MFA

### Como usuario

1. Abre **Ajustes** (⚙️)
2. Haz clic en **"Activar MFA"**
3. Escanea el código QR con una app autenticadora:
   - [Google Authenticator](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2) (Android/iOS)
   - [Authy](https://authy.com/) (Android/iOS/Desktop, con backup)
   - [1Password](https://1password.com/) (TOTP integrado)
   - [Bitwarden](https://bitwarden.com/) (TOTP integrado)
4. Introduce el código de 6 dígitos mostrado
5. **Guarda los 10 códigos de respaldo** (¡se muestran sólo una vez!)
   - Guárdalos en un gestor de contraseñas
   - O imprímelos y guárdalos en lugar seguro

### Códigos de respaldo

- Cada código es de **un solo uso**
- Formato: `XXXX-XXXX` (8 caracteres hexadecimales con guion)
- Introduce uno en lugar del código TOTP cuando no tengas acceso a la app
- Contador de códigos restantes visible en los ajustes
- Cuando se agoten: desactiva MFA y vuelve a configurarlo

## Crear un usuario (admin)

Sólo los usuarios con rol `admin` pueden crear nuevos usuarios:

```bash
# directamente vía API (contraseña ≥ 12 caracteres):
curl -X POST https://your-domain.com/api/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "karin", "password": "strongPassword123!", "role": "user"}'
```

## Passkeys (sin contraseña)

Tesla Carview soporta passkeys WebAuthn/FIDO2 como alternativa a las contraseñas:

1. Abre **Ajustes → Passkeys**
2. Haz clic en **"+ Añadir passkey"** — se abrirá el diálogo del navegador
3. Confirma con Face ID, Touch ID o una llave de seguridad
4. A partir de ahora: elige **"Iniciar sesión con passkey"** en la página de login

Las passkeys son resistentes al phishing y no requieren contraseña.

## Inicio de sesión QR SSO (para el navegador de la pantalla Tesla)

El navegador integrado en las pantallas Tesla no soporta WebAuthn/Face ID.
Con el flujo de emparejamiento QR sí puedes iniciar sesión usando Passkey/Face ID:

```
[Navegador Tesla]             [Smartphone]
  abrir página de login
  "Iniciar sesión con smartphone"
  mostrar código QR ────────── escanear
  (sondeo cada 2 s)             abrir /pair/{token}
                                tocar "Confirmar con passkey"
                                Face ID / Touch ID ✓
                                POST /api/pair/confirm/{token}
  sesión confirmada ◄─────────
  recibir JWT
  abrir dashboard
```

**Paso a paso:**

1. En el navegador Tesla toca **"Iniciar sesión con smartphone"**
2. Aparece un código QR (válido 5 minutos)
3. Escanea el QR con la cámara del smartphone
4. Se abre `https://your-domain.com/pair/{token}` en el teléfono
5. Toca **"Confirmar con passkey"** → Face ID / Touch ID
6. El navegador Tesla inicia sesión automáticamente

**Propiedades de seguridad:**
- Token: valor aleatorio de 256 bits, no predecible
- TTL: 5 minutos, de un solo uso
- Limitado por tenant: el token sólo es válido para tu propio tenant
- La passkey en el smartphone verifica la identidad en el servidor

**Requisito:** Debe haber al menos una passkey registrada previamente en el smartphone (Ajustes → Passkeys).

## Requisitos de contraseña

- Al menos **12 caracteres**
- Como máximo 256 caracteres
- No hay requisitos adicionales de clase de caracteres (la longitud importa más que la complejidad)
- Recomendación: una frase de paso con 4+ palabras aleatorias

🌐 **Idioma:** [EN](Legal-Content) · [DE](DE-Legal-Content) · [FR](FR-Legal-Content) · **ES** · [TR](TR-Legal-Content) · [EL](EL-Legal-Content)

---

# Contenido legal (Aviso legal, Privacidad, Términos)

Si Tesla Carview es públicamente accesible (no solo en tu red local), puedes estar legalmente obligado a proporcionar un aviso legal, una política de privacidad y términos de uso — especialmente bajo la ley europea (RGPD/GDPR).

---

## ¿Esto me afecta?

**Solo uso Tesla Carview en mi red local (sin dominio público):**
→ Sin requisitos legales. Salta esta página.

**Tengo un dominio público y solo yo uso la app:**
→ Riesgo bajo, pero un aviso legal es recomendable si estás en la UE.

**Uso Tesla Carview con familia o amigos (no comercial):**
→ Deberías configurar el aviso legal y la política de privacidad para estar tranquilo.

**Ofrezco una demo pública o registro abierto:**
→ Aviso legal, política de privacidad y términos son obligatorios en la UE.

---

## Dónde configurar el contenido legal

1. Inicia sesión como **admin**
2. Ve a **Admin → Contenido legal**
3. Verás tres secciones: **Aviso legal**, **Política de privacidad**, **Términos de uso**

---

## Rellenar las plantillas

Tesla Carview proporciona plantillas con campos marcados como `<<PLACEHOLDER>>`. Debes rellenar:

| Marcador | Qué introducir |
|---|---|
| `<<NAME>>` | Tu nombre legal completo |
| `<<STREET>>` | Tu calle y número |
| `<<CITY>>` | Tu ciudad y código postal |
| `<<COUNTRY>>` | Tu país |
| `<<EMAIL>>` | Una dirección de email de contacto |
| `<<PHONE>>` | Número de teléfono (obligatorio en Alemania) |

> ⚠️ **La app te avisará** si quedan campos `<<PLACEHOLDER>>` sin rellenar. No hagas pública la instalación sin completar todos los marcadores.

---

## Versionado y publicación

El contenido legal tiene versiones. Cuando haces cambios:
1. Edita el contenido en el editor
2. Haz clic en **"Publicar nueva versión"**
3. Los usuarios que aceptaron una versión anterior son invitados a aceptar la nueva en el próximo inicio de sesión

Esto crea un rastro de auditoría que muestra quién aceptó qué versión y cuándo.

---

## Contenido legal multiidioma

Tesla Carview gestiona el contenido legal en un idioma principal (alemán por defecto para servidores DE) y lo refleja en los demás idiomas. Si cambias la versión alemana, los demás idiomas se actualizan automáticamente.

Si necesitas traducciones personalizadas, puedes editar cada idioma por separado.

---

## Requisitos mínimos del RGPD para la política de privacidad

Si estás en la UE, tu política de privacidad debe indicar:
- Qué datos personales recopilas (nombre de usuario, email, datos del vehículo, ubicación)
- Por qué los recopilas (uso personal, registro privado)
- Cuánto tiempo los conservas (hasta la eliminación de la cuenta o X años)
- Quién tiene acceso (solo tú como admin)
- Derechos de los usuarios (acceso, eliminación, corrección)
- Contacto para consultas sobre datos (tu email)

La plantilla de Tesla Carview cubre todos estos puntos. Solo tienes que rellenar tus datos de contacto.

---

## Contacto del operador (separado del aviso legal)

Para consultas comerciales o de prensa, puedes configurar un email de contacto en el pie de página:
- **Ajustes → Contacto del operador**
- Aparece en el pie de página de la app y es independiente del aviso legal

Se configura en el archivo de entorno del frontend (no el `.env` principal):
```bash
# /opt/tesla-carview/frontend/.env:
VITE_OPERATOR_CONTACT_EMAIL=contacto@tudominio.com
```

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Legal-Content)** | English version |
| 🇩🇪 **[Deutsch](DE-Legal-Content)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Legal-Content)** | Version française |
| 🇪🇸 **[Español](ES-Legal-Content)** | Estás aquí |
| 🇹🇷 **[Türkçe](TR-Legal-Content)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Legal-Content)** | Ελληνική έκδοση |

---

# Contenido legal (Aviso legal, Privacidad, Términos)

Si Tesla Carview es accesible públicamente (no solo en su red local), es posible que esté legalmente obligado a proporcionar un aviso legal (Impressum), una política de privacidad y términos de uso — especialmente bajo la legislación alemana/europea (DSGVO/RGPD).

---

## ¿Es esto relevante para mí?

**Solo uso Tesla Carview en mi red local (sin dominio público):**
→ Sin requisitos legales. Omita esta página.

**Tengo un dominio público y solo yo uso la aplicación:**
→ Riesgo bajo, pero se recomienda un aviso legal si está en Alemania/UE.

**Uso Tesla Carview con familiares o amigos (sin fines comerciales):**
→ Debería configurar el aviso legal y la política de privacidad por precaución.

---

## Dónde configurar el contenido legal

1. Inicie sesión como **administrador**
2. Vaya a **Admin → Contenido legal**
3. Verá tres secciones: **Aviso legal**, **Política de privacidad**, **Términos de uso**

---

## Completar las plantillas

Tesla Carview proporciona plantillas con campos marcados como `<<MARCADOR>>`. Debe completar:

| Marcador | Qué ingresar |
|---|---|
| `<<NAME>>` | Su nombre legal completo |
| `<<STREET>>` | Su calle y número de casa |
| `<<CITY>>` | Su ciudad y código postal |
| `<<COUNTRY>>` | Su país |
| `<<EMAIL>>` | Una dirección de correo electrónico de contacto |
| `<<PHONE>>` | Número de teléfono (obligatorio en Alemania) |

> ⚠️ **La aplicación le advertirá** si quedan campos `<<MARCADOR>>` sin completar. No haga pública la instalación sin completar todos los marcadores.

---

## Versionado y publicación

El contenido legal está versionado. Cuando realice cambios:
1. Edite el contenido en el editor
2. Haga clic en **"Publicar nueva versión"**
3. A los usuarios que hayan aceptado una versión anterior se les pedirá que acepten la nueva en el próximo inicio de sesión

Esto crea un registro de auditoría que muestra quién aceptó qué versión y cuándo.

---

## Contenido legal en varios idiomas

Tesla Carview gestiona el contenido legal en un idioma principal (alemán de forma predeterminada para servidores en DE) y lo refleja en otros idiomas. Si cambia la versión alemana, los otros idiomas se actualizan automáticamente.

Si necesita traducciones personalizadas, puede editar cada idioma por separado.

---

## Requisitos mínimos del RGPD/DSGVO para la política de privacidad

Si está en la UE, su política de privacidad debe indicar:
- Qué datos personales recopila (nombre de usuario, correo electrónico, datos del vehículo, ubicación)
- Por qué los recopila (uso personal, registro privado)
- Cuánto tiempo los conserva (hasta la eliminación de la cuenta o X años)
- Quién tiene acceso (solo usted como administrador)
- Derechos del usuario (acceso, eliminación, corrección)
- Contacto para consultas sobre datos (su correo electrónico)

La plantilla de Tesla Carview cubre todos estos puntos. Solo complete sus datos de contacto.

---

## Contacto del operador (diferente al aviso legal)

Para consultas comerciales o de prensa, puede configurar un correo electrónico de contacto en el pie de página:
- **Ajustes → Contacto del operador**
- Aparece en el pie de página de la aplicación y es independiente del aviso legal

Esto se configura en el archivo de entorno del frontend (no en el `.env` principal):
```bash
# /opt/tesla-carview/frontend/.env:
VITE_OPERATOR_CONTACT_EMAIL=contact@yourdomain.com
```

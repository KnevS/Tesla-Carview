🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Multi-Tenant)** | English version |
| 🇩🇪 **[Deutsch](DE-Multi-Tenant)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Multi-Tenant)** | Version française |
| 🇪🇸 **[Español](ES-Multi-Tenant)** | Estás aquí |
| 🇹🇷 **[Türkçe](TR-Multi-Tenant)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Multi-Tenant)** | Ελληνική έκδοση |

---

# Multi-Tenant y usuarios

Tesla Carview admite varias cuentas aisladas ("tenants") en un único servidor — ideal para familias, o si desea ofrecer el servicio a amigos cercanos bajo la licencia no comercial.

---

## Comprender los tenants

Piense en los tenants como apartamentos separados en el mismo edificio:
- Cada tenant tiene sus propios **usuarios**, **vehículos** y **datos**
- Los tenants no pueden ver los datos de los demás
- Un servidor, múltiples entornos aislados

**¿Cuándo necesita varios tenants?**
- Una familia con dos propietarios de Tesla que desean datos separados
- Usted y un amigo comparten un servidor
- Prueba de una segunda configuración sin tocar los datos de producción

**¿Cuándo es suficiente un solo tenant?**
- Usted y su pareja comparten un Tesla
- Tiene varios Tesla pero quiere todos los datos en un solo lugar
- Uso individual

---

## La base de datos maestra vs. las bases de datos de los tenants

Tesla Carview utiliza dos tipos de bases de datos:

| Base de datos | Ubicación | Contiene |
|---|---|---|
| `master.db` | `/app/data/master.db` | Lista de tenants, tokens de usuario, estado OAuth |
| `{tenant-uuid}.db` | `/app/data/tenants/` | Todos los datos de vehículos y usuarios de un tenant |

Los datos de cada tenant están completamente aislados a nivel de archivo.

---

## Crear un nuevo tenant

### Opción 1: Autorregistro (si está habilitado)

Los usuarios pueden registrar su propio tenant en `https://tesla.yourdomain.com/register`:
1. Complete el nombre del tenant, el slug (identificador corto compatible con URL), el nombre de usuario administrador y la contraseña
2. Acepte los términos
3. Listo — se crea un nuevo tenant aislado

**Restrinja el autorregistro con códigos de invitación:**
En `.env`:
```env
REGISTRATION_REQUIRES_INVITE=true
```
Luego cree códigos de invitación en **Admin → Invitaciones → Crear código de invitación** y comparta el enlace.

### Opción 2: Mediante el administrador (sin autorregistro)

Si el autorregistro está deshabilitado, usted (como administrador) puede crear tenants directamente a través de la API o habilitando temporalmente el registro.

---

## Gestionar usuarios dentro de un tenant

### Roles de usuario

| Rol | Qué puede hacer |
|---|---|
| **Administrador** | Todo — vehículos, usuarios, ajustes, gestión de datos |
| **Usuario** | Ver datos de los vehículos asignados, crear entradas en el libro de viajes |

Los administradores configuran permisos por usuario más allá del rol básico:

| Permiso | Predeterminado para usuarios |
|---|---|
| Puede editar vehículos | No |
| Puede añadir vehículos | No |
| MFA requerido | Sí (configurable) |

### Invitar usuarios

Como administrador, invite a otros a su tenant:
1. **Admin → Usuarios → Invitar usuario**
2. Ingrese su correo electrónico (o simplemente genere un enlace sin correo electrónico)
3. Establezca sus permisos iniciales
4. Hacen clic en el enlace y establecen su contraseña

### Asignar vehículos a usuarios

Un usuario solo puede ver los vehículos que tiene asignados:
1. **Admin → Usuarios** → haga clic en un usuario
2. En "Vehículos" → asigne qué vehículos puede ver
3. Los cambios surten efecto inmediatamente (no se requiere cierre de sesión)

---

## Seudónimos de los tenants

Por privacidad, los tenants se identifican con un **seudónimo** (p. ej. "brave-eagle") en la página de inicio de sesión — no por el nombre real del tenant. Esto evita que la página de inicio de sesión revele quién gestiona este servidor.

Puede cambiar el seudónimo:
- **Admin → Ajustes → Tenant → Cambiar seudónimo**

---

## Eliminar un tenant

La eliminación de un tenant es una operación destructiva y requiere confirmación:
1. **Admin → Datos → Eliminar tenant**
2. Escriba la frase de confirmación
3. Se crea automáticamente una copia de seguridad antes de la eliminación

---

## Estado del tenant

Los tenants pueden suspenderse sin eliminarlos:
- **Admin → Tenants → Suspender**
- Los tenants suspendidos no pueden iniciar sesión
- Los datos se conservan

---

## Límites técnicos (servidor único)

| Recurso | Límite práctico |
|---|---|
| Número de tenants | Sin límite fijo (SQLite escala bien) |
| Vehículos por tenant | Sin límite fijo |
| Usuarios por tenant | Sin límite fijo |
| Tamaño de la base de datos por tenant | ~50 MB por 3 años de datos (típico) |

Tesla Carview no está diseñado para uso SaaS multi-tenant a gran escala — es para uso privado/familiar. Consulte [Licencia y uso](License-and-Usage) para saber qué está permitido.

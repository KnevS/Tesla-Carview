🌐 **Idioma:** [EN](Multi-Tenant) · [DE](DE-Multi-Tenant) · [FR](FR-Multi-Tenant) · **ES** · [TR](TR-Multi-Tenant) · [EL](EL-Multi-Tenant)

---

# Multi-tenant y usuarios

Tesla Carview soporta múltiples cuentas aisladas ("inquilinos") en un solo servidor — perfecto para familias, o si quieres ofrecer el servicio a amigos cercanos bajo la licencia no comercial.

---

## Entender los inquilinos

Piensa en los inquilinos como apartamentos separados en el mismo edificio:
- Cada inquilino tiene sus propios **usuarios**, **vehículos** y **datos**
- Los inquilinos no pueden ver los datos de los demás
- Un servidor, múltiples entornos aislados

**¿Cuándo necesitas varios inquilinos?**
- Familia con dos propietarios de Tesla que quieren datos separados
- Tú y un amigo compartís un servidor
- Probar una segunda configuración sin tocar los datos de producción

**¿Cuándo basta con un inquilino?**
- Tú y tu pareja compartís un Tesla
- Tienes varios Tesla pero quieres todos los datos en un solo lugar
- Uso individual

---

## La base de datos maestra vs. las bases de datos de inquilinos

Tesla Carview usa dos tipos de bases de datos:

| Base de datos | Ubicación | Contiene |
|---|---|---|
| `master.db` | `/app/data/master.db` | Lista de inquilinos, tokens de usuario, estado OAuth |
| `{tenant-uuid}.db` | `/app/data/tenants/` | Todos los datos de vehículo y usuario de un inquilino |

Los datos de cada inquilino están completamente aislados a nivel de archivo.

---

## Crear un nuevo inquilino

### Opción 1: Autoregistro (si está activado)

Los usuarios pueden registrar su propio inquilino en `https://tesla.tudominio.com/register`:
1. Rellena el nombre del inquilino, slug (identificador corto compatible con URL), nombre de usuario admin y contraseña
2. Acepta los términos
3. Listo — se crea un nuevo inquilino aislado

**Restringir el autoregistro con códigos de invitación:**
En `.env`:
```env
REGISTRATION_REQUIRES_INVITE=true
```
Luego crea códigos de invitación en **Admin → Invitaciones → Crear código de invitación** y comparte el enlace.

### Opción 2: Via admin (sin autoregistro)

Si el autoregistro está desactivado, tú (como admin) creas inquilinos directamente via la API o habilitando el registro temporalmente.

---

## Gestionar usuarios dentro de un inquilino

### Roles de usuario

| Rol | Qué pueden hacer |
|---|---|
| **Admin** | Todo — vehículos, usuarios, ajustes, gestión de datos |
| **Usuario** | Ver datos de vehículos asignados, crear entradas en el libro de registros |

Los admins establecen permisos por usuario más allá del rol básico:

| Permiso | Por defecto para usuarios |
|---|---|
| Puede editar vehículos | No |
| Puede añadir vehículos | No |
| MFA requerido | Sí (configurable) |

### Invitar usuarios

Como admin, invita a otros a tu inquilino:
1. **Admin → Usuarios → Invitar usuario**
2. Introduce su email (o simplemente genera un enlace sin email)
3. Establece sus permisos iniciales
4. Hacen clic en el enlace y configuran su contraseña

### Asignar vehículos a usuarios

Un usuario solo puede ver los vehículos que le están asignados:
1. **Admin → Usuarios** → haz clic en un usuario
2. Bajo "Vehículos" → asigna qué vehículos pueden ver
3. Los cambios surten efecto inmediatamente (no hace falta cerrar sesión)

---

## Seudónimos de inquilinos

Por privacidad, los inquilinos se identifican por un **seudónimo** (ej. "brave-eagle") en la página de inicio de sesión — no por el nombre real del inquilino. Esto evita que la página de inicio de sesión revele quién gestiona este servidor.

Puedes cambiar el seudónimo:
- **Admin → Ajustes → Inquilino → Cambiar seudónimo**

---

## Eliminar un inquilino

La eliminación de un inquilino es una operación destructiva y requiere confirmación:
1. **Admin → Data → Eliminar inquilino**
2. Escribe la frase de confirmación
3. Se crea automáticamente una copia de seguridad antes de la eliminación

---

## Estado del inquilino

Los inquilinos pueden suspenderse sin eliminarlos:
- **Admin → Inquilinos → Suspender**
- Los inquilinos suspendidos no pueden iniciar sesión
- Los datos se conservan

---

## Límites técnicos (servidor único)

| Recurso | Límite práctico |
|---|---|
| Número de inquilinos | Sin límite fijo (SQLite escala bien) |
| Vehículos por inquilino | Sin límite fijo |
| Usuarios por inquilino | Sin límite fijo |
| Tamaño de base de datos por inquilino | ~50 MB para 3 años de datos (típico) |

Tesla Carview no está diseñado para uso SaaS multi-tenant a gran escala — es para uso privado/familiar. Ver [Licencia y derechos de uso](ES-License-and-Usage) para lo que está permitido.

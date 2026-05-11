# Política de privacidad

> La presente política describe qué datos personales se tratan al utilizar esta instancia de registro de datos de Tesla **autoalojada de forma privada**, sobre qué base jurídica y con qué finalidad. Se aplican el Reglamento General de Protección de Datos (RGPD) y la Ley federal alemana de protección de datos (BDSG).

## 1. Responsable del tratamiento

Responsable del tratamiento en el sentido del art. 4 (7) RGPD:

<<NAME>>
<<STREET>>
<<ZIP_CITY>>
<<COUNTRY>>
Correo electrónico: <<EMAIL>>

## 2. Naturaleza del tratamiento

La aplicación se opera **exclusivamente para uso privado** del responsable del tratamiento y de su hogar. **No** se realiza ningún tratamiento de datos de terceros; el registro público no es posible.

Todos los datos permanecen **localmente en el servidor propio del responsable del tratamiento**. **No** existe transferencia a terceros, salvo dos excepciones documentadas (Tesla, Monta opcional), véase la sección 5.

## 3. Datos tratados

| Categoría de datos | Finalidad | Base jurídica |
|---|---|---|
| Nombre de usuario, hash de contraseña, secreto MFA, historial de inicios de sesión | Autenticación y protección de la cuenta | Art. 6 (1) (b) RGPD — ejecución de un contrato |
| Token OAuth de la cuenta Tesla | Acceso a la Tesla Fleet API para los vehículos propios | Art. 6 (1) (b) RGPD |
| Datos maestros del vehículo (VIN, modelo, año) | Gestión del vehículo | Art. 6 (1) (b) RGPD |
| Datos de trayectos (GPS, velocidad, consumo) | Libro de a bordo, análisis de autonomía y de consumo | Art. 6 (1) (a/b) RGPD |
| Sesiones de carga (energía, duración, coste, GPS) | Historial de carga, liquidación de costes de carga doméstica | Art. 6 (1) (b) RGPD |
| Telemetría de la batería (SoC, temperatura, tensión) | Análisis de degradación | Art. 6 (1) (b) RGPD |
| Registros del servidor (IP, user agent, marcas temporales, códigos de estado) | Seguridad, prevención de abusos (fail2ban, limitación de tasa) | Art. 6 (1) (f) RGPD — interés legítimo |
| Registro de auditoría de acciones relevantes para la seguridad | Análisis forense en caso de incidentes | Art. 6 (1) (f) RGPD |

## 4. Conservación

| Categoría de datos | Conservación |
|---|---|
| Tokens de actualización | 7 días renovables, después borrado automático |
| Registros del servidor (nginx) | 14 días con rotación |
| Datos de trayectos y de carga | indefinida — función de borrado / limpieza disponible en la aplicación |
| Cuenta de usuario | hasta su eliminación activa |

El responsable del tratamiento puede eliminar datos en cualquier momento mediante la función **«Gestión de datos»** en la aplicación.

## 5. Destinatarios / transferencia a terceros países

### 5.1 Tesla, Inc. (EE. UU.)

Para consultar los datos del vehículo y controlarlo se utiliza la [Tesla Fleet API](https://developer.tesla.com). Las llamadas a la API (incl. token OAuth, VIN del vehículo, parámetros de comando) se transmiten a Tesla, Inc. (3500 Deer Creek Road, Palo Alto, CA 94304, EE. UU.). No existe relación de encargado del tratamiento conforme al art. 28 RGPD; Tesla actúa como responsable del tratamiento independiente. Mecanismo de transferencia: **cláusulas contractuales tipo** de la Comisión Europea y **EU-US Data Privacy Framework**. Aviso de privacidad de Tesla: [https://www.tesla.com/legal/privacy](https://www.tesla.com/legal/privacy).

### 5.2 Monta ApS (Dinamarca) — opcional

Si la integración de Monta está activada en los ajustes, las sesiones de carga se sincronizan con la Monta Partner API a efectos de facturación. Destinatario: Monta ApS, Vesterbrogade 26, 1620 Copenhague, Dinamarca. Tratamiento en el EEE — sin transferencia a terceros países. Privacidad: [https://monta.com/privacy](https://monta.com/privacy).

## 6. Cookies

La aplicación utiliza **únicamente cookies estrictamente necesarias**:

- `refreshToken` (httpOnly, Secure, SameSite=Strict) — sesión de inicio de sesión, validez de 7 días
- `localStorage['locale']` — idioma elegido, almacenado únicamente de forma local en el navegador, nunca transmitido

**No** se utilizan cookies de seguimiento, publicitarias ni de análisis. Por tanto, no se requiere consentimiento conforme al § 25 TDDDG.

## 7. Hospedaje

El servidor que aloja esta instancia es operado por el propio responsable del tratamiento (autoalojamiento) o por un proveedor de hospedaje vinculado mediante un contrato de encargo del tratamiento. El proveedor concreto se indicará a petición.

## 8. Sus derechos como interesado

Le asisten, en particular, los siguientes derechos en virtud de los art. 15-22 RGPD:

- **Derecho de acceso** a los datos tratados sobre usted (art. 15)
- **Derecho de rectificación** de datos inexactos (art. 16)
- **Derecho de supresión** («derecho al olvido», art. 17) — en la medida permitida por la ley
- **Derecho a la limitación** del tratamiento (art. 18)
- **Derecho a la portabilidad** en un formato estructurado y legible por máquina (art. 20) — la aplicación ofrece exportación CSV/JSON
- **Derecho de oposición** al tratamiento basado en el interés legítimo (art. 21)
- **Derecho a presentar una reclamación** ante una autoridad de control (art. 77) — la autoridad de protección de datos del Land alemán que le corresponda es competente

Envíe sus solicitudes por correo electrónico a <<EMAIL>>.

## 9. Seguridad

La aplicación implementa medidas técnicas y organizativas conforme al art. 32 RGPD. Detalles: véase la [política de seguridad](https://github.com/KnevS/Tesla-Carview/blob/main/SECURITY.en.md) en el repositorio.

## 10. Cambios en esta política

La presente política puede modificarse cuando cambie el tratamiento o el marco jurídico. Tras cada modificación se le pedirá que la confirme nuevamente en su próximo inicio de sesión. Las versiones anteriores se conservan en el sistema como prueba.

Última actualización: <<DATE>>

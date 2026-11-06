# Verificación de dominios y redes

Cómo consultar disponibilidad con evidencia. Anota cada resultado con su fecha y su fuente. «Libre» significa «no registrado en la consulta de ese día»: no autoriza a usar la marca.

Consultar e informar es tu parte. Crear cuentas, reservar usuarios y registrar dominios lo hace el equipo.

## Controles

Antes de confiar en un método de consulta, pruébalo con dos nombres: uno que seguro existe (google, nasa) y uno inventado (qzxvkwplmt7731). Si los dos dan el mismo resultado, ese método no sirve para ese sitio.

## Dominios

Orden: el .com primero, porque es filtro; después el .com.ar; después los del bot (.ai y .app); al final, los de protección.

| Dominio | Dónde consultarlo | «No registrado» se ve así |
|---|---|---|
| .com | RDAP `https://rdap.verisign.com/com/v1/domain/NOMBRE.com` | HTTP 404 |
| .net | RDAP `https://rdap.verisign.com/net/v1/domain/NOMBRE.net` | HTTP 404 |
| .app | RDAP `https://pubapi.registry.google/rdap/domain/NOMBRE.app` | HTTP 404 |
| .io, .chat | RDAP `https://rdap.identitydigital.services/rdap/domain/NOMBRE.TLD` | HTTP 404 |
| .auto, .car, .cars, .lat | RDAP `https://rdap.centralnic.com/TLD/domain/NOMBRE.TLD` | HTTP 404 |
| .co | RDAP `https://rdap.registry.co/co/domain/NOMBRE.co` | HTTP 404 |
| .bot | RDAP `https://rdap.nominet.uk/bot/domain/NOMBRE.bot` | HTTP 404 |
| .org | RDAP `https://rdap.publicinterestregistry.org/rdap/domain/NOMBRE.org` | HTTP 404 |
| .com.ar | WHOIS `whois.nic.ar`, puerto 43 | «El dominio no se encuentra registrado en NIC Argentina» |
| .ai | WHOIS `whois.nic.ai`, puerto 43 | «Domain not found» |

El RDAP de NIC Argentina no responde (probado en octubre y noviembre de 2026): por eso el .com.ar va por WHOIS. Sin un cliente `whois` instalado, bash alcanza:

```bash
timeout 20 bash -c "exec 3<>/dev/tcp/whois.nic.ar/43; printf '%s\r\n' 'NOMBRE.com.ar' >&3; cat <&3"
```

Para tandas grandes:

- Consulta cada registro directo. El directorio general `rdap.org` corta con HTTP 429 cuando recibe consultas en paralelo, y no conoce algunos dominios (.co, .chat).
- Verisign aguantó 10 consultas a la vez: `xargs -P 10` sobre un archivo con un nombre por línea.
- Para esperar procesos lanzados con `&`, usa `wait` solo en su línea: un `wait` dentro de un pipe (`wait | sort`) no los espera, y la lista sale cortada.

### Qué dominios importan para este tipo de proyecto

- **Imprescindibles**: .com (es el que la gente escribe de memoria) y .com.ar (confianza local).
- **Si el producto suma un bot o asistente**: .ai (hoy se asocia con inteligencia artificial; es más caro) y .app.
- **Protección, si hay presupuesto**: .co (por quien escribe mal .com), .chat, .bot, .lat, .net y .org.
- **Poco recomendables**: .auto, .car y .cars (caros y casi nadie los escribe de memoria); .io (dudas sobre su futuro por el traspaso de soberanía del territorio que representa); .xyz y .online (transmiten poca confianza).

## Redes

Consulta con el navegador integrado, como lo haría una persona. Con curl, Instagram, TikTok y Facebook devuelven la misma página para una cuenta real y para una inventada.

| Red | Dirección | Sin perfil visible | Fuerza de la señal |
|---|---|---|---|
| Instagram | `https://www.instagram.com/USUARIO/` | «Profile isn't available» | media: sale también con cuentas suspendidas o desactivadas |
| TikTok | `https://www.tiktok.com/@USUARIO` | «Couldn't find this account» | media, por lo mismo |
| Facebook | `https://www.facebook.com/USUARIO` | «This content isn't available right now» | débil: sale también con perfiles privados |

- A veces TikTok carga la página vacía: espera unos segundos y vuelve a leerla.
- Si el perfil existe, anota de quién es: cuenta personal o negocio, rubro, país y seguidores. La rúbrica resta distinto según el caso.
- «Sin perfil visible» es una señal, no una garantía: la prueba definitiva es crear el usuario en la aplicación.

**Telegram** (para el bot; regla del equipo del 4/11/2026): `https://t.me/USUARIO` con curl. Si existe, la página trae el bloque `tgme_page_extra` y el nombre en `og:title`; si está libre, no lo trae (control: `durov` existe, uno inventado no). Un bot de Telegram tiene que terminar en «bot»: consultar `NOMBREbot` y `NOMBRE_bot`, además del usuario exacto. Telegram pide al menos 5 letras.

**WhatsApp**: desde el 29/6/2026 los nombres de usuario se reservan dentro de la aplicación (Ajustes > Cuenta > Nombre de usuario), a medida que WhatsApp lo habilita para cada cuenta. No hay forma de consultarlos desde afuera. Las empresas pueden reservar el mismo usuario que ya tienen en Instagram o Facebook, así que asegurar esas dos ayuda a asegurar WhatsApp.

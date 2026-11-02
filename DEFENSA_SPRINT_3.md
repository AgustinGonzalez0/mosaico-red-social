# Mosaico: corrección integral y defensa del Sprint 3

Revisión del 2 de noviembre de 2026 sobre `main`, partiendo de `f76a83b7d75378079a69996af6505a98fb47a469`. El HEAD local coincidía con el commit auditado y el árbol de trabajo estaba limpio. No se hicieron commits, push ni Pull Requests.

## Problemas encontrados y correcciones

| Problema | Solución y evidencia |
|---|---|
| El detalle agregaba un `_id` string y devolvía 404 para publicaciones existentes. | Se convierte con `new Types.ObjectId(id)` y se conserva `ParseObjectIdPipe`. Los e2e prueban 200 con autor/Me gusta, 400 por ID inválido y 404 por inexistente/eliminada. |
| Mi Perfil invocaba `takeUntilDestroyed()` fuera del contexto de inyección. | Se inyecta `DestroyRef` y se pasa explícitamente al operador dentro de `ngOnInit`. Las pruebas verifican últimas tres publicaciones, comentarios, eliminación y cancelación al destruir. |
| El detalle pedía cincuenta comentarios y carecía de paginación. | Solicita cinco por bloque. Los Signals guardan comentarios, carga, offset y `hasMore`. Un Set de IDs evita duplicados; el offset avanza según la página recibida. Se bloquean peticiones simultáneas y los errores conservan la lista. |
| Crear o editar un comentario no mantenía correctamente el estado de la pantalla. | Crear inserta al principio e incrementa el offset en uno, porque el nuevo registro desplaza los siguientes resultados del servidor. Editar reemplaza únicamente ese ID y mantiene la posición y fecha. Los cambios se aplican al recibir confirmación. |
| Se podía editar un comentario de una publicación eliminada. | `editar()` reutiliza `verificarPublicacion()` antes de modificar. La consulta también exige que el comentario pertenezca a esa publicación y que el usuario sea su autor. |
| La autenticación usaba un refresh token de siete días y renovación automática ante 401. | Se eliminó ese contrato. `/auth/autorizar` y `/auth/refrescar` reutilizan `JwtAuthGuard`. Solo se emiten JWT de acceso de quince minutos; el guard rechaza otros tipos, firma inválida, vencimiento, identidad inválida y cuenta deshabilitada. |
| La carga inicial solo confiaba en la fecha del JWT local. | Ahora muestra spinner y llama al servidor. Hasta esa respuesta `autenticado` es falso y no se renderiza el outlet. Un 401 limpia la sesión y navega al login; los errores de red muestran Reintentar. |
| Faltaba el aviso de los diez minutos. | AuthService controla un solo temporizador: calcula el aviso como `exp - 5 minutos` y luego programa la expiración real. El modal reutiliza ModalService y ofrece Extender sesión/Ahora no. |
| El interceptor refrescaba y repetía automáticamente solicitudes. | Adjunta el JWT solo a la API propia. Un 401 protegido cierra sesión y redirige; login, registro, autorizar y refrescar gestionan sus propios errores. No hay repetición automática. |
| Todos los 401 del login se mostraban como contraseña incorrecta. | Solo se traducen los mensajes de credenciales inválidas; se conserva el mensaje de cuenta deshabilitada, red y demás errores. |
| Los errores del formulario ocultaban el detalle y la presentación era incompleta. | Se separan errores del detalle, comentarios y formulario. Se muestran imagen grande, autor/avatar/fecha, likes, comentarista/avatar/fecha, Editado y acciones propias. Los estilos incluyen adaptación a pantallas pequeñas. |
| El muro del Sprint 2 había cambiado a Cargar más sin actualizar su contrato de pruebas. | Se restauró Anterior/Siguiente desde el comportamiento previo `2bbe476`, manteniendo `ngOnInit`, un único método de consulta y parámetros de orden/página. La paginación incremental corresponde a los comentarios. |
| Había pruebas incompletas y dependencias faltantes en tests. | Se agregaron suites de detalle, guards, arranque y sesión con reloj simulado; se actualizó PostCard con el router requerido por RouterLink y se ampliaron los e2e del backend. |

## Métodos para explicar al profesor

Las líneas corresponden a los archivos finales formateados de esta entrega. Los controllers delegan, los servicios HTTP solicitan datos y los servicios del backend aplican las reglas de negocio.

| Funcionalidad | Método | Archivo | Línea exacta | Qué explicarle al profesor |
|---|---|---|---:|---|
| Inicializar el arranque | `ngOnInit()` | `frontend/src/app/app.ts` | 62 | Sin parámetros; llama una vez a validarSesion para iniciar la autorización. |
| Pantalla de carga y autorización inicial | `validarSesion()` | `frontend/src/app/app.ts` | 66 | Lee la sesión, llama a AuthService.autorizar y actualiza spinner/error o navega según la respuesta. |
| Inicializar el detalle | `ngOnInit()` | `frontend/src/app/pages/detalle-publicacion/detalle-publicacion.ts` | 43 | Sin parámetros; inicia obtenerPublicacion cuando el componente está listo. |
| Cargar el detalle | `obtenerPublicacion()` | `frontend/src/app/pages/detalle-publicacion/detalle-publicacion.ts` | 47 | Toma el ID de la ruta; usa el servicio HTTP, actualiza la publicación y luego carga comentarios. |
| HTTP del detalle | `obtenerPublicacion(id)` | `frontend/src/app/core/services/publicaciones.service.ts` | 68 | Recibe un ID y devuelve un Observable con la respuesta de GET /publicaciones/:id. |
| Detalle desde MongoDB | `obtener(id, usuarioId)` | `backend/src/publicaciones/publicaciones.service.ts` | 94 | Convierte el ID a ObjectId, reutiliza la consulta existente y devuelve una publicación activa o lanza 404. |
| Primer bloque y siguientes de comentarios | `cargarComentarios()` | `frontend/src/app/pages/detalle-publicacion/detalle-publicacion.ts` | 72 | Usa el ID y offset de los Signals; pide cinco, agrega IDs nuevos y actualiza offset/hasMore. Conserva datos al fallar. |
| Botón incremental | `cargarMasComentarios()` | `frontend/src/app/pages/detalle-publicacion/detalle-publicacion.ts` | 101 | Solo pide otro bloque cuando hasMore es verdadero; cargarComentarios bloquea peticiones simultáneas. |
| Guardar comentario desde el formulario | `guardarComentario()` | `frontend/src/app/pages/detalle-publicacion/detalle-publicacion.ts` | 105 | Valida el mensaje y el estado de carga; elige POST o PUT y actualiza la lista únicamente cuando el servidor confirma. |
| Preparar edición | `editarComentario(comentario)` | `frontend/src/app/pages/detalle-publicacion/detalle-publicacion.ts` | 139 | Recibe el comentario propio, guarda su ID y copia su texto al formulario. |
| HTTP de creación | `crearComentario(publicacionId, mensaje)` | `frontend/src/app/core/services/publicaciones.service.ts` | 72 | Envía solo el mensaje por POST y devuelve el comentario confirmado. |
| HTTP de edición | `editarComentario(publicacionId, comentarioId, mensaje)` | `frontend/src/app/core/services/publicaciones.service.ts` | 76 | Envía PUT con el mensaje; no envía autor ni campos internos. |
| Crear en el backend | `crear(publicacionId, dto, usuarioId)` | `backend/src/publicaciones/comentarios.service.ts` | 45 | Comprueba la publicación activa, guarda el autor autenticado y devuelve el comentario con sus datos públicos. |
| Editar en el backend | `editar(publicacionId, comentarioId, dto, usuarioId)` | `backend/src/publicaciones/comentarios.service.ts` | 59 | Verifica publicación, pertenencia y autor; cambia el texto y modificado, conservando createdAt. |
| Listar desde MongoDB | `listar(publicacionId, paginacion)` | `backend/src/publicaciones/comentarios.service.ts` | 79 | Usa sort, skip y limit en MongoDB y devuelve data/total/offset/limit/hasMore. |
| Autorizar desde Angular | `autorizar()` | `frontend/src/app/core/services/auth.service.ts` | 44 | Envía POST /auth/autorizar con el token adjuntado por el interceptor y actualiza al usuario confirmado por el servidor. |
| Renovar desde Angular | `refrescar()` | `frontend/src/app/core/services/auth.service.ts` | 53 | Rechaza concurrencia o vencimiento local; solicita POST /auth/refrescar y guarda la respuesta si la sesión sigue siendo la misma. |
| Autorizar en NestJS | `autorizar(usuario)` | `backend/src/auth/auth.service.ts` | 71 | Devuelve los datos públicos de la cuenta que el guard ya verificó, evitando otra consulta duplicada. |
| Renovar en NestJS | `refrescar(usuario)` | `backend/src/auth/auth.service.ts` | 75 | Usa el usuario validado por el mismo guard y emite un nuevo JWT con la configuración de quince minutos. |
| Validar JWT y cuenta | `canActivate(context)` | `backend/src/auth/jwt-auth.guard.ts` | 23 | Extrae Bearer, verifica firma/exp/tipo/sub, consulta la cuenta y deja sus datos públicos en la solicitud. |
| Proteger rutas del cliente | `authGuard` | `frontend/src/app/core/guards/auth.guard.ts` | 5 | Exige autorización previa del servidor y vigencia local; se aplica también a las rutas hijas. |
| Interceptor HTTP | `authInterceptor` | `frontend/src/app/core/interceptors/auth.interceptor.ts` | 7 | Adjunta Bearer solo a nuestra API; ante un 401 protegido limpia la sesión y navega al login, sin refrescar ni reintentar. |
| Comprobar vigencia local | `tokenVigente()` | `frontend/src/app/core/services/auth.service.ts` | 96 | Compara exp con el reloj. Sirve para el temporizador; no sustituye la autorización del backend. |
| Control del temporizador | `comprobarVencimiento()` | `frontend/src/app/core/services/auth.service.ts` | 101 | Cancela el timeout anterior y programa el único evento siguiente: aviso o cierre por expiración. |
| Modal de extensión | `ofrecerExtension()` | `frontend/src/app/core/services/auth.service.ts` | 117 | Marca el aviso para ese token, programa su vencimiento y pregunta con ModalService; renueva únicamente si se acepta a tiempo. |
| Cierre local | `logout()` | `frontend/src/app/core/services/auth.service.ts` | 71 | Detiene temporizador/listeners, cierra el aviso y elimina sesión y marca del almacenamiento. |
| Inicializar Mi Perfil | `ngOnInit()` | `frontend/src/app/pages/mi-perfil/mi-perfil.ts` | 44 | Configura y ejecuta la carga de las últimas tres publicaciones; takeUntilDestroyed recibe DestroyRef explícitamente. |
| Inicializar el muro | `ngOnInit()` | `frontend/src/app/pages/publicaciones/publicaciones.ts` | 47 | Inicia la primera consulta por fecha y página uno. |
| Consultar el muro | `cargarPublicaciones(orden, pagina)` | `frontend/src/app/pages/publicaciones/publicaciones.ts` | 51 | Convierte página a offset y cancela la consulta anterior; MongoDB ordena y pagina. |

## Endpoints definitivos

| Método y ruta | Entrada y resultado |
|---|---|
| `POST /auth/registro` | Multipart validado. Devuelve `{ usuario, token }`, código 201. |
| `POST /auth/login` | Usuario/correo y contraseña. Devuelve `{ usuario, token }`, código 200. |
| `POST /auth/autorizar` | Bearer vigente. Devuelve los datos públicos actuales del usuario, código 200; inválido/vencido/deshabilitado: 401. |
| `POST /auth/refrescar` | Bearer vigente. Devuelve `{ usuario, token }` con quince minutos nuevos, código 200; inválido/vencido/deshabilitado: 401. |
| `GET /publicaciones?orden=fecha\|meGusta&autor=<id>&offset=0&limit=3` | Listado paginado; orden/filtro/paginación ejecutados en MongoDB. |
| `GET /publicaciones/:id` | Publicación activa con autor y estado de Me gusta. |
| `POST /publicaciones` | Alta multipart validada del usuario autenticado, código 201. |
| `DELETE /publicaciones/:id` | Baja lógica por autor o administrador, código 204. |
| `POST /publicaciones/:id/me-gusta` | Agrega el Me gusta propio, código 201. |
| `DELETE /publicaciones/:id/me-gusta` | Quita el Me gusta propio, código 200. |
| `GET /publicaciones/:id/comentarios?offset=0&limit=5` | Comentarios recientes primero con data/total/offset/limit/hasMore, código 200. |
| `POST /publicaciones/:id/comentarios` | JSON `{ mensaje }`, código 201. Autor obtenido del JWT; publicación activa obligatoria. |
| `PUT /publicaciones/:id/comentarios/:comentarioId` | JSON `{ mensaje }`, código 200. Solo su autor; publicación activa obligatoria. |

`/auth/refresh` y el endpoint vacío `/auth/logout` se retiraron. El cierre de sesión elimina el JWT del cliente. El backend exige autenticación en todas las rutas de publicaciones y comentarios.

## Resultados reales de verificación

| Comprobación | Resultado final |
|---|---|
| Frontend: `npm.cmd run build` | Correcto, build de producción sin warnings. |
| Frontend: `npm.cmd test -- --watch=false` | 10 archivos de pruebas, **92 pruebas aprobadas**. |
| Backend: `npm.cmd run build` | Correcto. |
| Backend: `npm.cmd test` | 3 archivos, **44 pruebas unitarias aprobadas**. |
| Backend: `npm.cmd run test:e2e` | 2 archivos, **72 pruebas e2e aprobadas** contra MongoDB en memoria. |
| Backend: `npm.cmd run lint` | Correcto, sin warnings ni errores. |
| Frontend: lint | No existe script ni configuración de lint en este proyecto; no se agregó una herramienta ajena a la consigna. |
| `git diff --check` | Correcto, sin errores de espacios. |
| Revisión visual en navegador | No completada: el host de acceso al navegador no estaba disponible y caducó la autorización de la ventana nativa. No se presenta como aprobada. |

Las pruebas del reloj usan timers simulados de Vitest. Comprueban aviso a los diez minutos, rechazo/aceptación, nuevo aviso tras renovar, token con doce minutos al recargar, aviso ya mostrado, retorno de suspensión, expiración con modal abierto, ausencia de renovaciones simultáneas y respuesta tardía después de cerrar sesión.

El primer intento de build detectó funciones espía de Vitest dentro de un archivo de fixtures que también verifica TypeScript al compilar producción. Se movió la creación de esas funciones espía a los specs. También se corrigieron los providers de RouterLink y advertencias de interpolación en los e2e. Los resultados de la tabla corresponden a las ejecuciones finales posteriores a esas correcciones.

Angular necesitó ejecutarse fuera del sandbox por los errores de permisos de lectura de rutas del entorno ya observados en la implementación previa. Las pruebas pudieron ejecutarse y pasaron. Se levantó una vista previa con una base temporal para intentar la inspección visual; se retiró su script y se detuvieron sus procesos al finalizar. No se utilizó la base configurada en `.env`.

## Auditoría final de la consigna

### Frontend

- [x] Publicación ampliada con imagen, título, descripción, autor, avatar, fecha y cantidad de Me gusta.
- [x] Comentarios visibles, ordenados y con datos de sus autores y fechas.
- [x] Crear comentarios con validación de texto, espacios y longitud.
- [x] Editar solo comentarios propios y mostrar Editado tras la confirmación.
- [x] Comentarios paginados mediante Cargar más, cinco por bloque, acumulación sin duplicados y errores recuperables.
- [x] Token guardado localmente y sesión habilitada solo después de la autorización del backend.
- [x] Pantalla inicial con spinner, autorización contra /auth/autorizar y redirección según el resultado.
- [x] Error de red inicial con Reintentar.
- [x] Modal a los diez minutos y renovación únicamente al aceptar con token vigente.
- [x] Rechazar la extensión conserva la sesión solo hasta exp; recargar no reinicia la duración.
- [x] Un 401 protegido limpia la sesión y envía al login sin renovación automática.
- [x] Mi Perfil inicia en ngOnInit y cancela sus consultas al destruirse.
- [x] El muro conserva Anterior/Siguiente y consulta orden/paginación en el backend.

### Backend

- [x] GET del detalle por ObjectId con manejo 400/404 y estado de Me gusta.
- [x] POST y PUT de comentarios con DTO validado y campos extra rechazados.
- [x] GET de comentarios paginado y ordenado en MongoDB.
- [x] Verificación de autor, pertenencia del comentario y publicación activa.
- [x] JWT con identidad, rol y tipo acceso, vencimiento de quince minutos.
- [x] POST /auth/autorizar y POST /auth/refrescar reutilizan el mismo guard.
- [x] Rechazo de tokens vencidos, inválidos, de otro tipo y de cuentas deshabilitadas.
- [x] Respuestas de usuario públicas, sin hash de contraseña.

Los puntos funcionales anteriores se respaldan en pruebas de componentes, HTTP y e2e; el ajuste visual en escritorio y móvil está implementado con CSS, pero queda pendiente su inspección manual en un navegador por la limitación de acceso indicada.

## Archivos modificados

Backend:

- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/jwt-auth.guard.ts`
- `backend/src/auth/jwt-auth.guard.spec.ts`
- `backend/src/auth/usuario-autenticado.ts`
- `backend/src/publicaciones/publicaciones.service.ts`
- `backend/src/publicaciones/comentarios.service.ts`
- `backend/src/publicaciones/dto/crear-comentario.dto.ts`
- `backend/src/publicaciones/schemas/comentario.schema.ts`
- `backend/test/publicaciones.e2e-spec.ts`

Frontend:

- `frontend/src/app/app.ts`
- `frontend/src/app/app.spec.ts`
- `frontend/src/app/app.routes.ts`
- `frontend/src/app/core/guards/auth.guard.ts`
- `frontend/src/app/core/guards/auth.guard.spec.ts` (nuevo)
- `frontend/src/app/core/interceptors/auth.interceptor.ts`
- `frontend/src/app/core/models/usuario.model.ts`
- `frontend/src/app/core/services/auth.service.ts`
- `frontend/src/app/core/services/auth.service.spec.ts` (nuevo)
- `frontend/src/app/core/services/publicaciones.service.ts`
- `frontend/src/app/core/services/publicaciones.service.spec.ts`
- `frontend/src/app/pages/detalle-publicacion/detalle-publicacion.ts`
- `frontend/src/app/pages/detalle-publicacion/detalle-publicacion.html`
- `frontend/src/app/pages/detalle-publicacion/detalle-publicacion.scss`
- `frontend/src/app/pages/detalle-publicacion/detalle-publicacion.spec.ts` (nuevo)
- `frontend/src/app/pages/login/login.ts`
- `frontend/src/app/pages/login/login.spec.ts`
- `frontend/src/app/pages/mi-perfil/mi-perfil.ts`
- `frontend/src/app/pages/mi-perfil/mi-perfil.spec.ts`
- `frontend/src/app/pages/publicaciones/publicaciones.ts`
- `frontend/src/app/pages/publicaciones/publicaciones.html`
- `frontend/src/app/shared/post-card/post-card.ts`
- `frontend/src/app/shared/post-card/post-card.spec.ts`
- `frontend/src/app/testing/fixtures.ts`

Documentación: `README.md` y este informe. No se agregaron dependencias de ejecución ni una arquitectura nueva de sesiones.

## Respuestas breves para la defensa oral

**¿Por qué utilizamos ngOnInit?** Para iniciar la carga una vez que Angular inicializó el componente. El constructor queda dedicado a su creación; las suscripciones usan DestroyRef para limpiarse al destruirlo.

**¿Cómo funciona la paginación de comentarios?** Pedimos cinco comentarios con offset cero. El backend ordena los más recientes primero. Cargar más pide los siguientes cinco, agrega IDs nuevos y avanza el offset; hasMore indica si queda otro bloque.

**¿Cómo evitamos editar comentarios ajenos?** El frontend solo muestra Editar en los propios. La seguridad la impone el backend: compara el autor del comentario con el usuario verificado del JWT y devuelve 403 si no coinciden.

**¿Cómo se valida un JWT?** El guard extrae Bearer y verifica firma y vencimiento con JwtService. También valida el tipo y la identidad y consulta que la cuenta siga habilitada. El rol utilizado es el actual de la base.

**¿Qué diferencia hay entre autorizar y refrescar?** Autorizar confirma la sesión existente y devuelve al usuario. Refrescar exige una sesión todavía válida y emite otro JWT con quince minutos de duración.

**¿Por qué no podemos refrescar un token vencido?** Porque esta consigna exige una sesión vigente para extenderla. Si ya venció, el mismo guard devuelve 401 y hay que iniciar sesión nuevamente.

**¿Qué ocurre a los diez minutos?** El servicio de autenticación muestra el modal para extender. El cálculo parte del vencimiento real del token, por eso recargar la página no reinicia los quince minutos.

**¿Qué pasa si rechaza extender?** El token no cambia y el aviso no se repite para ese token. Al llegar a exp se limpian la sesión y el temporizador y se vuelve al login.

**¿Qué ocurre si el backend devuelve 401?** Si es una petición protegida, el interceptor cierra sesión y redirige al login sin repetirla. Login, registro, autorización inicial y extensión manejan sus mensajes específicos.

**¿Qué sucede si falla Cargar más o guardar un comentario?** Conservamos los datos ya visibles y el texto del formulario. Solo actualizamos la lista cuando el servidor confirma y el usuario puede reintentar.

## Pendientes y límites

No quedaron fallos de build, tests o lint conocidos. Queda pendiente únicamente la revisión visual manual del detalle en escritorio y móvil porque el acceso al navegador no se autorizó a tiempo. No se desplegó ni se modificó ningún servicio externo.

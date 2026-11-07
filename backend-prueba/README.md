# Etapa 2: NestJS con conexión a MongoDB

Aplicación NestJS mínima que intenta conectarse a MongoDB al iniciar. Todavía no agrega usuarios ni autenticación.

Ruta: `GET /api/hola` (la raíz `/` también se reescribe a esa ruta).

Respuesta esperada si la conexión de MongoDB funciona: `funciona!!!`

Para desplegar, elegí `backend-prueba` como **Root Directory** y NestJS como **Framework Preset**. Configurá `MONGODB_URI` en las variables de entorno de Vercel para Production y Preview.

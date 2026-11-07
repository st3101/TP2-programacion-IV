# Etapa 1: función mínima de Vercel

Esta función no usa NestJS ni MongoDB. Sirve para comprobar que Vercel ejecuta una API Node sencilla.

Ruta: `GET /api/hola`

Respuesta esperada: `{ "mensaje": "funciona!!!" }`

Para probarla, importá el repositorio en un proyecto Vercel nuevo y elegí `backend-prueba` como **Root Directory**. No necesita variables de entorno.

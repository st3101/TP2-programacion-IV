# API NestJS para Vercel

API mínima con NestJS. La ruta `GET /` devuelve `{"message":"La API funciona"}`.

## Desarrollo local

Requiere Node.js 20 o superior.

Configura `MONGODB_URI` en `.env` usando la URI de MongoDB Atlas. El archivo
`.env` es local y está excluido de Git; en Vercel se configurará la misma clave
`MONGODB_URI` en las variables de entorno del proyecto. Node.js carga el `.env`
al iniciar en local y NestJS abre una conexión Mongoose al arrancar. `GET /`
responde con el estado de la API y hace un ping a MongoDB; si no puede acceder,
devuelve HTTP 503.

```bash
npm install
npm run start:dev
```

Abrir `http://localhost:3000/`.

## Vercel

Importar el repositorio en Vercel y mantener el comando de build `npm run build`.
El punto de entrada serverless está en `api/index.ts`; las rutas se reescriben
para que NestJS gestione la petición. No se configura una base de datos todavía.

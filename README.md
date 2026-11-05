# Lobby — red social de videojuegos

El repositorio contiene dos proyectos independientes:

- `frontend/`: aplicación web en Angular.
- `backend/`: API en NestJS.

## Ejecutar el frontend

```powershell
cd frontend
npm start
```

## Ejecutar el backend

```powershell
cd backend
npm run start:dev
```

El backend expone estas rutas de autenticación:

- `POST http://localhost:3000/auth/registro`: crea la cuenta y devuelve un token de acceso.
- `POST http://localhost:3000/auth/login`: valida el correo y la contraseña y devuelve un token de acceso.
- `GET http://localhost:3000/usuarios/me`: devuelve el perfil del usuario del token y sus últimas tres publicaciones con comentarios.
- `PATCH http://localhost:3000/usuarios/me`: actualiza los datos editables del perfil. Requiere `Authorization: Bearer <accessToken>`.

El archivo local `backend/.env` debe tener `MONGODB_URI` y `JWT_SECRET`. El proyecto genera un `JWT_SECRET` local si todavía no existía; no compartas ese archivo.

El frontend tiene formularios en `/registro` y `/login`, y la pantalla `/mi-perfil`. Al registrarse o iniciar sesión, guarda el token para enviarlo como `Authorization: Bearer ...` en las próximas solicitudes. El registro usa `multipart/form-data` para aceptar una imagen de perfil (JPG, PNG o WEBP, hasta 5 MB); los archivos se guardan en `backend/uploads/profiles` y se sirven desde `/uploads/profiles`.

Para registrarse desde Postman, elegí `Body > form-data` y enviá `nombre`, `apellido`, `correo`, `nombreUsuario`, `password`, `repetirPassword`, `fechaNacimiento`, `descripcion` y, opcionalmente, el archivo `imagenPerfil`. Para iniciar sesión, el cuerpo JSON usa `identificador` (correo o nombre de usuario) y `password`. La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.

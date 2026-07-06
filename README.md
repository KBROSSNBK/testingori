# Rincón Literario

Aplicación web para reseñar libros con calificación de estrellas (1 a 5) e intercambiar libros con otros lectores, con estética vintage y portadas obtenidas públicamente desde la API de Google Books.

## Funcionalidades

- Buscar un libro por título/autor y seleccionar su portada oficial para escribir una reseña con calificación de 1 a 5 estrellas.
- Publicar un libro propio en el catálogo de intercambio, con estado de conservación y notas.
- Ver el catálogo público y proponer un intercambio por uno de tus libros publicados.
- Flujo de aprobación: toda propuesta de intercambio queda pendiente hasta que el dueño del libro la aprueba o la rechaza en la sección "Mis Intercambios".

## Cómo usarla

Este sitio es estático (HTML/CSS/JS) y puede publicarse con GitHub Pages. Al entrar, se te pedirá un nombre para identificar tus reseñas y publicaciones.

## Nota importante (prototipo)

Esta versión es un prototipo de interfaz sin servidor ni base de datos propia: toda la información (reseñas, catálogo, solicitudes) se guarda únicamente en el navegador de cada persona mediante `localStorage`. Esto significa que no hay cuentas de usuario reales ni sincronización entre distintos dispositivos o navegadores. Para que la plataforma funcione entre varias personas de forma real, en el futuro se necesitaría agregar un backend con base de datos y autenticación de usuarios.

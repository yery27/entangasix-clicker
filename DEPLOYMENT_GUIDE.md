# 🚀 Guía de Despliegue: GitHub y Vercel

Sigue estos pasos para subir tu juego a internet y compartirlo con tus amigos.

## 1. Instalar Git
Parece que no tienes Git instalado o configurado en tu terminal.
1. Descarga Git desde [git-scm.com](https://git-scm.com/downloads).
2. Instálalo (dale a "Next" a todo por defecto).
3. **Importante**: Reinicia tu terminal (o VS Code) después de instalarlo.

## 2. Preparar el Repositorio Local
Una vez instalado Git, abre una **nueva terminal** en la carpeta de tu proyecto y ejecuta estos comandos uno por uno:

```bash
# 1. Inicializar git
git init

# 2. Añadir todos los archivos
git add .

# 3. Guardar los cambios
git commit -m "Primera versión del juego"
```

## 3. Subir a GitHub
1. Ve a [github.com](https://github.com) e inicia sesión.
2. Crea un **New Repository** (botón verde).
3. Ponle un nombre (ej: `entangasix-clicker`).
4. Déjalo en **Public**.
5. **No** marques ninguna casilla de "Initialize this repository with...".
6. Dale a **Create repository**.

Te saldrá una pantalla con instrucciones. Copia las líneas que aparecen bajo **"…or push an existing repository from the command line"**. Serán algo así:

```bash
git remote add origin https://github.com/TU_USUARIO/entangasix-clicker.git
git branch -M main
git push -u origin main
```
Pega y ejecuta esos comandos en tu terminal.

## 4. Desplegar en Vercel
1. Ve a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de **GitHub**.
2. Dale a **"Add New..."** -> **"Project"**.
3. Verás tu repositorio `entangasix-clicker` en la lista "Import Git Repository". Dale a **Import**.
4. En la configuración:
   - **Framework Preset**: Vite (se suele detectar solo).
   - **Root Directory**: `./` (déjalo tal cual).
   - **Build Command**: `npm run build` (déjalo tal cual).
5. Dale a **Deploy**.

¡Espera unos segundos y Vercel te dará un enlace (ej: `entangasix-clicker.vercel.app`) para que todos puedan jugar! 🎮

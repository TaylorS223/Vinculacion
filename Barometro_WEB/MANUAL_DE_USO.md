# Manual de Uso — Barometro ULEAM

Plataforma de formularios dinámicos y recolección de datos para ULEAM.

- **Web (administradores/gestores)**: http://localhost:4200
- **Móvil (recolectores)**: http://localhost:4201

---

## 1. Roles del Sistema

| Rol | Acceso | ¿Qué puede hacer? |
|-----|--------|-------------------|
| **SUPER_ADMIN** | Web | Crea usuarios, gestiona todo |
| **ADMIN** | Web | Crea proyectos, gestiona formularios |
| **PROJECT** | Web | Gestiona formularios de sus proyectos |
| **RECOLECTOR** | Móvil | Recolecta datos y completa formularios |

---

## 2. Web (Panel Administrativo)

### 2.1 Inicio de sesión

1. Abre http://localhost:4200
2. Ingresa **correo** y **contraseña** proporcionados por el administrador
3. Haz clic en **Iniciar sesión**

### 2.2 Dashboard

Después del login ves el panel principal con:
- **Mis formularios** — formularios que creaste
- **Formularios compartidos** — formularios que otros compartieron contigo
- Buscador y filtros por estado (Borrador/Publicado/Archivado)

### 2.3 Proyectos

Los formularios se organizan dentro de **proyectos**.

**Crear proyecto** (ADMIN o SUPER_ADMIN):
1. Ve a la sección **Proyectos**
2. Haz clic en **Nuevo proyecto**
3. Ingresa nombre, descripción y asigna líderes
4. Guarda

### 2.4 Formularios

**Crear formulario**:
1. Desde el Dashboard haz clic en **Nuevo formulario**
2. Selecciona el proyecto al que pertenecerá
3. Ingresa título y opcionalmente una descripción
4. Agrega preguntas:
   - **Texto** — respuesta libre corta
   - **Número** — respuesta numérica
   - **Opción múltiple** — selección única o múltiple
   - **Likert** — escala de valoración con filas y columnas
5. Configura si es **paso a paso** (una pregunta por vez)
6. Guarda el formulario

**Publicar formulario**: Una vez listo, haz clic en **Publicar** para que los recolectores puedan verlo.

**Compartir formulario** (PROJECT o ADMIN):
1. Abre el formulario
2. En la sección **Compartir**, ingresa el correo del usuario
3. Selecciona el rol:
   - **PROJECT** — puede editar el formulario
   - **RECOLECTOR** — solo puede recolectar respuestas
4. Asigna **respuestas objetivo** (opcional)
5. Confirma

**Ver respuestas**: En la lista de formularios, haz clic en el ícono de respuestas para ver gráficos y datos recolectados.

### 2.5 Usuarios (solo SUPER_ADMIN)

En **Usuarios** puedes:
- **Crear usuario**: nombre, correo, contraseña y rol
- **Editar usuario**: cambiar datos, activar/desactivar
- **Cambiar rol**: de un usuario existente
- **Eliminar usuario**: solo si no tiene formularios asociados

### 2.6 Perfil

En **Configuración** puedes:
- Editar tu nombre, teléfono, cargo y biografía
- Subir foto de perfil
- Cambiar tema claro/oscuro

---

## 3. App Móvil (Recolección)

### 3.1 Inicio de sesión

1. Abre http://localhost:4201
2. Ingresa la **URL del servidor**: `http://localhost:8000`
3. Ingresa tu **correo** y **contraseña**
4. Toca **Iniciar sesión**

### 3.2 Pantalla de inicio

Después del login ves:
- **Encuestas disponibles** — formularios compartidos contigo
- **Progreso** — cantidad de respuestas enviadas vs objetivo
- Acceso directo a las secciones

### 3.3 Descargar formularios

Antes de recolectar, descarga los formularios:
1. Toca **Descargar formularios** en la pantalla de inicio
2. Los formularios se guardan offline en el dispositivo

### 3.4 Llenar encuesta

1. Toca una encuesta de la lista
2. Responde las preguntas:
   - **Texto**: escribe la respuesta
   - **Número**: ingresa un valor numérico
   - **Opción múltiple**: selecciona una o varias opciones
   - **Likert**: marca una columna por cada fila
3. Las preguntas obligatorias tienen un asterisco (*)
4. Al terminar, toca **Enviar** o **Guardar borrador**

### 3.5 Borradores

Las respuestas sin enviar se guardan como borradores. Puedes:
- Verlos en **Borradores**
- Continuar llenándolos después
- Eliminarlos si ya no los necesitas

### 3.6 Listo para enviar

Cuando tengas conexión:
1. Ve a **Listo para enviar**
2. Revisa las encuestas pendientes
3. Toca **Enviar** para subir las respuestas al servidor

### 3.7 Historial

En **Enviados** ves todas las respuestas que ya enviaste correctamente.

### 3.8 Ajustes

- **Cambiar servidor**: si el backend cambia de dirección
- **Limpiar datos**: borra todos los formularios descargados
- **Modo oscuro**: activa/desactiva tema oscuro

---

## 4. Flujo de trabajo típico

```
SUPER_ADMIN/ADMIN crea proyecto
  → ADMIN/PROJECT crea formularios dentro del proyecto
    → ADMIN/PROJECT publica el formulario
      → ADMIN/PROJECT comparte con RECOLECTORES
        → RECOLECTOR abre app móvil, descarga formularios
          → RECOLECTOR llena encuestas en campo (offline)
            → RECOLECTOR envía respuestas cuando tiene conexión
              → ADMIN/PROJECT revisa resultados en el dashboard web
```

---

## 5. Solución de problemas

| Problema | Causa | Solución |
|----------|-------|----------|
| Error "No autenticado" | Token expirado | Cierra sesión y vuelve a iniciar |
| No aparecen formularios en móvil | No se descargaron | Toca "Descargar formularios" |
| No puedo iniciar sesión | Credenciales incorrectas | Contacta al administrador |
| Formulario no se publica | Debe pertenecer a un proyecto | Asígnale un proyecto primero |

---

## 6. Cuenta inicial (desarrollo)

Usa las que te proporciona la autoridad correspondiente,
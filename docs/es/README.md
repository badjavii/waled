<div align="center">

# Waled

_Gestor de gastos personales construido para Venezuela_

[![Tech](https://img.shields.io/badge/Tech-Rust%20%7C%20Tauri%20v2-orange?labelColor=181825&style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript-blue?labelColor=181825&style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Styling](https://img.shields.io/badge/Styling-TailwindCSS-06b6d4?labelColor=181825&style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/github/license/Badjavii/waled?color=a6e3a1&labelColor=181825&style=for-the-badge)](https://github.com/Badjavii/waled/blob/main/LICENSE)

[Read this README in English](../../README.md)

</div>

## Sobre Waled

Waled es una aplicación de escritorio para llevar el registro de gastos personales en Venezuela, diseñada específicamente en torno a la realidad bimonetaria del país. Cada gasto se registra en bolívares (VES). El equivalente en dólares se deriva de la tasa oficial del BCV: se congela en el momento del pago para que los valores históricos nunca se desajusten, y se recalcula al vuelo contra la tasa de hoy cuando se necesita una vista actualizada.

La aplicación corre localmente en tu máquina. Una base de datos SQLite mantiene cada transacción, billetera y cuenta bajo tu control. La tasa BCV se obtiene desde DolarApi al arrancar y se refresca automáticamente a medianoche. Cuando estás sin conexión, la app se adapta y te permite ingresar la tasa manualmente.

Waled deliberadamente no lleva ingresos, saldos ni transferencias. Es una herramienta exclusivamente de gastos.

## Arquitectura de recordatorios y sincronización

Desde la v0.2.0, Waled se integra con dos webhooks de Google Apps Script bajo control del propio usuario, que se encargan de los recordatorios y la sincronización de estado:

- **Webhook de recordatorios**: recibe el disparo manual de "Enviar ahora" desde la app y envía un correo digest con los pagos próximos.
- **Webhook de sincronización**: recibe eventos de sincronización cada vez que creas, editas, archivas o pagas una cuenta periódica. Mantiene su propio estado en `PropertiesService` de Google y ejecuta un trigger diario a las 8am hora de Caracas que envía un correo digest consolidado con los pagos próximos, de modo que los recordatorios llegan incluso cuando tu computadora está apagada.

Cada usuario despliega sus propios scripts en su cuenta personal de Google. Waled no aloja ningún servicio compartido. Las instrucciones de despliegue y el código de los scripts están en [`docs/gas/`](../gas/).

## Características

- Registro estricto de gastos, categorizados por tipo de cuenta (servicios básicos, alimentación, educación, salud, entre otros).
- Tasa BCV histórica congelada en el momento del pago, para que el equivalente en dólares de un gasto pasado refleje la realidad económica de ese día.
- Billeteras físicas y digitales, con referencia de pago opcional para cualquier tipo.
- Dos ciclos de recordatorio por cuenta periódica (el ciclo actual más el próximo dentro de una ventana de 30 días), mostrados en tres secciones: próximos pagos, vencidos y recientemente pagados.
- Correo digest diario despachado automáticamente por Google Apps Script a las 8am hora de Caracas.
- Botón manual "Enviar ahora" que dispara un digest bajo demanda sin esperar al trigger diario.
- Sincronización strict-online de cuentas periódicas y pagos al webhook de sync cuando está configurado. El rechazo-y-reintento en caso de fallo de red mantiene el estado local y remoto alineados.
- Widget de tasa BCV en vivo que se refresca automáticamente a medianoche y manualmente cuando el usuario lo pida.
- Dashboard mensual con total de gastos, top 5 de cuentas por gasto y top 5 de pagos próximos.
- Exportación e importación completa de la base de datos en formato JSON, con validación por versión de schema.
- Directorio de respaldos configurable, con creación automática de la estructura de carpetas para respaldos manuales, de importación y de limpieza.
- Restablecimiento de la aplicación protegido por confirmación mediante escritura del nombre del usuario y respaldo automático previo.
- Interfaz en modo oscuro pensada para uso diario en escritorio.

## Construcción e instalación

### Requisitos previos

- **Node.js** 20 LTS o superior.
- Toolchain estable de **Rust**, instalado a través de [rustup](https://rustup.rs/).
- **Dependencias del sistema** para Tauri v2. Consulta la [guía de prerrequisitos de Tauri](https://tauri.app/start/prerequisites/) según tu sistema operativo.

### Clonar y configurar

```bash
git clone https://github.com/Badjavii/waled.git
cd waled

# Instalar dependencias del orquestador raíz
npm install

# Instalar dependencias del frontend
npm install --prefix frontend
```

### Desarrollo

```bash
npm run dev
```

Este comando arranca Vite para el frontend, compila el backend en Rust en modo debug y abre la ventana nativa con hot reload para los cambios de UI.

### Compilación para producción

```bash
npm run build
```

Genera un instalador nativo para la plataforma actual en `backend/target/release/bundle/`:

- **Linux**: `.AppImage` (portable, sin instalación) más `.deb` y `.rpm`.
- **Windows**: instaladores `.msi` y `.exe`.
- **macOS**: `.dmg` y `.app`.

### Releases precompiladas

Los instaladores firmados para Windows y Linux se publican automáticamente con cada tag de release. Descarga el más reciente desde la [página de Releases](https://github.com/Badjavii/waled/releases).

### Configuración de Google Apps Script

Para activar los recordatorios y la sincronización, despliega los dos scripts que están en [`docs/gas/`](../gas/) bajo tu propia cuenta de Google y pega sus URLs en la configuración de Waled. Las instrucciones detalladas paso a paso están en el [README de GAS](../gas/README.md).

## Créditos

Este proyecto es diseñado y desarrollado con orgullo por **Badjavii**, desarrollador junior.
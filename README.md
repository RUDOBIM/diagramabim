# BIMLoading · Estudio de diagramas

Editor conceptual de arquitectura en español, inspirado en las funciones públicas de ArchiDiagram. El código usa HTML, CSS y JavaScript con Vite. Funciona sin clave de Gemini. El mapa requiere conexión con OpenStreetMap.

## Abrir en Google AI Studio

1. Descomprime el ZIP y sube el contenido de la carpeta `diagrama-bim` a la raíz de un repositorio GitHub al que tengas acceso.
2. Abre https://aistudio.google.com/apps. En Build, abre el menú **+** del cuadro de instrucciones y elige **Import from GitHub**. Selecciona el repositorio.
3. Abre la vista previa. Si AI Studio pide instrucciones para ejecutar el proyecto, pega este texto:

> Ejecuta este editor de diagramas arquitectónicos con `npm run dev`. Conserva `index.html`, `src.js` y las funciones existentes. Comprueba las vistas de planta, axonometría y mapa. Verifica la edición de volúmenes, el cambio de fecha y hora solar y la descarga de SVG y PNG. Conserva la interfaz en español.

Documentación oficial de Build: https://ai.google.dev/gemini-api/docs/aistudio-build-mode

## Probar en tu PC

Con Node.js instalado, abre la terminal en esta carpeta y ejecuta:

```sh
npm install
npm run dev
```

Abre la URL que imprime Vite. Usa `npm run build` para generar la versión estática en `dist/`.

## Cómo usarlo

- Selecciona un volumen para cambiar su posición y dimensiones. El eje X crece hacia el este y el eje Y hacia el sur.
- Introduce latitud, longitud, fecha y desfase UTC local, incluido el horario de verano cuando corresponda. La hora del control se interpreta con ese desfase.
- En planta y axonometría puedes exportar una lámina vectorial SVG o un PNG de 1800 × 1180 px. El mapa de contexto se consulta por separado.
- Los cambios se guardan en el navegador. El modelo consiste en prismas rectangulares editables. La proyección de sombras aproxima la posición solar y se limita al terreno conceptual plano. No calcula sombras entre edificios ni usa elevaciones del mapa.

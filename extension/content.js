{

  const mostrarResultadosEnPagina = (candidatos) => {
    // Si ya existe una tabla abierta, la quitamos
    const existente = document.getElementById('modal-resultados-ia');
    if (existente) existente.remove();

    const modal = document.createElement("div");
    modal.id = "modal-resultados-ia";
    modal.style = `
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 85%; max-width: 650px; max-height: 80vh;
        background: #ffffff !important; border-radius: 15px; 
        box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        z-index: 1000000; padding: 25px; font-family: Arial, sans-serif;
        display: flex; flex-direction: column; border: 3px solid #0073b1;
        color: #333333 !important;
      `;

    let filas = candidatos.map(c => `
          <tr>
              <td style="padding:10px; border-bottom:1px solid #eee;">${c.nombre}</td>
              <td style="padding:12px; border-bottom:1px solid #eee; color: #555 !important; font-size: 13px;">${c.cargo}</td>
              <td style="padding:12px; border-bottom:1px solid #eee; color: #555 !important; font-size: 13px;">${c.ubicacion}</td>
              <td style="padding:12px; border-bottom:1px solid #eee; color: #555 !important; font-size: 13px;">${c.skills}</td>
              <td style="padding:10px; border-bottom:1px solid #eee;">
                  <a href="${c.url}" target="_blank" style="color:#0073b1; text-decoration:none;">🔗 Ver Perfil</a>
              </td>
          </tr>
      `).join('');

    modal.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
              <h3 style="margin:0; color:#0073b1;">Candidatos Extraídos (${candidatos.length})</h3>
              <button id="cerrar-modal" style="background:none; border:none; font-size:24px; cursor:pointer; color:#666;">&times;</button>
          </div>
          <div style="overflow-y:auto; flex-grow:1; border:1px solid #eee; border-radius:8px;">
              <table style="width:100%; border-collapse:collapse; text-align:left;">
                  <thead style="background:#f8f9fa; position:sticky; top:0;">
                      <tr>
                          <th style="padding:12px; text-align:left; color: #000 !important; border-bottom: 2px solid #ddd; font-weight: bold;">Nombre</th>
                          <th style="padding:12px; text-align:left; color: #000 !important; border-bottom: 2px solid #ddd; font-weight: bold;">Cargo</th>
                          <th style="padding:12px; text-align:left; color: #000 !important; border-bottom: 2px solid #ddd; font-weight: bold;">Ubicación</th>
                                                    <th style="padding:12px; text-align:left; color: #000 !important; border-bottom: 2px solid #ddd; font-weight: bold;">Skills</th>
                          <th style="padding:12px; text-align:right; color: #000 !important; border-bottom: 2px solid #ddd; font-weight: bold;">Acción</th>
                      </tr>
                  </thead>
                  <tbody>${filas}</tbody>
              </table>
          </div>
          <div style="margin-top:15px; display:flex; gap:10px;">
              <button id="btn-copy-modal" style="flex:1; padding:12px; background:#0073b1; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">📋 Copiar para Excel</button>
              <button id="btn-download-csv" style="flex:1; padding:12px; background:#27ae60; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">📥 Descargar CSV</button>
              <button id="btn-clear-modal" style="flex:1; padding:12px; background:#f44336; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">🗑️ Limpiar Todo</button>
          </div>
      `;


    document.body.appendChild(modal);

    // EVENTOS DE LOS BOTONES
    document.getElementById('cerrar-modal').onclick = () => modal.remove();

    document.getElementById('btn-download-csv').onclick = () => {
      let contenido = "Nombre;Cargo;Ubicacion;Skills;URL\n" +
        candidatos.map(c => `${c.nombre};${c.cargo};${c.ubicacion};${c.skills};${c.url}`).join('\n');

      // Crear el archivo y descargarlo
      const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Candidatos_Extraidos_${new Date().toLocaleDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    document.getElementById('btn-copy-modal').onclick = () => {
      let texto = "Nombre\tCargo\tUbicacion\tSkills\tURL\n" +
        candidatos.map(c => `${c.nombre}\t${c.cargo}\t${c.ubicacion}\t${c.skills}\t${c.url}`).join('\n');
      navigator.clipboard.writeText(texto).then(() => {
        alert("✅ ¡Copiado! Ya puedes pegarlo en Excel.");
      });
    };

    document.getElementById('btn-clear-modal').onclick = async () => {
      if (confirm("¿Borrar todos los datos acumulados?")) {
        await chrome.storage.local.set({ temp_candidatos: [] });
        modal.remove();
        location.reload();
      }
    };
  };

  const ejecutarScraping = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    // Extraemos ubicaciones de la URL para filtrar
    const ubicacionFiltro = urlParams.get('ubicacion') ?
      urlParams.get('ubicacion').toLowerCase().split(',').map(u => u.trim()) : [];

    // Extraemos skills de la URL para buscar coincidencias
    const skillsFiltro = urlParams.get('skills') ?
      urlParams.get('skills').toLowerCase().split(',').map(s => s.trim().replace(/["']/g, "")) : [];

    // EXTRAER SKILLS DE LOS BOOLEANOS (Parámetro 'q')
    const queryBusqueda = urlParams.get('q') ? urlParams.get('q').toLowerCase() : "";

    const terminosBooleanos = queryBusqueda.match(/"([^"]+)"/g) || [];
    const skillsDesdeQuery = terminosBooleanos.map(s => s.replace(/["']/g, "").trim())
      .filter(s => s !== "linkedin.com/in/" && s !== "colombia"); // Filtramos lo que no es skill

    const todosLosSkillsFiltro = [...new Set([...skillsFiltro, ...skillsDesdeQuery])];
    // Filtramos la lista de skills para que NO incluya palabras que ya están en el filtro de ubicación
    const listaSkillsFinal = todosLosSkillsFiltro.filter(s => !ubicacionFiltro.includes(s));

    const links = document.querySelectorAll('a');
    let resultadosEncontrados = [];
    const storage = await chrome.storage.local.get(['filtro_ubicacion_manual']);

    links.forEach(link => {
      const href = link.href.toLowerCase();
      const texto = link.innerText.toLowerCase();

      // 1. FILTRO DE TEXTO: Ignoramos si el link es un botón de navegación o filtro
      const esNavegacion = texto.includes("siguiente") ||
        texto.includes("atrás") ||
        texto.includes("imágenes") ||
        texto.includes("vídeos") ||
        texto.includes("videos") ||
        texto.includes("noticias") ||
        texto.includes("maps") ||
        texto.includes("modo ia") ||
        texto.includes("shopping") ||
        /^\d+$/.test(texto.trim()); // Esto ignora los números 1, 2, 3... de la paginación

      // 2. FILTRO DE ZONA PROHIBIDA (La clave para tu captura)
      // Buscamos si el link está dentro del footer o del área de navegación inferior
      const enZonaProhibida = link.closest('#foot') ||
        link.closest('#bottomads') ||
        link.closest('nav') || // Ignora menús de navegación
        link.closest('.AaV7S'); // Clase común del footer de Google

      if (href.includes("linkedin.com/in/") && !esNavegacion && !enZonaProhibida) {

        // Buscamos el bloque del resultado real (usualmente data-hveid o clase específica)
        let contenedorBloque = link.closest('div[data-hveid]') || link.closest('.MjjYud');

        if (contenedorBloque && contenedorBloque.id !== 'botstuff') {

          // Si el bloque es un resultado real, suele tener un h3
          const tieneTitulo = contenedorBloque.querySelector('h3');

          if (tieneTitulo) {

            // Verificación de altura para no marcar el footer entero por error
            if (contenedorBloque.offsetHeight < 500) {
              contenedorBloque.style.border = "2px solid #0073b1";
              contenedorBloque.style.backgroundColor = "rgba(0, 115, 177, 0.05)";
              contenedorBloque.style.borderRadius = "10px";
              contenedorBloque.style.padding = "10px";

              // Extraer datos
              const textoCompleto = (contenedorBloque.querySelector('h3')?.innerText || "Candidato");

              // Dividimos el texto usando el guion o la barra como separador
              let partes = textoCompleto.split(/[-]/).map(item => item.trim());
              const nombreLimpio = (partes[0] || "Candidato");
              const cargoLimpio = partes[1] || "Sin cargo";

              const urlLimpia = link.href.split('&');

              if (urlLimpia.includes("translate.google.com")) {
                // Si es de translate, extraemos la URL real que viene después de 'u='
                const match = urlLimpia.match(/u=([^&,]+)/);
                if (match) urlLimpia = decodeURIComponent(match);
              }

              // Buscamos el contenedor de la descripción dentro del resultado actual
              let infoLimpia = contenedorBloque.innerText
                .replace(/\n/g, ' ')  // Cambia saltos de línea por espacios
                .replace(/\s\s+/g, ' ') // Quita espacios dobles
                .trim().toLowerCase();

              const filtroManual = storage.filtro_ubicacion_manual || "";

              // Filtrado por ubicación
              let ubicacionEncontrada = "";
              if (filtroManual !== "") {
                // Si el texto de la tarjeta de Google NO incluye lo que escribiste, SALTAMOS
                if (!infoLimpia.includes(filtroManual)) {
                  contenedorBloque.style.border = "none";
                  contenedorBloque.style.opacity = "0.1"; // Lo pone casi transparente si no coincide
                  return;
                }
                ubicacionEncontrada = filtroManual; // Si coincide, lo marcamos
              } else {
                // Si dejaste el cuadro vacío, intenta usar el filtro de la URL o pon N/A
                const coincidencia = ubicacionFiltro.find(loc => infoLimpia.includes(loc));
                ubicacionEncontrada = coincidencia ? coincidencia : "N/A";
              }

              // Match skills
              let skillMatch = []
              if (listaSkillsFinal.length > 0) {
                skillMatch = listaSkillsFinal.filter(s => {
                  // Limpiamos el skill de posibles espacios extraños en los extremos
                  const skillLimpio = s.trim().toLowerCase();

                  // Creamos una expresión regular que busque la palabra exacta
                  // \b asegura que coincida con límites de palabra (evita errores de match parcial)
                  // Pero como en tech hay términos como 'it', usaremos una búsqueda más permisiva:
                  const regex = new RegExp(skillLimpio, 'gi');

                  return regex.test(infoLimpia);
                });
              }

              if (ubicacionEncontrada !== "") {

                let urlTexto = Array.isArray(urlLimpia) ? urlLimpia : urlLimpia;

                if (!resultadosEncontrados.some(r => r.url === urlLimpia)) {

                  // 1. Preparamos los parámetros para el "Modo Lupa"
                  const paramsLupa = new URLSearchParams();
                  paramsLupa.set('modo_lupa', 'true');

                  // Pasamos los skills que hicieron match (en minúsculas para procesar mejor luego)
                  if (skillMatch.length > 0) {
                    paramsLupa.set('skills', skillMatch.join(','));
                  }

                  // Pasamos la ubicación encontrada
                  if (ubicacionEncontrada) {
                    paramsLupa.set('ubicacion', ubicacionEncontrada);
                  }

                  // 2. Construimos la URL final inyectando los parámetros
                  // Verificamos si la url original ya tiene un '?' para usar '&' o '?'
                  const conector = urlLimpia.includes('?') ? '&' : '?';
                  const urlConLupa = urlLimpia + conector + paramsLupa.toString();

                  const objetoParaTabla = {
                    nombre: nombreLimpio,
                    cargo: cargoLimpio,
                    ubicacion: ubicacionEncontrada.charAt(0).toUpperCase() + ubicacionEncontrada.slice(1),
                    skills: skillMatch.map(s => s.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')).join(', '),
                    url: urlLimpia
                  }

                  resultadosEncontrados.push(objetoParaTabla);

                } else {
                  // Si no coincide la ubicación, quitamos el estilo visual para indicar que fue descartado
                  contenedorBloque.style.border = "none";
                  contenedorBloque.style.backgroundColor = "transparent";
                }
              }
            }
          }
        }
      }
    });

    // 4. Guardado Seguro en Storage (Aquí es donde el async/await es clave)
    if (resultadosEncontrados.length > 0) {
      try {
        const data = await chrome.storage.local.get(['temp_candidatos']);
        let listaPrevia = data.temp_candidatos || []

        const listaCompleta = [...listaPrevia, ...resultadosEncontrados];
        const listaFinal = [];
        const urlVistas = {};

        listaCompleta.map(item => {
          if (!(item.url in urlVistas)) {
            listaFinal.push(item);
            urlVistas[item.url] = true
          }
        });

        await chrome.storage.local.set({ temp_candidatos: listaFinal }, () => {
          mostrarResultadosEnPagina(listaFinal);
        });
      } catch (err) {
        console.error("Error guardando en storage:", err);
      }
    } else {
      document.getElementById('status-ia-text').innerText = "❌ No se hallaron links";
    }

    // --- LÓGICA DE NAVEGACIÓN AUTOMÁTICA ---

    // Traemos la configuración: si está activo y cuántos queremos
    const config = await chrome.storage.local.get(['auto_scraping_activo', 'limite_candidatos']);

    if (config.auto_scraping_activo) {
      const data = await chrome.storage.local.get(['temp_candidatos']);
      const actuales = data.temp_candidatos ? data.temp_candidatos.length : 0;
      const limite = parseInt(config.limite_candidatos) || 50;

      console.log(`📊 Progreso: ${actuales} de ${limite}`);

      if (actuales < limite) {
        // 1. Buscamos todos los enlaces de la página
        const enlaces = document.querySelectorAll('a');

        // 2. Filtramos el que contenga la palabra "Siguiente" (o "Next")
        const botonSiguiente = Array.from(enlaces).find(a => {
          const texto = a.innerText.toLowerCase();
          // Verificamos que diga "siguiente" y que sea un link visible
          return texto.includes('siguiente') || texto.includes('next');
        });

        if (botonSiguiente) {
          console.log("🚀 Botón 'Siguiente' identificado.");

          // 2. MARCADO VISUAL: Le ponemos un estilo para que tu esposa vea que lo encontró
          botonSiguiente.style.outline = "5px solid #27ae60"; // Borde verde fuerte
          botonSiguiente.style.backgroundColor = "#e8f8f5";   // Fondo verde menta claro
          botonSiguiente.style.borderRadius = "5px";
          botonSiguiente.style.padding = "5px";
          botonSiguiente.style.transition = "all 0.3s ease";

          // Opcional: Hacer scroll hasta el botón para que ella vea el marcado
          botonSiguiente.scrollIntoView({ behavior: 'smooth', block: 'center' });

          const statusText = document.getElementById('status-ia-text');
          if (statusText) statusText.innerText = `⏳ ¡Botón encontrado! Saltando en breve...`;

          // 3. Pausa de seguridad antes del clic
          setTimeout(() => {
            // Le damos un efecto de "pulso" justo antes de hacer clic
            botonSiguiente.style.transform = "scale(1.1)";

            setTimeout(() => {
              botonSiguiente.click();
            }, 500);
          }, 3500); // Espera total de 4 segundos

        } else {
          console.log("🏁 No hay más páginas disponibles.");
          chrome.storage.local.set({ auto_scraping_activo: false });
        }
      } else {
        console.log("🎯 Meta alcanzada.");
        chrome.storage.local.set({ auto_scraping_activo: false });
        alert(`¡Proceso terminado! Se obtuvieron ${actuales} candidatos.`);
      }
    }
  };

  const inyectarInterfaz = () => {
    if (document.getElementById('panel-ia-pro')) return;

    const panel = document.createElement("div");
    panel.id = "panel-ia-pro";
    panel.style = "position:fixed; top:20px; right:20px; z-index:999999; background:white; padding:15px; border:2px solid #0073b1; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.3); font-family:Arial,sans-serif; width:200px;";

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <h4 style="margin:0; color:#0073b1; font-size:14px;">Pro Recruiter</h4>
        <button id="cerrar-panel-ia" style="background:none; border:none; color:#666; cursor:pointer; font-size:18px; line-height:1;">&times;</button>
      </div>
      
      <label style="font-size:10px; color:#666;">Ubicación exacta:</label>
      <input type="text" id="input-ubicacion-manual" 
        value="${urlParams.get('ubicación') || ''}" 
        placeholder="Ej: Ciudad de México" 
        style="width:90%; margin-bottom:10px; padding:5px; border:1px solid #ccc; border-radius:4px;">
      
      <label style="font-size:10px; color:#666;">Meta candidatos:</label>
      <input type="number" id="input-limite" value="50" style="width:90%; margin-bottom:10px; padding:5px; border:1px solid #ccc; border-radius:4px;">
    
      <button id="btn-run-scrape" style="width:100%; padding:10px; background:#0073b1; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold; margin-bottom:5px;">Extraer candidatos</button>
      <button id="btn-stop-scrape" style="width:100%; padding:8px; background:#666; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold; margin-bottom:5px;">Detener</button>
    
      <div id="contador-eterno" style="font-size:10px; color:#666; margin-top:5px; text-align:center;"></div>
      <div id="status-ia-text" style="font-size:10px; color:#0073b1; margin-top:5px; text-align:center; font-weight:bold;"></div>
    `;
    document.body.appendChild(panel);

    // Acción para cerrar el panel
    document.getElementById('cerrar-panel-ia').onclick = () => panel.remove();

    // Acción para detener el scraping
    document.getElementById('btn-stop-scrape').onclick = async () => {
      await chrome.storage.local.set({ auto_scraping_activo: false });
      document.getElementById('status-ia-text').innerText = "🛑 Detenido";
      alert("El proceso automático se ha detenido.");
    };

    // Al hacer clic, llamamos a la función asíncrona
    document.getElementById('btn-run-scrape').addEventListener('click', async () => {
      const limiteUser = document.getElementById('input-limite').value || 50;
      const ubicacionManual = document.getElementById('input-ubicacion-manual').value.toLowerCase().trim();

      // 1. LIMPIAR DATOS PREVIOS (Esta es la línea clave)
      await chrome.storage.local.set({ temp_candidatos: [] });

      // Activamos el modo automático en el storage antes de empezar
      await chrome.storage.local.set({
        auto_scraping_activo: true,
        limite_candidatos: limiteUser,
        filtro_ubicacion_manual: ubicacionManual
      });

      // Función para actualizar el contador visual
      const actualizarContador = async () => {
        const data = await chrome.storage.local.get(['historial_total_urls']);
        const total = data.historial_total_urls ? data.historial_total_urls.length : 0;
        document.getElementById('contador-eterno').innerText = `Total en base: ${total}`;
      };
      actualizarContador();

      // Lanzamos el proceso
      ejecutarScraping();
    });
  };

  // Lógica de inicio
  const urlParams = new URLSearchParams(window.location.search);
  let ubicacionesRequeridas = [];

  // if (window.location.hostname.includes("google.com") && urlParams.get('reclutador_pro') === 'true') {
  if (window.location.hostname.includes("google.com")) {
    inyectarInterfaz();

    if (urlParams.get('ubicacion')) {
      // Convertimos "Medellin, Antioquia" en ['medellin', 'antioquia']
      ubicacionesRequeridas = urlParams.get('ubicacion').toLowerCase().split(',').map(u => u.trim());
    }
  }

  chrome.storage.local.get(['auto_scraping_activo'], (res) => {
    if (res.auto_scraping_activo) {
      // Esperamos un segundo a que la página de Google termine de renderizar
      setTimeout(() => {
        ejecutarScraping();
      }, 1500);
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
    const tabla = document.getElementById('tabla-cuerpo');
    const contador = document.getElementById('contador');

    // 1. Leer datos del storage
    const data = await chrome.storage.local.get(['temp_candidatos']);
    const candidatos = data.temp_candidatos || [];

    contador.innerText = `Total: ${candidatos.length}`;

    // 2. Llenar la tabla
    candidatos.forEach(c => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${c.nombre}</td>
            <td><a href="${c.url}" target="_blank">Ver perfil</a></td>
        `;
        tabla.appendChild(fila);
    });

    // 3. Botón para copiar (Formato listo para pegar en Excel)
    document.getElementById('btn-copy').onclick = () => {
        let texto = "Nombre\tURL\n";
        candidatos.forEach(c => {
            texto += `${c.nombre}\t${c.url}\n`;
        });
        
        navigator.clipboard.writeText(texto).then(() => {
            alert("¡Copiado al portapapeles! Ya puedes pegarlo en Excel.");
        });
    };

    // 4. Botón para limpiar
    document.getElementById('btn-clear').onclick = async () => {
        if(confirm("¿Seguro que quieres borrar todos los candidatos extraídos?")) {
            await chrome.storage.local.set({ temp_candidatos: [] });
            location.reload();
        }
    };
});
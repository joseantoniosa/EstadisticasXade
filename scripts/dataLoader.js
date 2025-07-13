// =================================================================================================
// 2. DataLoader: Carga y parsea el archivo TXT
// =================================================================================================
class DataLoader {
    constructor(dataModel, uiController) {
        this.dataModel = dataModel;
        this.uiController = uiController;
    }

    async loadFile(file) {
        if (!file) {
            this.uiController.showAlert("Non se seleccionou ningún ficheiro.");
            console.log("DEBUG_DataLoader: Non se seleccionou ningún ficheiro.");
            return false;
        }

        this.dataModel.clear();
        this.uiController.setWidgetsInitialState(false);
        this.uiController.setFechaLabel("Data: -");
        this.uiController.clearTable();
        this.uiController.showProgressBar();

        console.log("DEBUG_DataLoader: Iniciando carga de ficheiro.");

        try {
            this.dataModel.setFechaArchivo(new Date(file.lastModified).toLocaleString('gl-ES', { dateStyle: 'short', timeStyle: 'short' }));

            const reader = new FileReader();
            reader.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = (event.loaded / event.total) * 100;
                    this.uiController.updateProgressBar(percent, "Procesando...");
                }
            };

            reader.onload = async (e) => {
                console.log("DEBUG_DataLoader: FileReader.onload disparado.");
                const content = e.target.result;
                let lines = content.split('\n');
                let linesSkipped = 0;

                // Descartar la primera línea si es una cabecera
                if (lines.length > 0 && lines[0].includes(';')) {
                    console.log("DEBUG_DataLoader: Primera línea parece ser una cabecera. Descartando.");
                    lines.shift();
                }

                const totalLinesToProcess = lines.length;
                console.log(`DEBUG_DataLoader: Total de líneas a procesar (después de posible cabecera): ${totalLinesToProcess}`);

                for (let i = 0; i < totalLinesToProcess; i++) {
                    const linea = lines[i].trim();
                    if (linea === '') {
                        continue;
                    }

                    let campos = linea.split(';');
                    campos = campos.map(campo => campo.trim().replace(/^"|"$/g, ''));

                    if (campos.length < 17) {
                        console.warn(`DEBUG_DataLoader: Saltando liña ${i + 1}: Campos insuficientes (${campos.length} < 17). Contido: "${linea.substring(0, Math.min(linea.length, 120))}..."`);
                        linesSkipped++;
                        continue;
                    }

                    const record = {
                        curso: campos[0] || '',
                        grupo: campos[1] || '',
                        evalua: campos[2] || '',
                        nota: campos[4] || '', // "Cualif"
                        materia: campos[8] || '', // "Materia"
                        nombreCompleto: campos[9] || '', // "Nome completo"
                        medida: campos[11] || '', // "Medida"
                        exvalren: campos[12] || '', // "Ex/Val/Ren"
                        repite: campos[13] || '', // "Núm. repetición"
                        pendentes: campos[16] || '' // "Asig.Pendente"
                    };

                    this.dataModel.addRecord(record);

                    if (i % 500 === 0 || i === totalLinesToProcess - 1) {
                        const percent = ((i / totalLinesToProcess) * 100);
                        this.uiController.updateProgressBar(percent, "Procesando...");
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }

                this.dataModel.finalizeMaterias();

                if (this.dataModel.getDatosPorAlumno().size === 0) {
                    this.uiController.showAlert("Non se atoparon datos válidos no ficheiro despois do procesamento.", "warning");
                    this.uiController.hideProgressBar();
                    console.log("DEBUG_DataLoader: No se encontraron datos válidos después del procesamiento.");
                    return false;
                }

                this.uiController.populateFilterCombos(
                    this.dataModel.sortCursos(this.dataModel.getAllCursos()),
                    this.dataModel.getAllEvaluaciones().sort()
                );
                this.uiController.setWidgetsInitialState(true);
                this.uiController.setFechaLabel(`Datos cargados. Data: ${this.dataModel.getFechaArchivo()}`);

                if (linesSkipped > 0) {
                    this.uiController.showAlert(`Datos cargados correctamente. Advertencia: ${linesSkipped} liña(s) foron ignoradas debido a un formato incorrecto.`, "warning");
                } else {
                    this.uiController.showAlert("Datos cargados correctamente.", "success");
                }
                this.uiController.hideProgressBar();
                console.log("DEBUG_DataLoader: Carga de ficheiro completada.");
                return true;
            };

            reader.onerror = (e) => {
                this.uiController.showAlert(`Erro ao ler o ficheiro: ${e.target.error.name}. Asegúrese de que é un ficheiro de texto válido.`);
                this.uiController.hideProgressBar();
                console.error(`DEBUG_DataLoader: Erro ao ler o ficheiro: ${e.target.error.name}`, e.target.error);
                return false;
            };
            reader.readAsText(file, 'UTF-8');
            return true;

        } catch (e) {
            this.uiController.showAlert(`Erro inesperado ao cargar ficheiro: ${e.message}`);
            this.uiController.hideProgressBar();
            console.error(`DEBUG_DataLoader: Erro inesperado ao cargar ficheiro: ${e.message}`, e);
            return false;
        }
    }
}

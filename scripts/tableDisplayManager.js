
// =================================================================================================
// 3. TableDisplayManager: Gestiona el filtrado y la renderización de la tabla
// =================================================================================================
class TableDisplayManager {
    constructor(dataModel, uiController) {
        this.dataModel = dataModel;
        this.uiController = uiController;
        this.currentFilteredData = [];
        this.currentVisibleSubjects = [];
        this.currentVisibleHeaders = [];
    }

    // Utility: Converts a Galician number string (with comma decimal) to a float
    parseNumberGalician(str) {
        if (typeof str !== 'string' || str.trim() === '') {
            return NaN;
        }
        return parseFloat(str.replace(',', '.'));
    }

    // Utility: Formats a number for display with dot decimal if necessary
    formatNumberForDisplay(num) {
        if (typeof num !== 'number' || isNaN(num)) {
            return '';
        }
        if (num % 1 === 0) {
            return num.toString();
        }
        return num.toFixed(2);
    }

    // Main method to apply filters and render the table
    applyFiltersAndRender(selectedCurso, selectedGrupo, selectedEvaluacion) {
        console.log(`DEBUG_TableDisplayManager: Aplicando filtros - Curso: ${selectedCurso}, Grupo: ${selectedGrupo}, Evaluación: ${selectedEvaluacion}`);

        this.currentFilteredData = [];
        this.currentVisibleSubjects = [];

        const tempFilteredDataForSubjectCheck = [];
        const datosPorAlumno = this.dataModel.getDatosPorAlumno();
        const infoBasica = this.dataModel.getInfoBasica();

        for (const [clave, alumnoData] of datosPorAlumno.entries()) {
            const [curso, grupo, evalua, nombreAlumno] = clave.split('_§_');

            const cumpleCurso = (selectedCurso === "Todos" || curso === selectedCurso);
            const cumpleGrupo = (selectedGrupo === "Todos" || grupo === selectedGrupo);
            const cumpleEvaluacion = (selectedEvaluacion === "Todas" || evalua === selectedEvaluacion);

            if (cumpleCurso && cumpleGrupo && cumpleEvaluacion) {
                tempFilteredDataForSubjectCheck.push({ clave, alumnoData });
            }
        }
        console.log(`DEBUG_TableDisplayManager: Elementos que cumplen filtro inicial: ${tempFilteredDataForSubjectCheck.length}`);

        if (tempFilteredDataForSubjectCheck.length === 0) {
            this.uiController.renderTable([], []);
            console.log("DEBUG_TableDisplayManager: No hay datos que cumplan los filtros. Tabla renderizada vacía.");
            return;
        }

        const materiasOrdenadas = this.dataModel.getMateriasOrdenadas();
        materiasOrdenadas.forEach(materia => {
            let hasDataForMateria = false;
            for (const { alumnoData } of tempFilteredDataForSubjectCheck) {
                const nota = alumnoData[materia];
                if (nota !== undefined && nota !== null && nota.trim() !== '') {
                    hasDataForMateria = true;
                    break;
                }
            }
            if (hasDataForMateria) {
                this.currentVisibleSubjects.push(materia);
            }
        });
        console.log(`DEBUG_TableDisplayManager: Materias visibles: ${JSON.stringify(this.currentVisibleSubjects)}`);

        // Prepare final data rows for the table
        tempFilteredDataForSubjectCheck.forEach(({ clave, alumnoData }) => {
            const [curso, grupo, evalua, nombreAlumno] = clave.split('_§_');
            const infoBasicaAlumno = infoBasica.get(clave);

            const rowData = {
                "Nome": nombreAlumno,
                "NomeNormalizado": this.dataModel.normalizeStringForSort(nombreAlumno),
                "Curso": curso,
                "Grupo": grupo,
                "Avaliación": evalua,
                "Medida": infoBasicaAlumno ? infoBasicaAlumno.medida : '',
                "Exvalren": infoBasicaAlumno ? infoBasicaAlumno.exvalren : '',
                "Repite": infoBasicaAlumno && infoBasicaAlumno.repite === '0' ? '' : (infoBasicaAlumno && infoBasicaAlumno.repite ? 'Si' : ''),
                "Pendentes": infoBasicaAlumno ? infoBasicaAlumno.pendentes : '',
            };

            let sumNotas = 0;
            let countNotas = 0;
            let suspensasCount = 0;

            rowData.values_all_cols = {
                "Nome": { text: rowData.Nome, isSuspended: false, isBold: true, isLeftAligned: true },
                "Curso": { text: rowData.Curso, isSuspended: false, isBold: false },
                "Grupo": { text: rowData.Grupo, isSuspended: false, isBold: false },
                "Avaliación": { text: rowData.Avaliación, isSuspended: false, isBold: false }
            };

            this.currentVisibleSubjects.forEach(materia => {
                const nota = alumnoData[materia];
                const parsedNota = this.parseNumberGalician(nota);

                rowData.values_all_cols[materia] = {
                    text: !isNaN(parsedNota) ? this.formatNumberForDisplay(parsedNota) : '',
                    isSuspended: !isNaN(parsedNota) && parsedNota < 5,
                    isBold: false
                };

                if (!isNaN(parsedNota)) {
                    sumNotas += parsedNota;
                    countNotas++;
                    if (parsedNota < 5) {
                        suspensasCount++;
                    }
                }
            });

            const media = countNotas > 0 ? (sumNotas / countNotas) : NaN;

            rowData.values_all_cols["Media"] = {
                text: !isNaN(media) ? this.formatNumberForDisplay(media) : '',
                isSuspended: false,
                isBold: true,
                isLowAverage: !isNaN(media) && media < 4,
                isMediaColumn: true
            };

            rowData.values_all_cols["Suspensas"] = {
                text: suspensasCount.toString(),
                isSuspended: false,
                isBold: false
            };

            // Include Medida, Exvalren, Repite, Pendentes for display
            rowData.values_all_cols["Medida"] = { text: rowData.Medida, isSuspended: false, isBold: false };
            rowData.values_all_cols["Exvalren"] = { text: rowData.Exvalren, isSuspended: false, isBold: false };
            rowData.values_all_cols["Repite"] = { text: rowData.Repite, isSuspended: false, isBold: false };
            rowData.values_all_cols["Pendentes"] = { text: rowData.Pendentes, isSuspended: false, isBold: false };

            this.currentFilteredData.push(rowData);
        });

        this.currentFilteredData.sort((a, b) => {
            return a.NomeNormalizado.localeCompare(b.NomeNormalizado);
        });

        this.currentVisibleHeaders = ["Nome"];

        if (selectedCurso === "Todos") {
            this.currentVisibleHeaders.push("Curso");
        }
        if (selectedGrupo === "Todos") {
            this.currentVisibleHeaders.push("Grupo");
        }
        if (selectedEvaluacion === "Todas") {
            this.currentVisibleHeaders.push("Avaliación");
        }

        this.currentVisibleHeaders.push(...this.currentVisibleSubjects);

        const infoCols = ["Medida", "Exvalren", "Repite", "Pendentes"];
        infoCols.forEach(col => {
            let hasData = false;
            for (const rowData of this.currentFilteredData) {
                const text = rowData.values_all_cols[col]?.text;
                if (text && text.trim() !== '') {
                    hasData = true;
                    break;
                }
            }
            if (hasData) {
                this.currentVisibleHeaders.push(col);
            }
        });

        if (this.currentFilteredData.length > 0) {
            this.currentVisibleHeaders.push("Suspensas", "Media");
        }

        console.log(`DEBUG_TableDisplayManager: Headers visibles: ${JSON.stringify(this.currentVisibleHeaders)}`);
        console.log(`DEBUG_TableDisplayManager: Datos finales para la tabla: ${this.currentFilteredData.length}`);

        this.uiController.renderTable(this.currentFilteredData, this.currentVisibleHeaders);
    }

    getCurrentTableData() {
        return this.currentFilteredData;
    }

    getCurrentTableHeaders() {
        return this.currentVisibleHeaders;
    }
}
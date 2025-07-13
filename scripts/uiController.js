// =================================================================================================
// 5. UIController: Gestiona interacciones con el DOM y la interfaz de usuario
// =================================================================================================
class UIController {
    constructor(dataModel, tableDisplayManager, exportManager) {
        this.dataModel = dataModel;
        this.tableDisplayManager = tableDisplayManager;
        this.exportManager = exportManager;

        // Elementos del DOM
        this.btnImportarDatos = document.getElementById('btn-importar-datos');
        this.fileInput = document.getElementById('file-input');
        this.btnExportarPdf = document.getElementById('btn-exportar-pdf');
        this.btnExportarHtml = document.getElementById('btn-exportar-html');
        this.btnExportarExcel = document.getElementById('btn-exportar-excel');
        this.btnEstadisticas = document.getElementById('btn-estadisticas');
        this.comboCurso = document.getElementById('combo-curso');
        this.comboGrupo = document.getElementById('combo-grupo');
        this.comboEval = document.getElementById('combo-eval');
        this.labelFecha = document.getElementById('label-fecha');
        this.tableHeaderRow = document.getElementById('table-header-row');
        this.tableBody = document.getElementById('table-body');
        this.progressBarContainer = document.getElementById('progress-container');
        this.progressBar = document.getElementById('progress-bar');
        this.alertMessage = document.getElementById('alert-message');
        this.cursoFilterGroup = document.getElementById('curso-filter-group');
        this.grupoFilterGroup = document.getElementById('grupo-filter-group');
        this.evalFilterGroup = document.getElementById('eval-filter-group');

        // Inicialización de estado
        this.setWidgetsInitialState(false);
        this.hideAlert();
    }

    // --- UI State Management ---
    setWidgetsInitialState(loaded) {
        const elementsToToggle = [
            this.btnExportarPdf, this.btnExportarHtml, this.btnExportarExcel, this.btnEstadisticas,
            this.comboCurso, this.comboGrupo, this.comboEval,
            this.cursoFilterGroup, this.grupoFilterGroup, this.evalFilterGroup
        ];

        elementsToToggle.forEach(el => {
            if (el) { // Check if element exists before manipulating
                if (loaded) {
                    if (el === this.comboCurso || el === this.comboGrupo || el === this.comboEval) {
                        el.disabled = false;
                    } else if (el === this.cursoFilterGroup || el === this.grupoFilterGroup || el === this.evalFilterGroup) {
                        el.classList.remove('initial-hidden');
                    } else {
                        el.classList.remove('hidden');
                        el.disabled = false; // Enable buttons
                    }
                } else {
                    if (el === this.comboCurso || el === this.comboGrupo || el === this.comboEval) {
                        el.disabled = true;
                    } else if (el === this.cursoFilterGroup || el === this.grupoFilterGroup || el === this.evalFilterGroup) {
                        el.classList.add('initial-hidden');
                    } else {
                        el.classList.add('hidden');
                        el.disabled = true; // Disable buttons
                    }
                }
            }
        });
        // Ensure import button is always visible
        if (this.btnImportarDatos) this.btnImportarDatos.classList.remove('hidden');
    }

    showAlert(message, type = 'error') {
        if (this.alertMessage) {
            this.alertMessage.textContent = message;
            this.alertMessage.className = `px-4 py-3 rounded relative mb-4 ${type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-green-100 border border-green-400 text-green-700'}`;
            this.alertMessage.classList.remove('hidden');
            console.log(`UI Alert (${type}): ${message}`);
        }
    }

    hideAlert() {
        if (this.alertMessage) {
            this.alertMessage.classList.add('hidden');
            console.log("UI Alert: Hidden.");
        }
    }

    setFechaLabel(text) {
        if (this.labelFecha) this.labelFecha.textContent = text;
    }

    clearTable() {
        if (this.tableHeaderRow) this.tableHeaderRow.innerHTML = '';
        if (this.tableBody) this.tableBody.innerHTML = '';
        console.log("UI: Tabla vaciada.");
    }

    showProgressBar() {
        if (this.progressBarContainer) this.progressBarContainer.classList.remove('hidden');
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
            this.progressBar.textContent = '0%';
        }
        console.log("UI: Barra de progreso visible.");
    }

    hideProgressBar() {
        if (this.progressBarContainer) this.progressBarContainer.classList.add('hidden');
        console.log("UI: Barra de progreso oculta.");
    }

    updateProgressBar(percent, text) {
        if (this.progressBar) {
            this.progressBar.style.width = `${percent.toFixed(0)}%`;
            this.progressBar.textContent = `${percent.toFixed(0)}% ${text}`;
        }
    }

    // --- Combo Population ---
    populateCombo(selectElement, options) {
        if (!selectElement) return;
        selectElement.innerHTML = '';
        options.forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText;
            option.textContent = optionText;
            selectElement.appendChild(option);
        });
        console.log(`UI: Combo '${selectElement.id}' poblado con ${options.length} opciones.`);
    }

    populateFilterCombos(cursos, evaluaciones) {
        this.populateCombo(this.comboCurso, ["Todos", ...cursos]);
        this.populateCombo(this.comboEval, ["Todas", ...evaluaciones]);
        this.updateGrupoCombo(); // Initial population of Grupo combo
    }

    updateGrupoCombo() {
        const selectedCurso = this.comboCurso.value;
        let gruposForCombo = ["Todos"];

        if (selectedCurso !== "Todos") {
            gruposForCombo.push(...this.dataModel.getGruposForCurso(selectedCurso).sort());
        } else {
            gruposForCombo.push(...this.dataModel.getAllGrupos().sort());
        }
        this.populateCombo(this.comboGrupo, gruposForCombo);
        console.log(`DEBUG_UIController: updateGrupoCombo - Curso: ${selectedCurso}, Grupos: ${gruposForCombo.join(', ')}`);
        this.tableDisplayManager.applyFiltersAndRender(
            this.comboCurso.value,
            this.comboGrupo.value,
            this.comboEval.value
        );
    }

    getCurrentFilterSelections() {
        return {
            curso: this.comboCurso ? this.comboCurso.value : "Todos",
            grupo: this.comboGrupo ? this.comboGrupo.value : "Todos",
            eval: this.comboEval ? this.comboEval.value : "Todas"
        };
    }

    // --- Table Rendering ---
    renderTable(data, headers) {
        this.clearTable();
        if (data.length === 0 && headers.length === 0) {
            console.log("DEBUG_UIController: renderTable: Datos o cabeceras vacías. No se renderiza nada.");
            return;
        }
        console.log(`DEBUG_UIController: renderTable: Renderizando tabla con ${data.length} filas y ${headers.length} cabeceras.`);

        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            if (headerText === "Nome") {
                th.classList.add('text-left');
            }
            if (headerText === "Media") {
                th.classList.add('media-column-header');
            }
            this.tableHeaderRow.appendChild(th);
        });

        const fragment = document.createDocumentFragment();

        data.forEach(rowData => {
            const tr = document.createElement('tr');
            if (rowData.values_all_cols.Media.isLowAverage) {
                tr.classList.add('low-average-row');
            }

            headers.forEach(header => {
                const td = document.createElement('td');
                const cellData = rowData.values_all_cols[header];

                if (cellData) {
                    td.textContent = cellData.text;
                    if (cellData.isSuspended) {
                        td.classList.add('suspended-grade');
                    }
                    if (cellData.isBold) {
                        td.classList.add('font-bold');
                    }
                    if (cellData.isLeftAligned) {
                        td.classList.add('text-left');
                    }
                    if (cellData.isMediaColumn) {
                        td.classList.add('media-column-cell');
                    }
                } else {
                    td.textContent = '';
                }
                tr.appendChild(td);
            });
            fragment.appendChild(tr);
        });

        // Render Summary Rows
        if (data.length > 0) {
            const summaryRowMedia = document.createElement('tr');
            summaryRowMedia.classList.add('summary-row-media');
            const summaryRowAprobados = document.createElement('tr');
            summaryRowAprobados.classList.add('summary-row-aprobados');

            headers.forEach(header => {
                const tdMedia = document.createElement('td');
                if (header === "Nome") {
                    tdMedia.textContent = "Media";
                    tdMedia.classList.add('text-left');
                } else if (["Curso", "Grupo", "Avaliación", "Medida", "Exvalren", "Repite", "Pendentes"].includes(header)) {
                    tdMedia.textContent = "";
                } else if (header === "Suspensas") {
                    tdMedia.textContent = "";
                }
                else {
                    let totalSum = 0;
                    let count = 0;
                    data.forEach(rowData => {
                        const cellText = rowData.values_all_cols[header]?.text;
                        const grade = this.tableDisplayManager.parseNumberGalician(cellText);
                        if (!isNaN(grade)) {
                            totalSum += grade;
                            count++;
                        }
                    });
                    tdMedia.textContent = count > 0 ? this.tableDisplayManager.formatNumberForDisplay(totalSum / count) : '';
                }
                if (header === "Media") {
                    tdMedia.classList.add('media-column-cell');
                }
                summaryRowMedia.appendChild(tdMedia);

                const tdAprobados = document.createElement('td');
                if (header === "Nome") {
                    tdAprobados.textContent = "Aprobados %";
                    tdAprobados.classList.add('text-left');
                } else if (["Curso", "Grupo", "Avaliación", "Medida", "Exvalren", "Repite", "Pendentes", "Suspensas"].includes(header)) {
                    tdAprobados.textContent = "";
                } else {
                    let passedCount = 0;
                    let totalEvaluated = 0;
                    data.forEach(rowData => {
                        const cellText = rowData.values_all_cols[header]?.text;
                        const grade = this.tableDisplayManager.parseNumberGalician(cellText);
                        if (!isNaN(grade)) {
                            totalEvaluated++;
                            if (grade >= 5) {
                                passedCount++;
                            }
                        }
                    });
                    tdAprobados.textContent = totalEvaluated > 0 ? ((passedCount / totalEvaluated) * 100).toFixed(0) + "%" : '';
                }
                if (header === "Media") {
                    tdAprobados.classList.add('media-column-cell');
                }
                summaryRowAprobados.appendChild(tdAprobados);
            });

            fragment.appendChild(summaryRowMedia);
            fragment.appendChild(summaryRowAprobados);
        }

        this.tableBody.appendChild(fragment);
        this._adjustColumnWidths(headers);
        console.log("DEBUG_UIController: Contenido de tabla inyectado en el DOM.");
    }

    // Adjusts column widths of the table
    _adjustColumnWidths(headers) {
        const table = document.getElementById('data-table');
        if (!table) return;

        const cells = Array.from(table.querySelectorAll('th, td'));
        const columnWidths = new Map();

        headers.forEach(headerText => {
            columnWidths.set(headerText, (headerText || '').length);
        });

        cells.forEach(cell => {
            const colIndex = cell.cellIndex;
            const headerText = headers[colIndex];
            if (headerText) {
                const currentWidth = columnWidths.get(headerText) || 0;
                const content = cell.textContent || '';
                columnWidths.set(headerText, Math.max(currentWidth, content.length));
            }
        });

        const styleId = 'dynamic-table-widths';
        let styleTag = document.getElementById(styleId);
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }

        let styleContent = '';
        headers.forEach((headerText, index) => {
            const width = columnWidths.get(headerText) || 10;
            styleContent += `#data-table th:nth-child(${index + 1}), #data-table td:nth-child(${index + 1}) { width: ${Math.min(width + 2, 200)}ch; max-width: ${Math.min(width + 2, 200)}ch; overflow: hidden; text-overflow: ellipsis; }`;
        });
        styleTag.textContent = styleContent;
        console.log("DEBUG_UIController: Ancho de columnas ajustado.");
    }
}

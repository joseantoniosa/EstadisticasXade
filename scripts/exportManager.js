class ExportManager {
    constructor(dataModel, tableDisplayManager, uiController) {
        this.dataModel = dataModel;
        this.tableDisplayManager = tableDisplayManager;
        this.uiController = uiController;

        // Formateadores de números para 'es-ES' (coma decimal)
        this.numberFormatter = new Intl.NumberFormat('es-ES', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        this.integerFormatter = new Intl.NumberFormat('es-ES', {
            maximumFractionDigits: 0,
        });
    }

    // Utility: Converts a Galician number string (with comma decimal) to a float
    parseNumberGalician(str) {
        if (typeof str !== 'string' || str.trim() === '') {
            return NaN;
        }
        // Permite tanto comas como puntos como separador decimal al parsear
        return parseFloat(str.replace(',', '.'));
    }

    // Utility: Formats a number for display using Intl.NumberFormat
    formatNumberForDisplay(num) {
        if (typeof num !== 'number' || isNaN(num)) {
            return '';
        }
        // Si el número es entero, lo mostramos sin decimales
        if (num % 1 === 0) {
            return this.integerFormatter.format(num);
        }
        // Si tiene decimales, lo mostramos con dos
        return this.numberFormatter.format(num);
    }

    exportPDF() {
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            this.uiController.showAlert("Librería jsPDF no cargada. No se puede exportar PDF.");
            console.error("DEBUG_ExportManager: Librería jsPDF no cargada.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');

		const currentFilteredData = this.tableDisplayManager.getCurrentTableData();
        const currentVisibleHeaders = this.tableDisplayManager.getCurrentTableHeaders();

        if (!currentFilteredData || currentFilteredData.length === 0) {
            this.uiController.showAlert("Non hai datos para exportar a PDF. Por favor, cargue datos primeiro e aplique os filtros desexados.", "warning");
            return;
        }

        const tableColumnStyles = {};
        const tableHeaderStyles = {};
        const tableBodyStyles = {};

        // Custom styles for specific columns based on their content
        currentVisibleHeaders.forEach((header, index) => {
            // Align "Nombre Completo" to left
            if (header === "Nome Completo") {
                tableColumnStyles[index] = { halign: 'left' };
            }
            // Align numbers to right (all except "Nome Completo", "Curso", "Grupo", "Avaliación")
            if (!["Nome Completo", "Curso", "Grupo", "Avaliación"].includes(header)) {
                tableColumnStyles[index] = { halign: 'right' };
            }
            // Background color for "Media" column
            if (header === "Media") {
                tableHeaderStyles[index] = { fillColor: [211, 232, 211] }; // Light green
                tableColumnStyles[index] = { fillColor: [240, 255, 240] }; // Very light green for body cells
            }
        });

        // Prepare data for autoTable
        const headers = currentVisibleHeaders;
        const data = currentFilteredData.map(rowData => {
            const rowValues = [];
            let isLowAverageRow = false; // Flag for special row styling
            let isSummaryRow = false; // Flag for summary row styling

            headers.forEach(header => {
                const cellData = rowData.values_all_cols[header];
                if (cellData) {
                    rowValues.push(cellData.text);
                    if (cellData.classes && cellData.classes.includes('low-average-row')) {
                        isLowAverageRow = true;
                    }
                     if (cellData.classes && (cellData.classes.includes('summary-row-media') || cellData.classes.includes('summary-row-aprobados'))) {
                        isSummaryRow = true;
                    }
                } else {
                    rowValues.push('');
                }
            });
            // Attach the flag to the row for access in hooks
            return { values: rowValues, isLowAverageRow: isLowAverageRow, isSummaryRow: isSummaryRow };
        });

        doc.autoTable({
            head: [headers],
            body: data.map(row => row.values),
            theme: 'grid',
            styles: {
                font: 'helvetica', // Default font
                fontSize: 8,
                cellPadding: 1,
                overflow: 'linebreak',
                halign: 'center',
                valign: 'middle',
                lineWidth: 0.1,
                lineColor: [200, 200, 200],
            },
            headStyles: {
                fillColor: [224, 224, 224], // Light grey for header
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                fontSize: 8
            },
            columnStyles: tableColumnStyles, // Apply dynamic column styles

            didParseCell: (hookData) => {
                // Apply specific styles for suspended grades
                const header = hookData.table.rawHeaders[hookData.column.index];
                const cellText = hookData.cell.text[0]; // Assuming text is an array with one element

                if (cellText && !isNaN(this.parseNumberGalician(cellText)) && this.parseNumberGalician(cellText) < 5 && !["Media", "Suspensas"].includes(header)) {
                    hookData.cell.styles.fillColor = [255, 224, 224]; // Light red
                    hookData.cell.styles.fontStyle = 'bold';
                }
            },
            didDrawCell: (hookData) => {
                 // Check if the row has the 'low-average-row' flag set
                const originalRow = data[hookData.row.index];
                if (originalRow && originalRow.isLowAverageRow) {
                    // Apply style to the entire row if it's a low average row
                    hookData.cell.styles.fillColor = [255, 250, 205]; // lightgoldenrodyellow
                }
                // Apply style to summary rows (media and aprobados)
                if (originalRow && originalRow.isSummaryRow) {
                     // Determine specific color based on summary row type (if distinguishable)
                    if (originalRow.values[0] === "% Aprobados Curso") { // Assuming the first cell identifies the row
                        hookData.cell.styles.fillColor = [230, 255, 230]; // light green
                    } else if (originalRow.values[0] === "Media Curso") {
                        hookData.cell.styles.fillColor = [211, 232, 211]; // light blue
                    }
                    hookData.cell.styles.fontStyle = 'bold';
                }
            },
            // Add margin for better layout
            margin: { top: 20, right: 10, bottom: 20, left: 10 },
            // Page break management
            startY: 20, // Start table after the margin
        });

        doc.save(`Avaliacion_Academica_${new Date().toISOString().slice(0, 10)}.pdf`);
        this.uiController.showAlert("Datos exportados correctamente a PDF.", "success");
        setTimeout(() => this.uiController.hideAlert(), 3000);
        console.log("DEBUG_ExportManager: Datos exportados a PDF.");
    }

    exportHTML() {
        if (!this.dataModel.getDatosPorAlumno() || this.dataModel.getDatosPorAlumno().size === 0) {
            this.uiController.showAlert("Non hai datos para exportar. Por favor, cargue datos primeiro.", "warning");
            return;
        }

        const tableHtml = this.uiController.tableBody.outerHTML; // Get the entire table body HTML
        const tableHeaderHtml = this.uiController.tableHeaderRow.outerHTML; // Get the entire table header HTML

        const fullHtmlContent = `
            <!DOCTYPE html>
            <html lang=\"es\">
            <head>
                <meta charset=\"UTF-8\">
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                <title>Avaliación Académica</title>
                <style>
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-family: Arial, sans-serif;
                    }
                    th, td {
                        border: 1px solid #ccc;
                        padding: 8px;
                        text-align: center;
                    }
                    th {
                        background-color: #f2f2f2;
                    }
                    .text-left { text-align: left; }
                    .suspended-grade { background-color: #ffe0e0; font-weight: bold; }
                    .low-average-row { background-color: #fffacd; }
                    .summary-row-media { background-color: #e6f7ff; font-weight: bold; }
                    .summary-row-aprobados { background-color: #e6ffe6; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>Avaliación Académica</h1>
                <table>
                    <thead>
                        ${tableHeaderHtml}
                    </thead>
                    <tbody>
                        ${tableHtml}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([fullHtmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Avaliacion_Academica_${new Date().toISOString().slice(0, 10)}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.uiController.showAlert("Datos exportados correctamente a HTML.", "success");
        setTimeout(() => this.uiController.hideAlert(), 3000);
        console.log("DEBUG_ExportManager: Datos exportados a HTML.");
    }

    exportExcel() {
        if (typeof window.XLSX === 'undefined') {
            this.uiController.showAlert("Librería XLSX.js no cargada. No se puede exportar Excel.");
            console.error("DEBUG_ExportManager: Librería XLSX.js no cargada.");
            return;
        }

        const currentFilteredData = this.tableDisplayManager.getCurrentTableData();
        const currentVisibleHeaders = this.tableDisplayManager.getCurrentTableHeaders();

        if (!currentFilteredData || currentFilteredData.length === 0) {
            this.uiController.showAlert("Non hai datos para exportar a Excel. Por favor, cargue datos primeiro e aplique os filtros desexados.", "warning");
            return;
        }

        const ws_data = [currentVisibleHeaders.map(header => ({ v: header, s: { font: { bold: true, name: 'Arial' }, fill: { fgColor: { rgb: "FFE0E0E0" } } } }))]; // Header row with bold and grey background

        currentFilteredData.forEach(rowData => {
            const row = [];
            const currentRowStyles = [];
            currentVisibleHeaders.forEach(header => {
                const cellData = rowData.values_all_cols[header];
                const cellText = cellData ? cellData.text : '';
                const cellClasses = cellData ? cellData.classes : [];

                let cellStyle = {
                    alignment: { horizontal: 'center', vertical: 'middle' },
                    font: { name: 'Arial' } // Default font for all cells
                };

                // Apply text alignment
                if (header === "Nome Completo") {
                    cellStyle.alignment.horizontal = 'left';
                } else if (!["Curso", "Grupo", "Avaliación"].includes(header)) {
                    cellStyle.alignment.horizontal = 'right';
                }

                // Apply background color for "Media" column
                if (header === "Media") {
                    cellStyle.fill = { fgColor: { rgb: "F0FFF0" } }; // Very light green for "Media" column
                }

                // Apply specific styles for suspended grades
                if (cellClasses.includes('suspended-grade')) {
                    cellStyle.fill = { fgColor: { rgb: "FFE0E0" } }; // Light red
                    cellStyle.font = { bold: true, name: 'Arial' };
                }

                // Apply style for low average rows
                if (cellClasses.includes('low-average-row')) {
                    cellStyle.fill = { fgColor: { rgb: "FFFACD" } }; // lightgoldenrodyellow
                }

                // Apply style for summary rows
                if (cellClasses.includes('summary-row-media') || cellClasses.includes('summary-row-aprobados')) {
                    cellStyle.font = { bold: true, name: 'Arial' };
                    if (cellClasses.includes('summary-row-media')) {
                        cellStyle.fill = { fgColor: { rgb: "E6F7FF" } }; // Light blue
                    } else if (cellClasses.includes('summary-row-aprobados')) {
                        cellStyle.fill = { fgColor: { rgb: "E6FFE6" } }; // Light green
                    }
                }

                row.push({ v: cellText, s: cellStyle });
            });
            ws_data.push(row);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data.map(r => r.map(c => c.v))); // Create sheet from values

        // Apply styles manually
        for (let R = 0; R < ws_data.length; ++R) {
            for (let C = 0; C < ws_data[R].length; ++C) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                if (ws[cellRef]) {
                    ws[cellRef].s = ws_data[R][C].s;
                }
            }
        }

        // Set column widths
        const wscols = currentVisibleHeaders.map((header, index) => {
            let max_length = header.length;
            for (let i = 0; i < ws_data.length; i++) {
                const cellValue = ws_data[i][index] ? String(ws_data[i][index].v) : '';
                if (cellValue) {
                    max_length = Math.max(max_length, cellValue.length);
                }
            }
            return { wch: Math.max(10, max_length + 2) }; // Minimum 10, plus 2 for padding
        });

        // Set width for "Nome Completo" (first column displayed to user, index 0)
        // Need to check the index of "Nome Completo" in currentVisibleHeaders
        const nomeCompletoIndex = currentVisibleHeaders.indexOf("Nome Completo");
        if (nomeCompletoIndex !== -1) {
             wscols[nomeCompletoIndex].wch = Math.max(wscols[nomeCompletoIndex].wch, 30); // Ensure a minimum reasonable width for names
        }
        ws['!cols'] = wscols;

        const selectedCurso = this.uiController.comboCurso.value;
        const selectedGrupo = this.uiController.comboGrupo.value;
        const selectedEvaluacion = this.uiController.comboEval.value;

        let sheetName = "Avaliación";
        if (selectedCurso !== "Todos" || selectedGrupo !== "Todos" || selectedEvaluacion !== "Todas") {
            sheetName = `${selectedCurso}_${selectedGrupo}_${selectedEvaluacion}`
                        .replace(/ /g, '_')
                        .replace(/Todos/g, 'T')
                        .replace(/Todas/g, 'T');
            if (sheetName.endsWith('_')) sheetName = sheetName.slice(0, -1);
            if (sheetName.startsWith('_')) sheetName = sheetName.slice(1);
        }
        sheetName = sheetName.substring(0, 31);

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `Avaliacion_Academica_${new Date().toISOString().slice(0, 10)}.xlsx`);
        this.uiController.showAlert("Datos exportados correctamente a Excel.", "success");
        setTimeout(() => this.uiController.hideAlert(), 3000);
    }


    async exportStatisticsExcel() {
        //const ExcelJS = await import('exceljs');
        const ExcelJS = window.ExcelJS;
        const workbook = new ExcelJS.Workbook();

        const allMaterias = new Set();
        const groupedData = new Map();

        this.dataModel.getDatosPorAlumno().forEach((record, clave) => {
            const [curso, grupo, evalua, nombreCompleto] = clave.split('_§_');

            // MODIFICACIÓN: Solo incluir 'Bac' para evaluación 'Ord'
            let shouldIncludeForStatistics =
                (curso.includes('Bac') && evalua === 'Ord') ||
                (curso.includes('ESO') && evalua === 'Final');

            if (!shouldIncludeForStatistics) return;

            const groupKey = `${curso}_§_${evalua}`;
            if (!groupedData.has(groupKey)) groupedData.set(groupKey, new Map());
            if (!groupedData.get(groupKey).has(grupo)) {
                groupedData.get(groupKey).set(grupo, {
                    materias: new Map(),
                    alumnos: new Set()
                });
            }
            const currentGroupStats = groupedData.get(groupKey).get(grupo);
            currentGroupStats.alumnos.add(nombreCompleto);

            for (const materia in record) {
                if (!['Media', 'Medida', 'ExValRen', 'Repite', 'Pendentes'].includes(materia)) {
                    const nota = this.parseNumberGalician(record[materia]);
                    if (!isNaN(nota)) {
                        if (!currentGroupStats.materias.has(materia)) currentGroupStats.materias.set(materia, []);
                        currentGroupStats.materias.get(materia).push(nota);
                        allMaterias.add(materia);
                    }
                }
            }
        });

        const sortedSubjects = Array.from(allMaterias).sort();
        const sortedCourseEvalKeys = Array.from(groupedData.keys()).sort((a, b) => {
            const [cursoA] = a.split('_§_');
            const [cursoB] = b.split('_§_');
            return this.dataModel.sortCursos([cursoA, cursoB])[0] === cursoA ? -1 : 1;
        });

        for (const courseEvalKey of sortedCourseEvalKeys) {
            const [curso, evalua] = courseEvalKey.split('_§_');
            const groupsInCourse = groupedData.get(courseEvalKey);
            if (!groupsInCourse || groupsInCourse.size === 0) continue;

            const worksheet = workbook.addWorksheet(`${curso.replace(/ /g, '_')}_${evalua}`.substring(0, 31));

            let row = worksheet.addRow(["PORCENTAXE DE APROBADOS EN XUÑO POR MATERIAS E NIVEL"]);
            row.font = { bold: true, size: 14, name: 'Arial' }; // Added Arial font
            worksheet.mergeCells(`A${row.number}:${String.fromCharCode(65 + sortedSubjects.length + 1)}${row.number}`);

            worksheet.addRow([]);

            let headers1 = ["Grupos", ...sortedSubjects, "% Aprobados Grupo"];
            worksheet.addRow(headers1).eachCell(cell => {
                cell.font = { bold: true, name: 'Arial' }; // Added Arial font
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });

            for (const grupo of Array.from(groupsInCourse.keys()).sort()) {
                const groupStats = groupsInCourse.get(grupo);
                const rowData = [grupo];
                let total = 0, approved = 0;

                for (const materia of sortedSubjects) {
                    const notas = groupStats.materias.get(materia) || [];
                    const aprobadas = notas.filter(n => n >= 5);
                    const pct = notas.length > 0 ? (aprobadas.length / notas.length * 100) : NaN;
                    if (!isNaN(pct)) {
                        total += notas.length;
                        approved += aprobadas.length;
                    }
                    rowData.push(!isNaN(pct) ? `${this.formatNumberForDisplay(pct)}%` : '');
                }

                const overall = total > 0 ? (approved / total * 100) : NaN;
                rowData.push(!isNaN(overall) ? `${this.formatNumberForDisplay(overall)}%` : '');

                const newRow = worksheet.addRow(rowData);
                newRow.eachCell(cell => {
                    cell.font = { name: 'Arial' };
                });
                const firstCell = newRow.getCell(1);
                firstCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFE0E0' } // Rojo suave
                };
            }

            let rowSummary = ["% Aprobados Curso"];
            for (const materia of sortedSubjects) {
                let allNotas = [];
                groupsInCourse.forEach(stats => {
                    allNotas = allNotas.concat(stats.materias.get(materia) || []);
                });
                const aprobadas = allNotas.filter(n => n >= 5);
                const pct = allNotas.length > 0 ? (aprobadas.length / allNotas.length * 100) : NaN;
                rowSummary.push(!isNaN(pct) ? `${this.formatNumberForDisplay(pct)}%` : '');
            }
            const allNotas = rowSummary.slice(1).filter(s => s).map(s => parseFloat(s));
            const avg = allNotas.length > 0 ? allNotas.reduce((a, b) => a + b, 0) / allNotas.length : NaN;
            rowSummary.push(!isNaN(avg) ? `${this.formatNumberForDisplay(avg)}%` : '');

            worksheet.addRow(rowSummary).eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
                cell.font = { bold: true, name: 'Arial' }; // Added Arial font
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });

            worksheet.addRow([]); worksheet.addRow([]); worksheet.addRow([]); worksheet.addRow([]);

            worksheet.addRow(["MEDIA DE CADA MATERIA POR GRUPO"]);
            worksheet.mergeCells(`A${worksheet.lastRow.number}:${String.fromCharCode(65 + sortedSubjects.length + 1)}${worksheet.lastRow.number}`);
            worksheet.lastRow.font = { bold: true, size: 14, name: 'Arial' }; // Added Arial font

            worksheet.addRow([]);

            let headers2 = ["Grupos", ...sortedSubjects, "Media Grupo"];
            worksheet.addRow(headers2).eachCell(cell => {
                cell.font = { bold: true, name: 'Arial' }; // Added Arial font
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });

            for (const grupo of Array.from(groupsInCourse.keys()).sort()) {
                const groupStats = groupsInCourse.get(grupo);
                const rowData = [grupo];
                let sum = 0, count = 0;

                for (const materia of sortedSubjects) {
                    const notas = groupStats.materias.get(materia) || [];
                    if (notas.length > 0) {
                        const media = notas.reduce((a, b) => a + b, 0) / notas.length;
                        sum += media * notas.length;
                        count += notas.length;
                        rowData.push(this.formatNumberForDisplay(media));
                    } else {
                        rowData.push('');
                    }
                }
                const mediaGrupo = count > 0 ? sum / count : NaN;
                rowData.push(!isNaN(mediaGrupo) ? this.formatNumberForDisplay(mediaGrupo) : '');

                const newRow = worksheet.addRow(rowData);
                newRow.eachCell(cell => {
                     cell.font = { name: 'Arial' };
                });
                const firstCell = newRow.getCell(1);
                firstCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFE0E0' } // Rojo suave
                };
            }

            let rowMediaCurso = ["Media Curso"];
            for (const materia of sortedSubjects) {
                let allNotas = [];
                groupsInCourse.forEach(stats => {
                    allNotas = allNotas.concat(stats.materias.get(materia) || []);
                });
                const avg = allNotas.length > 0 ? allNotas.reduce((a, b) => a + b, 0) / allNotas.length : NaN;
                rowMediaCurso.push(!isNaN(avg) ? this.formatNumberForDisplay(avg) : '');
            }
            const all = rowMediaCurso.slice(1).filter(s => s).map(s => parseFloat(s));
            const totalAvg = all.length > 0 ? all.reduce((a, b) => a + b, 0) / all.length : NaN;
            rowMediaCurso.push(!isNaN(totalAvg) ? this.formatNumberForDisplay(totalAvg) : '');

            worksheet.addRow(rowMediaCurso).eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3E8D3' } };
                cell.font = { bold: true, name: 'Arial' }; // Added Arial font
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });

            worksheet.columns.forEach(column => {
                let maxLength = 1;
                column.eachCell({ includeEmpty: true }, cell => {
                    const val = String(cell.value || '');
                    if (val.length > maxLength) maxLength = val.length;
                });

                // Set width for the first column (A) to approximately 1.2 cm
                if (column.number === 1) { // ExcelJS column.number is 1-based
                    column.width = 10; // Approx. 1.2 cm for Arial font
                } else {
                    // Set a reasonable width based on content, but not too small
                    column.width = Math.max(10, maxLength + 2);
                }
            });
        }

        // *** CÓDIGO PARA OCULTAR COLUMNAS VACÍAS ***
        workbook.worksheets.forEach(worksheet => {
            if (!worksheet) return;

            // Determinar el número de filas de cabecera a ignorar.
            // Asumimos que los datos empiezan después de la primera cabecera.
            // Buscamos la primera fila que contiene "Grupos".
            let headerRowCount = 0;
            worksheet.eachRow((row, rowNumber) => {
                if(row.getCell(1).value === 'Grupos') {
                    headerRowCount = rowNumber;
                    return false; // Salir del bucle
                }
            });

            if (headerRowCount === 0) headerRowCount = 3; // Fallback por si no se encuentra

            const columnCount = worksheet.columns.length;
            for (let i = 1; i <= columnCount; i++) {
                const column = worksheet.getColumn(i);
                let hasData = false;
                // Empezar a comprobar desde la fila siguiente a la cabecera
                for (let j = headerRowCount + 1; j <= worksheet.rowCount; j++) {
                    const cell = worksheet.getRow(j).getCell(i);
                    if (cell.value !== null && cell.value !== undefined && cell.value.toString().trim() !== '') {
                        hasData = true;
                        break; // Salir del bucle si se encuentra algún dato
                    }
                }
                if (!hasData) {
                    column.hidden = true;
                }
            }
        });
        // *** FIN DEL CÓDIGO DE OCULTAR ***

        if (workbook.worksheets.length === 0) {
            this.uiController.showAlert("Non se xeraron estatísticas coa configuración actual. Asegúrese de que hai datos de 'Bac/Ord' ou 'ESO/Final' cargados.", "warning");
            return;
        }

        const blob = await workbook.xlsx.writeBuffer();
        const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Estatisticas_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.uiController.showAlert("Estatísticas exportadas correctamente.", "success");
        setTimeout(() => this.uiController.hideAlert(), 3000);
    }
}
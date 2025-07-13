// =================================================================================================
// 6. AcademicEvaluatorApp: Orquestador principal
// =================================================================================================
class AcademicEvaluatorApp {
    constructor() {
        this.dataModel = new DataModel();
        // Pass partially, then set full dependencies later to avoid circular references in constructor
        this.uiController = new UIController(this.dataModel, null, null);
        this.tableDisplayManager = new TableDisplayManager(this.dataModel, this.uiController);
        this.exportManager = new ExportManager(this.dataModel, this.tableDisplayManager, this.uiController);
        this.dataLoader = new DataLoader(this.dataModel, this.uiController);


        // Complete UIController's dependencies after all managers are instantiated
        this.uiController.tableDisplayManager = this.tableDisplayManager;
        this.uiController.exportManager = this.exportManager;

        this.initEvents();
    }

    initEvents() {
        // Event Listeners for UI elements
        if (this.uiController.btnImportarDatos) {
            this.uiController.btnImportarDatos.addEventListener('click', () => this.uiController.fileInput.click());
        }
        if (this.uiController.fileInput) {
            this.uiController.fileInput.addEventListener('change', async (e) => {
                await this.dataLoader.loadFile(e.target.files[0]);
                // Re-apply filters after loading to ensure UI is updated
                this.tableDisplayManager.applyFiltersAndRender(
                    this.uiController.comboCurso.value,
                    this.uiController.comboGrupo.value,
                    this.uiController.comboEval.value
                );
            });
        }
        if (this.uiController.comboCurso) {
            this.uiController.comboCurso.addEventListener('change', () => this.uiController.updateGrupoCombo());
        }
        if (this.uiController.comboGrupo) {
            this.uiController.comboGrupo.addEventListener('change', () => this.tableDisplayManager.applyFiltersAndRender(
                this.uiController.comboCurso.value,
                this.uiController.comboGrupo.value,
                this.uiController.comboEval.value
            ));
        }
        if (this.uiController.comboEval) {
            this.uiController.comboEval.addEventListener('change', () => this.tableDisplayManager.applyFiltersAndRender(
                this.uiController.comboCurso.value,
                this.uiController.comboGrupo.value,
                this.uiController.comboEval.value
            ));
        }
        if (this.uiController.btnExportarPdf) {
            this.uiController.btnExportarPdf.addEventListener('click', () => this.exportManager.exportPDF());
        }
        if (this.uiController.btnExportarHtml) {
            this.uiController.btnExportarHtml.addEventListener('click', () => this.exportManager.exportHTML());
        }
        if (this.uiController.btnExportarExcel) {
            this.uiController.btnExportarExcel.addEventListener('click', () => this.exportManager.exportExcel());
        }
        if (this.uiController.btnEstadisticas) {
            this.uiController.btnEstadisticas.addEventListener('click', () => this.exportManager.exportStatisticsExcel());
        }
        console.log("DEBUG_App: Eventos inicializados.");
    }
}

// Inicializa la aplicación cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    new AcademicEvaluatorApp();
});

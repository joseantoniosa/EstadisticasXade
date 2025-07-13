/**
 * 
 */
// =================================================================================================
// 1. DataModel: Almacena y gestiona los datos de la aplicación
// =================================================================================================
class DataModel {
    constructor() {
        this.datosPorAlumno = new Map(); // clave (curso_grupo_eval_nombre) -> {materia1: nota, materia2: nota, ...}
        this.infoBasica = new Map(); // clave (curso_grupo_eval_nombre) -> {medida, exvalren, repite, pendentes}
        this.materiasOrdenadas = []; // Array de materias únicas y ordenadas
        this.cursosDisponibles = new Set();
        this.evaluacionesDisponibles = new Set();
        this.gruposDisponibles = new Set();
        this.gruposPorCurso = new Map(); // Mapa: curso -> Set de grupos para ese curso
        this.fechaArchivo = null;
    }

    clear() {
        this.datosPorAlumno.clear();
        this.infoBasica.clear();
        this.materiasOrdenadas = [];
        this.cursosDisponibles.clear();
        this.evaluacionesDisponibles.clear();
        this.gruposDisponibles.clear();
        this.gruposPorCurso.clear();
        this.fechaArchivo = null;
        console.log("DEBUG_DataModel: Datos limpiados.");
    }

    addRecord({ curso, grupo, evalua, nombreCompleto, materia, nota, medida, exvalren, repite, pendentes }) {
        const clave = `${curso}_§_${grupo}_§_${evalua}_§_${nombreCompleto}`;

        if (!this.infoBasica.has(clave)) {
            this.infoBasica.set(clave, { medida, exvalren, repite, pendentes });
        }

        if (!this.datosPorAlumno.has(clave)) {
            this.datosPorAlumno.set(clave, {});
        }
        this.datosPorAlumno.get(clave)[materia] = nota;

        if (materia && materia.trim() !== '') {
            this.materiasOrdenadas.push(materia);
        }

        this.cursosDisponibles.add(curso);
        this.evaluacionesDisponibles.add(evalua);
        this.gruposDisponibles.add(grupo);
        if (!this.gruposPorCurso.has(curso)) {
            this.gruposPorCurso.set(curso, new Set());
        }
        this.gruposPorCurso.get(curso).add(grupo);
    }

    finalizeMaterias() {
        this.materiasOrdenadas = Array.from(new Set(this.materiasOrdenadas)).sort();
        console.log(`DEBUG_DataModel: Materias finalizadas: ${JSON.stringify(this.materiasOrdenadas)}`);
    }

    // Getters for available data
    getAllCursos() {
        return Array.from(this.cursosDisponibles);
    }

    getAllEvaluaciones() {
        return Array.from(this.evaluacionesDisponibles);
    }

    getGruposForCurso(curso) {
        return this.gruposPorCurso.has(curso) ? Array.from(this.gruposPorCurso.get(curso)) : [];
    }

    getAllGrupos() {
        return Array.from(this.gruposDisponibles);
    }

    getDatosPorAlumno() {
        return this.datosPorAlumno;
    }

    getInfoBasica() {
        return this.infoBasica;
    }

    getMateriasOrdenadas() {
        return this.materiasOrdenadas;
    }

    getFechaArchivo() {
        return this.fechaArchivo;
    }

    setFechaArchivo(date) {
        this.fechaArchivo = date;
    }

    // Utility: Sort courses (e.g., "1º ESO", "2º ESO, "1º BAC")
    sortCursos(cursos) {
        return cursos.sort((a, b) => {
            const parseCurso = (c) => {
                const match = c.match(/(\d+)\s*(º|ª)?\s*(ESO|BAC)/i);
                if (match) {
                    const num = parseInt(match[1]);
                    const stage = match[3].toUpperCase();
                    let stageValue = 0;
                    if (stage === 'ESO') stageValue = 100;
                    if (stage === 'BAC') stageValue = 200;
                    return num + stageValue;
                }
                return 0; // fallback for courses that don't match the pattern
            };
            return parseCurso(a) - parseCurso(b);
        });
    }

    // Utility: Normalize string for sorting (remove accents, convert to lowercase)
    normalizeStringForSort(str) {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }
}
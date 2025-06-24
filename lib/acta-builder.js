"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActaBuilder = void 0;
var date_fns_1 = require("date-fns");
var locale_1 = require("date-fns/locale");
var ActaBuilder = /** @class */ (function () {
    function ActaBuilder(sesionData) {
        this.sesion = sesionData;
        this.htmlContent = "";
    }
    ActaBuilder.prototype.formatDateTime = function (dateString, timeString) {
        try {
            var date = (0, date_fns_1.parseISO)(dateString);
            var _a = timeString.split(':').map(Number), hours = _a[0], minutes = _a[1], seconds = _a[2];
            date.setHours(hours, minutes, seconds || 0);
            return (0, date_fns_1.format)(date, "EEEE dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: locale_1.es });
        }
        catch (error) {
            console.error("Error formatting date/time:", error);
            return "Fecha: ".concat(dateString, ", Hora: ").concat(timeString);
        }
    };
    ActaBuilder.prototype.buildHeader = function () {
        var _a = this.sesion, codigo_sesion = _a.codigo_sesion, fecha = _a.fecha, hora = _a.hora, modalidad = _a.modalidad, lugar = _a.lugar, tipo = _a.tipo, hora_fin = _a.hora_fin;
        var formattedDateTime = this.formatDateTime(fecha, hora);
        var formattedEndTime = hora_fin ? " - ".concat(hora_fin) : '';
        this.htmlContent += "\n      <div style=\"font-family: Arial, sans-serif; margin: 20px; color: #333;\">\n        <div style=\"text-align: center; margin-bottom: 30px;\">\n          <h1 style=\"color: #0056b3; margin-bottom: 10px;\">ACTA DE SESI\u00D3N</h1>\n          <h2 style=\"color: #0056b3; margin-bottom: 10px;\">".concat(tipo, " ").concat(codigo_sesion, "</h2>\n          <p style=\"font-size: 16px; margin-bottom: 5px;\">\n            Celebrada el ").concat(formattedDateTime).concat(formattedEndTime, "\n          </p>\n          <p style=\"font-size: 16px;\">\n            Modalidad: <strong>").concat(modalidad, "</strong> en <strong>").concat(lugar, "</strong>\n          </p>\n        </div>\n        <hr style=\"border: 2px solid #0056b3; margin: 20px 0;\">\n    ");
        return this;
    };
    ActaBuilder.prototype.buildGeneralInfo = function () {
        var _a = this.sesion, codigo_sesion = _a.codigo_sesion, fecha = _a.fecha, hora = _a.hora, modalidad = _a.modalidad, lugar = _a.lugar, tipo = _a.tipo, hora_fin = _a.hora_fin;
        var formattedFecha = (0, date_fns_1.format)((0, date_fns_1.parseISO)(fecha), "dd/MM/yyyy", { locale: locale_1.es });
        var formattedEndTime = hora_fin ? " - ".concat(hora_fin) : '';
        this.htmlContent += "\n      <div style=\"margin-bottom: 30px;\">\n        <h3 style=\"color: #0056b3; border-bottom: 1px solid #0056b3; padding-bottom: 5px;\">INFORMACI\u00D3N GENERAL</h3>\n        <table style=\"width: 100%; border-collapse: collapse; margin-top: 15px;\">\n          <tr>\n            <td style=\"padding: 8px; width: 30%;\"><strong>C\u00F3digo de Sesi\u00F3n:</strong></td>\n            <td style=\"padding: 8px;\">".concat(codigo_sesion, "</td>\n          </tr>\n          <tr>\n            <td style=\"padding: 8px;\"><strong>Fecha:</strong></td>\n            <td style=\"padding: 8px;\">").concat(formattedFecha, "</td>\n          </tr>\n          <tr>\n            <td style=\"padding: 8px;\"><strong>Hora:</strong></td>\n            <td style=\"padding: 8px;\">").concat(hora).concat(formattedEndTime, "</td>\n          </tr>\n          <tr>\n            <td style=\"padding: 8px;\"><strong>Modalidad:</strong></td>\n            <td style=\"padding: 8px;\">").concat(modalidad, "</td>\n          </tr>\n          <tr>\n            <td style=\"padding: 8px;\"><strong>Lugar:</strong></td>\n            <td style=\"padding: 8px;\">").concat(lugar, "</td>\n          </tr>\n          <tr>\n            <td style=\"padding: 8px;\"><strong>Tipo de Sesi\u00F3n:</strong></td>\n            <td style=\"padding: 8px;\">").concat(tipo, "</td>\n          </tr>\n        </table>\n      </div>\n    ");
        return this;
    };
    ActaBuilder.prototype.buildParticipantes = function () {
        var miembrosPresentes = [];
        var externosPresentes = [];
        // Recopilar miembros de la junta directiva presentes
        this.sesion.sesiones_participantes.forEach(function (sp) {
            var _a, _b;
            if (sp.estado_asistencia === 'PRESENTE') {
                if ((_a = sp.junta_directiva_miembros) === null || _a === void 0 ? void 0 : _a.nombre_completo) {
                    miembrosPresentes.push("".concat(sp.junta_directiva_miembros.nombre_completo, " (").concat(sp.junta_directiva_miembros.puesto, ")"));
                }
                else if ((_b = sp.usuarios) === null || _b === void 0 ? void 0 : _b.nombre) {
                    miembrosPresentes.push("".concat(sp.usuarios.nombre, " (").concat(sp.usuarios.rol, ")"));
                }
            }
        });
        // Recopilar participantes externos presentes
        this.sesion.sesion_participantes_externos.forEach(function (ep) {
            if (ep.estado_asistencia === 'PRESENTE') {
                externosPresentes.push("".concat(ep.nombre, " (").concat(ep.email, ")"));
            }
        });
        this.htmlContent += "\n      <div style=\"margin-bottom: 30px;\">\n        <h3 style=\"color: #0056b3; border-bottom: 1px solid #0056b3; padding-bottom: 5px;\">PARTICIPANTES</h3>\n        \n        <h4 style=\"color: #0056b3; margin-top: 15px;\">Miembros de la Junta Directiva Presentes:</h4>\n        ".concat(miembrosPresentes.length > 0 ? "\n          <ul style=\"list-style: none; padding: 0; margin-left: 20px;\">\n            ".concat(miembrosPresentes.map(function (m) { return "<li style=\"margin-bottom: 5px;\">".concat(m, "</li>"); }).join(""), "\n          </ul>\n        ") : "<p style=\"margin-left: 20px;\">No hay miembros de la junta directiva presentes registrados.</p>", "\n\n        <h4 style=\"color: #0056b3; margin-top: 15px;\">Participantes Externos Presentes:</h4>\n        ").concat(externosPresentes.length > 0 ? "\n          <ul style=\"list-style: none; padding: 0; margin-left: 20px;\">\n            ".concat(externosPresentes.map(function (e) { return "<li style=\"margin-bottom: 5px;\">".concat(e, "</li>"); }).join(""), "\n          </ul>\n        ") : "<p style=\"margin-left: 20px;\">No hay participantes externos presentes registrados.</p>", "\n      </div>\n    ");
        return this;
    };
    ActaBuilder.prototype.buildAgenda = function () {
        var _a;
        var agenda = (_a = this.sesion.agendas) === null || _a === void 0 ? void 0 : _a[0];
        var puntos = (agenda === null || agenda === void 0 ? void 0 : agenda.puntos_agenda.sort(function (a, b) { return a.orden - b.orden; })) || [];
        this.htmlContent += "\n      <div style=\"margin-bottom: 30px;\">\n        <h3 style=\"color: #0056b3; border-bottom: 1px solid #0056b3; padding-bottom: 5px;\">AGENDA DE LA SESI\u00D3N</h3>\n        ".concat(puntos.length > 0 ? "\n          ".concat(puntos.map(function (punto, index) {
            var _a;
            var responsablesNombres = [];
            (_a = punto.punto_responsables) === null || _a === void 0 ? void 0 : _a.forEach(function (pr) {
                var _a, _b, _c;
                if ((_a = pr.usuarios) === null || _a === void 0 ? void 0 : _a.nombre) {
                    responsablesNombres.push(pr.usuarios.nombre);
                }
                else if ((_b = pr.junta_directiva_miembros) === null || _b === void 0 ? void 0 : _b.nombre_completo) {
                    responsablesNombres.push(pr.junta_directiva_miembros.nombre_completo);
                }
                else if ((_c = pr.sesion_participantes_externos) === null || _c === void 0 ? void 0 : _c.nombre) {
                    responsablesNombres.push(pr.sesion_participantes_externos.nombre);
                }
            });
            var responsablesHtml = responsablesNombres.length > 0 ?
                "<p><strong>Responsable(s):</strong> ".concat(responsablesNombres.join(", "), "</p>") : '';
            return "\n            <div style=\"margin-bottom: 50px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; background-color: #f9f9f9;\">\n              <h4 style=\"color: #0056b3; margin-bottom: 10px;\">".concat(index + 1, ". ").concat(punto.titulo, "</h4>\n              \n              <div style=\"margin-left: 20px;\">\n                ").concat(punto.descripcion ? "<p><strong>Descripci\u00F3n:</strong> ".concat(punto.descripcion, "</p>") : "", "\n                ").concat(punto.tiempo_estimado ? "<p><strong>Tiempo Estimado:</strong> ".concat(punto.tiempo_estimado, " minutos</p>") : "", "\n                <p><strong>Categor\u00EDa:</strong> ").concat(punto.categoria, "</p>\n                ").concat(punto.anotaciones ? "<p><strong>Anotaciones:</strong> ".concat(punto.anotaciones, "</p>") : "", "\n\n                ").concat(punto.requiere_votacion ? "\n                  <div style=\"margin-top: 10px;\">\n                    <p><strong>Votaci\u00F3n:</strong> ".concat(punto.estado_votacion, "</p>\n                    <ul style=\"list-style: none; padding: 0; margin-left: 20px;\">\n                      <li>Votos a favor: ").concat(punto.votos_a_favor, "</li>\n                      <li>Votos en contra: ").concat(punto.votos_en_contra, "</li>\n                      <li>Votos abstenci\u00F3n: ").concat(punto.votos_abstenciones, "</li>\n                    </ul>\n                  </div>\n                ") : "", "\n\n                ").concat(responsablesHtml, "\n\n                ").concat(punto.documentos && punto.documentos.length > 0 ? "\n                  <div style=\"margin-top: 10px;\">\n                    <p><strong>Documentos Adjuntos:</strong></p>\n                    <ul style=\"list-style: none; padding: 0; margin-left: 20px;\">\n                      ".concat(punto.documentos.map(function (doc) { return "<li><a href=\"".concat(doc.url, "\" target=\"_blank\">").concat(doc.nombre, " (").concat(doc.tipo, ")</a></li>"); }).join(""), "\n                    </ul>\n                  </div>\n                ") : "", "\n\n                ").concat(punto.acuerdos && punto.acuerdos.length > 0 ? "\n                  <div style=\"margin-top: 10px;\">\n                    <p><strong>Acuerdos:</strong></p>\n                    <ul style=\"list-style: none; padding: 0; margin-left: 20px;\">\n                      ".concat(punto.acuerdos.map(function (acuerdo) {
                var _a;
                var acuerdoResponsablesNombres = [];
                (_a = acuerdo.acuerdo_responsables) === null || _a === void 0 ? void 0 : _a.forEach(function (ar) {
                    var _a, _b, _c;
                    if ((_a = ar.usuarios) === null || _a === void 0 ? void 0 : _a.nombre) {
                        acuerdoResponsablesNombres.push(ar.usuarios.nombre);
                    }
                    else if ((_b = ar.junta_directiva_miembros) === null || _b === void 0 ? void 0 : _b.nombre_completo) {
                        acuerdoResponsablesNombres.push(ar.junta_directiva_miembros.nombre_completo);
                    }
                    else if ((_c = ar.sesion_participantes_externos) === null || _c === void 0 ? void 0 : _c.nombre) {
                        acuerdoResponsablesNombres.push(ar.sesion_participantes_externos.nombre);
                    }
                });
                var acuerdoResponsablesHtml = acuerdoResponsablesNombres.length > 0 ?
                    "(Responsable(s): ".concat(acuerdoResponsablesNombres.join(", "), ")") : '';
                return "\n                        <li style=\"margin-bottom: 15px;\">\n                          ".concat(acuerdo.descripcion, " \n                          ").concat(acuerdo.fecha_limite ? "<br/><strong>Fecha L\u00EDmite:</strong> ".concat((0, date_fns_1.format)((0, date_fns_1.parseISO)(acuerdo.fecha_limite), "dd/MM/yyyy", { locale: locale_1.es }), "") : "", "\n                          ").concat(acuerdoResponsablesNombres.length > 0 ? "<br/><strong>Responsable(s):</strong> ".concat(acuerdoResponsablesNombres.join(", "), "") : "", "\n                        </li>\n                      ");
            }).join(""), "\n                    </ul>\n                  </div>\n                ") : "", "\n              </div>\n            </div>\n          ");
        }).join(""), "\n        ") : "<p>No hay puntos en la agenda para esta sesi\u00F3n.</p>", "\n      </div>\n    ");
        return this;
    };
    ActaBuilder.prototype.buildSecretarySignature = function () {
        this.htmlContent += "\n      <div style=\"margin-top: 50px; text-align: center;\">\n        <p style=\"margin-bottom: 40px;\">___________________________</p>\n        <p style=\"font-weight: bold;\">Firma del Secretario/a</p>\n        <p>[Nombre del Secretario/a]</p>\n        <p>[Rol del Secretario/a]</p>\n      </div>\n    ";
        return this;
    };
    ActaBuilder.prototype.buildFooter = function () {
        this.htmlContent += "\n      <div style=\"text-align: center; font-size: 12px; color: #777; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;\">\n        <p>Acta generada autom\u00E1ticamente por el sistema de gesti\u00F3n de reuniones.</p>\n        <p>Fecha de generaci\u00F3n: ".concat((0, date_fns_1.format)(new Date(), "dd/MM/yyyy HH:mm", { locale: locale_1.es }), "</p>\n      </div>\n    </div>\n    ");
        return this;
    };
    ActaBuilder.prototype.build = function () {
        this.htmlContent = ""; // Reset content before building
        this.buildHeader();
        this.buildGeneralInfo();
        this.buildParticipantes();
        this.buildAgenda();
        this.buildSecretarySignature();
        this.buildFooter();
        return this.htmlContent;
    };
    return ActaBuilder;
}());
exports.ActaBuilder = ActaBuilder;

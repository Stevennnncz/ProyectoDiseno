-- Crear tabla de usuarios con roles
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL CHECK (rol IN ('ADMINISTRADOR', 'PRESIDENTE', 'TESORERO', 'INVITADO')),
  junta_directiva_miembro_id UUID UNIQUE REFERENCES junta_directiva_miembros(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de sesiones
CREATE TABLE IF NOT EXISTS sesiones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_sesion VARCHAR(20) UNIQUE NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  modalidad VARCHAR(20) NOT NULL CHECK (modalidad IN ('PRESENCIAL', 'VIRTUAL')),
  lugar VARCHAR(255) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA' CHECK (estado IN ('PROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA')),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ORDINARIA', 'EXTRAORDINARIA')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acta_url VARCHAR(500),
  hora_fin TIME NOT NULL
);

-- Crear tabla de agenda
CREATE TABLE IF NOT EXISTS agendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de puntos de agenda
CREATE TABLE IF NOT EXISTS puntos_agenda (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agenda_id UUID REFERENCES agendas(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tiempo_estimado INTEGER, -- en minutos
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('INFORMATIVO', 'APROBACION', 'DISCUSION')),
  requiere_votacion BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  inicio TIMESTAMP WITH TIME ZONE,
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_CURSO', 'FINALIZADO')),
  estado_votacion VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_votacion IN ('APROBADA', 'RECHAZADA', 'ABSTENIDO')),
  anotaciones VARCHAR(500),
  votos_a_favor INTEGER DEFAULT 0,
  votos_en_contra INTEGER DEFAULT 0,
  votos_abstencion INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS puntos_responsables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de documentos
CREATE TABLE IF NOT EXISTS documentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  punto_id UUID REFERENCES puntos_agenda(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  tipo VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de votaciones
CREATE TABLE IF NOT EXISTS votaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  punto_id UUID REFERENCES puntos_agenda(id) ON DELETE CASCADE,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  estado VARCHAR(20) DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA'))
);

-- Crear tabla de votos
CREATE TABLE IF NOT EXISTS votos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  votacion_id UUID REFERENCES votaciones(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  opcion VARCHAR(20) NOT NULL CHECK (opcion IN ('A_FAVOR', 'EN_CONTRA', 'ABSTENCION')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(votacion_id, usuario_id)
);

-- Crear tabla de acuerdos
CREATE TABLE IF NOT EXISTS acuerdos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  punto_id UUID REFERENCES puntos_agenda(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  fecha_limite DATE,
  estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de responsables de acuerdos
CREATE TABLE IF NOT EXISTS acuerdo_responsables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  acuerdo_id UUID REFERENCES acuerdos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE NULL,
  external_participant_id UUID REFERENCES sesion_participantes_externos(id) ON DELETE CASCADE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_responsible_type CHECK (
    (usuario_id IS NOT NULL AND external_participant_id IS NULL) OR
    (usuario_id IS NULL AND external_participant_id IS NOT NULL)
  ),
  UNIQUE (acuerdo_id, usuario_id, external_participant_id)
);

-- Crear tabla de actas
CREATE TABLE IF NOT EXISTS actas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  fecha_generacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de justificaciones de ausencia
CREATE TABLE IF NOT EXISTS justificaciones_ausencia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  url_documento VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, sesion_id)
);

-- Crear tabla para la relación muchos a muchos entre sesiones y usuarios
DROP TABLE IF EXISTS sesiones_participantes CASCADE;
CREATE TABLE IF NOT EXISTS sesiones_participantes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE NULL,
  junta_directiva_miembro_id UUID REFERENCES junta_directiva_miembros(id) ON DELETE CASCADE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  estado_asistencia VARCHAR(20) NOT NULL DEFAULT 'AUSENTE' CHECK (estado_asistencia IN ('PRESENTE', 'AUSENTE')),
  asistira BOOLEAN DEFAULT TRUE,
  CONSTRAINT chk_participant_type CHECK (
    (usuario_id IS NOT NULL AND junta_directiva_miembro_id IS NULL) OR
    (usuario_id IS NULL AND junta_directiva_miembro_id IS NOT NULL)
  ),
  UNIQUE (sesion_id, usuario_id),
  UNIQUE (sesion_id, junta_directiva_miembro_id)
);

-- Crear tabla para la relación muchos a muchos entre puntos de agenda y usuarios responsables
DROP TABLE IF EXISTS punto_responsables CASCADE;
CREATE TABLE IF NOT EXISTS punto_responsables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  punto_id UUID REFERENCES puntos_agenda(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE NULL,
  junta_directiva_miembro_id UUID REFERENCES junta_directiva_miembros(id) ON DELETE CASCADE NULL,
  external_participant_id UUID REFERENCES sesion_participantes_externos(id) ON DELETE CASCADE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_responsible_type CHECK (
    (usuario_id IS NOT NULL AND junta_directiva_miembro_id IS NULL AND external_participant_id IS NULL) OR
    (usuario_id IS NULL AND junta_directiva_miembro_id IS NOT NULL AND external_participant_id IS NULL) OR
    (usuario_id IS NULL AND junta_directiva_miembro_id IS NULL AND external_participant_id IS NOT NULL)
  ),
  UNIQUE (punto_id, usuario_id),
  UNIQUE (punto_id, junta_directiva_miembro_id),
  UNIQUE (punto_id, external_participant_id)
);

-- Crear tabla para participantes externos de la sesión
CREATE TABLE IF NOT EXISTS sesion_participantes_externos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  estado_asistencia VARCHAR(20) NOT NULL DEFAULT 'AUSENTE' CHECK (estado_asistencia IN ('PRESENTE', 'AUSENTE'))
);

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  mensaje TEXT NOT NULL,
  fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de miembros de la junta directiva
CREATE TABLE IF NOT EXISTS junta_directiva_miembros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_completo VARCHAR(255) NOT NULL,
  puesto VARCHAR(255) NOT NULL,
  correo VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha ON sesiones(fecha);
CREATE INDEX IF NOT EXISTS idx_sesiones_estado ON sesiones(estado);
CREATE INDEX IF NOT EXISTS idx_puntos_agenda_orden ON puntos_agenda(agenda_id, orden);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id, leida);

-- ============================================================
-- 002: Graph Tables — Connections and Continuity Conflicts
-- ============================================================

CREATE TYPE connection_type AS ENUM (
    'leads_to',
    'ties_into',
    'spin_off',
    'retcons',
    'references',
    'parallel',
    'collected_in',
    'prerequisite',
    'recommended_after'
);

CREATE TYPE interpretation_type AS ENUM (
    'official',
    'fan_accepted',
    'editorial_retcon'
);

-- ============================================================
-- CONNECTIONS (Graph Edges)
-- ============================================================
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    connection_type connection_type NOT NULL,
    strength INTEGER CHECK (strength BETWEEN 1 AND 10),
    confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
    interpretation interpretation_type DEFAULT 'official',
    description TEXT,
    citation TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(source_type, source_id, target_type, target_id, connection_type)
);

CREATE INDEX idx_connections_source ON connections(source_type, source_id);
CREATE INDEX idx_connections_target ON connections(target_type, target_id);
CREATE INDEX idx_connections_type ON connections(connection_type);

-- ============================================================
-- CONTINUITY CONFLICTS
-- ============================================================
CREATE TABLE continuity_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    official_stance TEXT NOT NULL,
    fan_interpretation TEXT NOT NULL,
    editorial_context TEXT NOT NULL,
    confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
    source_citations TEXT[] DEFAULT '{}',
    related_edition_ids UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

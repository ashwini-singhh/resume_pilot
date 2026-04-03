-- Supabase Schema for AI Resume Pipeline SaaS

-- Users table (extends default auth if needed, but keeping isolated for simplicity in this standalone script)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stripe_customer_id TEXT,
    subscription_status TEXT DEFAULT 'free',
    free_runs_remaining INTEGER DEFAULT 3
);

-- Job Descriptions
CREATE TABLE job_descriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    company TEXT,
    raw_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resumes
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT,
    raw_text TEXT,
    parsed_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pipeline Runs
CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    jd_id UUID REFERENCES job_descriptions(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    coverage_score NUMERIC,
    stats JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
    section TEXT,
    entry_id TEXT,
    bullet_index INTEGER,
    original_text TEXT,
    suggested_text TEXT,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected
    diff_data JSONB, -- Optional green/red breakdown
    trigger_source TEXT DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 
-- Assume authentication is handled via Supabase Auth

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can do all to their JDs" ON job_descriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can do all to their resumes" ON resumes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can do all to their runs" ON runs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can do all to their suggestions" ON suggestions FOR ALL USING (
    EXISTS (SELECT 1 FROM runs r WHERE r.id = suggestions.run_id AND r.user_id = auth.uid())
);

-- ── On-Demand Improvement Context Messages (new isolated table) ──
CREATE TABLE IF NOT EXISTS context_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL,               -- logical session UUID, no FK (decoupled)
    suggestion_id UUID REFERENCES suggestions(id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('assistant', 'user')),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_context_messages_run_id ON context_messages (run_id);

ALTER TABLE context_messages ENABLE ROW LEVEL SECURITY;

-- Context messages are visible if the run_id matches any suggestion the user owns,
-- OR they can be accessed directly by the app service-role key.
CREATE POLICY "Users can access their own context messages" ON context_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM suggestions s
            JOIN runs r ON r.id = s.run_id
            WHERE s.id = context_messages.suggestion_id
            AND r.user_id = auth.uid()
        )
    );

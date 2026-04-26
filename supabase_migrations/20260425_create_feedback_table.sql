-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL, -- Bug, Confusing, Feature Request, Loved it, Other
    message TEXT NOT NULL,
    rating INTEGER, -- 1-5 stars
    context JSONB, -- metadata like score, template, feature, action
    page TEXT, -- current page name
    feature TEXT, -- current feature name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback" ON feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admin can read all feedback
-- Note: Assuming we have a service role or a specific admin check. 
-- For now, allow reading if user is authenticated (simple for dev) or specific admin check if metadata has admin=true
CREATE POLICY "Admins can read all feedback" ON feedback
    FOR SELECT USING (
        (SELECT (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean) = true
    );

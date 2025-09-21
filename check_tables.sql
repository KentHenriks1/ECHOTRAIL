-- Check structure of existing tables
\d users
\d trails  
\d track_points
\d user_sessions
\d share_links

-- Check for any existing data
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as trail_count FROM trails;
SELECT COUNT(*) as track_point_count FROM track_points;
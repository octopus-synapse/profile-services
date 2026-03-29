-- Update section type icons from emoji to Lucide icons
-- This migration changes iconType from 'emoji' to 'lucide' and updates icon names

UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'briefcase' WHERE "key" = 'work_experience_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'graduation-cap' WHERE "key" = 'education_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'zap' WHERE "key" = 'skill_set_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'globe' WHERE "key" = 'language_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'badge-check' WHERE "key" = 'certification_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'rocket' WHERE "key" = 'project_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'book-open' WHERE "key" = 'publication_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'trophy' WHERE "key" = 'award_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'heart-handshake' WHERE "key" = 'volunteer_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'git-branch' WHERE "key" = 'open_source_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'bug' WHERE "key" = 'bug_bounty_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'medal' WHERE "key" = 'hackathon_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'mic' WHERE "key" = 'talk_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'star' WHERE "key" = 'achievement_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'file-text' WHERE "key" = 'summary_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'lightbulb' WHERE "key" = 'interest_v1';
UPDATE "SectionType" SET "iconType" = 'lucide', "icon" = 'users' WHERE "key" = 'recommendation_v1';

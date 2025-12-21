-- Create database schema
-- Run this script to initialize your PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE user_role AS ENUM ('CONTRACTOR', 'SUBCONTRACTOR');
CREATE TYPE project_status AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED');
CREATE TYPE bid_status AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'AWARDED', 'DECLINED', 'WITHDRAWN');
CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
CREATE TYPE document_type AS ENUM ('BLUEPRINT', 'SPECIFICATION', 'CONTRACT', 'ADDENDUM', 'PHOTO', 'OTHER');

-- Note: All tables are created automatically by Drizzle ORM
-- This script is for documentation purposes and initial enum setup

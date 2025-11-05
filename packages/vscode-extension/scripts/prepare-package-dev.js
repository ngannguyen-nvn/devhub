/**
 * Simplified packaging script for local development
 * Skips all prebuild downloads and uses locally built better-sqlite3
 */

// Set environment variable for the main script
process.env.SKIP_PREBUILD_DOWNLOAD = '1';

// Run the main prepare-package script
require('./prepare-package.js');

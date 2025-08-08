#!/usr/bin/env node

import { Pool } from 'pg';
import config from './src/dvm/config.js';

async function dropFunctions() {
    const pool = new Pool(config.database);

    try {
        console.log('🗑️  Dropping existing functions...');

        const dropCommands = [
            'DROP FUNCTION IF EXISTS get_user_relay_recommendations(TEXT, TEXT, INT, BOOLEAN)',
            'DROP FUNCTION IF EXISTS analyze_user_current_relays(TEXT, TEXT[])',
            'DROP FUNCTION IF EXISTS get_discovery_relays(TEXT, TEXT[], INT)',
            'DROP FUNCTION IF EXISTS get_discovery_relays(INT)',
            'DROP FUNCTION IF EXISTS get_relay_health_summary()',
            'DROP FUNCTION IF EXISTS generate_relay_rotation_strategy(TEXT, TEXT[], INT)',
            'DROP FUNCTION IF EXISTS refresh_relay_analytics()'
        ];

        for (const command of dropCommands) {
            await pool.query(command);
            console.log(`✅ ${command}`);
        }

        console.log('🎉 All functions dropped successfully!');
        console.log('Now run: npm run comprehensive-setup');

    } catch (error) {
        console.error('❌ Error dropping functions:', error.message);
    } finally {
        await pool.end();
    }
}

dropFunctions();
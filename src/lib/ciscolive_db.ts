import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'ciscolive.db');

// Ensure DB file exists
const db = new Database(DB_PATH);

// Initialize Tables
db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
        mac TEXT PRIMARY KEY,
        name TEXT, -- User defined alias
        model TEXT,
        firmware TEXT,
        battery INTEGER,
        lastSeen TEXT,
        vendor TEXT,
        status TEXT, -- 'Active', 'Inactive', etc.
        x INTEGER, -- Widget X position
        y INTEGER, -- Widget Y position
        layoutIndex INTEGER, -- Legacy/Order
        notes TEXT
    );

    CREATE TABLE IF NOT EXISTS stats (
        mac TEXT,
        hour TEXT, -- ISO string truncated to hour
        type TEXT, -- 'BLE' or 'UWB'
        count INTEGER DEFAULT 0,
        PRIMARY KEY (mac, hour, type)
    );
`);

// Helpers
export const getCiscoDB = () => db;

export const upsertDevice = (device: {
    mac: string;
    model?: string;
    firmware?: string;
    battery?: number;
    lastSeen?: string;
    vendor?: string;
    name?: string;
    status?: string;
    x?: number;
    y?: number;
}) => {
    // Dynamic update based on provided fields to avoid overwriting with nulls
    // But for simplicity in sqlite, we usually use COALESCE in SQL or object merge in JS.

    // We want to update technical fields (model, firmware, battery, lastSeen, vendor) always if provided.
    // We want to KEEP user fields (name, notes, x, y, layoutIndex) if not provided.

    const stmt = db.prepare(`
        INSERT INTO devices (mac, model, firmware, battery, lastSeen, vendor, name, status, x, y)
        VALUES (@mac, @model, @firmware, @battery, @lastSeen, @vendor, @name, @status, @x, @y)
        ON CONFLICT(mac) DO UPDATE SET
            model = COALESCE(excluded.model, devices.model),
            firmware = COALESCE(excluded.firmware, devices.firmware),
            battery = COALESCE(excluded.battery, devices.battery),
            lastSeen = COALESCE(excluded.lastSeen, devices.lastSeen),
            vendor = COALESCE(excluded.vendor, devices.vendor),
            status = COALESCE(excluded.status, devices.status),
            -- Only update name/x/y if explicitly provided (not null in excluded)
            name = COALESCE(excluded.name, devices.name),
            x = COALESCE(excluded.x, devices.x),
            y = COALESCE(excluded.y, devices.y)
    `);

    stmt.run({
        ...device,
        model: device.model || null,
        firmware: device.firmware || null,
        battery: device.battery, // keep undefined or null
        lastSeen: device.lastSeen || new Date().toISOString(),
        vendor: device.vendor || null,
        name: device.name || null,
        status: device.status || 'Active',
        x: device.x || null,
        y: device.y || null
    });
};

export const incrementStat = (mac: string, type: 'BLE' | 'UWB', timestamp: number) => {
    const date = new Date(timestamp);
    date.setMinutes(0, 0, 0); // Round to hour
    const hour = date.toISOString();

    const stmt = db.prepare(`
        INSERT INTO stats (mac, hour, type, count)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(mac, hour, type) DO UPDATE SET
            count = stats.count + 1
    `);
    stmt.run(mac, hour, type);
};

export const getAllData = () => {
    const devices = db.prepare('SELECT * FROM devices ORDER BY layoutIndex ASC').all();
    const stats = db.prepare("SELECT * FROM stats WHERE hour >= datetime('now', '-24 hours')").all();

    // Merge stats into devices? Or return separate? Return separate for easier graph building.
    return { devices, stats };
};

export const updateDeviceLayout = (mac: string, index: number) => {
    db.prepare('UPDATE devices SET layoutIndex = ? WHERE mac = ?').run(index, mac);
};

export const updateDevicePosition = (mac: string, x: number, y: number) => {
    db.prepare('UPDATE devices SET x = ?, y = ? WHERE mac = ?').run(x, y, mac);
};

export const updateDeviceNotes = (mac: string, notes: string) => {
    db.prepare('UPDATE devices SET notes = ? WHERE mac = ?').run(notes, mac);
};

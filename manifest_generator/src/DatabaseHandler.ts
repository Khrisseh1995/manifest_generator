import sqlite3, { Database } from 'sqlite3';
import ManifestInformation from './types/ManifestInformation';

/**
 * The Singleton class defines the `getInstance` method that lets clients access
 * the unique singleton instance.
 */
export default class DatabaseHandler {
    private static instance: DatabaseHandler;
    private connection: Database;

    private constructor() {
        this.connection = new sqlite3.Database('../db/manifest_info.db', (err) => {
            if (err) {
                console.error(err.message);
            }
            console.log('Connected to the manifest databaseHandler.');
        });
    }

    public static getInstance(): DatabaseHandler {
        if (!DatabaseHandler.instance) {
            DatabaseHandler.instance = new DatabaseHandler();
        }

        return DatabaseHandler.instance;
    }

    public insertIntoDatabase(insertValues: Array<ManifestInformation>) {
        this.connection.run('INSERT INTO manifest_information(EXTINFO, TIME, LOCATION, FILENAME) VALUES(?, ?, ?, ?)', insertValues, (err) => {
            if (err) {
                return console.error(err.message);
            }
        });
    }

    public readValuesForManifest(): Promise<Array<ManifestInformation>> {
        return new Promise((res, rej) => {
            const sql = "select * from (select * from manifest_information order by id DESC limit 10) order by id ASC";

            this.connection.all(sql, [], (err, rows) => {
                res(rows);
                rej(err);
            });
        })
    }
}
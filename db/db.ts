//import { drizzle } from 'drizzle-orm/expo-sqlite'
import { drizzle } from 'drizzle-orm/op-sqlite'
import { openDatabaseSync, deleteDatabaseAsync } from 'expo-sqlite/next'
import { open } from '@op-engineering/op-sqlite'
import * as schema from './schema'

deleteDatabaseAsync('db.db')
//export const rawdb = openDatabaseSync('db.db')
//export const db = drizzle(rawdb, { schema })
//rawdb.execAsync('PRAGMA foreign_keys = ON;')

const op = open({ name: 'db' })
export const db = drizzle(op, { schema })
op.execute('PRAGMA foreign_keys = ON;')

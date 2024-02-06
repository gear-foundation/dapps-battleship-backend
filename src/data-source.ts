import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { Accounts } from './entity/Account';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [Accounts],
  synchronize: true,
  logging: false,
});

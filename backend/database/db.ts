import { SQLDatabase } from "encore.dev/storage/sqldb";

export const anchorDB = new SQLDatabase("anchor", {
  migrations: "./migrations",
});

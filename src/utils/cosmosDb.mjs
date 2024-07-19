import { CosmosClient } from "@azure/cosmos";

/**
 * Creates a connection to the Cosmos DB.
 * @returns {import("@azure/cosmos").Database} The database instance.
 */
export function createDatabaseConnection(connectionString, databaseName) {

  // Create a new CosmosClient
  const client = new CosmosClient(connectionString || "your-connection-string");

  // Get a reference to the database and the container
  /**
   * The database instance for Cosmos DB.
   * @type {import("@azure/cosmos").Database}
   */
  const database = client.database(
    databaseName || "your-database"
  );
  return database;
}

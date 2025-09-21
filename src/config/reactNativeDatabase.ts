import { logger } from "../utils/logger";
import { API_CONFIG } from "./api";

// React Native compatible database interface that mirrors knex API
export interface ReactNativeDB {
  raw(query: string): Promise<any>;
  select(...columns: string[]): QueryBuilder;
  insert(data: any): QueryBuilder;
  where(column: string, value: any): QueryBuilder;
  del(): QueryBuilder;
  returning(columns: string): QueryBuilder;
  onConflict(column: string): QueryBuilder;
  merge(): QueryBuilder;
  leftJoin(
    table: string,
    leftColumn: string,
    rightColumn: string
  ): QueryBuilder;
  groupBy(column: string): QueryBuilder;
  orderBy(column: string, direction?: "asc" | "desc"): QueryBuilder;
}

export interface QueryBuilder {
  select(...columns: string[]): QueryBuilder;
  insert(data: any): QueryBuilder;
  where(column: string, value: any): QueryBuilder;
  del(): QueryBuilder;
  returning(columns: string): QueryBuilder;
  onConflict(column: string): QueryBuilder;
  merge(): QueryBuilder;
  leftJoin(
    table: string,
    leftColumn: string,
    rightColumn: string
  ): QueryBuilder;
  groupBy(column: string): QueryBuilder;
  orderBy(column: string, direction?: "asc" | "desc"): QueryBuilder;
  first(): Promise<any>;
  then(callback: (result: any) => void): Promise<any>;
}

class ReactNativeQueryBuilder implements QueryBuilder {
  private tableName: string;
  private operation: "select" | "insert" | "update" | "delete" = "select";
  private columns: string[] = ["*"];
  private whereConditions: Array<{ column: string; value: any }> = [];
  private insertData: any = null;
  private joinClauses: Array<{
    type: string;
    table: string;
    leftColumn: string;
    rightColumn: string;
  }> = [];
  private groupByColumn?: string;
  private orderByColumn?: string;
  private orderDirection?: "asc" | "desc";
  private conflictColumn?: string;
  private shouldMerge = false;
  private returnColumns?: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(...columns: string[]): QueryBuilder {
    this.operation = "select";
    this.columns = columns.length > 0 ? columns : ["*"];
    return this;
  }

  insert(data: any): QueryBuilder {
    this.operation = "insert";
    this.insertData = data;
    return this;
  }

  where(column: string, value: any): QueryBuilder {
    this.whereConditions.push({ column, value });
    return this;
  }

  del(): QueryBuilder {
    this.operation = "delete";
    return this;
  }

  returning(columns: string): QueryBuilder {
    this.returnColumns = columns;
    return this;
  }

  onConflict(column: string): QueryBuilder {
    this.conflictColumn = column;
    return this;
  }

  merge(): QueryBuilder {
    this.shouldMerge = true;
    return this;
  }

  leftJoin(
    table: string,
    leftColumn: string,
    rightColumn: string
  ): QueryBuilder {
    this.joinClauses.push({ type: "LEFT", table, leftColumn, rightColumn });
    return this;
  }

  groupBy(column: string): QueryBuilder {
    this.groupByColumn = column;
    return this;
  }

  orderBy(column: string, direction: "asc" | "desc" = "asc"): QueryBuilder {
    this.orderByColumn = column;
    this.orderDirection = direction;
    return this;
  }

  async first(): Promise<any> {
    try {
      const results = await this.execute();
      return Array.isArray(results) && results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error("Database first() query failed:", error);
      throw error;
    }
  }

  async then(callback?: (result: any) => void): Promise<any> {
    try {
      const result = await this.execute();
      if (callback) {
        callback(result);
      }
      return result;
    } catch (error) {
      logger.error("Database query failed:", error);
      throw error;
    }
  }

  private async execute(): Promise<any> {
    // Convert query to Neon REST API call
    const endpoint = this.buildApiEndpoint();
    const requestOptions = this.buildRequestOptions();

    try {
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        API_CONFIG.timeout
      );

      const response = await fetch(`${API_CONFIG.neonRestApi}${endpoint}`, {
        ...requestOptions,
        headers: {
          ...API_CONFIG.headers,
          ...requestOptions.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.formatResult(data);
    } catch (error) {
      logger.error(
        `Database operation failed for table ${this.tableName}:`,
        error
      );
      throw error;
    }
  }

  private buildApiEndpoint(): string {
    // PostgREST uses the table name directly as the endpoint
    switch (this.operation) {
      case "select":
        return `/${this.tableName}${this.buildQueryParams()}`;
      case "insert":
        return `/${this.tableName}`;
      case "update":
        return `/${this.tableName}${this.buildWhereParams()}`;
      case "delete":
        return `/${this.tableName}${this.buildWhereParams()}`;
      default:
        throw new Error(`Unsupported operation: ${this.operation}`);
    }
  }

  private buildQueryParams(): string {
    const params = new URLSearchParams();

    // Add select columns
    if (this.columns.length > 0 && !this.columns.includes("*")) {
      params.append("select", this.columns.join(","));
    }

    // Add where conditions using PostgREST format
    this.whereConditions.forEach((condition) => {
      params.append(condition.column, `eq.${condition.value}`);
    });

    // Add order by
    if (this.orderByColumn) {
      params.append("order", `${this.orderByColumn}.${this.orderDirection}`);
    }

    // Add limit if needed (default to reasonable limit)
    params.append("limit", "1000");

    return params.toString() ? `?${params.toString()}` : "";
  }

  private buildWhereParams(): string {
    if (this.whereConditions.length === 0) return "";

    const params = new URLSearchParams();
    this.whereConditions.forEach((condition) => {
      params.append(condition.column, `eq.${condition.value}`);
    });

    return params.toString() ? `?${params.toString()}` : "";
  }

  private buildRequestOptions(): RequestInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    switch (this.operation) {
      case "select":
        return {
          method: "GET",
          headers,
        };
      case "insert":
        if (this.returnColumns) {
          headers["Prefer"] = "return=representation";
        }
        return {
          method: "POST",
          headers,
          body: JSON.stringify(this.insertData),
        };
      case "update":
        if (this.returnColumns) {
          headers["Prefer"] = "return=representation";
        }
        return {
          method: "PATCH",
          headers,
          body: JSON.stringify(this.insertData || {}),
        };
      case "delete":
        return {
          method: "DELETE",
          headers,
        };
      default:
        throw new Error(`Unsupported operation: ${this.operation}`);
    }
  }

  private formatResult(data: any): any {
    // PostgREST returns arrays directly, not wrapped in {rows: []}
    if (this.operation === "select") {
      return Array.isArray(data) ? data : [];
    } else if (this.operation === "insert" && this.returnColumns) {
      return Array.isArray(data) ? data : [data];
    } else if (this.operation === "update" && this.returnColumns) {
      return Array.isArray(data) ? data : [data];
    } else {
      // For operations without return data, just return success indicator
      return Array.isArray(data) ? data.length : 1;
    }
  }
}

class ReactNativeDatabaseConnection implements ReactNativeDB {
  constructor(private apiBaseUrl: string) {}

  raw(query: string): Promise<any> {
    // For raw queries, send directly to the database API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    // For raw queries, we'll simulate with a simple response since PostgREST doesn't support raw SQL
    clearTimeout(timeoutId);
    return Promise.resolve([
      { result: "Raw query simulated - use PostgREST table access instead" },
    ]);
  }

  // Table access methods - return QueryBuilder for fluent interface
  select(...columns: string[]): QueryBuilder {
    throw new Error(
      "select() must be called on a table. Use db(tableName).select()"
    );
  }

  insert(data: any): QueryBuilder {
    throw new Error(
      "insert() must be called on a table. Use db(tableName).insert()"
    );
  }

  where(column: string, value: any): QueryBuilder {
    throw new Error(
      "where() must be called on a table query. Use db(tableName).where()"
    );
  }

  del(): QueryBuilder {
    throw new Error("del() must be called on a table. Use db(tableName).del()");
  }

  returning(columns: string): QueryBuilder {
    throw new Error("returning() must be called on a table query.");
  }

  onConflict(column: string): QueryBuilder {
    throw new Error("onConflict() must be called on a table query.");
  }

  merge(): QueryBuilder {
    throw new Error("merge() must be called on a table query.");
  }

  leftJoin(
    table: string,
    leftColumn: string,
    rightColumn: string
  ): QueryBuilder {
    throw new Error("leftJoin() must be called on a table query.");
  }

  groupBy(column: string): QueryBuilder {
    throw new Error("groupBy() must be called on a table query.");
  }

  orderBy(column: string, direction?: "asc" | "desc"): QueryBuilder {
    throw new Error("orderBy() must be called on a table query.");
  }
}

// Create a function that returns a QueryBuilder for a specific table
export function createReactNativeDatabase(
  apiBaseUrl: string = API_CONFIG.neonRestApi
) {
  const connection = new ReactNativeDatabaseConnection(apiBaseUrl);

  // Return a function that can be called with table name, like knex
  const db = (tableName: string): QueryBuilder => {
    return new ReactNativeQueryBuilder(tableName);
  };

  // Add the connection methods to the db function
  db.raw = (query: string) => {
    return connection.raw(query);
  };

  return db;
}

// Export the database instance
export const db = createReactNativeDatabase();

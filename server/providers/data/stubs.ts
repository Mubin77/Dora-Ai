import { DataProvider } from "../types";
import { isRealApiKey } from "../ai/google";

export class SupabaseDataProvider implements DataProvider {
  public readonly id = "supabase";
  public readonly name = "Supabase";
  public readonly category = "data" as const;
  public readonly capabilities: Array<"kv" | "relational" | "vector" | "document"> = ["relational", "vector"];

  public isConfigured(): boolean {
    return isRealApiKey(process.env.SUPABASE_URL) && isRealApiKey(process.env.SUPABASE_ANON_KEY);
  }
}

export class FirebaseDataProvider implements DataProvider {
  public readonly id = "firebase";
  public readonly name = "Firebase Firestore";
  public readonly category = "data" as const;
  public readonly capabilities: Array<"kv" | "relational" | "vector" | "document"> = ["document"];

  public isConfigured(): boolean {
    return isRealApiKey(process.env.FIREBASE_PROJECT_ID);
  }
}

export class NeonDataProvider implements DataProvider {
  public readonly id = "neon";
  public readonly name = "Neon PostgreSQL";
  public readonly category = "data" as const;
  public readonly capabilities: Array<"kv" | "relational" | "vector" | "document"> = ["relational"];

  public isConfigured(): boolean {
    return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.includes("neon.tech"));
  }
}

export class MongoDBDataProvider implements DataProvider {
  public readonly id = "mongodb";
  public readonly name = "MongoDB Atlas";
  public readonly category = "data" as const;
  public readonly capabilities: Array<"kv" | "relational" | "vector" | "document"> = ["document", "vector"];

  public isConfigured(): boolean {
    return isRealApiKey(process.env.MONGODB_URI);
  }
}

export class UpstashDataProvider implements DataProvider {
  public readonly id = "upstash";
  public readonly name = "Upstash Redis / Vector";
  public readonly category = "data" as const;
  public readonly capabilities: Array<"kv" | "relational" | "vector" | "document"> = ["kv", "vector"];

  public isConfigured(): boolean {
    return isRealApiKey(process.env.UPSTASH_REDIS_REST_URL) && isRealApiKey(process.env.UPSTASH_REDIS_REST_TOKEN);
  }
}


import type { Env } from "../index";

export type Variables = {
  user: {
    id: number;
    username: string;
    region: string;
    isAdmin: boolean;
  };
};

export type AppEnv = { Bindings: Env; Variables: Variables };

export type Region = "vn" | "na";
export type Role = "dps" | "healer" | "tank";
export type Day = "saturday" | "sunday";

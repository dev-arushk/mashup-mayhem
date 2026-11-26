export type NumberConfigEntry = {
  value: number;
  type: "number";
  label: string;
  group: string;
  min?: number;
  max?: number;
  step?: number;
};

export type BooleanConfigEntry = {
  value: boolean;
  type: "boolean";
  label: string;
  group: string;
};

export type ColorConfigEntry = {
  value: string; // hex e.g. "#ff0000"
  type: "color";
  label: string;
  group: string;
};

export type SelectConfigEntry = {
  value: string;
  type: "select";
  label: string;
  group: string;
  options: string[];
};

export type Vector2ConfigEntry = {
  value: { x: number; y: number };
  type: "vector2";
  label: string;
  group: string;
};

export type ConfigEntry =
  | NumberConfigEntry
  | BooleanConfigEntry
  | ColorConfigEntry
  | SelectConfigEntry
  | Vector2ConfigEntry;

export type GameConfig = Record<string, ConfigEntry>;

// Utility: extract a flat values object from a CONFIG
export type ConfigValues<T extends GameConfig> = {
  [K in keyof T]: T[K]["value"];
};

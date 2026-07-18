export const SCHEMA_COMMON_TYPES = ["table", "view", "procedure", "function", "trigger"];
export const SCHEMA_KNOWN_TYPES = [
  "table", "view", "procedure", "function", "trigger", "index", "materialized_view", "sequence", "synonym",
  "event", "package", "type", "domain", "collation", "operator", "aggregate", "extension",
  "virtual_table", "foreign_table", "temp_table"
];
export const SCHEMA_TYPE_LABELS = {
  table: "TABLE",
  view: "VIEW",
  procedure: "PROCEDURE",
  function: "FUNCTION",
  trigger: "TRIGGER",
  index: "INDEX",
  materialized_view: "MATERIALIZED VIEW",
  sequence: "SEQUENCE",
  synonym: "SYNONYM",
  event: "EVENT",
  package: "PACKAGE",
  type: "TYPE",
  domain: "DOMAIN",
  collation: "COLLATION",
  operator: "OPERATOR",
  aggregate: "AGGREGATE",
  extension: "EXTENSION",
  virtual_table: "VIRTUAL TABLE",
  foreign_table: "FOREIGN TABLE",
  temp_table: "TEMP TABLE"
};

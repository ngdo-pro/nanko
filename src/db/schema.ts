import {
  bigserial,
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// Bootstrap scope: only the tables needed to prove the resolveGraph() test
// harness (see PLAN.md Phase 1). relation/relation_version/position/annotation
// are added when Phase 1 is implemented for real.

export const elementKind = pgEnum("element_kind", [
  "system_landscape",
  "person",
  "system",
  "container",
  "component",
  "code",
]);

export const project = pgTable("project", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const milestone = pgTable(
  "milestone",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    occursOn: date("occurs_on"),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.projectId, table.sortOrder)],
);

export const element = pgTable("element", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): AnyPgColumn => element.id, {
    onDelete: "cascade",
  }),
  kind: elementKind("kind").notNull(),
  isExternal: boolean("is_external").notNull().default(false),
  seq: bigserial("seq", { mode: "number" }).notNull(),
  createdAtMilestoneId: uuid("created_at_milestone_id")
    .notNull()
    .references(() => milestone.id),
  deletedAtMilestoneId: uuid("deleted_at_milestone_id").references(() => milestone.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const elementVersion = pgTable(
  "element_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    elementId: uuid("element_id")
      .notNull()
      .references(() => element.id, { onDelete: "cascade" }),
    milestoneId: uuid("milestone_id")
      .notNull()
      .references(() => milestone.id),
    name: text("name").notNull(),
    description: text("description"),
    technology: text("technology"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.elementId, table.milestoneId)],
);

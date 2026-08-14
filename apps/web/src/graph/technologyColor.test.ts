import { describe, expect, it } from "vitest";
import { suggestedArchetype, technologyColor } from "./technologyColor";

describe("technologyColor", () => {
  it("returns the brand color for a known technology", () => {
    // GIVEN MongoDB as the technology
    // WHEN resolving its color
    // THEN it returns MongoDB's brand green
    expect(technologyColor("MongoDB")).toBe("#47a248");
  });

  it("returns a different color for a different known technology", () => {
    // GIVEN Redis as the technology
    // WHEN resolving its color
    // THEN it returns Redis's brand red, distinct from MongoDB's
    expect(technologyColor("Redis")).toBe("#dc382d");
  });

  it("matches case-insensitively", () => {
    // GIVEN the technology written in a different case
    // WHEN resolving its color
    // THEN the match still succeeds
    expect(technologyColor("redis")).toBe(technologyColor("REDIS"));
  });

  it("matches as a substring, not only an exact string", () => {
    // GIVEN a technology string with extra detail around the known name
    // WHEN resolving its color
    // THEN it still matches the known technology
    expect(technologyColor("Amazon RDS Postgres 15")).toBe("#336791");
  });

  it("prefers the more specific match over a shorter substring collision", () => {
    // GIVEN a technology string that could ambiguously match a short substring
    // WHEN resolving its color
    // THEN the more specific technology wins, not an unrelated shorter substring
    expect(technologyColor("Kubernetes worker node")).toBe("#326ce5");
  });

  it("returns null for an unrecognized technology", () => {
    // GIVEN a technology with no known brand color
    // WHEN resolving its color
    // THEN no color is returned
    expect(technologyColor("SomeInHouseFramework")).toBeNull();
  });

  it("returns null when there is no technology", () => {
    // GIVEN no technology set
    // WHEN resolving its color
    // THEN no color is returned
    expect(technologyColor(null)).toBeNull();
    expect(technologyColor("")).toBeNull();
    expect(technologyColor("   ")).toBeNull();
  });
});

describe("suggestedArchetype", () => {
  it("suggests database for a known database technology", () => {
    // GIVEN MongoDB as the technology
    // WHEN suggesting an archetype
    // THEN it suggests database
    expect(suggestedArchetype("MongoDB")).toBe("database");
  });

  it("suggests queue for a known message-broker technology", () => {
    // GIVEN RabbitMQ as the technology
    // WHEN suggesting an archetype
    // THEN it suggests queue
    expect(suggestedArchetype("RabbitMQ")).toBe("queue");
  });

  it("never suggests service, even for a common service technology", () => {
    // GIVEN a technology that is a database (unambiguous), not a general-purpose one
    // WHEN checking the full set of database suggestions
    // THEN service is never one of them (deliberately not inferred from a name alone)
    expect(suggestedArchetype("Symfony")).toBeNull();
  });

  it("returns null for an unrecognized technology", () => {
    // GIVEN a technology with no known archetype mapping
    // WHEN suggesting an archetype
    // THEN no suggestion is returned
    expect(suggestedArchetype("SomeInHouseFramework")).toBeNull();
  });

  it("returns null when there is no technology", () => {
    // GIVEN no technology set
    // WHEN suggesting an archetype
    // THEN no suggestion is returned
    expect(suggestedArchetype(null)).toBeNull();
    expect(suggestedArchetype("")).toBeNull();
  });
});

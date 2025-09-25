import { describe, it, expect } from "@jest/globals";

describe("Basic Functionality", () => {
  it("should pass a simple test", () => {
    expect(2 + 2).toBe(4);
  });

  it("should handle async operations", async () => {
    const result = await Promise.resolve("success");
    expect(result).toBe("success");
  });

  it("should work with objects", () => {
    const user = { name: "John", age: 30 };
    expect(user).toEqual({ name: "John", age: 30 });
    expect(user.name).toBe("John");
  });
});

import request from "supertest";
import { prisma } from "@/database/prisma";

import { app } from "@/app";
import exp from "constants";

describe("UsersController", () => {
  let userId: string;

  afterAll(async () => {
    await prisma.user.delete({
      where: {
        id: userId,
      },
    });
  });

  it("should create a new user", async () => {
    const response = await request(app).post("/users").send({
      name: "test user",
      email: "test@example.com",
      password: "password123",
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.name).toBe("test user");

    userId = response.body.id;
  });

  it("should throw new Error if user already exists", async () => {
    const response = await request(app).post("/users").send({
      name: "duplicate user",
      email: "test@example.com",
      password: "password123",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("User with same email already exists");
  });

  it("should throw a validation error if email is invalid", async () => {
    const response = await request(app).post("/users").send({
      name: "ab",
      email: "invalid-email",
      password: "password123",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("validation error");
  });
});

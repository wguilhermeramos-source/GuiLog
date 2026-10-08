import request from "supertest";
import { prisma } from "@/database/prisma";
import { app } from "@/app";
import { response } from "express";

describe("SessionsController", () => {
  let userId: string;

  afterAll(async () => {
    await prisma.user.delete({
      where: {
        id: userId,
      },
    });
  });

  it("should authenticate a user and get an access token", async () => {
    const userResponse = await request(app).post("/users").send({
      name: "Auth test user",
      email: "auth_test@example.com",
      password: "password123",
    });

    userId = userResponse.body.id;

    const sessionResponse = await request(app).post("/sessions").send({
      email: "auth_test@example.com",
      password: "password123",
    });

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body.token).toEqual(expect.any(String));
  });
});
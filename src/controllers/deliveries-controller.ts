import { Request, Response } from "express";
import { prisma } from "@/database/prisma";
import { z } from "zod";
import { AppError } from "@/utils/AppError";

class DeliveriesController {
  async create(request: Request, response: Response) {
    if (!request.user) {
      throw new AppError("Unauthorized", 401);
    }

    const bodySchema = z.object({
      description: z.string().trim().min(1).max(255),
    });

    const { description } = bodySchema.parse(request.body);

    await prisma.delivery.create({
      data: {
        userId: request.user.id,
        description,
      },
    });

    return response.status(201).send();
  }

  async index(request: Request, response: Response) {
    if (!request.user) {
      throw new AppError("Unauthorized", 401);
    }

    const deliveries = await prisma.delivery.findMany({
      where:
        request.user.role === "customer"
          ? { userId: request.user.id }
          : {},
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return response.json(deliveries);
  }
}

export { DeliveriesController };
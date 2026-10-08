import { Router } from "express";

import { DeliveriesController } from "@/controllers/deliveries-controller";
import { DeliveriesStatusController } from "@/controllers/deliveries-status-controller";

import { ensureAuthenticated } from "@/middlewares/ensure-authenticated";
import { verifyUserAuthorization } from "@/middlewares/verifyUserAuthorization";

const deliveriesRoutes = Router();
const deliveriesController = new DeliveriesController();
const deliveriesStatusController = new DeliveriesStatusController();

deliveriesRoutes.use(ensureAuthenticated);
deliveriesRoutes.post(
  "/",
  verifyUserAuthorization(["customer"]),
  deliveriesController.create,
);
deliveriesRoutes.get(
  "/",
  verifyUserAuthorization(["customer", "sale"]),
  deliveriesController.index,
);

deliveriesRoutes.patch(
  "/:id/status",
  verifyUserAuthorization(["sale"]),
  deliveriesStatusController.update
)

export { deliveriesRoutes };

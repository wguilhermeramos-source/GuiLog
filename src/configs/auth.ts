import { env } from "../env";
import { SignOptions } from "jsonwebtoken";

export const authConfig = {
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: "1d" as SignOptions["expiresIn"],
  },
};
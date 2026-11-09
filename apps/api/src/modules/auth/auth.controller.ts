import { Body, Controller, Post } from "@nestjs/common";
import type { LoginService } from "./login.service.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly login: LoginService) {}

  @Post("request-link")
  async requestLink(@Body() body: { email?: string }) {
    const verificationToken = await this.login.requestLink(body.email);
    return {
      accepted: true,
      ...(process.env.NODE_ENV !== "production" && verificationToken ? { verificationToken } : {}),
    };
  }

  @Post("verify")
  verify(@Body() body: { token?: string }) {
    return this.login.verify(body.token);
  }
}

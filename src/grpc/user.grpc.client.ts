import { Inject, Injectable } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";

import {
  UserServiceClient,
  User,
  UserServiceGetByIdRequest,
} from "@ecommerce/contracts/generated/ecommerce/user/v1/user";

import { callGrpc } from "@ecommerce/common";

@Injectable()
export class UserGrpcClient {
  private userService?: UserServiceClient;

  constructor(
    @Inject("USER_SERVICE")
    private readonly client: ClientGrpc,
  ) {}

  private getUserService(): UserServiceClient {
    if (!this.userService) {
      this.userService =
        this.client.getService<UserServiceClient>("UserService");
    }

    return this.userService;
  }

  async getById(id: number): Promise<User> {
    const request: UserServiceGetByIdRequest = {
      id,
    };

    const response = await callGrpc(this.getUserService().getById(request), {
      source: "user-service.UserService",
      timeoutMs: 5000,
    });

    if (!response.user) {
      throw new Error(`User ${id} was not found`);
    }

    return response.user;
  }
}

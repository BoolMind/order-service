import { Inject, Injectable } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";

import {
  Product,
  ProductServiceClient,
  ProductServiceGetByIdRequest,
  ProductServiceGetByIdResponse,
} from "@ecommerce/contracts/generated/ecommerce/catalog/v1/catalog";

import { callGrpc } from "@ecommerce/common";

@Injectable()
export class CatalogGrpcClient {
  private productService?: ProductServiceClient;

  constructor(
    @Inject("CATALOG_SERVICE")
    private readonly client: ClientGrpc,
  ) {}

  private getProductService(): ProductServiceClient {
    if (!this.productService) {
      this.productService =
        this.client.getService<ProductServiceClient>("ProductService");
    }

    return this.productService;
  }

  async getById(id: number): Promise<Product> {
    const request: ProductServiceGetByIdRequest = {
      id,
    };

    const response = await callGrpc<ProductServiceGetByIdResponse>(
      this.getProductService().getById(request),
      {
        source: "catalog-service.ProductService",
        timeoutMs: 5000,
      },
    );

    if (!response.product) {
      throw new Error(`Product ${id} was not found`);
    }

    return response.product;
  }

  async getByIds(ids: number[]): Promise<Map<number, Product>> {
    const uniqueIds = [...new Set(ids)];

    const products = await Promise.all(
      uniqueIds.map((id) => this.getById(id)),
    );

    return new Map(products.map((product) => [product.id, product]));
  }
}

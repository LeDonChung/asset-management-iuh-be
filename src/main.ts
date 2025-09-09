import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { JWT_BEARER_PREFIX } from "./common/utils/constants";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Request size limits
  app.use("/upload", (req, res, next) => {
    req.rawHeaders.push("content-length");
    next();
  });

  // Enable CORS with specific settings
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests from *.laztar.com and localhost:3001
      if (
        !origin ||
        origin.includes("laztar.com") ||
        origin === "*" ||
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle("Asset Management API")
    .setDescription("Asset Management API")
    .setVersion("1.0")
    .addBearerAuth()
    .addTag("Permissions", "Manage user permissions and roles")
    .addBearerAuth({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      name: JWT_BEARER_PREFIX,
      description: "Enter JWT token",
      in: "header",
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "none",
      filter: true,
      showRequestDuration: true,
      tryItOutEnabled: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
    customSiteTitle: "Asset Management API Docs",
    customfavIcon: "/favicon.ico",
    customJs: [
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js",
    ],
    customCssUrl: [
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css",
    ],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, "0.0.0.0");

  const logger = new Logger("Bootstrap");
  logger.log(
    `🚀 Application is running on: ${process.env.API_URL || "http://localhost:3000"}`
  );
  logger.log(
    `📚 API Documentation: ${process.env.API_URL || "http://localhost:3000"}/api/docs`
  );
}
bootstrap();

import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { JWT_BEARER_PREFIX } from "./common/utils/constants";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust proxy settings for production deployment
  if (process.env.NODE_ENV === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  // Security headers - Configure helmet for HTTP deployment
  app.use(helmet({
    crossOriginOpenerPolicy: false, // Disable COOP to prevent origin issues
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Disable CSP to allow Swagger UI to load properly
  }));

  // Request size limits
  app.use("/upload", (req, res, next) => {
    req.rawHeaders.push("content-length");
    next();
  });

  // Enable CORS with specific settings
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://asset.codeshare.id.vn",
        "https://socket.codeshare.id.vn",
      ];
  
      if (!origin) return callback(null, true); // Postman hoặc mobile
  
      if (allowedOrigins.includes(origin)) {
        callback(null, true); // chỉ 1 origin
      } else {
        callback(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers"
    ],
  });

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Add a simple health check endpoint
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

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
      // Force Swagger UI to use relative URLs to avoid HTTPS/SSL issues
      url: undefined,
      urls: undefined,
    },
    customSiteTitle: "Asset Management API Docs",
    customfavIcon: undefined, // Remove favicon to avoid 404 errors
    // Custom CSS to ensure proper styling without external dependencies
    customCss: `
      .swagger-ui .topbar { display: none !important; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .scheme-container { background: #fafafa; padding: 10px; }
    `,
    explorer: false, // Disable explorer to prevent additional requests
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

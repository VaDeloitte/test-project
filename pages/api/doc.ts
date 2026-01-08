// Import the `withSwagger` function from 'next-swagger-doc' package
import { withSwagger } from 'next-swagger-doc';

// Create a handler using the withSwagger function to generate Swagger documentation
const swaggerHandler = withSwagger({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NextJS Swagger',
      version: '0.1.0',
    },
  },
  apiFolder: 'pages/api',
});
// Export the configured swaggerHandler
export default swaggerHandler();
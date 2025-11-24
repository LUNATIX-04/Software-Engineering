import { Elysia } from "elysia"
import { openapi } from "@elysiajs/openapi"

import { registerProjectRoutes } from "./routes/projects"
import { registerInviteRoutes } from "./routes/invites"
import { registerDepartmentRoutes } from "./routes/departments"
import { registerMemberRoutes } from "./routes/members"
import { registerTaskRoutes } from "./routes/tasks"
import { registerMediaRoutes } from "./routes/media"
import { registerAuthRoutes } from "./routes/auth"
import { registerAccountRoutes } from "./routes/account"
import { registerTraditionalAuthRoutes } from "./routes/traditional-auth"

const app = new Elysia().use(
  openapi({
    path: "/openapi",
    documentation: {
      info: {
        title: "ASAP Project API",
        version: "1.0.0",
      },
    },
  })
)

registerMediaRoutes(app)
registerProjectRoutes(app)
registerInviteRoutes(app)
registerDepartmentRoutes(app)
registerMemberRoutes(app)
registerTaskRoutes(app)
registerAccountRoutes(app)
registerTraditionalAuthRoutes(app)
registerAuthRoutes(app)

export async function handleElysiaRequest(request: Request) {
  return app.handle(request)
}


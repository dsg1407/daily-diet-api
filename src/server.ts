import fastify from 'fastify'
import cookie from '@fastify/cookie'
import { env } from './env'

import { mealsRoutes } from './routes/meals.router'
import { usersRoutes } from './routes/users.router'

const app = fastify()

app.register(cookie)
app.register(mealsRoutes, { prefix: 'meals' })
app.register(usersRoutes, { prefix: 'users' })

app
  .listen({
    port: env.PORT,
  })
  .then(() => {
    console.log(`Server running on port ${env.PORT}! 🚀🚀`)
  })
